import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Permissoes, Permissao } from '@/hooks/usePerfisAcesso';

export type UserRole = 'master' | 'admin' | 'operador' | 'visualizador';

const defaultPermissao: Permissao = {
  visualizar: false,
  criar: false,
  editar: false,
  excluir: false
};

const defaultPermissoes: Permissoes = {
  usuarios: { ...defaultPermissao },
  perfis: { ...defaultPermissao },
  clientes: { ...defaultPermissao },
  boletos: { ...defaultPermissao },
  notas: { ...defaultPermissao },
  bancos: { ...defaultPermissao },
  modelos: { ...defaultPermissao },
  configuracoes: { ...defaultPermissao },
  integracoes: { ...defaultPermissao }
};

export function usePermissoes() {
  const { user } = useAuth();

  const { data: usuarioInfo, isLoading: isLoadingUsuario } = useQuery({
    queryKey: ['usuario-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('vv_b_usuarios')
        .select(`
          *,
          perfil_acesso:vv_b_perfis_acesso(id, nome, permissoes)
        `)
        .eq('user_id', user.id)
        .or('deleted.is.null,deleted.eq.')
        .single();
      
      if (error) {
        console.error('Erro ao buscar info do usuário:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id
  });

  const { data: userRoles, isLoading: isLoadingRole } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('vv_b_user_roles')
        .select('role')
        .eq('user_id', user.id)
        .or('deleted.is.null,deleted.eq.');
      
      if (error) {
        console.error('Erro ao buscar roles do usuário:', error);
        return [];
      }
      
      return (data?.map(r => r.role) ?? []) as UserRole[];
    },
    enabled: !!user?.id
  });

  // Determine primary role by priority: master > admin > operador > visualizador
  const getPrimaryRole = (roles: UserRole[]): UserRole | null => {
    if (roles.includes('master')) return 'master';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('operador')) return 'operador';
    if (roles.includes('visualizador')) return 'visualizador';
    return null;
  };

  const userRole = getPrimaryRole(userRoles ?? []);

  const isAtivo = usuarioInfo?.ativo ?? false;
  const isMaster = (userRoles ?? []).includes('master');
  const isAdmin = (userRoles ?? []).includes('admin');
  const isMasterOrAdmin = isMaster || isAdmin;
  
  const permissoes: Permissoes = (usuarioInfo?.perfil_acesso?.permissoes as unknown as Permissoes) || defaultPermissoes;

  const hasPermission = (modulo: keyof Permissoes, acao: keyof Permissao): boolean => {
    if (!isAtivo) return false;
    if (isMaster) return true; // Master tem acesso total
    return permissoes[modulo]?.[acao] ?? false;
  };

  const canAccess = (modulo: keyof Permissoes): boolean => {
    return hasPermission(modulo, 'visualizar');
  };

  return {
    usuarioInfo,
    userRole,
    isAtivo,
    isMaster,
    isAdmin,
    isMasterOrAdmin,
    permissoes,
    hasPermission,
    canAccess,
    isLoading: isLoadingUsuario || isLoadingRole
  };
}
