
-- Add columns for barcode tracking on vv_b_boletos_api
ALTER TABLE public.vv_b_boletos_api 
  ADD COLUMN IF NOT EXISTS cod_barras_calculado text,
  ADD COLUMN IF NOT EXISTS linha_digitavel_calculada text;

-- Add emission tracking columns to vv_b_boletos_gerados
ALTER TABLE public.vv_b_boletos_gerados
  ADD COLUMN IF NOT EXISTS usuario_emissao_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_emissao_boleto timestamp with time zone DEFAULT now();
