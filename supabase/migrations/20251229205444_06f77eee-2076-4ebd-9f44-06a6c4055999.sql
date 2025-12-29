-- Corrigir policies duplicadas/conflitantes e garantir soft-delete via UPDATE
-- Tabela: public.vv_b_modelos_boleto

-- Garantir RLS ligado
ALTER TABLE public.vv_b_modelos_boleto ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas/duplicadas
DROP POLICY IF EXISTS allow_select_modelos ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS allow_insert_modelos ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS allow_update_modelos ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS allow_delete_modelos ON public.vv_b_modelos_boleto;

DROP POLICY IF EXISTS vv_b_modelos_boleto_read ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS vv_b_modelos_boleto_insert ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS vv_b_modelos_boleto_update ON public.vv_b_modelos_boleto;
DROP POLICY IF EXISTS vv_b_modelos_boleto_delete ON public.vv_b_modelos_boleto;

-- Leitura pública apenas de registros não deletados
CREATE POLICY vv_b_modelos_boleto_read
ON public.vv_b_modelos_boleto
FOR SELECT
TO public
USING ((deleted IS NULL) OR (deleted = ''::bpchar));

-- Inserção: admin/operador autenticado
CREATE POLICY vv_b_modelos_boleto_insert
ON public.vv_b_modelos_boleto
FOR INSERT
TO authenticated
WITH CHECK (
  vv_b_has_role(auth.uid(), 'admin'::public.vv_b_perfil_usuario)
  OR vv_b_has_role(auth.uid(), 'operador'::public.vv_b_perfil_usuario)
);

-- Atualização (inclui soft delete): admin/operador autenticado, somente se ainda não deletado
CREATE POLICY vv_b_modelos_boleto_update
ON public.vv_b_modelos_boleto
FOR UPDATE
TO authenticated
USING (
  ((deleted IS NULL) OR (deleted = ''::bpchar))
  AND (
    vv_b_has_role(auth.uid(), 'admin'::public.vv_b_perfil_usuario)
    OR vv_b_has_role(auth.uid(), 'operador'::public.vv_b_perfil_usuario)
  )
)
WITH CHECK (
  vv_b_has_role(auth.uid(), 'admin'::public.vv_b_perfil_usuario)
  OR vv_b_has_role(auth.uid(), 'operador'::public.vv_b_perfil_usuario)
);

-- Delete físico: somente admin
CREATE POLICY vv_b_modelos_boleto_delete
ON public.vv_b_modelos_boleto
FOR DELETE
TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'::public.vv_b_perfil_usuario));
