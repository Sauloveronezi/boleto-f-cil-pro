import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useManageUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const criarUsuario = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', email, password }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Usuário criado',
        description: 'O usuário foi criado com sucesso.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const alterarSenha = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'update-password', userId, password }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Senha alterada',
        description: 'A senha foi alterada com sucesso.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    criarUsuario,
    alterarSenha
  };
}
