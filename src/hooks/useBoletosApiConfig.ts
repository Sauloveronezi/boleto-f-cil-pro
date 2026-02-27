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

const normalizeFiltroChave = (chaveOriginal: string) => {
  const chave = chaveOriginal.trim();
  const chaveSemEspacos = chave.replace(/\s+/g, '_');
  const lower = chaveSemEspacos.toLowerCase();

  // Legado do módulo antigo
  if (['dataemissaoinicio', 'data_emissao_inicio', 'dataemissaofim', 'data_emissao_fim'].includes(lower)) {
    return 'data_emissao';
  }

  if (['datavencimentoinicio', 'data_vencimento_inicio', 'datavencimentofim', 'data_vencimento_fim', 'data_vencimento'].includes(lower)) {
    return 'data_vencimento';
  }

  if (['clienteid', 'cliente_id', 'cliente'].includes(lower)) {
    return 'cliente';
  }

  if (['estado', 'uf'].includes(lower)) {
    return 'uf';
  }

  if (['cidade', 'dyn_cidade'].includes(lower)) {
    return 'dyn_cidade';
  }

  if (['transportadora', 'dyn_zonatransporte'].includes(lower)) {
    return 'transportadora';
  }

  // Sufixos de range
  return chaveSemEspacos.replace(/_(de|ate)$/i, '');
};

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
  const allItems = data || [];

  const colunas = allItems.filter(c => c.tipo === 'coluna');

  const filtrosDaColuna = colunas
    .filter(c => c.visivel && c.uso_filtro && c.uso_filtro !== 'nenhum')
    .map(c => ({ ...c, chave: normalizeFiltroChave(c.chave) }));

  const basesComUsoNaColuna = new Set(
    filtrosDaColuna.map(c => normalizeFiltroChave(c.chave))
  );

  const filtrosLegados = allItems
    .filter(c => c.tipo === 'filtro' && c.visivel)
    .map((f) => {
      const chaveBase = normalizeFiltroChave(f.chave);
      const colunaCorrespondente = colunas.find(c => normalizeFiltroChave(c.chave) === chaveBase);

      // Se já existe configuração de uso_filtro na coluna, ignora legado para evitar duplicidade
      if (colunaCorrespondente && basesComUsoNaColuna.has(chaveBase)) return null;

      // Se houver coluna correspondente sem uso_filtro definido, usa a coluna como base (melhor UX e ordem)
      if (colunaCorrespondente) {
        return {
          ...colunaCorrespondente,
          chave: chaveBase,
          uso_filtro: (f.nivel || 'primario') as 'primario' | 'secundario',
        } as BoletosApiConfigItem;
      }

      return {
        ...f,
        chave: chaveBase,
        uso_filtro: (f.nivel || 'primario') as 'primario' | 'secundario',
      } as BoletosApiConfigItem;
    })
    .filter(Boolean) as BoletosApiConfigItem[];

  // Dedupe final por chave base (ex: data_emissao_de + data_emissao_ate => data_emissao)
  const merged = [...filtrosDaColuna, ...filtrosLegados];
  const unicosMap = new Map<string, BoletosApiConfigItem>();

  merged.forEach((item) => {
    const chaveBase = normalizeFiltroChave(item.chave);
    const existente = unicosMap.get(chaveBase);

    // Prioriza item do tipo coluna sobre legado
    if (!existente || (existente.tipo === 'filtro' && item.tipo === 'coluna')) {
      unicosMap.set(chaveBase, { ...item, chave: chaveBase });
    }
  });

  const visiveis = Array.from(unicosMap.values()).sort((a, b) => (a.ordem || 99) - (b.ordem || 99));

  return {
    data: visiveis,
    primarios: visiveis.filter(f => (f.uso_filtro === 'primario') || (f.tipo === 'filtro' && f.nivel === 'primario')),
    secundarios: visiveis.filter(f => (f.uso_filtro === 'secundario') || (f.tipo === 'filtro' && f.nivel === 'secundario')),
    allFiltros: visiveis,
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

