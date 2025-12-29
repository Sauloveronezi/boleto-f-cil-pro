-- Function to check if any admin exists (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.vv_b_any_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vv_b_user_roles
    WHERE role = 'admin'::public.vv_b_perfil_usuario
      AND deleted IS NULL
  );
$$;

-- Replace bootstrap policy to use the security definer function (prevents infinite recursion)
DROP POLICY IF EXISTS bootstrap_first_admin ON public.vv_b_user_roles;

CREATE POLICY bootstrap_first_admin
ON public.vv_b_user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'admin'::public.vv_b_perfil_usuario
  AND user_id = auth.uid()
  AND NOT public.vv_b_any_admin_exists()
);
