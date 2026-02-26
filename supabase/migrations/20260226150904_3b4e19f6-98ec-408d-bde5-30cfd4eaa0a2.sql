
-- Remover constraint antiga
ALTER TABLE vv_b_boletos_api DROP CONSTRAINT IF EXISTS uq_boletos_nota_cobranca_doc;

-- Garantir que paymentrundate nunca seja NULL
ALTER TABLE vv_b_boletos_api ALTER COLUMN paymentrundate SET DEFAULT '';
UPDATE vv_b_boletos_api SET paymentrundate = '' WHERE paymentrundate IS NULL;

-- Criar nova constraint com 4 campos
ALTER TABLE vv_b_boletos_api ADD CONSTRAINT uq_boletos_nota_cobranca_doc_prd UNIQUE (numero_nota, numero_cobranca, documento, paymentrundate);
