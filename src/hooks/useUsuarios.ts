import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Usuario {
  id: string;
  user_id: string;
  nome: string | null;
  email: string;
  ativo: boolean;
  aprovado_por: string | null;
  data_aprovacao: string | null;
  perfil_acesso_id: string | null;
  created_at: string;
  updated_at: string;
  deleted: string | null;
  perfil_acesso?: {
    id: string;
    nome: string;
  } | null;
}

export function useUsuarios() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading, error } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_usuarios')
        .select(`
          *,
          perfil_acesso:vv_b_perfis_acesso(id, nome)
        `)
        .or('deleted.is.null,deleted.eq.')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Usuario[];
    }
  });

  const aprovarUsuario = useMutation({
    mutationFn: async ({ 
      usuarioId, 
      perfilAcessoId, 
      role 
    }: { 
      usuarioId: string; 
      perfilAcessoId: string; 
      role: 'master' | 'admin' | 'operador' | 'visualizador';
    }) => {
      const { data, error } = await supabase.rpc('vv_b_aprovar_usuario', {
        p_usuario_id: usuarioId,
        p_perfil_acesso_id: perfilAcessoId,
        p_role: role
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Usuário aprovado',
        description: 'O usuário foi aprovado com sucesso.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao aprovar usuário',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const desativarUsuario = useMutation({
    mutationFn: async (usuarioId: string) => {
      const { error } = await supabase
        .from('vv_b_usuarios')
        .update({ ativo: false })
        .eq('id', usuarioId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Usuário desativado',
        description: 'O usuário foi desativado com sucesso.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao desativar usuário',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const excluirUsuario = useMutation({
    mutationFn: async (usuarioId: string) => {
      const { error } = await supabase
        .rpc('vv_b_soft_delete', {
          p_table_name: 'vv_b_usuarios',
          p_id: usuarioId
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi excluído com sucesso.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const atualizarPerfil = useMutation({
    mutationFn: async ({ 
      usuarioId, 
      perfilAcessoId 
    }: { 
      usuarioId: string; 
      perfilAcessoId: string;
    }) => {
      const { error } = await supabase
        .from('vv_b_usuarios')
        .update({ perfil_acesso_id: perfilAcessoId })
        .eq('id', usuarioId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Perfil atualizado',
        description: 'O perfil do usuário foi atualizado com sucesso.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    usuarios,
    isLoading,
    error,
    aprovarUsuario,
    desativarUsuario,
    excluirUsuario,
    atualizarPerfil
  };
}
