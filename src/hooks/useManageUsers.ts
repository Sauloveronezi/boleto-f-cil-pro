import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useManageUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const criarUsuario = useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      perfilAcessoId, 
      role,
      nome 
    }: { 
      email: string; 
      password: string; 
      perfilAcessoId: string;
      role: string;
      nome?: string;
    }) => {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', email, password, perfilAcessoId, role, nome }
      });

      // Verificar erro da resposta (inclui erros 4xx/5xx)
      if (response.error) {
        // Tentar extrair mensagem do corpo da resposta
        const errorBody = response.data;
        if (errorBody?.error) {
          throw new Error(errorBody.error);
        }
        throw new Error(response.error.message || 'Erro ao criar usuário');
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
