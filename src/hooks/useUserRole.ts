import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'master' | 'admin' | 'operador' | 'visualizador';

export function useUserRole() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as roles do usuário atual (suporta múltiplas roles)
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('vv_b_user_roles')
        .select('role')
        .eq('user_id', user.id)
        .or('deleted.is.null,deleted.eq.');

      if (error) {
        console.error('Erro ao buscar roles:', error);
        return [];
      }

      return (data?.map(r => r.role) ?? []) as UserRole[];
    },
    enabled: !!user?.id,
  });

  // Determinar role principal por prioridade: master > admin > operador > visualizador
  const getPrimaryRole = (roles: UserRole[]): UserRole | null => {
    if (roles.includes('master')) return 'master';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('operador')) return 'operador';
    if (roles.includes('visualizador')) return 'visualizador';
    return null;
  };

  const userRole = getPrimaryRole(userRoles ?? []);

  // Verificar se existe algum admin ou master no sistema
  const { data: hasAnyAdmin } = useQuery({
    queryKey: ['has-any-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_user_roles')
        .select('id')
        .in('role', ['admin', 'master'])
        .or('deleted.is.null,deleted.eq.')
        .limit(1);

      if (error) {
        console.error('Erro ao verificar admin:', error);
        return true; // Assume que existe para segurança
      }

      return (data?.length || 0) > 0;
    },
    enabled: !!user?.id,
  });

  // Mutation para primeiro admin se registrar
  const bootstrapAdmin = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Verificar novamente se já existe admin ou master
      const { data: existingAdmin } = await supabase
        .from('vv_b_user_roles')
        .select('id')
        .in('role', ['admin', 'master'])
        .or('deleted.is.null,deleted.eq.')
        .limit(1);

      if (existingAdmin && existingAdmin.length > 0) {
        throw new Error('Já existe um administrador no sistema');
      }

      const { error } = await supabase
        .from('vv_b_user_roles')
        .insert({
          user_id: user.id,
          role: 'admin',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['has-any-admin'] });
      toast({
        title: 'Permissão concedida',
        description: 'Você foi registrado como administrador do sistema.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isMaster = (userRoles ?? []).includes('master');
  const isAdmin = (userRoles ?? []).includes('admin');
  const canEdit = isMaster || isAdmin || (userRoles ?? []).includes('operador');
  const canBootstrapAdmin = !!user && !hasAnyAdmin && (!userRoles || userRoles.length === 0);

  return {
    userRole,
    userRoles,
    isLoading,
    canEdit,
    isAdmin,
    isMaster,
    hasAnyAdmin,
    canBootstrapAdmin,
    bootstrapAdmin,
  };
}
