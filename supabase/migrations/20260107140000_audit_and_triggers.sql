-- Migration for Audit Log and Integrity Triggers

-- 1. Create Audit Log Table
CREATE TABLE IF NOT EXISTS vv_b_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'SOFT_DELETE', 'RESTORE', etc.
    user_id UUID REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ DEFAULT now(),
    details JSONB
);

-- 2. Update RPC to log actions
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
        public.vv_b_has_role(v_user_id, 'admin') OR 
        public.vv_b_has_role(v_user_id, 'master') OR
        public.vv_b_has_role(v_user_id, 'operador')
    ) THEN
        -- We try to log the failure, but if transaction fails, this log might be lost.
        -- In a real scenario, we might just raise exception.
        RAISE EXCEPTION 'Acesso negado: Você não tem permissão para excluir registros.';
    END IF;

    -- Validate table
    IF p_table_name NOT IN (
        'vv_b_usuarios', 'vv_b_user_roles', 'vv_b_empresas', 
        'vv_b_clientes', 'vv_b_modelos_boleto', 'vv_b_perfis_acesso',
        'vv_b_api_integracoes', 'vv_b_boletos_api', 'vv_b_mapeamento_campos'
    ) THEN
         RAISE EXCEPTION 'Tabela inválida para exclusão.';
    END IF;

    -- Update
    EXECUTE format('UPDATE %I SET deleted = ''X'', data_deleted = now(), usuario_deleted_id = $2 WHERE id = $1', p_table_name) 
    USING p_id, v_user_id;

    -- Log Success
    INSERT INTO vv_b_audit_log (table_name, record_id, action, user_id)
    VALUES (p_table_name, p_id, 'SOFT_DELETE', v_user_id);

    RETURN true;
END;
$$;

-- 3. Trigger for System Profiles Integrity
CREATE OR REPLACE FUNCTION vv_b_protect_system_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if it is a system record being soft-deleted
    IF OLD.sistema = true AND NEW.deleted = 'X' THEN
        RAISE EXCEPTION 'Não é permitido excluir registros de sistema.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_system_delete ON vv_b_perfis_acesso;
CREATE TRIGGER check_system_delete
    BEFORE UPDATE OF deleted ON vv_b_perfis_acesso
    FOR EACH ROW
    EXECUTE FUNCTION vv_b_protect_system_records();
