import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Permissao {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
}

export interface Permissoes {
  usuarios: Permissao;
  perfis: Permissao;
  clientes: Permissao;
  boletos: Permissao;
  notas: Permissao;
  bancos: Permissao;
  modelos: Permissao;
  configuracoes: Permissao;
  integracoes: Permissao;
}

export interface PerfilAcesso {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: Permissoes;
  sistema: boolean;
  created_at: string;
  updated_at: string;
  deleted: string | null;
}

const defaultPermissao: Permissao = {
  visualizar: false,
  criar: false,
  editar: false,
  excluir: false
};

export const defaultPermissoes: Permissoes = {
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

export const MODULOS = [
  { key: 'usuarios', label: 'Usuários' },
  { key: 'perfis', label: 'Perfis de Acesso' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'boletos', label: 'Boletos' },
  { key: 'notas', label: 'Notas Fiscais' },
  { key: 'bancos', label: 'Bancos' },
  { key: 'modelos', label: 'Modelos de Layout' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'integracoes', label: 'Integrações API' }
] as const;

export const ACOES = [
  { key: 'visualizar', label: 'Visualizar' },
  { key: 'criar', label: 'Criar' },
  { key: 'editar', label: 'Editar' },
  { key: 'excluir', label: 'Excluir' }
] as const;

export function usePerfisAcesso() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: perfis = [], isLoading, error } = useQuery({
    queryKey: ['perfis-acesso'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_perfis_acesso')
        .select('*')
        .or('deleted.is.null,deleted.eq.')
        .order('sistema', { ascending: false })
        .order('nome');
      
      if (error) throw error;
      
      return (data || []).map(perfil => ({
        ...perfil,
        permissoes: (perfil.permissoes as unknown as Permissoes) || defaultPermissoes
      })) as PerfilAcesso[];
    }
  });

  const criarPerfil = useMutation({
    mutationFn: async (perfil: Omit<PerfilAcesso, 'id' | 'created_at' | 'updated_at' | 'deleted' | 'sistema'>) => {
      const { data, error } = await supabase
        .from('vv_b_perfis_acesso')
        .insert([{
          nome: perfil.nome,
          descricao: perfil.descricao,
          permissoes: JSON.parse(JSON.stringify(perfil.permissoes)),
          sistema: false
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis-acesso'] });
      toast({
        title: 'Perfil criado',
        description: 'O perfil de acesso foi criado com sucesso.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar perfil',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const atualizarPerfil = useMutation({
    mutationFn: async ({ id, ...perfil }: Partial<PerfilAcesso> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (perfil.nome !== undefined) updateData.nome = perfil.nome;
      if (perfil.descricao !== undefined) updateData.descricao = perfil.descricao;
      if (perfil.permissoes !== undefined) updateData.permissoes = perfil.permissoes;

      const { error } = await supabase
        .from('vv_b_perfis_acesso')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis-acesso'] });
      toast({
        title: 'Perfil atualizado',
        description: 'O perfil de acesso foi atualizado com sucesso.'
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

  const excluirPerfil = useMutation({
    mutationFn: async (perfilId: string) => {
      // Validar se é sistema antes de chamar RPC (embora deva ter trigger no banco também)
      const { data: perfil } = await supabase
        .from('vv_b_perfis_acesso')
        .select('sistema')
        .eq('id', perfilId)
        .single();
        
      if (perfil?.sistema) {
        throw new Error('Não é possível excluir um perfil de sistema.');
      }

      const { error } = await supabase
        .from('vv_b_perfis_acesso')
        .update({
          deleted: 'X',
          data_delete: new Date().toISOString()
        })
        .eq('id', perfilId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis-acesso'] });
      toast({
        title: 'Perfil excluído',
        description: 'O perfil de acesso foi excluído com sucesso.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir perfil',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    perfis,
    isLoading,
    error,
    criarPerfil,
    atualizarPerfil,
    excluirPerfil,
    defaultPermissoes
  };
}
