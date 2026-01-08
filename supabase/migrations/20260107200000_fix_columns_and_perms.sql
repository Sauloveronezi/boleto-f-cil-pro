-- Ensure standard columns exist in vv_b_boletos_api
-- This fixes the issue where standard fields might be missing from the table, causing sync errors.
ALTER TABLE public.vv_b_boletos_api 
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS empresa TEXT, -- Código da empresa/filial
ADD COLUMN IF NOT EXISTS cliente TEXT, -- Nome do cliente
ADD COLUMN IF NOT EXISTS data_desconto DATE,
ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC(15,2);

-- Ensure permissions for RPCs used by the frontend
-- This allows the UI to check for existing columns and add new ones dynamically.
GRANT EXECUTE ON FUNCTION public.vv_b_add_dynamic_column(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vv_b_list_dynamic_columns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.vv_b_get_table_columns(text) TO authenticated;

-- Ensure permissions on the tables
GRANT ALL ON public.vv_b_boletos_api TO authenticated;
GRANT ALL ON public.vv_b_api_mapeamento_campos TO authenticated;
GRANT ALL ON public.vv_b_api_mapeamento_campos TO service_role;
