CREATE OR REPLACE FUNCTION public.handle_new_user_vv_b()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_first_user BOOLEAN;
  v_master_perfil_id UUID;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM vv_b_usuarios WHERE deleted IS NULL) INTO v_is_first_user;
  SELECT id INTO v_master_perfil_id FROM vv_b_perfis_acesso WHERE nome = 'Master' AND deleted IS NULL LIMIT 1;
  
  INSERT INTO public.vv_b_usuarios (user_id, email, nome, ativo, perfil_acesso_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    v_is_first_user,
    CASE WHEN v_is_first_user THEN v_master_perfil_id ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  IF v_is_first_user THEN
    INSERT INTO public.vv_b_user_roles (user_id, role, perfil_acesso_id)
    VALUES (NEW.id, 'master'::vv_b_perfil_usuario, v_master_perfil_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;