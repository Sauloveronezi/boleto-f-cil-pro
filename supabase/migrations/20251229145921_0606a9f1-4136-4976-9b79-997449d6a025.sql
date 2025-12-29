-- Bootstrap admin policy: permite primeiro usuário criar role admin se não existir nenhum
CREATE POLICY "bootstrap_first_admin" 
ON public.vv_b_user_roles 
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'admin' 
  AND user_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.vv_b_user_roles 
    WHERE role = 'admin' AND deleted IS NULL
  )
);