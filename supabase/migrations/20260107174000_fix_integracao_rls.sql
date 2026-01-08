-- Fix RLS policies for vv_b_api_integracoes and vv_b_boletos_api to allow soft delete via UPDATE
-- This ensures consistent behavior across all API-related tables

-- Drop existing policies
DROP POLICY IF EXISTS "public_read_api_integracoes" ON public.vv_b_api_integracoes;
DROP POLICY IF EXISTS "admin_full_api_integracoes" ON public.vv_b_api_integracoes;
DROP POLICY IF EXISTS "operador_crud_api_integracoes" ON public.vv_b_api_integracoes;
DROP POLICY IF EXISTS "public_read_boletos_api" ON public.vv_b_boletos_api;
DROP POLICY IF EXISTS "admin_full_boletos_api" ON public.vv_b_boletos_api;
DROP POLICY IF EXISTS "operador_crud_boletos_api" ON public.vv_b_boletos_api;

-- vv_b_api_integracoes Policies
CREATE POLICY "allow_read_api_integracoes" 
ON public.vv_b_api_integracoes 
FOR SELECT 
TO authenticated
USING (deleted IS NULL);

CREATE POLICY "allow_insert_api_integracoes" 
ON public.vv_b_api_integracoes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_update_api_integracoes" 
ON public.vv_b_api_integracoes 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_delete_api_integracoes" 
ON public.vv_b_api_integracoes 
FOR DELETE 
TO authenticated
USING (true);

-- vv_b_boletos_api Policies
CREATE POLICY "allow_read_boletos_api" 
ON public.vv_b_boletos_api 
FOR SELECT 
TO authenticated
USING (deleted IS NULL);

CREATE POLICY "allow_insert_boletos_api" 
ON public.vv_b_boletos_api 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_update_boletos_api" 
ON public.vv_b_boletos_api 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_delete_boletos_api" 
ON public.vv_b_boletos_api 
FOR DELETE 
TO authenticated
USING (true);
