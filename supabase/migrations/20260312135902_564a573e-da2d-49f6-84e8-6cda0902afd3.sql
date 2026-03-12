-- Fix the contasareceber@vidaveg.com.br user to appear as pending again
UPDATE public.vv_b_usuarios 
SET deleted = NULL, 
    data_delete = NULL, 
    usuario_delete_id = NULL, 
    ativo = false, 
    perfil_acesso_id = NULL,
    data_aprovacao = NULL,
    aprovado_por = NULL,
    updated_at = now()
WHERE email = 'contasareceber@vidaveg.com.br' AND deleted = 'X';