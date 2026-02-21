import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BoletoCampoMapeamento {
  id: string;
  campo_boleto: string;
  label: string;
  fonte_campo: string;
  tipo_transformacao: string;
  parametros: Record<string, any>;
  ativo: boolean;
  ordem: number;
}

const TABLE = 'vv_b_boleto_campo_mapeamento';

export function useBoletoCampoMapeamento() {
  return useQuery({
    queryKey: ['boleto_campo_mapeamento'],
    queryFn: async (): Promise<BoletoCampoMapeamento[]> => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .is('deleted', null)
        .order('ordem');
      if (error) { console.error(error); return []; }
      return (data || []) as unknown as BoletoCampoMapeamento[];
    },
  });
}

export function useUpdateBoletoCampoMapeamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BoletoCampoMapeamento> }) => {
      const { error } = await supabase.from(TABLE).update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boleto_campo_mapeamento'] }),
  });
}

export function useAddBoletoCampoMapeamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campo: Omit<BoletoCampoMapeamento, 'id'>) => {
      const { error } = await supabase.from(TABLE).insert(campo as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boleto_campo_mapeamento'] }),
  });
}

export function useDeleteBoletoCampoMapeamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLE)
        .update({ deleted: '*', data_delete: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boleto_campo_mapeamento'] }),
  });
}
