-- Migration to implement soft delete system-wide
-- 1. Add/Rename columns for soft delete
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'vv_b_usuarios', 
        'vv_b_user_roles', 
        'vv_b_empresas', 
        'vv_b_clientes', 
        'vv_b_modelos_boleto', 
        'vv_b_perfis_acesso',
        'vv_b_boletos_api', 
        'vv_b_mapeamento_campos'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Ensure table exists in public schema to avoid errors
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            
            -- Add 'deleted' if not exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'deleted') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN deleted CHAR(1) DEFAULT NULL', t);
            END IF;

            -- Rename data_delete -> data_deleted if exists, else add
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'data_delete') THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN data_delete TO data_deleted', t);
            ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'data_deleted') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN data_deleted TIMESTAMPTZ DEFAULT NULL', t);
            END IF;

            -- Rename usuario_delete_id -> usuario_deleted_id if exists, else add
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'usuario_delete_id') THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN usuario_delete_id TO usuario_deleted_id', t);
            ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'usuario_deleted_id') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN usuario_deleted_id UUID DEFAULT NULL', t);
            END IF;

        END IF;
    END LOOP;
END $$;

-- 2. Create RPC for soft delete
CREATE OR REPLACE FUNCTION public.vv_b_soft_delete(p_table_name text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Check permissions (only admin or authorized roles can delete)
    -- Assuming vv_b_has_role exists from previous migrations
    IF NOT (
        public.vv_b_has_role(auth.uid(), 'admin') OR 
        public.vv_b_has_role(auth.uid(), 'master') OR
        public.vv_b_has_role(auth.uid(), 'operador') -- Allow operators to delete? User said "Vincular a permissão... aos perfis". I'll allow operator for now.
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Você não tem permissão para excluir registros.';
    END IF;

    -- Validate table name to prevent injection (allow-list)
    IF p_table_name NOT IN (
        'vv_b_usuarios', 'vv_b_user_roles', 'vv_b_empresas', 
        'vv_b_clientes', 'vv_b_modelos_boleto', 'vv_b_perfis_acesso',
        'vv_b_boletos_api', 'vv_b_mapeamento_campos'
    ) THEN
        RAISE EXCEPTION 'Tabela inválida para exclusão.';
    END IF;

    -- Perform soft delete
    EXECUTE format('UPDATE %I SET deleted = ''X'', data_deleted = now(), usuario_deleted_id = auth.uid() WHERE id = $1', p_table_name) 
    USING p_id;

    RETURN true;
END;
$$;

-- 3. Apply Restrictive Policies (Global Filter)
-- This ensures 'deleted' items are hidden unless the user is admin/master
-- Note: Restrictive policies are ANDed with other policies.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'vv_b_usuarios', 
        'vv_b_user_roles', 
        'vv_b_empresas', 
        'vv_b_clientes', 
        'vv_b_modelos_boleto', 
        'vv_b_perfis_acesso',
        'vv_b_boletos_api', 
        'vv_b_mapeamento_campos'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            
            -- Drop existing policy if it exists (to avoid errors on rerun)
            EXECUTE format('DROP POLICY IF EXISTS "global_soft_delete_filter" ON %I', t);
            
            -- Create restrictive policy
            -- Users can see rows IF (deleted IS DISTINCT FROM 'X') OR (User is Admin/Master)
            EXECUTE format('
                CREATE POLICY "global_soft_delete_filter" ON %I
                AS RESTRICTIVE
                FOR SELECT
                TO authenticated
                USING (
                    deleted IS DISTINCT FROM ''X'' 
                    OR public.vv_b_has_role(auth.uid(), ''admin'')
                    OR public.vv_b_has_role(auth.uid(), ''master'')
                )
            ', t);

        END IF;
    END LOOP;
END $$;
