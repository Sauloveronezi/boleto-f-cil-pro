-- =============================================
-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- =============================================

-- ============ 1. rl_email_verification_codes ============
-- CRITICAL: Public role has ALL access to email verification codes
DROP POLICY IF EXISTS "Service role can manage email codes" ON rl_email_verification_codes;
CREATE POLICY "service_role_manage_email_codes" ON rl_email_verification_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ 2. rl_verification_codes ============
-- CRITICAL: Public role has ALL access to phone OTP codes
DROP POLICY IF EXISTS "Service role can manage verification codes" ON rl_verification_codes;
CREATE POLICY "service_role_manage_verification_codes" ON rl_verification_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ 3. rl_participants ============
-- CRITICAL: Public can read all + update any participant
DROP POLICY IF EXISTS "Anyone can read participants" ON rl_participants;
DROP POLICY IF EXISTS "Participants can update their own data" ON rl_participants;
DROP POLICY IF EXISTS "auth_read_participants" ON rl_participants;
-- Keep insert for registration but restrict read/update
CREATE POLICY "auth_read_participants" ON rl_participants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_role_read_participants" ON rl_participants
  FOR SELECT TO service_role USING (true);
CREATE POLICY "service_role_update_participants" ON rl_participants
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ============ 4. rl_admins ============
-- WARN: Admin phone numbers publicly readable
DROP POLICY IF EXISTS "Public can read rl_admins for client-side checks" ON rl_admins;
-- Keep authenticated read only
-- "Authenticated users can also read rl_admins" already exists

-- ============ 5. rl_webhook_logs ============
-- WARN: Public can insert webhook logs
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON rl_webhook_logs;
CREATE POLICY "service_role_insert_webhook_logs" ON rl_webhook_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- ============ 6. vv_b_clientes ============
-- CRITICAL: PII publicly readable via public_read_clientes
DROP POLICY IF EXISTS "public_read_clientes" ON vv_b_clientes;
-- authenticated users can already read via admin_full_clientes, operador_crud_clientes, visualizador_read_clientes

-- ============ 7. vv_b_boleto_campo_mapeamento ============
-- CRITICAL: Public INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "insert_boleto_campo_map" ON vv_b_boleto_campo_mapeamento;
DROP POLICY IF EXISTS "update_boleto_campo_map" ON vv_b_boleto_campo_mapeamento;
DROP POLICY IF EXISTS "delete_boleto_campo_map" ON vv_b_boleto_campo_mapeamento;
DROP POLICY IF EXISTS "read_boleto_campo_map" ON vv_b_boleto_campo_mapeamento;

CREATE POLICY "auth_read_boleto_campo_map" ON vv_b_boleto_campo_mapeamento
  FOR SELECT TO authenticated USING (deleted IS NULL);
CREATE POLICY "admin_insert_boleto_campo_map" ON vv_b_boleto_campo_mapeamento
  FOR INSERT TO authenticated WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_update_boleto_campo_map" ON vv_b_boleto_campo_mapeamento
  FOR UPDATE TO authenticated USING (deleted IS NULL) WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_delete_boleto_campo_map" ON vv_b_boleto_campo_mapeamento
  FOR DELETE TO authenticated USING (vv_b_is_master_or_admin(auth.uid()) AND deleted IS NULL);

-- ============ 8. vv_b_boleto_template_fields ============
-- Public INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "insert_boleto_template_fields" ON vv_b_boleto_template_fields;
DROP POLICY IF EXISTS "update_boleto_template_fields" ON vv_b_boleto_template_fields;
DROP POLICY IF EXISTS "delete_boleto_template_fields" ON vv_b_boleto_template_fields;
DROP POLICY IF EXISTS "read_boleto_template_fields" ON vv_b_boleto_template_fields;

CREATE POLICY "auth_read_template_fields" ON vv_b_boleto_template_fields
  FOR SELECT TO authenticated USING (deleted IS NULL);
CREATE POLICY "admin_insert_template_fields" ON vv_b_boleto_template_fields
  FOR INSERT TO authenticated WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_update_template_fields" ON vv_b_boleto_template_fields
  FOR UPDATE TO authenticated USING (deleted IS NULL) WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_delete_template_fields" ON vv_b_boleto_template_fields
  FOR DELETE TO authenticated USING (vv_b_is_master_or_admin(auth.uid()) AND deleted IS NULL);

-- ============ 9. vv_b_boleto_templates ============
-- Public INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "insert_boleto_templates" ON vv_b_boleto_templates;
DROP POLICY IF EXISTS "update_boleto_templates" ON vv_b_boleto_templates;
DROP POLICY IF EXISTS "delete_boleto_templates" ON vv_b_boleto_templates;
DROP POLICY IF EXISTS "read_boleto_templates" ON vv_b_boleto_templates;

CREATE POLICY "auth_read_templates" ON vv_b_boleto_templates
  FOR SELECT TO authenticated USING (deleted IS NULL);
CREATE POLICY "admin_insert_templates" ON vv_b_boleto_templates
  FOR INSERT TO authenticated WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_update_templates" ON vv_b_boleto_templates
  FOR UPDATE TO authenticated USING (deleted IS NULL) WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_delete_templates" ON vv_b_boleto_templates
  FOR DELETE TO authenticated USING (vv_b_is_master_or_admin(auth.uid()) AND deleted IS NULL);

-- ============ 10. vv_b_boletos_api_erros ============
-- Anonymous delete access
DROP POLICY IF EXISTS "allow_delete_boletos_erros" ON vv_b_boletos_api_erros;
CREATE POLICY "admin_delete_boletos_erros" ON vv_b_boletos_api_erros
  FOR DELETE TO authenticated USING (vv_b_is_master_or_admin(auth.uid()) AND deleted IS NULL);

-- Fix insert policy (WITH CHECK true → admin only)
DROP POLICY IF EXISTS "admin_insert_boletos_erros" ON vv_b_boletos_api_erros;
CREATE POLICY "admin_insert_boletos_erros" ON vv_b_boletos_api_erros
  FOR INSERT TO authenticated WITH CHECK (vv_b_is_master_or_admin(auth.uid()));
-- Also allow service_role for edge functions
CREATE POLICY "service_insert_boletos_erros" ON vv_b_boletos_api_erros
  FOR INSERT TO service_role WITH CHECK (true);

-- ============ 11. vv_b_boletos_api_config ============
-- Public role policies → authenticated
DROP POLICY IF EXISTS "read_boletos_api_config" ON vv_b_boletos_api_config;
DROP POLICY IF EXISTS "insert_boletos_api_config" ON vv_b_boletos_api_config;
DROP POLICY IF EXISTS "update_boletos_api_config" ON vv_b_boletos_api_config;
DROP POLICY IF EXISTS "delete_boletos_api_config" ON vv_b_boletos_api_config;

CREATE POLICY "auth_read_boletos_api_config" ON vv_b_boletos_api_config
  FOR SELECT TO authenticated USING (deleted IS NULL);
CREATE POLICY "admin_insert_boletos_api_config" ON vv_b_boletos_api_config
  FOR INSERT TO authenticated WITH CHECK (vv_b_is_master_or_admin(auth.uid()));
CREATE POLICY "admin_update_boletos_api_config" ON vv_b_boletos_api_config
  FOR UPDATE TO authenticated USING (vv_b_is_master_or_admin(auth.uid())) WITH CHECK (vv_b_is_master_or_admin(auth.uid()));
CREATE POLICY "admin_delete_boletos_api_config" ON vv_b_boletos_api_config
  FOR DELETE TO authenticated USING (vv_b_is_master_or_admin(auth.uid()));

-- ============ 12. vv_b_perfis_acesso ============
-- System config publicly readable
DROP POLICY IF EXISTS "public_read_perfis_acesso" ON vv_b_perfis_acesso;
CREATE POLICY "auth_read_perfis_acesso" ON vv_b_perfis_acesso
  FOR SELECT TO authenticated USING (deleted IS NULL);

-- ============ 13. Public read policies → authenticated only ============
-- vv_b_bancos
DROP POLICY IF EXISTS "public_read_bancos" ON vv_b_bancos;
CREATE POLICY "auth_read_bancos" ON vv_b_bancos
  FOR SELECT TO authenticated USING (deleted IS NULL);

-- vv_b_configuracoes_banco
DROP POLICY IF EXISTS "public_read_config_banco" ON vv_b_configuracoes_banco;
CREATE POLICY "auth_read_config_banco" ON vv_b_configuracoes_banco
  FOR SELECT TO authenticated USING (deleted IS NULL);

-- vv_b_configuracoes_cnab
DROP POLICY IF EXISTS "public_read_cnab" ON vv_b_configuracoes_cnab;
CREATE POLICY "auth_read_cnab" ON vv_b_configuracoes_cnab
  FOR SELECT TO authenticated USING (deleted IS NULL);

-- vv_b_empresas: remove public read + fix permissive authenticated policies
DROP POLICY IF EXISTS "public_read_empresas" ON vv_b_empresas;
DROP POLICY IF EXISTS "Allow authenticated insert" ON vv_b_empresas;
DROP POLICY IF EXISTS "Allow authenticated read" ON vv_b_empresas;
DROP POLICY IF EXISTS "Allow authenticated update" ON vv_b_empresas;

-- ============ 14. vv_b_linhas_cnab ============
-- Tighten authenticated WITH CHECK true
DROP POLICY IF EXISTS "allow_insert_linhas_cnab" ON vv_b_linhas_cnab;
DROP POLICY IF EXISTS "allow_update_linhas_cnab" ON vv_b_linhas_cnab;
DROP POLICY IF EXISTS "allow_delete_linhas_cnab" ON vv_b_linhas_cnab;

CREATE POLICY "admin_insert_linhas_cnab" ON vv_b_linhas_cnab
  FOR INSERT TO authenticated WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_update_linhas_cnab" ON vv_b_linhas_cnab
  FOR UPDATE TO authenticated USING (true) WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_delete_linhas_cnab" ON vv_b_linhas_cnab
  FOR DELETE TO authenticated USING (vv_b_is_master_or_admin(auth.uid()));

-- ============ 15. vv_b_arquivos_cnab_lidos ============
-- Tighten WITH CHECK true
DROP POLICY IF EXISTS "allow_insert_arquivos_cnab" ON vv_b_arquivos_cnab_lidos;
DROP POLICY IF EXISTS "allow_update_arquivos_cnab" ON vv_b_arquivos_cnab_lidos;
DROP POLICY IF EXISTS "allow_delete_arquivos_cnab" ON vv_b_arquivos_cnab_lidos;

CREATE POLICY "admin_insert_arquivos_cnab" ON vv_b_arquivos_cnab_lidos
  FOR INSERT TO authenticated WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_update_arquivos_cnab" ON vv_b_arquivos_cnab_lidos
  FOR UPDATE TO authenticated USING (deleted IS NULL) WITH CHECK (vv_b_is_master_or_admin(auth.uid()) OR vv_b_has_role(auth.uid(), 'operador'::vv_b_perfil_usuario));
CREATE POLICY "admin_delete_arquivos_cnab" ON vv_b_arquivos_cnab_lidos
  FOR DELETE TO authenticated USING (vv_b_is_master_or_admin(auth.uid()) AND deleted IS NULL);

-- ============ 16. Contato ============
-- Fix WITH CHECK true on insert
DROP POLICY IF EXISTS "admin_insert_contato" ON "Contato";
CREATE POLICY "admin_insert_contato" ON "Contato"
  FOR INSERT TO authenticated WITH CHECK (vv_b_is_master_or_admin(auth.uid()));

-- ============ 17. Fix functions with mutable search_path ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Fix vv_b_soft_delete search_path
CREATE OR REPLACE FUNCTION public.vv_b_soft_delete(p_table_name text, p_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    
    IF NOT (
        public.vv_b_has_role(v_user_id, 'admin'::public.vv_b_perfil_usuario) OR 
        public.vv_b_has_role(v_user_id, 'master'::public.vv_b_perfil_usuario) OR
        public.vv_b_has_role(v_user_id, 'operador'::public.vv_b_perfil_usuario)
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Você não tem permissão para excluir registros.';
    END IF;

    IF p_table_name NOT IN (
        'vv_b_usuarios', 'vv_b_user_roles', 'vv_b_empresas', 
        'vv_b_clientes', 'vv_b_modelos_boleto', 'vv_b_perfis_acesso',
        'vv_b_api_integracoes', 'vv_b_boletos_api', 'vv_b_api_mapeamento_campos'
    ) THEN
        RAISE EXCEPTION 'Tabela inválida para exclusão: %', p_table_name;
    END IF;

    EXECUTE format('UPDATE %I SET deleted = ''X'', data_delete = now(), usuario_delete_id = $2 WHERE id = $1', p_table_name) 
    USING p_id, v_user_id;

    BEGIN
        INSERT INTO vv_b_audit_log (table_name, record_id, action, user_id)
        VALUES (p_table_name, p_id, 'SOFT_DELETE', v_user_id);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN true;
END;
$function$;

-- ============ 18. Service role policies for Edge Functions ============
-- sync-api-boletos and test-api-connection need service_role access
CREATE POLICY "service_read_api_integracoes" ON vv_b_api_integracoes
  FOR SELECT TO service_role USING (true);

CREATE POLICY "service_insert_boletos_api" ON vv_b_boletos_api
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_update_boletos_api" ON vv_b_boletos_api
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_insert_sync_log" ON vv_b_api_sync_log
  FOR INSERT TO service_role WITH CHECK (true);