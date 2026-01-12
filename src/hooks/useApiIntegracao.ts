import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApiIntegracao {
  id: string;
  nome: string;
  tipo: string;
  endpoint_base: string | null;
  modo_demo: boolean;
  campos_chave: string[];
  headers_autenticacao: Record<string, string>;
  ativo: boolean;
  ultima_sincronizacao: string | null;
  json_path: string | null;
  modelo_boleto_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoletoApi {
  id: string;
  integracao_id: string | null;
  numero_nota: string;
  cliente_id: string;
  numero_cobranca: string;
  data_emissao: string | null;
  data_vencimento: string | null;
  valor: number | null;
  dados_extras: Record<string, any>;
  sincronizado_em: string;
  created_at: string;
  dyn_nome_do_cliente?: string;
  dyn_cidade?: string;
  dyn_conta?: string;
  dyn_desconto1?: string;
  dyn_desconto_data?: string;
  dyn_zonatransporte?: string;
  taxnumber1?: string;
}

export interface SyncLog {
  id: string;
  integracao_id: string;
  status: string;
  registros_processados: number;
  registros_novos: number;
  registros_atualizados: number;
  erros: any[];
  duracao_ms: number;
  created_at: string;
}

export function useApiIntegracoes() {
  return useQuery({
    queryKey: ['api-integracoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_api_integracoes')
        .select('*')
        .is('deleted', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ApiIntegracao[];
    }
  });
}

export function useBoletosApi(filtros?: {
  dataEmissaoInicio?: string;
  dataEmissaoFim?: string;
  clienteId?: string;
  cnpj?: string;
  estado?: string;
  cidade?: string;
}) {
  return useQuery({
    queryKey: ['boletos-api', filtros],
    queryFn: async () => {
      let query = supabase
        .from('vv_b_boletos_api')
        .select('*')
        .is('deleted', null)
        .order('data_emissao', { ascending: false });

      if (filtros?.dataEmissaoInicio) {
        query = query.gte('data_emissao', filtros.dataEmissaoInicio);
      }
      if (filtros?.dataEmissaoFim) {
        query = query.lte('data_emissao', filtros.dataEmissaoFim);
      }
      if (filtros?.clienteId) {
        query = query.eq('cliente_id', filtros.clienteId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Filtrar por CNPJ, estado, cidade do cliente no JS
      let resultado = data || [];
      
      if (filtros?.cnpj) {
        resultado = resultado.filter((b: any) => 
          b.taxnumber1?.includes(filtros.cnpj)
        );
      }
      if (filtros?.estado) {
        // Estado não parece estar mapeado diretamente, talvez dyn_cidade tenha UF ou precise ver outro campo
        // Por enquanto, vamos tentar filtrar se houver campo 'uf' ou dentro de dyn_cidade
        resultado = resultado.filter((b: any) => 
          b.uf === filtros.estado || b.dyn_cidade?.includes(filtros.estado)
        );
      }
      if (filtros?.cidade) {
        resultado = resultado.filter((b: any) => 
          b.dyn_cidade?.toLowerCase().includes(filtros.cidade.toLowerCase())
        );
      }

      return resultado;
    }
  });
}

export function useSyncLogs(integracaoId?: string) {
  return useQuery({
    queryKey: ['sync-logs', integracaoId],
    queryFn: async () => {
      let query = supabase
        .from('vv_b_api_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (integracaoId) {
        query = query.eq('integracao_id', integracaoId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as SyncLog[];
    }
  });
}

export function useSyncApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      integracao_id?: string;
      modo_demo?: boolean;
      endpoint?: string;
      headers_auth?: Record<string, string>;
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-api-boletos', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos-api'] });
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['api-integracoes'] });
    }
  });
}

export function useUpdateIntegracao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      nome?: string;
      endpoint_base?: string;
      modo_demo?: boolean;
      campos_chave?: string[];
      headers_autenticacao?: Record<string, string>;
      ativo?: boolean;
    }) => {
      const { id, ...updates } = params;
      
      const { data, error } = await supabase
        .from('vv_b_api_integracoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-integracoes'] });
    }
  });
}
