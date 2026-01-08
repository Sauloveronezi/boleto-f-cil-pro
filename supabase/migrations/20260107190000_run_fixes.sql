-- Add missing columns to vv_b_boletos_api
-- Standard fields used in mapping logic
ALTER TABLE public.vv_b_boletos_api 
ADD COLUMN IF NOT EXISTS data_desconto DATE,
ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS empresa TEXT,
ADD COLUMN IF NOT EXISTS cliente TEXT;

-- Dynamic fields referenced in frontend (BoletosApi.tsx)
ALTER TABLE public.vv_b_boletos_api 
ADD COLUMN IF NOT EXISTS dyn_cidade TEXT,
ADD COLUMN IF NOT EXISTS dyn_conta TEXT,
ADD COLUMN IF NOT EXISTS dyn_desconto_data TEXT, -- Keeping as TEXT to be safe with various date formats or empty strings
ADD COLUMN IF NOT EXISTS dyn_desconto1 TEXT,
ADD COLUMN IF NOT EXISTS dyn_nome_do_cliente TEXT,
ADD COLUMN IF NOT EXISTS dyn_zonatransporte TEXT;

-- Grant permissions if necessary (usually inherited, but good to be sure)
GRANT ALL ON public.vv_b_boletos_api TO authenticated;
GRANT ALL ON public.vv_b_boletos_api TO service_role;
