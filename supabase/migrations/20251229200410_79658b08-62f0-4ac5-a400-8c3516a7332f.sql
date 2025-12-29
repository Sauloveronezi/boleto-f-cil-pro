-- RLS policies para vv_b_modelos_boleto
-- Permitir SELECT para todos (autenticados e não autenticados)
CREATE POLICY "Modelos são visíveis para todos"
ON public.vv_b_modelos_boleto
FOR SELECT
USING (deleted IS NULL OR deleted = '');

-- Permitir INSERT para admin/operador
CREATE POLICY "Admin e operador podem criar modelos"
ON public.vv_b_modelos_boleto
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vv_b_user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'operador')
    AND (deleted IS NULL OR deleted = '')
  )
);

-- Permitir UPDATE para admin/operador (incluindo soft delete)
CREATE POLICY "Admin e operador podem atualizar modelos"
ON public.vv_b_modelos_boleto
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.vv_b_user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'operador')
    AND (deleted IS NULL OR deleted = '')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vv_b_user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'operador')
    AND (deleted IS NULL OR deleted = '')
  )
);

-- Permitir DELETE físico para admin (soft delete é via UPDATE)
CREATE POLICY "Admin pode deletar modelos"
ON public.vv_b_modelos_boleto
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.vv_b_user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND (deleted IS NULL OR deleted = '')
  )
);