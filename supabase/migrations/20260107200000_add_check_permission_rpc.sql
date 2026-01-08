-- Função para verificar permissões de forma granular no backend
-- Esta função será usada para garantir que as regras de acesso sejam aplicadas também no nível do banco de dados/API
-- Requisito: "Implementar verificações de acesso em: ... Backend (APIs e serviços)"

CREATE OR REPLACE FUNCTION public.vv_b_check_permission(
  p_modulo text,
  p_acao text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_permissoes jsonb;
BEGIN
  -- 1. Verificar se usuário existe e está ativo
  -- Se vv_b_has_role já verifica 'deleted', aqui verificamos 'ativo' na tabela de usuarios
  IF NOT EXISTS (
    SELECT 1 FROM vv_b_usuarios 
    WHERE user_id = v_user_id AND ativo = true AND deleted IS NULL
  ) THEN
    RETURN false;
  END IF;

  -- 2. Master e Admin têm acesso total
  -- Requisito: "Perfis Master e Administrador: ... Acesso total a todas as telas e funções"
  IF vv_b_has_role(v_user_id, 'master') OR vv_b_has_role(v_user_id, 'admin') THEN
    RETURN true;
  END IF;

  -- 3. Buscar permissões do perfil do usuário
  SELECT pa.permissoes INTO v_permissoes
  FROM vv_b_usuarios u
  JOIN vv_b_perfis_acesso pa ON u.perfil_acesso_id = pa.id
  WHERE u.user_id = v_user_id 
    AND u.ativo = true
    AND u.deleted IS NULL
    AND pa.deleted IS NULL;

  IF v_permissoes IS NULL THEN
    RETURN false;
  END IF;

  -- 4. Verificar permissão específica
  -- Estrutura do JSONB: { "modulo": { "acao": true/false } }
  -- Exemplo: p_modulo = 'clientes', p_acao = 'criar'
  
  -- Retorna true se a chave existir e for true, senão false
  RETURN COALESCE((v_permissoes -> p_modulo ->> p_acao)::boolean, false);
END;
$$;
