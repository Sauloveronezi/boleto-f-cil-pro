import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Banco } from '@/types/boleto';

export function useBancos() {
  return useQuery({
    queryKey: ['bancos'],
    queryFn: async (): Promise<Banco[]> => {
      const { data, error } = await supabase
        .from('vv_b_bancos')
        .select('*')
        .is('deleted', null)
        .order('nome_banco');
      
      if (error) {
        console.error('Erro ao carregar bancos:', error);
        throw error;
      }
      
      return (data || []).map(banco => ({
        id: banco.id,
        nome_banco: banco.nome_banco,
        codigo_banco: banco.codigo_banco.trim(),
        logo_url: banco.logo_url,
        ativo: banco.ativo ?? true,
        tipo_layout_padrao: banco.tipo_layout_padrao as 'CNAB_240' | 'CNAB_400' | undefined,
      }));
    },
  });
}
