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
  nivel: 'primario' | 'secundario';
  uso_filtro: 'nenhum' | 'primario' | 'secundario';
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
  // Derive filters from columns that have uso_filtro set (new unified model)
  // Also support legacy tipo='filtro' entries
  const allItems = data || [];
  const visiveis = allItems.filter(c => {
    // New model: columns with uso_filtro != 'nenhum'
    if (c.tipo === 'coluna' && c.uso_filtro && c.uso_filtro !== 'nenhum') return c.visivel;
    // Legacy: tipo='filtro'
    if (c.tipo === 'filtro' && c.visivel) return true;
    return false;
  });
  return {
    data: visiveis,
    primarios: visiveis.filter(f => (f.uso_filtro === 'primario') || (f.tipo === 'filtro' && f.nivel === 'primario')),
    secundarios: visiveis.filter(f => (f.uso_filtro === 'secundario') || (f.tipo === 'filtro' && f.nivel === 'secundario')),
    allFiltros: allItems.filter(c => c.tipo === 'filtro' || (c.uso_filtro && c.uso_filtro !== 'nenhum')),
    ...rest,
  };
}

export function useAddBoletosApiConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: { tipo: 'coluna' | 'filtro'; chave: string; label: string; campo_boleto?: string; ordem?: number; nivel?: 'primario' | 'secundario'; uso_filtro?: string }) => {
      const { data, error } = await supabase
        .from('vv_b_boletos_api_config' as any)
        .insert({
          tipo: item.tipo,
          chave: item.chave,
          label: item.label,
          campo_boleto: item.campo_boleto || item.chave,
          ordem: item.ordem || 99,
          visivel: true,
          nivel: item.nivel || 'primario',
          uso_filtro: item.uso_filtro || 'nenhum',
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

export function useUpdateBoletosApiConfigNivel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nivel }: { id: string; nivel: 'primario' | 'secundario' }) => {
      const { error } = await supabase
        .from('vv_b_boletos_api_config' as any)
        .update({ nivel, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateBoletosApiConfigUsoFiltro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, uso_filtro }: { id: string; uso_filtro: 'nenhum' | 'primario' | 'secundario' }) => {
      const { error } = await supabase
        .from('vv_b_boletos_api_config' as any)
        .update({ uso_filtro, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateBoletosApiConfigOrdem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { id: string; ordem: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from('vv_b_boletos_api_config' as any)
          .update({ ordem: item.ordem, updated_at: new Date().toISOString() } as any)
          .eq('id', item.id);
        if (error) throw error;
      }
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
