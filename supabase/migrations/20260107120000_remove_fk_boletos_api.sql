-- Drop Foreign Key constraint on cliente_id in vv_b_boletos_api table
ALTER TABLE public.vv_b_boletos_api
DROP CONSTRAINT IF EXISTS vv_b_boletos_api_cliente_id_fkey;

-- Ensure cliente_id is nullable (it should be already, but just to be safe)
ALTER TABLE public.vv_b_boletos_api
ALTER COLUMN cliente_id DROP NOT NULL;
