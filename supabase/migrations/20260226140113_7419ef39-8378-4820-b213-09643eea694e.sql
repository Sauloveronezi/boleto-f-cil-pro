
-- Drop existing unique constraint
ALTER TABLE public.vv_b_boletos_api DROP CONSTRAINT IF EXISTS vv_b_boletos_api_unique_nota_cobranca;

-- Create new unique index including documento (PaymentDocument)
CREATE UNIQUE INDEX vv_b_boletos_api_unique_nota_cobranca_doc 
ON public.vv_b_boletos_api (numero_nota, numero_cobranca, COALESCE(documento, ''));
