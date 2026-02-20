import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDefaultTemplateFields } from '@/data/defaultBoletoTemplateFields';
import { getSantanderTemplateFields } from '@/data/defaultSantanderTemplateFields';

// ===== Types =====
export interface BoletoTemplateRow {
  id: string;
  name: string;
  bank_code: string | null;
  layout_version: string | null;
  background_pdf_url: string;
  page_width: number;
  page_height: number;
  requires_calculation: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoletoTemplateFieldRow {
  id: string;
  template_id: string;
  key: string;
  label: string | null;
  source_ref: string | null;
  page: number;
  bbox: [number, number, number, number];
  font_family: string;
  font_size: number;
  bold: boolean;
  align: string;
  format: string | null;
  color: string;
  bg_color: string | null;
  is_barcode: boolean;
  is_digitable_line: boolean;
  visible: boolean;
  display_order: number;
}

const TEMPLATES_TABLE = 'vv_b_boleto_templates';
const FIELDS_TABLE = 'vv_b_boleto_template_fields';

const DEFAULT_TEMPLATE_ID = 'b0000000-0000-0000-0000-000000000001';
const SANTANDER_TEMPLATE_ID = 'b0000000-0000-0000-0000-000000000033';

// ===== Hooks de leitura =====

/** Lista todos os templates de boleto (não deletados) */
export function useBoletoTemplates() {
  return useQuery({
    queryKey: ['boleto_templates'],
    queryFn: async (): Promise<BoletoTemplateRow[]> => {
      const { data, error } = await supabase
        .from(TEMPLATES_TABLE)
        .select('*')
        .is('deleted', null)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) {
        console.error('Erro ao listar templates:', error);
        return [];
      }
      return (data || []) as unknown as BoletoTemplateRow[];
    },
  });
}

/** Busca o template padrão */
export function useDefaultBoletoTemplate() {
  return useQuery({
    queryKey: ['boleto_template_default'],
    queryFn: async (): Promise<BoletoTemplateRow | null> => {
      const { data, error } = await supabase
        .from(TEMPLATES_TABLE)
        .select('*')
        .eq('is_default', true)
        .is('deleted', null)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Template padrão não encontrado:', error);
        return null;
      }
      return data as unknown as BoletoTemplateRow | null;
    },
  });
}

/** Busca os campos de um template */
export function useBoletoTemplateFields(templateId: string | undefined) {
  return useQuery({
    queryKey: ['boleto_template_fields', templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<BoletoTemplateFieldRow[]> => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from(FIELDS_TABLE)
        .select('*')
        .eq('template_id', templateId)
        .is('deleted', null)
        .order('display_order');

      if (error) {
        console.error('Erro ao carregar campos do template:', error);
        return [];
      }
      return (data || []).map(row => ({
        ...row,
        bbox: row.bbox as unknown as [number, number, number, number],
      })) as unknown as BoletoTemplateFieldRow[];
    },
  });
}

// ===== Seed do template padrão =====

/** Cria ou recria o template padrão (deleta campos antigos e reinsere com coordenadas atualizadas) */
export function useSeedDefaultTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Verifica se o template já existe
      const { data: existing } = await supabase
        .from(TEMPLATES_TABLE)
        .select('id')
        .eq('id', DEFAULT_TEMPLATE_ID)
        .is('deleted', null)
        .maybeSingle();

      if (!existing) {
        // Cria o template
        const { error: tplError } = await supabase
          .from(TEMPLATES_TABLE)
          .insert({
            id: DEFAULT_TEMPLATE_ID,
            name: 'Modelo Padrão Bradesco',
            bank_code: '237',
            layout_version: 'v1',
            background_pdf_url: '/templates/modelo_padrao_bradesco.pdf',
            page_width: 210,
            page_height: 297,
            requires_calculation: true,
            is_default: true,
          });

        if (tplError) throw tplError;
      }

      // Sempre deleta campos existentes e reinsere (para atualizar coordenadas)
      await supabase
        .from(FIELDS_TABLE)
        .delete()
        .eq('template_id', DEFAULT_TEMPLATE_ID);

      // Inserir campos atualizados
      const fields = getDefaultTemplateFields();
      const fieldsToInsert = fields.map(f => ({
        template_id: DEFAULT_TEMPLATE_ID,
        key: f.key,
        label: f.label,
        source_ref: f.source_ref,
        page: f.page,
        bbox: f.bbox,
        font_family: f.font_family || 'helvetica',
        font_size: f.font_size || 10,
        bold: f.bold || false,
        align: f.align || 'left',
        format: f.format || null,
        is_barcode: f.is_barcode || false,
        is_digitable_line: f.is_digitable_line || false,
        display_order: f.display_order,
        visible: true,
      }));

      const { error: fieldsError } = await supabase
        .from(FIELDS_TABLE)
        .insert(fieldsToInsert);

      if (fieldsError) throw fieldsError;

      console.log(`[seed] Template padrão criado/atualizado com ${fieldsToInsert.length} campos`);
      return { id: DEFAULT_TEMPLATE_ID };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boleto_templates'] });
      queryClient.invalidateQueries({ queryKey: ['boleto_template_default'] });
      queryClient.invalidateQueries({ queryKey: ['boleto_template_fields'] });
    },
  });
}

/** Cria ou recria o template Santander */
export function useSeedSantanderTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from(TEMPLATES_TABLE)
        .select('id')
        .eq('id', SANTANDER_TEMPLATE_ID)
        .is('deleted', null)
        .maybeSingle();

      if (!existing) {
        const { error: tplError } = await supabase
          .from(TEMPLATES_TABLE)
          .insert({
            id: SANTANDER_TEMPLATE_ID,
            name: 'Modelo Padrão Santander',
            bank_code: '033',
            layout_version: 'v1',
            background_pdf_url: '/templates/boleto_santander_referencia.pdf',
            page_width: 210,
            page_height: 297,
            requires_calculation: true,
            is_default: false,
          });
        if (tplError) throw tplError;
      }

      await supabase
        .from(FIELDS_TABLE)
        .delete()
        .eq('template_id', SANTANDER_TEMPLATE_ID);

      const fields = getSantanderTemplateFields();
      const fieldsToInsert = fields.map(f => ({
        template_id: SANTANDER_TEMPLATE_ID,
        key: f.key,
        label: f.label,
        source_ref: f.source_ref,
        page: f.page,
        bbox: f.bbox,
        font_family: f.font_family || 'helvetica',
        font_size: f.font_size || 10,
        bold: f.bold || false,
        align: f.align || 'left',
        format: f.format || null,
        is_barcode: f.is_barcode || false,
        is_digitable_line: f.is_digitable_line || false,
        display_order: f.display_order,
        visible: true,
      }));

      const { error: fieldsError } = await supabase
        .from(FIELDS_TABLE)
        .insert(fieldsToInsert);
      if (fieldsError) throw fieldsError;

      console.log(`[seed] Template Santander criado/atualizado com ${fieldsToInsert.length} campos`);
      return { id: SANTANDER_TEMPLATE_ID };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boleto_templates'] });
      queryClient.invalidateQueries({ queryKey: ['boleto_template_fields'] });
    },
  });
}

// ===== Mutations =====

/** Atualiza um campo do template */
export function useUpdateTemplateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldId, updates }: { fieldId: string; updates: Partial<BoletoTemplateFieldRow> }) => {
      const { error } = await supabase
        .from(FIELDS_TABLE)
        .update(updates as any)
        .eq('id', fieldId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boleto_template_fields'] });
    },
  });
}

/** Adiciona um novo campo ao template */
export function useAddTemplateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (field: Omit<BoletoTemplateFieldRow, 'id'>) => {
      const { data, error } = await supabase
        .from(FIELDS_TABLE)
        .insert(field as any)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boleto_template_fields'] });
    },
  });
}

/** Soft delete de um campo */
export function useDeleteTemplateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from(FIELDS_TABLE)
        .update({ deleted: '*', data_delete: new Date().toISOString() } as any)
        .eq('id', fieldId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boleto_template_fields'] });
    },
  });
}
