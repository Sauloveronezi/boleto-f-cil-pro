
ALTER TABLE vv_b_boletos_api_config 
ADD COLUMN IF NOT EXISTS uso_filtro text NOT NULL DEFAULT 'nenhum';

-- Migrate existing filtro records: set uso_filtro based on nivel, then change tipo to 'coluna'
UPDATE vv_b_boletos_api_config 
SET uso_filtro = COALESCE(nivel, 'primario')
WHERE tipo = 'filtro';

-- Set existing coluna records to 'nenhum' (not a filter)
UPDATE vv_b_boletos_api_config
SET uso_filtro = 'nenhum'
WHERE tipo = 'coluna';
