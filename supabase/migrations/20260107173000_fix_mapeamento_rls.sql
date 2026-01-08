-- Fix RLS policies for vv_b_api_mapeamento_campos to allow soft delete via UPDATE
-- This ensures the "Direct Update" fallback in the frontend works without needing RPC

-- Drop existing policies to be safe and start fresh
DROP POLICY IF EXISTS "allow_read_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_insert_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_update_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;
DROP POLICY IF EXISTS "allow_delete_mapeamento_campos" ON public.vv_b_api_mapeamento_campos;

-- Enable RLS
ALTER TABLE public.vv_b_api_mapeamento_campos ENABLE ROW LEVEL SECURITY;

-- Read: Allow authenticated users to see non-deleted records
CREATE POLICY "allow_read_mapeamento_campos" 
ON public.vv_b_api_mapeamento_campos 
FOR SELECT 
TO authenticated
USING (deleted IS NULL);

-- Insert: Allow authenticated users to insert
CREATE POLICY "allow_insert_mapeamento_campos" 
ON public.vv_b_api_mapeamento_campos 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Update: Allow authenticated users to update any record (needed for soft delete)
-- We check (true) to allow updating even if the record is currently "deleted" (though UI hides it)
-- This is critical for the "deleted = 'X'" update to succeed.
CREATE POLICY "allow_update_mapeamento_campos" 
ON public.vv_b_api_mapeamento_campos 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Delete: Allow physical delete if needed (though we use soft delete)
CREATE POLICY "allow_delete_mapeamento_campos" 
ON public.vv_b_api_mapeamento_campos 
FOR DELETE 
TO authenticated
USING (true);
