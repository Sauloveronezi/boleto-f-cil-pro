-- RPC para soft-delete de mapeamentos (contorna falhas de RLS no UPDATE via PostgREST)

CREATE OR REPLACE FUNCTION public.vv_b_soft_delete_mapeamento_campo(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Exige usuário autenticado
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Opcional (mais seguro): apenas admin/operador podem excluir mapeamentos
  IF NOT (public.vv_b_has_role('admin'::public.vv_b_perfil_usuario, auth.uid()::text)
          OR public.vv_b_has_role('operador'::public.vv_b_perfil_usuario, auth.uid()::text)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Bypass RLS dentro da função
  PERFORM set_config('row_security', 'off', true);

  UPDATE public.vv_b_api_mapeamento_campos
     SET deleted = '*',
         data_delete = now(),
         usuario_delete_id = auth.uid()
   WHERE id = p_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vv_b_soft_delete_mapeamento_campo(uuid) TO authenticated;
