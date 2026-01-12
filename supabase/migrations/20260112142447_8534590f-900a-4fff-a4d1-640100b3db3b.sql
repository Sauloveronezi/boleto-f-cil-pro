-- Recriar policy de update para permitir soft delete
-- O problema é que a USING clause exige deleted IS NULL,
-- mas ao fazer soft delete estamos mudando deleted para '*'

DROP POLICY IF EXISTS "Permitir update para admin e operador" ON public.vv_b_modelos_boleto;

-- Policy para update: admin, master e operador podem atualizar
-- USING permite atualizar registros não deletados OU que estão sendo marcados como deletados
CREATE POLICY "Permitir update para admin e operador"
ON public.vv_b_modelos_boleto
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vv_b_user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master', 'operador')
    AND deleted IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vv_b_user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master', 'operador')
    AND deleted IS NULL
  )
);