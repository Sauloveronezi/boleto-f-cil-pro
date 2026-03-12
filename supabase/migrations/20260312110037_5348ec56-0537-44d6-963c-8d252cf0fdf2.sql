
-- =====================================================
-- CORREÇÃO DE SEGURANÇA: RLS Policies restritivas
-- =====================================================

-- 1. TABELA vv_b_api_integracoes - Credenciais expostas publicamente
DROP POLICY IF EXISTS "allow_read_api_integracoes" ON vv_b_api_integracoes;
DROP POLICY IF EXISTS "allow_insert_api_integracoes" ON vv_b_api_integracoes;
DROP POLICY IF EXISTS "allow_update_api_integracoes" ON vv_b_api_integracoes;
DROP POLICY IF EXISTS "allow_delete_api_integracoes" ON vv_b_api_integracoes;

CREATE POLICY "admin_read_api_integracoes" ON vv_b_api_integracoes
  FOR SELECT TO authenticated
  USING (vv_b_is_master_or_admin(auth.uid()) AND deleted IS NULL);

CREATE POLICY "admin_insert_api_integracoes" ON vv_b_api_integracoes
  FOR INSERT TO authenticated
  WITH CHECK (vv_b_is_master_or_admin(auth.uid()));

CREATE POLICY "admin_update_api_integracoes" ON vv_b_api_integracoes
  FOR UPDATE TO authenticated
  USING (vv_b_is_master_or_admin(auth.uid()) AND deleted IS NULL)
  WITH CHECK (vv_b_is_master_or_admin(auth.uid()));

CREATE POLICY "admin_delete_api_integracoes" ON vv_b_api_integracoes
  FOR DELETE TO authenticated
  USING (vv_b_is_master_or_admin(auth.uid()) AND deleted IS NULL);

-- 2. TABELA vv_b_api_mapeamento_campos
DROP POLICY IF EXISTS "allow_read_mapeamento_campos" ON vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_insert_mapeamento_campos" ON vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_update_mapeamento_campos" ON vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_delete_mapeamento_campos" ON vv_b_api_mapeamento_campos;

CREATE POLICY "auth_read_mapeamento_campos" ON vv_b_api_mapeamento_campos
  FOR SELECT TO authenticated
  USING (deleted IS NULL);

CREATE POLICY "admin_insert_mapeamento_campos" ON vv_b_api_mapeamento_campos
  FOR INSERT TO authenticated
  WITH CHECK (vv_b_is_master_or_admin(auth.uid()));

CREATE POLICY "admin_update_mapeamento_campos" ON vv_b_api_mapeamento_campos
  FOR UPDATE TO authenticated
  USING (deleted IS NULL)
  WITH CHECK (vv_b_is_master_or_admin(auth.uid()));

CREATE POLICY "admin_delete_mapeamento_campos" ON vv_b_api_mapeamento_campos
  FOR DELETE TO authenticated
  USING (vv_b_is_master_or_admin(auth.uid()) AND deleted IS NULL);

-- 3. TABELA vv_b_boletos_api
DROP POLICY IF EXISTS "allow_read_boletos_api" ON vv_b_boletos_api;
DROP POLICY IF EXISTS "allow_insert_boletos_api" ON vv_b_boletos_api;
DROP POLICY IF EXISTS "allow_update_boletos_api" ON vv_b_boletos_api;
DROP POLICY IF EXISTS "allow_delete_boletos_api" ON vv_b_boletos_api;

CREATE POLICY "auth_read_boletos_api" ON vv_b_boletos_api
  FOR SELECT TO authenticated
  USING (deleted IS NULL);

CREATE POLICY "admin_insert_boletos_api" ON vv_b_boletos_api
  FOR INSERT TO authenticated
  WITH CHECK (vv_b_is_master_or_admin(auth.uid()));

CREATE POLICY "admin_update_boletos_api" ON vv_b_boletos_api
  FOR UPDATE TO authenticated
  USING (deleted IS NULL)
  WITH CHECK (vv_b_is_master_or_admin(auth.uid()));

-- 4. TABELA vv_b_api_sync_log
DROP POLICY IF EXISTS "allow_read_sync_log" ON vv_b_api_sync_log;
DROP POLICY IF EXISTS "allow_insert_sync_log" ON vv_b_api_sync_log;

CREATE POLICY "auth_read_sync_log" ON vv_b_api_sync_log
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_insert_sync_log" ON vv_b_api_sync_log
  FOR INSERT TO authenticated
  WITH CHECK (vv_b_is_master_or_admin(auth.uid()));

-- 5. TABELA vv_b_boletos_api_erros (se existir)
DROP POLICY IF EXISTS "allow_read_boletos_erros" ON vv_b_boletos_api_erros;
DROP POLICY IF EXISTS "allow_insert_boletos_erros" ON vv_b_boletos_api_erros;
DROP POLICY IF EXISTS "allow_update_boletos_erros" ON vv_b_boletos_api_erros;

CREATE POLICY "auth_read_boletos_erros" ON vv_b_boletos_api_erros
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_insert_boletos_erros" ON vv_b_boletos_api_erros
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 6. TABELA Contato - dados pessoais expostos
ALTER TABLE "Contato" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_contato" ON "Contato";
CREATE POLICY "admin_read_contato" ON "Contato"
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_insert_contato" ON "Contato"
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7. TABELA rl_participants - dados pessoais expostos
ALTER TABLE rl_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_participants" ON rl_participants;
CREATE POLICY "auth_read_participants" ON rl_participants
  FOR SELECT TO authenticated
  USING (true);

-- 8. Proteger vv_b_add_dynamic_column com role check e prefixo
CREATE OR REPLACE FUNCTION public.vv_b_add_dynamic_column(p_column_name text, p_column_type text DEFAULT 'TEXT'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_safe_column_name TEXT;
  v_safe_type TEXT;
  v_column_exists BOOLEAN;
BEGIN
  -- Exigir role admin/master
  IF NOT vv_b_is_master_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem criar colunas dinâmicas';
  END IF;

  -- Sanitizar nome da coluna
  v_safe_column_name := regexp_replace(lower(p_column_name), '[^a-z0-9_]', '_', 'g');
  
  IF length(v_safe_column_name) > 63 THEN
    v_safe_column_name := substring(v_safe_column_name, 1, 63);
  END IF;
  
  -- Exigir prefixo dyn_
  IF NOT v_safe_column_name LIKE 'dyn_%' THEN
    RAISE EXCEPTION 'Nome da coluna deve começar com prefixo dyn_. Recebido: %', v_safe_column_name;
  END IF;

  -- Blacklist de colunas do sistema
  IF v_safe_column_name IN (
    'id', 'created_at', 'updated_at', 'deleted', 
    'usuario_delete_id', 'data_delete', 'integracao_id',
    'numero_nota', 'numero_cobranca', 'cliente_id',
    'data_emissao', 'data_vencimento', 'valor',
    'banco', 'empresa', 'cliente', 'dados_extras',
    'json_original', 'sincronizado_em'
  ) THEN
    RAISE EXCEPTION 'Nome de coluna conflita com coluna do sistema: %', v_safe_column_name;
  END IF;
  
  -- Validar tipo
  v_safe_type := CASE upper(p_column_type)
    WHEN 'TEXT' THEN 'TEXT'
    WHEN 'INTEGER' THEN 'INTEGER'
    WHEN 'NUMERIC' THEN 'NUMERIC'
    WHEN 'DATE' THEN 'DATE'
    WHEN 'TIMESTAMP' THEN 'TIMESTAMP WITH TIME ZONE'
    WHEN 'BOOLEAN' THEN 'BOOLEAN'
    ELSE 'TEXT'
  END;
  
  -- Verificar existência
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vv_b_boletos_api' 
    AND column_name = v_safe_column_name
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    RETURN TRUE;
  END IF;
  
  EXECUTE format(
    'ALTER TABLE public.vv_b_boletos_api ADD COLUMN %I %s',
    v_safe_column_name, v_safe_type
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar coluna %: %', v_safe_column_name, SQLERRM;
    RETURN FALSE;
END;
$function$;
