import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UsuarioAtual {
  id: string;
  user_id: string;
  nome: string | null;
  email: string;
  ativo: boolean;
  perfil_acesso_id: string | null;
  perfil_acesso?: {
    id: string;
    nome: string;
    permissoes: Record<string, Record<string, boolean>> | null;
  } | null;
}

export function useUsuarioAtual() {
  const { user, loading: authLoading } = useAuth();

  const { data: usuarioAtual, isLoading, error, refetch } = useQuery({
    queryKey: ['usuario-atual', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('vv_b_usuarios')
        .select(`
          id,
          user_id,
          nome,
          email,
          ativo,
          perfil_acesso_id,
          perfil_acesso:vv_b_perfis_acesso(id, nome, permissoes)
        `)
        .eq('user_id', user.id)
        .or('deleted.is.null,deleted.eq.')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar usuário atual:', error);
        return null;
      }

      return data as UsuarioAtual | null;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 30000, // 30 seconds
  });

  const isAtivo = usuarioAtual?.ativo ?? false;
  const isPendente = usuarioAtual !== null && !usuarioAtual.ativo;
  const perfilNome = usuarioAtual?.perfil_acesso?.nome ?? null;

  return {
    usuarioAtual,
    isLoading: authLoading || isLoading,
    error,
    isAtivo,
    isPendente,
    perfilNome,
    refetch,
  };
}
