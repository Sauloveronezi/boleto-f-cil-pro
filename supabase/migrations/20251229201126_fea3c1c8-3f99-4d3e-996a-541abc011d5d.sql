-- Fix RLS policies vv_b_modelos_boleto usando vv_b_has_role (security definer)
DO $$
BEGIN
  -- Drop antigas (se existirem)
  EXECUTE 'DROP POLICY IF EXISTS "Modelos são visíveis para todos" ON public.vv_b_modelos_boleto';
  EXECUTE 'DROP POLICY IF EXISTS "Admin e operador podem criar modelos" ON public.vv_b_modelos_boleto';
  EXECUTE 'DROP POLICY IF EXISTS "Admin e operador podem atualizar modelos" ON public.vv_b_modelos_boleto';
  EXECUTE 'DROP POLICY IF EXISTS "Admin pode deletar modelos" ON public.vv_b_modelos_boleto';
EXCEPTION WHEN undefined_object THEN
  -- ignore
  NULL;
END $$;

-- SELECT: apenas não deletados
CREATE POLICY "vv_b_modelos_boleto_read"
ON public.vv_b_modelos_boleto
FOR SELECT
TO public
USING (deleted IS NULL OR deleted = '');

-- INSERT: admin/operador
CREATE POLICY "vv_b_modelos_boleto_insert"
ON public.vv_b_modelos_boleto
FOR INSERT
TO authenticated
WITH CHECK (
  public.vv_b_has_role(auth.uid(), 'admin'::public.vv_b_perfil_usuario)
  OR public.vv_b_has_role(auth.uid(), 'operador'::public.vv_b_perfil_usuario)
);

-- UPDATE (inclui soft delete): admin/operador em registros ativos
CREATE POLICY "vv_b_modelos_boleto_update"
ON public.vv_b_modelos_boleto
FOR UPDATE
TO authenticated
USING (
  (deleted IS NULL OR deleted = '')
  AND (
    public.vv_b_has_role(auth.uid(), 'admin'::public.vv_b_perfil_usuario)
    OR public.vv_b_has_role(auth.uid(), 'operador'::public.vv_b_perfil_usuario)
  )
)
WITH CHECK (
  public.vv_b_has_role(auth.uid(), 'admin'::public.vv_b_perfil_usuario)
  OR public.vv_b_has_role(auth.uid(), 'operador'::public.vv_b_perfil_usuario)
);

-- DELETE físico: só admin (opcional; soft delete já atende)
CREATE POLICY "vv_b_modelos_boleto_delete"
ON public.vv_b_modelos_boleto
FOR DELETE
TO authenticated
USING (public.vv_b_has_role(auth.uid(), 'admin'::public.vv_b_perfil_usuario));