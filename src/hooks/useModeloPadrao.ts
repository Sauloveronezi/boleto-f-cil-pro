import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampoMapeadoModelo {
  id: string;
  tipo: string;
  label: string;
  variavel?: string;
  valor_fixo?: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  fonte?: string;
  tamanho_fonte?: number;
  negrito?: boolean;
  italico?: boolean;
  borda?: boolean;
  alinhamento?: 'left' | 'center' | 'right';
  formato?: string;
  cor?: string;
  cor_fundo?: string;
}

export interface ModeloBoleto {
  id: string;
  nome_modelo: string;
  banco_id: string | null;
  bancos_compativeis: string[] | null;
  tipo_layout: string;
  formato_pagina: string;
  largura_pagina: number;
  altura_pagina: number;
  padrao: boolean;
  campos_mapeados: CampoMapeadoModelo[];
  texto_instrucoes: string | null;
  pdf_storage_bucket: string | null;
  pdf_storage_path: string | null;
}

export function useModeloPadrao() {
  return useQuery({
    queryKey: ['modelo_boleto_padrao'],
    queryFn: async (): Promise<ModeloBoleto | null> => {
      const { data, error } = await supabase
        .from('vv_b_modelos_boleto')
        .select('*')
        .eq('padrao', true)
        .is('deleted', null)
        .single();

      if (error) {
        console.warn('Modelo padrão não encontrado:', error);
        return null;
      }

      return {
        ...data,
        campos_mapeados: (data.campos_mapeados as unknown as CampoMapeadoModelo[]) || [],
      } as ModeloBoleto;
    },
  });
}

export function useModelosBoleto() {
  return useQuery({
    queryKey: ['modelos_boleto'],
    queryFn: async (): Promise<ModeloBoleto[]> => {
      const { data, error } = await supabase
        .from('vv_b_modelos_boleto')
        .select('*')
        .is('deleted', null)
        .order('padrao', { ascending: false })
        .order('nome_modelo');

      if (error) {
        console.error('Erro ao carregar modelos:', error);
        return [];
      }

      return (data || []).map(m => ({
        ...m,
        campos_mapeados: (m.campos_mapeados as unknown as CampoMapeadoModelo[]) || [],
      })) as ModeloBoleto[];
    },
  });
}
