import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NotaFiscal, StatusNota } from '@/types/boleto';

export function useNotasFiscais() {
  return useQuery({
    queryKey: ['notas_fiscais'],
    queryFn: async (): Promise<NotaFiscal[]> => {
      const { data, error } = await supabase
        .from('vv_b_notas_fiscais')
        .select('*')
        .is('deleted', null)
        .order('data_emissao', { ascending: false });
      
      if (error) {
        console.error('Erro ao carregar notas fiscais:', error);
        throw error;
      }
      
      return (data || []).map(nota => ({
        id: nota.id,
        numero_nota: nota.numero_nota,
        serie: nota.serie || '1',
        codigo_cliente: nota.cliente_id,
        data_emissao: nota.data_emissao,
        data_vencimento: nota.data_vencimento,
        valor_titulo: Number(nota.valor_titulo),
        status: (nota.status as StatusNota) || 'aberta',
        moeda: nota.moeda || 'BRL',
        referencia_interna: nota.referencia_interna || '',
      }));
    },
  });
}
