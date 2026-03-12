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

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar autenticação com claims do token
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

    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser(token)
    const authUserId = userData?.user?.id

    if (userError || !authUserId) {
      console.error('[manage-users] token validation failed:', userError?.message ?? 'no user id')
      throw new Error('Não autorizado')
    }

    // Verificar se o usuário é Master (suporta múltiplas roles + fallback pelo perfil)
    const { data: rolesData, error: roleError } = await supabaseAdmin
      .from('vv_b_user_roles')
      .select('role')
      .eq('user_id', authUserId)
      .or('deleted.is.null,deleted.eq.')

    const roles = rolesData?.map(r => String(r.role).toLowerCase()) ?? []
    let isMaster = roles.includes('master')

    if (!isMaster) {
      const { data: usuarioData } = await supabaseAdmin
        .from('vv_b_usuarios')
        .select('perfil_acesso:vv_b_perfis_acesso(nome)')
        .eq('user_id', authUserId)
        .or('deleted.is.null,deleted.eq.')
        .limit(1)
        .maybeSingle()

      const perfilNome = (usuarioData?.perfil_acesso as { nome?: string } | null)?.nome
      isMaster = String(perfilNome || '').toLowerCase() === 'master'
    }

    if (roleError || !isMaster) {
      throw new Error('Apenas usuários Master podem gerenciar usuários')
    }

    const body = await req.json()
    const { action, email, password, userId, perfilAcessoId, role, nome } = body

    if (action === 'create') {
      // Criar novo usuário
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

      // 2. Criar registro em vv_b_usuarios (upsert para evitar duplicidade)
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
        // Rollback: excluir usuário do auth se falhar a inserção
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
        throw new Error('Erro ao criar registro do usuário: ' + usuarioError.message)
      }

      // 3. Criar registro em vv_b_user_roles (upsert para evitar duplicidade)
      const { error: roleError2 } = await supabaseAdmin
        .from('vv_b_user_roles')
        .upsert({
          user_id: newUserId,
          role: role,
          perfil_acesso_id: perfilAcessoId,
          deleted: null
        }, { onConflict: 'user_id,role' })

      if (roleError2) {
        // Rollback: excluir registros criados
        await supabaseAdmin.from('vv_b_usuarios').delete().eq('user_id', newUserId)
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
        throw new Error('Erro ao criar role do usuário: ' + roleError2.message)
      }

      return new Response(
        JSON.stringify({ success: true, user: newUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update-password') {
      // Atualizar senha
      if (!userId || !password) {
        throw new Error('ID do usuário e nova senha são obrigatórios')
      }

      // Verificar se o usuário existe no Auth
      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)

      if (getUserError || !targetUser?.user) {
        // Usuário não existe no Auth - buscar email na tabela vv_b_usuarios e re-criar
        const { data: usuarioDb, error: dbError } = await supabaseAdmin
          .from('vv_b_usuarios')
          .select('email, nome')
          .eq('user_id', userId)
          .or('deleted.is.null,deleted.eq.')
          .single()

        if (dbError || !usuarioDb) {
          throw new Error('Usuário não encontrado no banco de dados nem no sistema de autenticação.')
        }

        // Re-criar o usuário no Auth com o mesmo ID
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

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
