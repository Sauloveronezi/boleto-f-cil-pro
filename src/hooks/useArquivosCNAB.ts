import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface ArquivoCNABLido {
  id: string;
  nome_arquivo: string;
  tipo_arquivo: 'remessa' | 'retorno';
  tipo_cnab: 'CNAB_240' | 'CNAB_400';
  banco_id: string | null;
  configuracao_cnab_id: string | null;
  conteudo_original: string;
  dados_parseados: Json;
  total_registros: number;
  valor_total: number;
  data_processamento: string;
  status: 'processado' | 'editado' | 'exportado';
  usuario_id: string | null;
  created_at: string;
  updated_at: string;
  banco?: {
    id: string;
    nome_banco: string;
    codigo_banco: string;
  };
}

export interface LinhaCNAB {
  id: string;
  arquivo_cnab_id: string;
  numero_linha: number;
  tipo_registro: string | null;
  conteudo_original: string;
  conteudo_editado: string | null;
  campos_extraidos: Json;
  campos_editados: Json | null;
  status: 'original' | 'editado' | 'removido' | 'adicionado';
  created_at: string;
  updated_at: string;
}

export interface NovoArquivoCNAB {
  nome_arquivo: string;
  tipo_arquivo: 'remessa' | 'retorno';
  tipo_cnab: 'CNAB_240' | 'CNAB_400';
  banco_id?: string;
  configuracao_cnab_id?: string;
  conteudo_original: string;
  dados_parseados: Json;
  total_registros?: number;
  valor_total?: number;
  linhas?: Omit<LinhaCNAB, 'id' | 'arquivo_cnab_id' | 'created_at' | 'updated_at'>[];
}

export function useArquivosCNAB() {
  return useQuery({
    queryKey: ['arquivos-cnab'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_arquivos_cnab_lidos')
        .select(`
          *,
          banco:vv_b_bancos(id, nome_banco, codigo_banco)
        `)
        .is('deleted', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ArquivoCNABLido[];
    },
  });
}

export function useArquivoCNAB(id: string | null) {
  return useQuery({
    queryKey: ['arquivo-cnab', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('vv_b_arquivos_cnab_lidos')
        .select(`
          *,
          banco:vv_b_bancos(id, nome_banco, codigo_banco)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ArquivoCNABLido;
    },
    enabled: !!id,
  });
}

export function useLinhasCNAB(arquivoId: string | null) {
  return useQuery({
    queryKey: ['linhas-cnab', arquivoId],
    queryFn: async () => {
      if (!arquivoId) return [];
      
      const { data, error } = await supabase
        .from('vv_b_linhas_cnab')
        .select('*')
        .eq('arquivo_cnab_id', arquivoId)
        .order('numero_linha', { ascending: true });

      if (error) throw error;
      return data as LinhaCNAB[];
    },
    enabled: !!arquivoId,
  });
}

export function useCreateArquivoCNAB() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (novoArquivo: NovoArquivoCNAB) => {
      const { linhas, ...arquivoData } = novoArquivo;
      
      // Criar arquivo
      const { data: arquivo, error: arquivoError } = await supabase
        .from('vv_b_arquivos_cnab_lidos')
        .insert([{
          nome_arquivo: arquivoData.nome_arquivo,
          tipo_arquivo: arquivoData.tipo_arquivo,
          tipo_cnab: arquivoData.tipo_cnab,
          banco_id: arquivoData.banco_id || null,
          configuracao_cnab_id: arquivoData.configuracao_cnab_id || null,
          conteudo_original: arquivoData.conteudo_original,
          dados_parseados: arquivoData.dados_parseados,
          total_registros: arquivoData.total_registros || 0,
          valor_total: arquivoData.valor_total || 0,
        }])
        .select()
        .single();

      if (arquivoError) throw arquivoError;

      // Criar linhas se fornecidas
      if (linhas && linhas.length > 0) {
        const linhasParaInserir = linhas.map(linha => ({
          arquivo_cnab_id: arquivo.id,
          numero_linha: linha.numero_linha,
          tipo_registro: linha.tipo_registro || null,
          conteudo_original: linha.conteudo_original,
          conteudo_editado: linha.conteudo_editado || null,
          campos_extraidos: linha.campos_extraidos as Json,
          campos_editados: linha.campos_editados as Json | null,
          status: linha.status,
        }));

        const { error: linhasError } = await supabase
          .from('vv_b_linhas_cnab')
          .insert(linhasParaInserir);

        if (linhasError) throw linhasError;
      }

      return arquivo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arquivos-cnab'] });
      toast({ title: 'Arquivo CNAB salvo com sucesso!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar arquivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLinhaCNAB() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LinhaCNAB> & { id: string }) => {
      const { data, error } = await supabase
        .from('vv_b_linhas_cnab')
        .update({
          conteudo_editado: updates.conteudo_editado || null,
          campos_editados: updates.campos_editados as Json | null,
          status: updates.status || 'editado',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['linhas-cnab', data.arquivo_cnab_id] });
      queryClient.invalidateQueries({ queryKey: ['arquivos-cnab'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar linha',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateArquivoCNAB() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'processado' | 'editado' | 'exportado' }) => {
      const { data, error } = await supabase
        .from('vv_b_arquivos_cnab_lidos')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arquivos-cnab'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar arquivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteArquivoCNAB() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('vv_b_arquivos_cnab_lidos')
        .update({
          deleted: '*',
          usuario_delete_id: user?.id,
          data_delete: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arquivos-cnab'] });
      toast({ title: 'Arquivo excluído com sucesso!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir arquivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
