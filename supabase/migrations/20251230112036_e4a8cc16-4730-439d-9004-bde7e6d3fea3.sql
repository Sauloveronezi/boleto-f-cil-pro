-- Corrigir políticas RLS da tabela vv_b_api_mapeamento_campos
-- As políticas atuais são RESTRICTIVE (Permissive: No), o que impede operações de soft delete

-- Remover políticas existentes
DROP POLICY IF EXISTS "allow_delete_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_insert_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_read_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_update_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;

-- Recriar políticas como PERMISSIVE (padrão)
-- Política de leitura - usuários autenticados podem ler registros não deletados
CREATE POLICY "allow_read_mapeamento_campos" 
ON public.vv_b_api_mapeamento_campos 
FOR SELECT 
TO authenticated
USING (deleted IS NULL OR deleted = '');

-- Política de inserção - usuários autenticados podem inserir
CREATE POLICY "allow_insert_mapeamento_campos" 
ON public.vv_b_api_mapeamento_campos 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política de atualização - usuários autenticados podem atualizar registros não deletados
-- E também podem fazer soft delete (atualizar para deleted = '*')
CREATE POLICY "allow_update_mapeamento_campos" 
ON public.vv_b_api_mapeamento_campos 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Política de exclusão física (não usamos, mas manter para consistência)
CREATE POLICY "allow_delete_mapeamento_campos" 
ON public.vv_b_api_mapeamento_campos 
FOR DELETE 
TO authenticated
USING (deleted IS NULL OR deleted = '');