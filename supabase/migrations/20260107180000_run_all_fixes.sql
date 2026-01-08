-- COMBINED FIX SCRIPT
-- This script includes:
-- 1. Creation of vv_b_soft_delete RPC function
-- 2. RLS Policy updates for vv_b_api_mapeamento_campos
-- 3. RLS Policy updates for vv_b_api_integracoes and vv_b_boletos_api

BEGIN;

--------------------------------------------------------------------------------
-- 1. Create RPC Function
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vv_b_soft_delete(p_table_name text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    
    -- Check permissions
    IF NOT (
        public.vv_b_has_role(v_user_id, 'admin'::public.vv_b_perfil_usuario) OR 
        public.vv_b_has_role(v_user_id, 'master'::public.vv_b_perfil_usuario) OR
        public.vv_b_has_role(v_user_id, 'operador'::public.vv_b_perfil_usuario)
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Você não tem permissão para excluir registros.';
    END IF;

    -- Validate table name (allow-list)
    IF p_table_name NOT IN (
        'vv_b_usuarios', 'vv_b_user_roles', 'vv_b_empresas', 
        'vv_b_clientes', 'vv_b_modelos_boleto', 'vv_b_perfis_acesso',
        'vv_b_api_integracoes', 'vv_b_boletos_api', 'vv_b_api_mapeamento_campos'
    ) THEN
        RAISE EXCEPTION 'Tabela inválida para exclusão: %', p_table_name;
    END IF;

    -- Update
    EXECUTE format('UPDATE %I SET deleted = ''X'', data_delete = now(), usuario_delete_id = $2 WHERE id = $1', p_table_name) 
    USING p_id, v_user_id;

    -- Log Success (best effort)
    BEGIN
        INSERT INTO vv_b_audit_log (table_name, record_id, action, user_id)
        VALUES (p_table_name, p_id, 'SOFT_DELETE', v_user_id);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN true;
END;
$$;

--------------------------------------------------------------------------------
-- 2. Fix RLS for vv_b_api_mapeamento_campos
--------------------------------------------------------------------------------
ALTER TABLE public.vv_b_api_mapeamento_campos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_insert_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_update_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_delete_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;

CREATE POLICY "allow_read_mapeamento_campos" ON public.vv_b_api_mapeamento_campos 
FOR SELECT TO authenticated USING (deleted IS NULL);

CREATE POLICY "allow_insert_mapeamento_campos" ON public.vv_b_api_mapeamento_campos 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "allow_update_mapeamento_campos" ON public.vv_b_api_mapeamento_campos 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete_mapeamento_campos" ON public.vv_b_api_mapeamento_campos 
FOR DELETE TO authenticated USING (true);

--------------------------------------------------------------------------------
-- 3. Fix RLS for vv_b_api_integracoes and vv_b_boletos_api
--------------------------------------------------------------------------------
-- Integracoes
ALTER TABLE public.vv_b_api_integracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_api_integracoes" ON public.vv_b_api_integracoes;
DROP POLICY IF EXISTS "admin_full_api_integracoes" ON public.vv_b_api_integracoes;
DROP POLICY IF EXISTS "operador_crud_api_integracoes" ON public.vv_b_api_integracoes;
DROP POLICY IF EXISTS "allow_read_api_integracoes" ON public.vv_b_api_integracoes;
DROP POLICY IF EXISTS "allow_insert_api_integracoes" ON public.vv_b_api_integracoes;
DROP POLICY IF EXISTS "allow_update_api_integracoes" ON public.vv_b_api_integracoes;
DROP POLICY IF EXISTS "allow_delete_api_integracoes" ON public.vv_b_api_integracoes;

CREATE POLICY "allow_read_api_integracoes" ON public.vv_b_api_integracoes 
FOR SELECT TO authenticated USING (deleted IS NULL);

CREATE POLICY "allow_insert_api_integracoes" ON public.vv_b_api_integracoes 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "allow_update_api_integracoes" ON public.vv_b_api_integracoes 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete_api_integracoes" ON public.vv_b_api_integracoes 
FOR DELETE TO authenticated USING (true);

-- Boletos API
ALTER TABLE public.vv_b_boletos_api ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_boletos_api" ON public.vv_b_boletos_api;
DROP POLICY IF EXISTS "admin_full_boletos_api" ON public.vv_b_boletos_api;
DROP POLICY IF EXISTS "operador_crud_boletos_api" ON public.vv_b_boletos_api;
DROP POLICY IF EXISTS "allow_read_boletos_api" ON public.vv_b_boletos_api;
DROP POLICY IF EXISTS "allow_insert_boletos_api" ON public.vv_b_boletos_api;
DROP POLICY IF EXISTS "allow_update_boletos_api" ON public.vv_b_boletos_api;
DROP POLICY IF EXISTS "allow_delete_boletos_api" ON public.vv_b_boletos_api;

CREATE POLICY "allow_read_boletos_api" ON public.vv_b_boletos_api 
FOR SELECT TO authenticated USING (deleted IS NULL);

CREATE POLICY "allow_insert_boletos_api" ON public.vv_b_boletos_api 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "allow_update_boletos_api" ON public.vv_b_boletos_api 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete_boletos_api" ON public.vv_b_boletos_api 
FOR DELETE TO authenticated USING (true);

COMMIT;
