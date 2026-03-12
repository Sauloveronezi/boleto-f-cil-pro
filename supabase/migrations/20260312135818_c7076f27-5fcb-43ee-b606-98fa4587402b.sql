CREATE OR REPLACE FUNCTION public.handle_new_user_vv_b()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_first_user BOOLEAN;
  v_master_perfil_id UUID;
  v_existing_deleted RECORD;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM vv_b_usuarios WHERE deleted IS NULL AND ativo = true) INTO v_is_first_user;
  SELECT id INTO v_master_perfil_id FROM vv_b_perfis_acesso WHERE nome = 'Master' AND deleted IS NULL LIMIT 1;
  
  -- Check if user was previously soft-deleted
  SELECT id, deleted INTO v_existing_deleted 
  FROM vv_b_usuarios 
  WHERE user_id = NEW.id 
  LIMIT 1;
  
  IF v_existing_deleted.id IS NOT NULL AND v_existing_deleted.deleted IS NOT NULL THEN
    -- Re-enable the soft-deleted user as pending (ativo=false, clear deleted)
    UPDATE vv_b_usuarios 
    SET deleted = NULL, 
        data_delete = NULL, 
        usuario_delete_id = NULL, 
        ativo = false, 
        perfil_acesso_id = NULL,
        data_aprovacao = NULL,
        aprovado_por = NULL,
        nome = COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        email = NEW.email,
        updated_at = now()
    WHERE id = v_existing_deleted.id;
    
    -- Also clean up deleted roles
    UPDATE vv_b_user_roles 
    SET deleted = NULL, data_delete = NULL, usuario_delete_id = NULL 
    WHERE user_id = NEW.id AND deleted IS NOT NULL;
    
    RETURN NEW;
  END IF;
  
  -- Normal insert for new users
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