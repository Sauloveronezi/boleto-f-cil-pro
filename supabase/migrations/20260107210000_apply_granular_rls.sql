-- Migration to apply granular RLS policies using vv_b_check_permission RPC
-- Ensures backend enforces the specific permissions defined in profiles

-- =============================================================================
-- Helper to drop all policies on a table
-- =============================================================================
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'vv_b_clientes', 
            'vv_b_bancos', 
            'vv_b_configuracoes_banco',
            'vv_b_notas_fiscais',
            'vv_b_boletos_gerados',
            'vv_b_modelos_boleto',
            'vv_b_api_integracoes',
            'vv_b_api_mapeamento_campos',
            'vv_b_empresas'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "allow_read_%I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_insert_%I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_update_%I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_delete_%I" ON public.%I', t, t);
        
        -- Drop other common naming patterns found in previous migrations
        EXECUTE format('DROP POLICY IF EXISTS "public_read_%I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "admin_full_%I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "operador_crud_%I" ON public.%I', t, t);
    END LOOP;
END $$;

-- =============================================================================
-- 1. CLIENTES (Modulo: clientes)
-- =============================================================================
ALTER TABLE public.vv_b_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_clientes_select" ON public.vv_b_clientes
FOR SELECT TO authenticated
USING (vv_b_check_permission('clientes', 'visualizar') AND (deleted IS NULL OR deleted = ''));

CREATE POLICY "policy_clientes_insert" ON public.vv_b_clientes
FOR INSERT TO authenticated
WITH CHECK (vv_b_check_permission('clientes', 'criar'));

CREATE POLICY "policy_clientes_update" ON public.vv_b_clientes
FOR UPDATE TO authenticated
USING (vv_b_check_permission('clientes', 'editar'))
WITH CHECK (vv_b_check_permission('clientes', 'editar'));

CREATE POLICY "policy_clientes_delete" ON public.vv_b_clientes
FOR DELETE TO authenticated
USING (vv_b_check_permission('clientes', 'excluir'));

-- =============================================================================
-- 2. BANCOS & CONFIG (Modulo: bancos)
-- =============================================================================
ALTER TABLE public.vv_b_bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vv_b_configuracoes_banco ENABLE ROW LEVEL SECURITY;

-- Bancos
CREATE POLICY "policy_bancos_select" ON public.vv_b_bancos
FOR SELECT TO authenticated
USING (vv_b_check_permission('bancos', 'visualizar') AND (deleted IS NULL OR deleted = ''));

CREATE POLICY "policy_bancos_insert" ON public.vv_b_bancos
FOR INSERT TO authenticated
WITH CHECK (vv_b_check_permission('bancos', 'criar'));

CREATE POLICY "policy_bancos_update" ON public.vv_b_bancos
FOR UPDATE TO authenticated
USING (vv_b_check_permission('bancos', 'editar'))
WITH CHECK (vv_b_check_permission('bancos', 'editar'));

CREATE POLICY "policy_bancos_delete" ON public.vv_b_bancos
FOR DELETE TO authenticated
USING (vv_b_check_permission('bancos', 'excluir'));

-- Configurações Banco
CREATE POLICY "policy_config_banco_select" ON public.vv_b_configuracoes_banco
FOR SELECT TO authenticated
USING (vv_b_check_permission('bancos', 'visualizar') AND (deleted IS NULL OR deleted = ''));

CREATE POLICY "policy_config_banco_insert" ON public.vv_b_configuracoes_banco
FOR INSERT TO authenticated
WITH CHECK (vv_b_check_permission('bancos', 'criar'));

CREATE POLICY "policy_config_banco_update" ON public.vv_b_configuracoes_banco
FOR UPDATE TO authenticated
USING (vv_b_check_permission('bancos', 'editar'))
WITH CHECK (vv_b_check_permission('bancos', 'editar'));

CREATE POLICY "policy_config_banco_delete" ON public.vv_b_configuracoes_banco
FOR DELETE TO authenticated
USING (vv_b_check_permission('bancos', 'excluir'));

-- =============================================================================
-- 3. NOTAS FISCAIS (Modulo: notas)
-- =============================================================================
ALTER TABLE public.vv_b_notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_notas_select" ON public.vv_b_notas_fiscais
FOR SELECT TO authenticated
USING (vv_b_check_permission('notas', 'visualizar') AND (deleted IS NULL OR deleted = ''));

CREATE POLICY "policy_notas_insert" ON public.vv_b_notas_fiscais
FOR INSERT TO authenticated
WITH CHECK (vv_b_check_permission('notas', 'criar'));

CREATE POLICY "policy_notas_update" ON public.vv_b_notas_fiscais
FOR UPDATE TO authenticated
USING (vv_b_check_permission('notas', 'editar'))
WITH CHECK (vv_b_check_permission('notas', 'editar'));

CREATE POLICY "policy_notas_delete" ON public.vv_b_notas_fiscais
FOR DELETE TO authenticated
USING (vv_b_check_permission('notas', 'excluir'));

-- =============================================================================
-- 4. BOLETOS GERADOS (Modulo: boletos)
-- =============================================================================
ALTER TABLE public.vv_b_boletos_gerados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_boletos_select" ON public.vv_b_boletos_gerados
FOR SELECT TO authenticated
USING (vv_b_check_permission('boletos', 'visualizar') AND (deleted IS NULL OR deleted = ''));

CREATE POLICY "policy_boletos_insert" ON public.vv_b_boletos_gerados
FOR INSERT TO authenticated
WITH CHECK (vv_b_check_permission('boletos', 'criar'));

CREATE POLICY "policy_boletos_update" ON public.vv_b_boletos_gerados
FOR UPDATE TO authenticated
USING (vv_b_check_permission('boletos', 'editar'))
WITH CHECK (vv_b_check_permission('boletos', 'editar'));

CREATE POLICY "policy_boletos_delete" ON public.vv_b_boletos_gerados
FOR DELETE TO authenticated
USING (vv_b_check_permission('boletos', 'excluir'));

-- =============================================================================
-- 5. MODELOS BOLETO (Modulo: modelos)
-- =============================================================================
ALTER TABLE public.vv_b_modelos_boleto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_modelos_select" ON public.vv_b_modelos_boleto
FOR SELECT TO authenticated
USING (vv_b_check_permission('modelos', 'visualizar') AND (deleted IS NULL OR deleted = ''));

CREATE POLICY "policy_modelos_insert" ON public.vv_b_modelos_boleto
FOR INSERT TO authenticated
WITH CHECK (vv_b_check_permission('modelos', 'criar'));

CREATE POLICY "policy_modelos_update" ON public.vv_b_modelos_boleto
FOR UPDATE TO authenticated
USING (vv_b_check_permission('modelos', 'editar'))
WITH CHECK (vv_b_check_permission('modelos', 'editar'));

CREATE POLICY "policy_modelos_delete" ON public.vv_b_modelos_boleto
FOR DELETE TO authenticated
USING (vv_b_check_permission('modelos', 'excluir'));

-- =============================================================================
-- 6. INTEGRAÇÕES (Modulo: integracoes)
-- =============================================================================
ALTER TABLE public.vv_b_api_integracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vv_b_api_mapeamento_campos ENABLE ROW LEVEL SECURITY;

-- Integracoes
CREATE POLICY "policy_integracoes_select" ON public.vv_b_api_integracoes
FOR SELECT TO authenticated
USING (vv_b_check_permission('integracoes', 'visualizar') AND (deleted IS NULL OR deleted = ''));

CREATE POLICY "policy_integracoes_insert" ON public.vv_b_api_integracoes
FOR INSERT TO authenticated
WITH CHECK (vv_b_check_permission('integracoes', 'criar'));

CREATE POLICY "policy_integracoes_update" ON public.vv_b_api_integracoes
FOR UPDATE TO authenticated
USING (vv_b_check_permission('integracoes', 'editar'))
WITH CHECK (vv_b_check_permission('integracoes', 'editar'));

CREATE POLICY "policy_integracoes_delete" ON public.vv_b_api_integracoes
FOR DELETE TO authenticated
USING (vv_b_check_permission('integracoes', 'excluir'));

-- Mapeamento
CREATE POLICY "policy_mapeamento_select" ON public.vv_b_api_mapeamento_campos
FOR SELECT TO authenticated
USING (vv_b_check_permission('integracoes', 'visualizar') AND (deleted IS NULL OR deleted = ''));

CREATE POLICY "policy_mapeamento_insert" ON public.vv_b_api_mapeamento_campos
FOR INSERT TO authenticated
WITH CHECK (vv_b_check_permission('integracoes', 'criar'));

CREATE POLICY "policy_mapeamento_update" ON public.vv_b_api_mapeamento_campos
FOR UPDATE TO authenticated
USING (vv_b_check_permission('integracoes', 'editar'))
WITH CHECK (vv_b_check_permission('integracoes', 'editar'));

CREATE POLICY "policy_mapeamento_delete" ON public.vv_b_api_mapeamento_campos
FOR DELETE TO authenticated
USING (vv_b_check_permission('integracoes', 'excluir'));

-- =============================================================================
-- 7. EMPRESAS (Modulo: configuracoes)
-- =============================================================================
ALTER TABLE public.vv_b_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_empresas_select" ON public.vv_b_empresas
FOR SELECT TO authenticated
USING (vv_b_check_permission('configuracoes', 'visualizar') AND (deleted IS NULL OR deleted = ''));

CREATE POLICY "policy_empresas_insert" ON public.vv_b_empresas
FOR INSERT TO authenticated
WITH CHECK (vv_b_check_permission('configuracoes', 'criar'));

CREATE POLICY "policy_empresas_update" ON public.vv_b_empresas
FOR UPDATE TO authenticated
USING (vv_b_check_permission('configuracoes', 'editar'))
WITH CHECK (vv_b_check_permission('configuracoes', 'editar'));

CREATE POLICY "policy_empresas_delete" ON public.vv_b_empresas
FOR DELETE TO authenticated
USING (vv_b_check_permission('configuracoes', 'excluir'));
