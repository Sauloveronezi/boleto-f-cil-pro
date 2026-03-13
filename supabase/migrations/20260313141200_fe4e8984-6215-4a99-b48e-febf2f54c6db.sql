-- Permitir que todos os usuários autenticados ativos leiam integrações de API
-- Necessário para que operadores possam gerar boletos via API
CREATE POLICY "auth_read_api_integracoes"
  ON public.vv_b_api_integracoes
  FOR SELECT
  TO authenticated
  USING (deleted IS NULL AND vv_b_user_is_active(auth.uid()));