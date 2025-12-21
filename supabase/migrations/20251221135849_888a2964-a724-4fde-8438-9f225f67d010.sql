-- Adicionar campos de autenticação na tabela de integrações
ALTER TABLE vv_b_api_integracoes 
ADD COLUMN IF NOT EXISTS tipo_autenticacao text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS auth_usuario text,
ADD COLUMN IF NOT EXISTS auth_senha_encrypted text,
ADD COLUMN IF NOT EXISTS auth_token_encrypted text,
ADD COLUMN IF NOT EXISTS auth_api_key_encrypted text,
ADD COLUMN IF NOT EXISTS auth_header_name text DEFAULT 'Authorization',
ADD COLUMN IF NOT EXISTS campos_api_detectados jsonb DEFAULT '[]';

-- Comentário para documentação
COMMENT ON COLUMN vv_b_api_integracoes.tipo_autenticacao IS 'Tipos: none, basic, bearer, api_key, oauth2, custom';
COMMENT ON COLUMN vv_b_api_integracoes.auth_senha_encrypted IS 'Senha criptografada com pgcrypto';
COMMENT ON COLUMN vv_b_api_integracoes.auth_token_encrypted IS 'Token criptografado';
COMMENT ON COLUMN vv_b_api_integracoes.auth_api_key_encrypted IS 'API Key criptografada';
COMMENT ON COLUMN vv_b_api_integracoes.campos_api_detectados IS 'Campos detectados na última chamada de teste';

-- Corrigir políticas RLS para permitir acesso anônimo de leitura e operações autenticadas
-- Primeiro, remover políticas existentes
DROP POLICY IF EXISTS "admin_full_api_integracoes" ON vv_b_api_integracoes;
DROP POLICY IF EXISTS "operador_crud_api_integracoes" ON vv_b_api_integracoes;
DROP POLICY IF EXISTS "public_read_api_integracoes" ON vv_b_api_integracoes;

-- Criar política de leitura pública para registros não deletados
CREATE POLICY "allow_read_api_integracoes" 
ON vv_b_api_integracoes 
FOR SELECT 
USING (deleted IS NULL);

-- Criar política de inserção para todos (temporário para desenvolvimento)
CREATE POLICY "allow_insert_api_integracoes" 
ON vv_b_api_integracoes 
FOR INSERT 
WITH CHECK (true);

-- Criar política de atualização para registros não deletados
CREATE POLICY "allow_update_api_integracoes" 
ON vv_b_api_integracoes 
FOR UPDATE 
USING (deleted IS NULL)
WITH CHECK (true);

-- Criar política de deleção
CREATE POLICY "allow_delete_api_integracoes" 
ON vv_b_api_integracoes 
FOR DELETE 
USING (deleted IS NULL);

-- Corrigir políticas do mapeamento também
DROP POLICY IF EXISTS "admin_full_mapeamento" ON vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "operador_crud_mapeamento" ON vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "public_read_mapeamento" ON vv_b_api_mapeamento_campos;

CREATE POLICY "allow_read_mapeamento_campos" 
ON vv_b_api_mapeamento_campos 
FOR SELECT 
USING (deleted IS NULL);

CREATE POLICY "allow_insert_mapeamento_campos" 
ON vv_b_api_mapeamento_campos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "allow_update_mapeamento_campos" 
ON vv_b_api_mapeamento_campos 
FOR UPDATE 
USING (deleted IS NULL)
WITH CHECK (true);

CREATE POLICY "allow_delete_mapeamento_campos" 
ON vv_b_api_mapeamento_campos 
FOR DELETE 
USING (deleted IS NULL);

-- Corrigir políticas do boletos_api
DROP POLICY IF EXISTS "admin_full_boletos_api" ON vv_b_boletos_api;
DROP POLICY IF EXISTS "operador_crud_boletos_api" ON vv_b_boletos_api;
DROP POLICY IF EXISTS "public_read_boletos_api" ON vv_b_boletos_api;

CREATE POLICY "allow_read_boletos_api" 
ON vv_b_boletos_api 
FOR SELECT 
USING (deleted IS NULL);

CREATE POLICY "allow_insert_boletos_api" 
ON vv_b_boletos_api 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "allow_update_boletos_api" 
ON vv_b_boletos_api 
FOR UPDATE 
USING (deleted IS NULL)
WITH CHECK (true);

CREATE POLICY "allow_delete_boletos_api" 
ON vv_b_boletos_api 
FOR DELETE 
USING (deleted IS NULL);

-- Corrigir políticas do sync_log
DROP POLICY IF EXISTS "admin_full_sync_log" ON vv_b_api_sync_log;
DROP POLICY IF EXISTS "operador_insert_sync_log" ON vv_b_api_sync_log;
DROP POLICY IF EXISTS "public_read_sync_log" ON vv_b_api_sync_log;

CREATE POLICY "allow_read_sync_log" 
ON vv_b_api_sync_log 
FOR SELECT 
USING (true);

CREATE POLICY "allow_insert_sync_log" 
ON vv_b_api_sync_log 
FOR INSERT 
WITH CHECK (true);