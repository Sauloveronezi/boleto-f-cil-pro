-- 1. Inserir roles faltantes para usuários que têm perfil mas não têm role
INSERT INTO vv_b_user_roles (user_id, role, perfil_acesso_id)
VALUES 
  ('9bfb5af4-80ec-45be-a852-04c39a638319', 'operador', '8228d3fc-829a-4a16-b344-09e5608317fc'),
  ('04ff01b9-01df-4bb4-8f78-8fad7f076248', 'operador', '8228d3fc-829a-4a16-b344-09e5608317fc'),
  ('ab0f4dd1-df7e-462c-aea5-9dc52690b971', 'operador', '8228d3fc-829a-4a16-b344-09e5608317fc'),
  ('cc830073-ea73-45a4-9b3b-068513fe3553', 'admin', '22bf562d-ecaf-42c4-bb92-f6b42157460b'),
  ('622199bf-2d9a-47d2-968a-af90f1eecf53', 'admin', '22bf562d-ecaf-42c4-bb92-f6b42157460b')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Adicionar policy de leitura universal para vv_b_empresas
-- Todos os usuários autenticados ativos devem poder ler dados da empresa (beneficiário)
CREATE POLICY "auth_read_empresas"
  ON public.vv_b_empresas
  FOR SELECT
  TO authenticated
  USING (deleted IS NULL AND vv_b_user_is_active(auth.uid()));

-- 3. Garantir que a função de aprovação insira a role automaticamente (já faz)
-- Atualizar a trigger para também criar a role ao aprovar
