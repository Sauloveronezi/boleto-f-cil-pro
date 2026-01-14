import { supabase } from '@/integrations/supabase/client'
import { BoletoTemplate, BoletoTemplateField } from '@/types/boletoTemplate'

export async function listTemplates(): Promise<BoletoTemplate[]> {
  const db: BoletoTemplate[] = await supabase
    .from('vv_b_boleto_templates')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data }) => (data || []) as BoletoTemplate[])
    .catch(() => [])
  const localRaw = localStorage.getItem('vv_b_boleto_templates')
  const local: BoletoTemplate[] = localRaw ? JSON.parse(localRaw) : []
  return [...local, ...db]
}

export async function getTemplate(id: string): Promise<BoletoTemplate | null> {
  try {
    const { data } = await supabase
      .from('vv_b_boleto_templates')
      .select('*')
      .eq('id', id)
      .single()
    if (data) return data as BoletoTemplate
  } catch {}
  const localRaw = localStorage.getItem('vv_b_boleto_templates')
  const local: BoletoTemplate[] = localRaw ? JSON.parse(localRaw) : []
  return local.find(t => t.id === id) || null
}

export async function getTemplateFields(templateId: string): Promise<BoletoTemplateField[]> {
  try {
    const { data } = await supabase
      .from('vv_b_boleto_template_fields')
      .select('*')
      .eq('template_id', templateId)
      .order('page', { ascending: true })
    if (data) return (data || []) as BoletoTemplateField[]
  } catch {}
  const localRaw = localStorage.getItem('vv_b_boleto_template_fields')
  const all: BoletoTemplateField[] = localRaw ? JSON.parse(localRaw) : []
  return all.filter(f => f.template_id === templateId)
}

export async function createTemplate(tpl: Omit<BoletoTemplate, 'id'>): Promise<BoletoTemplate> {
  // Tenta banco
  try {
    const { data, error } = await supabase
      .from('vv_b_boleto_templates')
      .insert({
        name: tpl.name,
        bank_code: tpl.bank_code,
        layout_version: tpl.layout_version,
        background_pdf_url: tpl.background_pdf_url,
        page_width: tpl.page_width,
        page_height: tpl.page_height,
        requires_calculation: tpl.requires_calculation ?? false,
      })
      .select('*')
      .single()
    if (!error && data) {
      return data as BoletoTemplate
    }
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
    const { data } = await supabase
      .from('vv_b_boleto_templates')
      .update({
        name: patch.name,
        bank_code: patch.bank_code,
        layout_version: patch.layout_version,
        background_pdf_url: patch.background_pdf_url,
        page_width: patch.page_width,
        page_height: patch.page_height,
        requires_calculation: patch.requires_calculation,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (data) return data as BoletoTemplate
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
  try {
    await supabase
      .from('vv_b_boleto_template_fields')
      .delete()
      .eq('template_id', templateId)
    if (fields.length === 0) return
    const payload = fields.map(f => ({
      template_id: templateId,
      key: f.key,
      source_ref: f.source_ref,
      page: f.page ?? 1,
      bbox: f.bbox,
      font_family: f.font_family || 'helvetica',
      font_size: f.font_size || 10,
      align: f.align || 'left',
      format: f.format,
      is_barcode: !!f.is_barcode,
      is_digitable_line: !!f.is_digitable_line,
    }))
    const { error } = await supabase
      .from('vv_b_boleto_template_fields')
      .insert(payload)
    if (error) throw error
  } catch {
    const localRaw = localStorage.getItem('vv_b_boleto_template_fields')
    let all: BoletoTemplateField[] = localRaw ? JSON.parse(localRaw) : []
    // Remove antigos
    all = all.filter(f => f.template_id !== templateId)
    // Adiciona novos
    all = [...all, ...fields]
    localStorage.setItem('vv_b_boleto_template_fields', JSON.stringify(all))
  }
}
