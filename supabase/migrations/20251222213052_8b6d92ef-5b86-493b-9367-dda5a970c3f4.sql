-- Dropar políticas antigas para modelos
DROP POLICY IF EXISTS "admin_full_modelos" ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS "operador_crud_modelos" ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS "public_read_modelos" ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS "visualizador_read_modelos" ON public.vv_b_modelos_boleto;

-- Criar nova política de leitura pública (qualquer pessoa pode ver modelos não deletados)
CREATE POLICY "allow_select_modelos" ON public.vv_b_modelos_boleto
FOR SELECT USING (deleted IS NULL);

-- Permitir insert para usuários autenticados com role admin ou operador
CREATE POLICY "allow_insert_modelos" ON public.vv_b_modelos_boleto
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.vv_b_has_role(auth.uid(), 'admin') OR
    public.vv_b_has_role(auth.uid(), 'operador')
  )
);

-- Permitir update para admin ou operador em registros não deletados
CREATE POLICY "allow_update_modelos" ON public.vv_b_modelos_boleto
FOR UPDATE USING (
  deleted IS NULL AND (
    public.vv_b_has_role(auth.uid(), 'admin') OR
    public.vv_b_has_role(auth.uid(), 'operador')
  )
) WITH CHECK (
  public.vv_b_has_role(auth.uid(), 'admin') OR
  public.vv_b_has_role(auth.uid(), 'operador')
);

-- Permitir delete (soft delete) para admin ou operador
CREATE POLICY "allow_delete_modelos" ON public.vv_b_modelos_boleto
FOR DELETE USING (
  deleted IS NULL AND (
    public.vv_b_has_role(auth.uid(), 'admin') OR
    public.vv_b_has_role(auth.uid(), 'operador')
  )
);