import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ConfiguracaoBanco } from '@/types/boleto';

export function useConfiguracoesBanco() {
  return useQuery({
    queryKey: ['configuracoes_banco'],
    queryFn: async (): Promise<ConfiguracaoBanco[]> => {
      const { data, error } = await supabase
        .from('vv_b_configuracoes_banco')
        .select('*')
        .is('deleted', null);
      
      if (error) {
        console.error('Erro ao carregar configurações de banco:', error);
        throw error;
      }
      
      return (data || []).map(config => ({
        id: config.id,
        banco_id: config.banco_id,
        carteira: config.carteira || '',
        agencia: config.agencia || '',
        conta: config.conta || '',
        codigo_cedente: config.codigo_cedente || '',
        taxa_juros_mensal: Number(config.taxa_juros_mensal) || 0,
        multa_percentual: Number(config.multa_percentual) || 0,
        dias_carencia: config.dias_carencia || 0,
        texto_instrucao_padrao: config.texto_instrucao_padrao || '',
      }));
    },
  });
}
