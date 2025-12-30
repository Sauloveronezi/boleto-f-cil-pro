import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewUserPayload {
  email: string;
  nome: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("[notify-new-user] RESEND_API_KEY not configured, skipping email notification");
      return new Response(
        JSON.stringify({ success: true, message: "Email notification skipped - no API key" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, nome }: NewUserPayload = await req.json();

    console.log(`[notify-new-user] Novo usuário cadastrado: ${email} (${nome})`);

    // Buscar emails dos admins e masters
    const { data: adminEmails, error: emailError } = await supabase.rpc('vv_b_get_admin_emails');

    if (emailError) {
      console.error("[notify-new-user] Erro ao buscar emails dos admins:", emailError);
      throw emailError;
    }

    if (!adminEmails || adminEmails.length === 0) {
      console.log("[notify-new-user] Nenhum admin/master encontrado para notificar");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailList = adminEmails.map((row: { email: string }) => row.email);
    console.log(`[notify-new-user] Enviando notificação para: ${emailList.join(", ")}`);

    // Enviar email usando fetch direto para Resend API
    const emailPromises = emailList.map((adminEmail: string) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sistema de Boletos <onboarding@resend.dev>",
          to: [adminEmail],
          subject: "Novo usuário aguardando aprovação",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Novo Usuário Cadastrado</h2>
              <p>Um novo usuário se cadastrou no sistema e aguarda sua aprovação:</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Nome:</strong> ${nome || 'Não informado'}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              </div>
              <p>Acesse o sistema para aprovar ou rejeitar este usuário.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #666; font-size: 12px;">
                Este é um email automático. Por favor, não responda.
              </p>
            </div>
          `,
        }),
      })
    );

    const results = await Promise.allSettled(emailPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;
    
    console.log(`[notify-new-user] Emails enviados: ${successCount} sucesso, ${failCount} falha`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[notify-new-user] Erro:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
