CREATE UNIQUE INDEX IF NOT EXISTS idx_boletos_api_unique_nota_cobranca_doc 
ON public.vv_b_boletos_api (numero_nota, numero_cobranca, documento) 
WHERE deleted IS NULL;