import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Configuração do servidor inválida')
    }

    // Admin client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verificar autenticação via getClaims
    const authHeader = req.headers.get('Authorization')
    console.log('[manage-users] auth header present:', Boolean(authHeader))

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[manage-users] missing or invalid bearer header')
      throw new Error('Não autorizado')
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      console.error('[manage-users] empty bearer token')
      throw new Error('Não autorizado')
    }

    // Create user-context client with the auth header
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Validate JWT using getClaims
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      console.error('[manage-users] getClaims failed:', claimsError?.message ?? 'no claims')
      throw new Error('Não autorizado')
    }

    const authUserId = claimsData.claims.sub as string
    console.log('[manage-users] authenticated user:', authUserId)

    // Verificar se o usuário é Master (suporta múltiplas roles + fallback pelo perfil)
    const { data: rolesData, error: roleError } = await supabaseAdmin
      .from('vv_b_user_roles')
      .select('role')
      .eq('user_id', authUserId)
      .is('deleted', null)

    const roles = rolesData?.map(r => String(r.role).toLowerCase()) ?? []
    let isMaster = roles.includes('master')

    if (!isMaster) {
      const { data: usuarioData } = await supabaseAdmin
        .from('vv_b_usuarios')
        .select('perfil_acesso:vv_b_perfis_acesso(nome)')
        .eq('user_id', authUserId)
        .is('deleted', null)
        .limit(1)
        .maybeSingle()

      const perfilNome = (usuarioData?.perfil_acesso as { nome?: string } | null)?.nome
      isMaster = String(perfilNome || '').toLowerCase() === 'master'
    }

    if (roleError || !isMaster) {
      console.error('[manage-users] not master. roles:', roles, 'roleError:', roleError?.message)
      throw new Error('Apenas usuários Master podem gerenciar usuários')
    }

    const body = await req.json()
    const { action, email, password, userId, perfilAcessoId, role, nome } = body

    if (action === 'create') {
      if (!email || !password) {
        throw new Error('Email e senha são obrigatórios')
      }

      if (!perfilAcessoId || !role) {
        throw new Error('Perfil de acesso e role são obrigatórios')
      }

      // 1. Criar usuário no auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (createError) {
        throw new Error(createError.message)
      }

      const newUserId = newUser.user.id

      // 2. Criar registro em vv_b_usuarios
      const { error: usuarioError } = await supabaseAdmin
        .from('vv_b_usuarios')
        .upsert({
          user_id: newUserId,
          email: email,
          nome: nome || email.split('@')[0],
          ativo: true,
          perfil_acesso_id: perfilAcessoId,
          data_aprovacao: new Date().toISOString(),
          aprovado_por: authUserId,
          deleted: null
        }, { onConflict: 'user_id' })

      if (usuarioError) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
        throw new Error('Erro ao criar registro do usuário: ' + usuarioError.message)
      }

      // 3. Criar registro em vv_b_user_roles
      const { error: roleError2 } = await supabaseAdmin
        .from('vv_b_user_roles')
        .upsert({
          user_id: newUserId,
          role: role,
          perfil_acesso_id: perfilAcessoId,
          deleted: null
        }, { onConflict: 'user_id,role' })

      if (roleError2) {
        await supabaseAdmin.from('vv_b_usuarios').delete().eq('user_id', newUserId)
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
        throw new Error('Erro ao criar role do usuário: ' + roleError2.message)
      }

      // 4. Notificar admins por email
      try {
        await notifyAdmins(supabaseAdmin, supabaseUrl, supabaseAnonKey, email, nome || email.split('@')[0], 'criado')
      } catch (e) {
        console.warn('[manage-users] falha ao notificar admins:', e)
      }

      return new Response(
        JSON.stringify({ success: true, user: newUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update-password') {
      if (!userId || !password) {
        throw new Error('ID do usuário e nova senha são obrigatórios')
      }

      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)

      if (getUserError || !targetUser?.user) {
        const { data: usuarioDb, error: dbError } = await supabaseAdmin
          .from('vv_b_usuarios')
          .select('email, nome')
          .eq('user_id', userId)
          .is('deleted', null)
          .single()

        if (dbError || !usuarioDb) {
          throw new Error('Usuário não encontrado no banco de dados nem no sistema de autenticação.')
        }

        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          id: userId,
          email: usuarioDb.email,
          password,
          email_confirm: true
        })

        if (createError) {
          throw new Error('Erro ao recriar usuário no Auth: ' + createError.message)
        }

        return new Response(
          JSON.stringify({ success: true, recreated: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      )

      if (updateError) {
        throw new Error(updateError.message)
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Ação inválida')

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const status = errorMessage === 'Não autorizado'
      ? 401
      : errorMessage.includes('Apenas usuários Master')
        ? 403
        : 400

    console.error('[manage-users] error:', errorMessage, 'status:', status)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Notify users marked with receber_notificacoes
async function notifyAdmins(
  supabaseAdmin: any,
  supabaseUrl: string,
  supabaseAnonKey: string,
  userEmail: string,
  userName: string,
  action: string
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.log('[manage-users] RESEND_API_KEY not set, skipping notification')
    return
  }

  // Buscar usuários que devem receber notificações
  const { data: notifyUsers, error } = await supabaseAdmin
    .from('vv_b_usuarios')
    .select('email')
    .eq('receber_notificacoes', true)
    .eq('ativo', true)
    .is('deleted', null)

  if (error || !notifyUsers?.length) {
    console.log('[manage-users] no users to notify or error:', error?.message)
    return
  }

  const emailList = notifyUsers.map((u: { email: string }) => u.email)
  console.log(`[manage-users] notifying: ${emailList.join(', ')}`)

  const promises = emailList.map((adminEmail: string) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sistema de Boletos <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `Usuário ${action} no sistema`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #154734;">Notificação de Usuário</h2>
            <p>Um usuário foi <strong>${action}</strong> no sistema:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Nome:</strong> ${userName || 'Não informado'}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
              <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">Email automático do Sistema de Boletos.</p>
          </div>
        `,
      }),
    })
  )

  await Promise.allSettled(promises)
}
