import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewUserPayload {
  email: string;
  nome?: string | null;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const parsePayload = async (req: Request): Promise<NewUserPayload> => {
  const payload = (await req.json()) as Partial<NewUserPayload>;

  if (!payload?.email || typeof payload.email !== "string") {
    throw new Error("Payload inválido: email é obrigatório");
  }

  return {
    email: payload.email.trim().toLowerCase(),
    nome: typeof payload.nome === "string" ? payload.nome.trim() : null,
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKeys = [Deno.env.get("RESEND_API_KEY"), Deno.env.get("RESEND_API_KEY2")]
      .filter((key): key is string => Boolean(key && key.trim().length > 0));

    if (resendApiKeys.length === 0) {
      console.log("[notify-new-user] RESEND_API_KEY/RESEND_API_KEY2 não configuradas, notificação ignorada");
      return new Response(
        JSON.stringify({ success: true, message: "Email notification skipped - no API key" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, nome } = await parsePayload(req);

    console.log(`[notify-new-user] Novo usuário cadastrado: ${email} (${nome ?? "sem nome"})`);

    const { data: recipients, error: emailError } = await supabase
      .from("vv_b_usuarios")
      .select("email")
      .eq("receber_notificacoes", true)
      .eq("ativo", true)
      .or("deleted.is.null,deleted.eq.");

    if (emailError) {
      console.error("[notify-new-user] Erro ao buscar destinatários:", emailError);
      throw emailError;
    }

    const emailList = (recipients ?? [])
      .map((row: { email: string | null }) => row.email)
      .filter((recipient): recipient is string => !!recipient && recipient.includes("@"));

    if (emailList.length === 0) {
      console.log("[notify-new-user] Nenhum usuário configurado para receber notificações");
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log(`[notify-new-user] Enviando notificação para: ${emailList.join(", ")}`);

    const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "Sistema de Boletos <onboarding@resend.dev>";
    const safeNome = escapeHtml(nome || "Não informado");
    const safeEmail = escapeHtml(email);

    const results = await Promise.allSettled(
      emailList.map(async (adminEmail) => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [adminEmail],
            subject: "Novo usuário aguardando aprovação",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Novo Usuário Cadastrado</h2>
                <p>Um novo usuário se cadastrou no sistema e aguarda sua aprovação:</p>
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Nome:</strong> ${safeNome}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${safeEmail}</p>
                  <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
                </div>
                <p>Acesse o sistema para aprovar ou rejeitar este usuário.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #666; font-size: 12px;">
                  Este é um email automático. Por favor, não responda.
                </p>
              </div>
            `,
          }),
        });

        const responseBody = await response.text();

        if (!response.ok) {
          throw new Error(`Falha ao enviar para ${adminEmail}: ${response.status} ${responseBody}`);
        }

        return { adminEmail, responseBody };
      }),
    );

    const failedResults = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));

    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failCount = failedResults.length;

    if (failCount > 0) {
      console.error("[notify-new-user] Falhas no envio:", failedResults);
    }

    console.log(`[notify-new-user] Emails enviados: ${successCount} sucesso, ${failCount} falha`);

    const allFailed = successCount === 0;

    return new Response(
      JSON.stringify({
        success: !allFailed,
        sent: successCount,
        failed: failCount,
        errors: failedResults,
      }),
      {
        status: allFailed ? 502 : 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[notify-new-user] Erro:", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
