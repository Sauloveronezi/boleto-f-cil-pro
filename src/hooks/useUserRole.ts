import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'admin' | 'operador' | 'visualizador';

export function useUserRole() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar role do usuário atual
  const { data: userRole, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('vv_b_user_roles')
        .select('role')
        .eq('user_id', user.id)
        .is('deleted', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar role:', error);
        return null;
      }

      return data?.role as UserRole | null;
    },
    enabled: !!user?.id,
  });

  // Verificar se existe algum admin no sistema
  const { data: hasAnyAdmin } = useQuery({
    queryKey: ['has-any-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_user_roles')
        .select('id')
        .eq('role', 'admin')
        .is('deleted', null)
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

      // Verificar novamente se já existe admin
      const { data: existingAdmin } = await supabase
        .from('vv_b_user_roles')
        .select('id')
        .eq('role', 'admin')
        .is('deleted', null)
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
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
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

  const canEdit = userRole === 'admin' || userRole === 'operador';
  const isAdmin = userRole === 'admin';
  const canBootstrapAdmin = !!user && !hasAnyAdmin && !userRole;

  return {
    userRole,
    isLoading,
    canEdit,
    isAdmin,
    hasAnyAdmin,
    canBootstrapAdmin,
    bootstrapAdmin,
  };
}
