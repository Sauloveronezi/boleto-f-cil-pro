import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BoletosApiConfigItem {
  id: string;
  tipo: 'coluna' | 'filtro';
  chave: string;
  label: string;
  visivel: boolean;
  ordem: number;
  campo_boleto: string | null;
}

const QUERY_KEY = 'boletos-api-config';

export function useBoletosApiConfig() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_boletos_api_config' as any)
        .select('*')
        .is('deleted', null)
        .order('ordem');
      if (error) throw error;
      return (data || []) as unknown as BoletosApiConfigItem[];
    },
  });
}

export function useBoletosApiConfigColunas() {
  const { data, ...rest } = useBoletosApiConfig();
  return {
    data: data?.filter(c => c.tipo === 'coluna' && c.visivel) || [],
    allColunas: data?.filter(c => c.tipo === 'coluna') || [],
    ...rest,
  };
}

export function useBoletosApiConfigFiltros() {
  const { data, ...rest } = useBoletosApiConfig();
  return {
    data: data?.filter(c => c.tipo === 'filtro' && c.visivel) || [],
    allFiltros: data?.filter(c => c.tipo === 'filtro') || [],
    ...rest,
  };
}

export function useAddBoletosApiConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: { tipo: 'coluna' | 'filtro'; chave: string; label: string; campo_boleto?: string; ordem?: number }) => {
      const { data, error } = await supabase
        .from('vv_b_boletos_api_config' as any)
        .insert({
          tipo: item.tipo,
          chave: item.chave,
          label: item.label,
          campo_boleto: item.campo_boleto || item.chave,
          ordem: item.ordem || 99,
          visivel: true,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: 'Configuração adicionada' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

export function useToggleBoletosApiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, visivel }: { id: string; visivel: boolean }) => {
      const { error } = await supabase
        .from('vv_b_boletos_api_config' as any)
        .update({ visivel, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteBoletosApiConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vv_b_boletos_api_config' as any)
        .update({
          deleted: '*',
          data_delete: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: 'Item removido' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}
