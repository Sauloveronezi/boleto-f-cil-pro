-- Adicionar política de leitura pública para clientes (usuários com role conseguem ver)
-- Note: public_read exige deleted IS NULL para segurança

CREATE POLICY "public_read_clientes" 
ON public.vv_b_clientes 
FOR SELECT 
USING (deleted IS NULL);

-- Adicionar política de leitura pública para notas fiscais
CREATE POLICY "public_read_notas" 
ON public.vv_b_notas_fiscais 
FOR SELECT 
USING (deleted IS NULL);

-- Adicionar política de leitura pública para configurações de banco
CREATE POLICY "public_read_config_banco" 
ON public.vv_b_configuracoes_banco 
FOR SELECT 
USING (deleted IS NULL);

-- Adicionar política de leitura pública para configurações CNAB
CREATE POLICY "public_read_cnab" 
ON public.vv_b_configuracoes_cnab 
FOR SELECT 
USING (deleted IS NULL);

-- Adicionar política de leitura pública para empresas
CREATE POLICY "public_read_empresas" 
ON public.vv_b_empresas 
FOR SELECT 
USING (deleted IS NULL);

-- Adicionar política de leitura pública para templates PDF
CREATE POLICY "public_read_templates" 
ON public.vv_b_templates_pdf 
FOR SELECT 
USING (deleted IS NULL);