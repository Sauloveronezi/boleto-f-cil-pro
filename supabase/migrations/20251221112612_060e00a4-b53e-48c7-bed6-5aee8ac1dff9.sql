-- Adicionar política de leitura pública para tabela de bancos
-- Bancos não são dados sensíveis e podem ser vistos por qualquer usuário

CREATE POLICY "public_read_bancos" 
ON public.vv_b_bancos 
FOR SELECT 
USING (deleted IS NULL);

-- Também adicionar leitura pública para modelos de boleto (necessário para gerar boletos)
CREATE POLICY "public_read_modelos" 
ON public.vv_b_modelos_boleto 
FOR SELECT 
USING (deleted IS NULL);