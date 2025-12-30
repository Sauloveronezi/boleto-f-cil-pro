-- ============================================
-- PARTE 2: TABELAS, FUNÇÕES E POLÍTICAS
-- ============================================

-- 1. Criar tabela de perfis de acesso
CREATE TABLE IF NOT EXISTS public.vv_b_perfis_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  permissoes JSONB DEFAULT '{}'::jsonb,
  sistema BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted CHAR(1),
  usuario_delete_id UUID,
  data_delete TIMESTAMP WITH TIME ZONE
);

-- 2. Criar tabela de usuários
CREATE TABLE IF NOT EXISTS public.vv_b_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  nome TEXT,
  email TEXT NOT NULL,
  ativo BOOLEAN DEFAULT false,
  aprovado_por UUID,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  perfil_acesso_id UUID REFERENCES public.vv_b_perfis_acesso(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted CHAR(1),
  usuario_delete_id UUID,
  data_delete TIMESTAMP WITH TIME ZONE
);

-- 3. Adicionar coluna perfil_acesso_id na tabela user_roles se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vv_b_user_roles' 
    AND column_name = 'perfil_acesso_id'
  ) THEN
    ALTER TABLE public.vv_b_user_roles ADD COLUMN perfil_acesso_id UUID REFERENCES public.vv_b_perfis_acesso(id);
  END IF;
END $$;

-- 4. Inserir perfis padrão do sistema
INSERT INTO public.vv_b_perfis_acesso (nome, descricao, sistema, permissoes) VALUES
('Master', 'Acesso total ao sistema - pode gerenciar tudo', true, '{"usuarios":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"perfis":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"clientes":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"boletos":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"notas":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"bancos":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"modelos":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"configuracoes":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"integracoes":{"visualizar":true,"criar":true,"editar":true,"excluir":true}}'::jsonb),
('Administrador', 'Gerencia usuários e configurações do sistema', true, '{"usuarios":{"visualizar":true,"criar":true,"editar":true,"excluir":false},"perfis":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"clientes":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"boletos":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"notas":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"bancos":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"modelos":{"visualizar":true,"criar":true,"editar":true,"excluir":true},"configuracoes":{"visualizar":true,"criar":true,"editar":true,"excluir":false},"integracoes":{"visualizar":true,"criar":true,"editar":true,"excluir":true}}'::jsonb),
('Operador', 'Cria e edita registros operacionais', true, '{"usuarios":{"visualizar":false,"criar":false,"editar":false,"excluir":false},"perfis":{"visualizar":false,"criar":false,"editar":false,"excluir":false},"clientes":{"visualizar":true,"criar":true,"editar":true,"excluir":false},"boletos":{"visualizar":true,"criar":true,"editar":true,"excluir":false},"notas":{"visualizar":true,"criar":true,"editar":true,"excluir":false},"bancos":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"modelos":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"configuracoes":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"integracoes":{"visualizar":true,"criar":false,"editar":false,"excluir":false}}'::jsonb),
('Visualizador', 'Apenas visualiza dados do sistema', true, '{"usuarios":{"visualizar":false,"criar":false,"editar":false,"excluir":false},"perfis":{"visualizar":false,"criar":false,"editar":false,"excluir":false},"clientes":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"boletos":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"notas":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"bancos":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"modelos":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"configuracoes":{"visualizar":true,"criar":false,"editar":false,"excluir":false},"integracoes":{"visualizar":true,"criar":false,"editar":false,"excluir":false}}'::jsonb)
ON CONFLICT DO NOTHING;

-- 5. Criar função para verificar se é master ou admin
CREATE OR REPLACE FUNCTION public.vv_b_is_master_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vv_b_user_roles
    WHERE user_id = _user_id 
      AND role IN ('master'::vv_b_perfil_usuario, 'admin'::vv_b_perfil_usuario)
      AND deleted IS NULL
  )
$$;

-- 6. Criar função para verificar se usuário está ativo
CREATE OR REPLACE FUNCTION public.vv_b_user_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ativo FROM vv_b_usuarios WHERE user_id = _user_id AND deleted IS NULL),
    false
  )
$$;

-- 7. Criar função para buscar permissões do usuário
CREATE OR REPLACE FUNCTION public.vv_b_get_user_permissions(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT pa.permissoes 
     FROM vv_b_usuarios u
     JOIN vv_b_perfis_acesso pa ON pa.id = u.perfil_acesso_id
     WHERE u.user_id = _user_id 
       AND u.deleted IS NULL 
       AND pa.deleted IS NULL),
    '{}'::jsonb
  )
$$;

-- 8. Criar função para verificar permissão específica
CREATE OR REPLACE FUNCTION public.vv_b_has_permission(_user_id uuid, _modulo text, _acao text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (pa.permissoes -> _modulo ->> _acao)::boolean
     FROM vv_b_usuarios u
     JOIN vv_b_perfis_acesso pa ON pa.id = u.perfil_acesso_id
     WHERE u.user_id = _user_id 
       AND u.deleted IS NULL 
       AND pa.deleted IS NULL
       AND u.ativo = true),
    false
  )
$$;

-- 9. Trigger para criar usuário automaticamente quando se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user_vv_b()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
  );
  
  IF v_is_first_user THEN
    INSERT INTO public.vv_b_user_roles (user_id, role, perfil_acesso_id)
    VALUES (NEW.id, 'master'::vv_b_perfil_usuario, v_master_perfil_id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_vv_b ON auth.users;
CREATE TRIGGER on_auth_user_created_vv_b
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_vv_b();

-- 10. Habilitar RLS nas novas tabelas
ALTER TABLE public.vv_b_perfis_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vv_b_usuarios ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS para vv_b_perfis_acesso
CREATE POLICY "public_read_perfis_acesso" ON public.vv_b_perfis_acesso
FOR SELECT USING (deleted IS NULL);

CREATE POLICY "master_admin_manage_perfis" ON public.vv_b_perfis_acesso
FOR ALL TO authenticated
USING (
  vv_b_is_master_or_admin(auth.uid()) 
  AND vv_b_user_is_active(auth.uid())
  AND deleted IS NULL
)
WITH CHECK (
  vv_b_is_master_or_admin(auth.uid()) 
  AND vv_b_user_is_active(auth.uid())
);

-- 12. Políticas RLS para vv_b_usuarios
CREATE POLICY "usuarios_read_own" ON public.vv_b_usuarios
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR (vv_b_is_master_or_admin(auth.uid()) AND vv_b_user_is_active(auth.uid()))
);

CREATE POLICY "master_admin_manage_usuarios" ON public.vv_b_usuarios
FOR ALL TO authenticated
USING (
  vv_b_is_master_or_admin(auth.uid()) 
  AND vv_b_user_is_active(auth.uid())
)
WITH CHECK (
  vv_b_is_master_or_admin(auth.uid()) 
  AND vv_b_user_is_active(auth.uid())
);

-- 13. Função para aprovar usuário
CREATE OR REPLACE FUNCTION public.vv_b_aprovar_usuario(p_usuario_id uuid, p_perfil_acesso_id uuid, p_role vv_b_perfil_usuario DEFAULT 'operador')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT (vv_b_is_master_or_admin(auth.uid()) AND vv_b_user_is_active(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar usuários';
  END IF;
  
  SELECT user_id INTO v_user_id FROM vv_b_usuarios WHERE id = p_usuario_id AND deleted IS NULL;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  UPDATE vv_b_usuarios
  SET ativo = true,
      aprovado_por = auth.uid(),
      data_aprovacao = now(),
      perfil_acesso_id = p_perfil_acesso_id,
      updated_at = now()
  WHERE id = p_usuario_id;
  
  INSERT INTO vv_b_user_roles (user_id, role, perfil_acesso_id)
  VALUES (v_user_id, p_role, p_perfil_acesso_id)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET perfil_acesso_id = p_perfil_acesso_id;
  
  RETURN true;
END;
$$;

-- 14. Função para listar admins e masters para notificação
CREATE OR REPLACE FUNCTION public.vv_b_get_admin_emails()
RETURNS TABLE(email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT u.email
  FROM vv_b_usuarios u
  JOIN vv_b_user_roles ur ON ur.user_id = u.user_id
  WHERE ur.role IN ('master'::vv_b_perfil_usuario, 'admin'::vv_b_perfil_usuario)
    AND ur.deleted IS NULL
    AND u.deleted IS NULL
    AND u.ativo = true;
$$;

-- 15. Triggers para updated_at
DROP TRIGGER IF EXISTS update_vv_b_perfis_acesso_updated_at ON public.vv_b_perfis_acesso;
CREATE TRIGGER update_vv_b_perfis_acesso_updated_at
  BEFORE UPDATE ON public.vv_b_perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vv_b_usuarios_updated_at ON public.vv_b_usuarios;
CREATE TRIGGER update_vv_b_usuarios_updated_at
  BEFORE UPDATE ON public.vv_b_usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();