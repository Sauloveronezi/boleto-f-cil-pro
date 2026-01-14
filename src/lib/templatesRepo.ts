import { supabase } from '@/integrations/supabase/client'
import { BoletoTemplate, BoletoTemplateField } from '@/types/boletoTemplate'

const DB_TABLE = 'vv_b_modelos_boleto';
const FIELDS_TABLE = 'vv_b_api_mapeamento_campos';

export async function listTemplates(): Promise<BoletoTemplate[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLE)
      .select('*')
      .is('deleted', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(mapDbToTemplate);
  } catch {
    const localRaw = localStorage.getItem('vv_b_boleto_templates')
    const local: BoletoTemplate[] = localRaw ? JSON.parse(localRaw) : []
    return local;
  }
}

export async function getTemplate(id: string): Promise<BoletoTemplate | null> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLE)
      .select('*')
      .eq('id', id)
      .is('deleted', null)
      .single();
    
    if (error) throw error;
    if (data) return mapDbToTemplate(data);
  } catch {}
  const localRaw = localStorage.getItem('vv_b_boleto_templates')
  const local: BoletoTemplate[] = localRaw ? JSON.parse(localRaw) : []
  return local.find(t => t.id === id) || null
}

export async function getTemplateFields(templateId: string): Promise<BoletoTemplateField[]> {
  // Para compatibilidade, campos agora estão em campos_mapeados do modelo
  const template = await getTemplate(templateId);
  if (!template) return [];
  
  // Extrair campos do JSON campos_mapeados
  const localRaw = localStorage.getItem('vv_b_boleto_template_fields')
  const all: BoletoTemplateField[] = localRaw ? JSON.parse(localRaw) : []
  return all.filter(f => f.template_id === templateId)
}

export async function createTemplate(tpl: Omit<BoletoTemplate, 'id'>): Promise<BoletoTemplate> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLE)
      .insert({
        nome_modelo: tpl.name,
        banco_id: tpl.bank_code || null,
        largura_pagina: tpl.page_width,
        altura_pagina: tpl.page_height,
        pdf_storage_path: tpl.background_pdf_url,
      })
      .select('*')
      .single();
    
    if (error) throw error;
    if (data) return mapDbToTemplate(data);
  } catch {}
  
  // Fallback local
  const localRaw = localStorage.getItem('vv_b_boleto_templates')
  const all: BoletoTemplate[] = localRaw ? JSON.parse(localRaw) : []
  const localTpl: BoletoTemplate = {
    id: `local_${Date.now()}`,
    name: tpl.name,
    bank_code: tpl.bank_code,
    layout_version: tpl.layout_version,
    background_pdf_url: tpl.background_pdf_url,
    page_width: tpl.page_width,
    page_height: tpl.page_height,
    requires_calculation: tpl.requires_calculation ?? false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  all.unshift(localTpl)
  localStorage.setItem('vv_b_boleto_templates', JSON.stringify(all))
  return localTpl
}

export async function updateTemplate(id: string, patch: Partial<BoletoTemplate>): Promise<BoletoTemplate> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLE)
      .update({
        nome_modelo: patch.name,
        banco_id: patch.bank_code,
        largura_pagina: patch.page_width,
        altura_pagina: patch.page_height,
        pdf_storage_path: patch.background_pdf_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    if (data) return mapDbToTemplate(data);
  } catch {}
  
  // Fallback local update
  const localRaw = localStorage.getItem('vv_b_boleto_templates')
  const all: BoletoTemplate[] = localRaw ? JSON.parse(localRaw) : []
  const idx = all.findIndex(t => t.id === id)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() } as BoletoTemplate
    localStorage.setItem('vv_b_boleto_templates', JSON.stringify(all))
    return all[idx]
  }
  throw new Error('Template não encontrado para atualizar')
}

export async function saveTemplateFields(templateId: string, fields: BoletoTemplateField[]): Promise<void> {
  // Salvar campos no localStorage por enquanto
  const localRaw = localStorage.getItem('vv_b_boleto_template_fields')
  let all: BoletoTemplateField[] = localRaw ? JSON.parse(localRaw) : []
  // Remove antigos
  all = all.filter(f => f.template_id !== templateId)
  // Adiciona novos
  all = [...all, ...fields]
  localStorage.setItem('vv_b_boleto_template_fields', JSON.stringify(all))
}

// Helper to map DB row to BoletoTemplate interface
function mapDbToTemplate(row: any): BoletoTemplate {
  return {
    id: row.id,
    name: row.nome_modelo || '',
    bank_code: row.banco_id || '',
    layout_version: row.tipo_layout || '',
    background_pdf_url: row.pdf_storage_path || '',
    page_width: row.largura_pagina || 210,
    page_height: row.altura_pagina || 297,
    requires_calculation: false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
