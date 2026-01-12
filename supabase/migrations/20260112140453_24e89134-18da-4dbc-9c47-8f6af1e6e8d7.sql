-- Drop existing policies if any to recreate them
DROP POLICY IF EXISTS "Permitir leitura de modelos ativos" ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS "Permitir insert para admin e operador" ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS "Permitir update para admin e operador" ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS "Permitir soft delete para admin e operador" ON public.vv_b_modelos_boleto;

-- Policy para leitura: todos autenticados podem ler modelos não deletados
CREATE POLICY "Permitir leitura de modelos ativos"
ON public.vv_b_modelos_boleto
FOR SELECT
TO authenticated
USING (deleted IS NULL);

-- Policy para insert: admin, master e operador podem criar
CREATE POLICY "Permitir insert para admin e operador"
ON public.vv_b_modelos_boleto
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vv_b_user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'master', 'operador')
    AND deleted IS NULL
  )
);

-- Policy para update: admin, master e operador podem atualizar
CREATE POLICY "Permitir update para admin e operador"
ON public.vv_b_modelos_boleto
FOR UPDATE
TO authenticated
USING (
  deleted IS NULL AND
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

-- Nota: O soft delete (marcar deleted='*') é feito via UPDATE, então a policy de update já cobre isso