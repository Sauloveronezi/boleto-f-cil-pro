-- Add nivel column to vv_b_boletos_api_config (primario = shown directly, secundario = in dropdown)
ALTER TABLE public.vv_b_boletos_api_config 
ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'primario' 
CHECK (nivel IN ('primario', 'secundario'));