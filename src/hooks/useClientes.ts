import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Cliente } from '@/types/boleto';

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase
        .from('vv_b_clientes')
        .select('*')
        .is('deleted', null)
        .order('razao_social');
      
      if (error) {
        console.error('Erro ao carregar clientes:', error);
        throw error;
      }
      
      return (data || []).map(cliente => ({
        id: cliente.id,
        razao_social: cliente.razao_social,
        cnpj: cliente.cnpj,
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        cep: cliente.cep || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        lzone: cliente.lzone || '',
        parceiro_negocio: cliente.parceiro_negocio || '',
        business_partner: cliente.business_partner || '',
        agente_frete: cliente.agente_frete || '',
      }));
    },
  });
}
