-- Remover constraint antigo se existir e criar novo sem cliente_id
DO $$
BEGIN
  -- Tentar dropar constraints existentes que envolvam numero_nota, numero_cobranca
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vv_b_boletos_api_numero_nota_cliente_id_numero_cobranca_key'
    AND conrelid = 'public.vv_b_boletos_api'::regclass
  ) THEN
    ALTER TABLE public.vv_b_boletos_api 
    DROP CONSTRAINT vv_b_boletos_api_numero_nota_cliente_id_numero_cobranca_key;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vv_b_boletos_api_unique_nota_cobranca'
    AND conrelid = 'public.vv_b_boletos_api'::regclass
  ) THEN
    ALTER TABLE public.vv_b_boletos_api 
    DROP CONSTRAINT vv_b_boletos_api_unique_nota_cobranca;
  END IF;
END $$;

-- Criar novo unique constraint apenas com numero_nota e numero_cobranca
ALTER TABLE public.vv_b_boletos_api
ADD CONSTRAINT vv_b_boletos_api_unique_nota_cobranca 
UNIQUE (numero_nota, numero_cobranca);