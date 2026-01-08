-- Recreate the function to ensure it exists and matches the expected signature
-- This addresses the "Could not find the function public.vv_b_soft_delete(p_id, p_table_name)" error
-- Note: The error message listing (p_id, p_table_name) implies the client might be sending them in that order
-- or simply listing named parameters. We define it as (p_table_name, p_id) which is standard.

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

    -- Log Success (best effort, ignore if fails)
    BEGIN
        INSERT INTO vv_b_audit_log (table_name, record_id, action, user_id)
        VALUES (p_table_name, p_id, 'SOFT_DELETE', v_user_id);
    EXCEPTION WHEN OTHERS THEN
        -- Ignore audit log errors to ensure delete succeeds
        NULL;
    END;

    RETURN true;
END;
$$;
