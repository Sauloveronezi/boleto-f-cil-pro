
-- Remover índices/constraints antigos que conflitam
DROP INDEX IF EXISTS idx_boletos_api_unique_nota_cobranca_doc;
DROP INDEX IF EXISTS vv_b_boletos_api_unique_nota_cobranca_doc;
ALTER TABLE vv_b_boletos_api DROP CONSTRAINT IF EXISTS vv_b_boletos_api_unique_key;

-- Garantir que documento nunca seja NULL
ALTER TABLE vv_b_boletos_api ALTER COLUMN documento SET DEFAULT '';
UPDATE vv_b_boletos_api SET documento = '' WHERE documento IS NULL;

-- Criar constraint unique real (não parcial) que PostgREST reconhece
ALTER TABLE vv_b_boletos_api ADD CONSTRAINT uq_boletos_nota_cobranca_doc UNIQUE (numero_nota, numero_cobranca, documento);
