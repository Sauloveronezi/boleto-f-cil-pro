import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { BoletoTemplate, BoletoTemplateField } from '@/types/boletoTemplate'
import { supabase } from '@/integrations/supabase/client'
import { getTemplate, getTemplateFields } from '@/lib/templatesRepo'
import { gerarCodigoBarras } from '@/lib/barcodeCalculator'

function mmToPt(mm: number): number { return mm * 72 / 25.4 }
function bboxMmToPt(b: [number, number, number, number]) {
  return [mmToPt(b[0]), mmToPt(b[1]), mmToPt(b[2] - b[0]), mmToPt(b[3] - b[1])] as [number, number, number, number]
}

async function fetchBackgroundPdf(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  const ab = await res.arrayBuffer()
  return ab
}

async function loadBoletoData(boletoId: string): Promise<Record<string, any>> {
  const { data } = await supabase
    .from('vv_b_boletos_api')
    .select('*')
    .eq('id', boletoId)
    .single()
  return data || {}
}

function normalizeValue(val: any, format?: string): string {
  if (val == null) return ''
  if (!format) return String(val)
  if (format === 'currency_ptbr') {
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'))
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(n) ? 0 : n)
  }
  if (format === 'date_ddmmyyyy') {
    const d = new Date(val)
    const dd = String(d.getDate()).padStart(2,'0')
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }
  if (format === 'mask_cnpj') {
    const s = String(val).replace(/\D/g,'').padStart(14,'0')
    return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8,12)}-${s.slice(12)}`
  }
  if (format === 'upper') return String(val).toUpperCase()
  if (format === 'numeric_only') return String(val).replace(/\D/g,'')
  return String(val)
}

async function ensureFont(doc: PDFDocument, name?: string) {
  if (name && name.toLowerCase().includes('times')) return await doc.embedFont(StandardFonts.TimesRoman)
  if (name && name.toLowerCase().includes('courier')) return await doc.embedFont(StandardFonts.Courier)
  return await doc.embedFont(StandardFonts.Helvetica)
}

function drawBarcodeI25(page: any, value: string, x: number, y: number, w: number, h: number) {
  const s = value.replace(/\D/g,'')
  const modules = { n: 1, w: 3 }
  const quiet = modules.w * 2
  let cursor = x + quiet
  const patterns: Record<string, string> = {
    '0':'nnwwn','1':'wnnnw','2':'nwnnw','3':'wwnnn','4':'nnwnw','5':'wnwnn','6':'nwwnn','7':'nnnww','8':'wnnwn','9':'nwnwn'
  }
  const start = 'nnn'
  const stop = 'wnn'
  const pairs: string[] = []
  for (let i=0;i<s.length;i+=2) { pairs.push(s.slice(i,i+2)) }
  const bars: number[] = []
  const addPattern = (p: string, wide: boolean) => {
    for (let i=0;i<p.length;i++) {
      const m = p[i] === 'w' ? modules.w : modules.n
      bars.push(m)
    }
  }
  addPattern(start,false)
  for (const pair of pairs) {
    const a = patterns[pair[0]] || 'nnnnn'
    const b = patterns[pair[1]] || 'nnnnn'
    for (let i=0;i<5;i++) {
      addPattern(a[i],true); addPattern(b[i],false)
    }
  }
  addPattern(stop,false)
  const totalModules = bars.reduce((sum, m)=>sum+m,0) + quiet
  const unit = w / totalModules
  let drawX = x + quiet*unit
  let isBar = true
  for (const m of bars) {
    const width = m * unit
    if (isBar) {
      page.drawRectangle({ x: drawX, y, width, height: h, color: rgb(0,0,0) })
    }
    drawX += width
    isBar = !isBar
  }
}

export async function renderBoletoPDF(templateId: string, boletoId: string): Promise<Uint8Array> {
  const tpl = await getTemplate(templateId)
  if (!tpl) throw new Error('Template não encontrado')
  const fields = await getTemplateFields(templateId)
  const bgPdf = await fetchBackgroundPdf(tpl.background_pdf_url)
  const bgDoc = await PDFDocument.load(bgPdf)
  const doc = await PDFDocument.create()
  const [bgPage] = await doc.copyPages(bgDoc, [0])
  doc.addPage(bgPage)
  const page = doc.getPage(0)
  const boleto = await loadBoletoData(boletoId)

  for (const f of fields) {
    const [x, y, w, h] = bboxMmToPt(f.bbox)
    if (f.is_barcode) {
      const value = String(boleto.codigo_barras_value || boleto.codigo_barras || '')
      if (value) drawBarcodeI25(page, value, x, page.getHeight()-y-h, w, h)
      continue
    }
    const font = await ensureFont(doc, f.font_family)
    let fontSize = f.font_size || 10
    let raw: any = ''
    if (f.source_ref && f.source_ref.startsWith('literal:')) {
      raw = f.source_ref.slice('literal:'.length)
    } else {
      raw = f.source_ref ? boleto?.[f.source_ref.split('.').pop() || ''] : boleto?.[f.key] || ''
    }
    if (f.is_digitable_line && tpl.requires_calculation && !raw) {
      const bc = String(boleto.codigo_barras_value || boleto.codigo_barras || '')
      raw = bc ? bc.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})/, '$1.$2 $3.$4 $5') : ''
    }
    const value = normalizeValue(raw, f.format)
    const txY = page.getHeight() - y - h + 2
    const textWidth = font.widthOfTextAtSize(value, fontSize)
    // Shrink-to-fit if text exceeds bbox
    if (textWidth > w - 4 && textWidth > 0) {
      const scale = (w - 4) / textWidth
      fontSize = Math.max(6, fontSize * scale)
    }
    const adjustedWidth = font.widthOfTextAtSize(value, fontSize)
    let txX = x + 2
    if (f.align === 'center') txX = x + (w - adjustedWidth)/2
    if (f.align === 'right') txX = x + w - adjustedWidth - 2
    if (value) {
      page.drawText(value, {
        x: txX,
        y: txY,
        size: fontSize,
        font,
        color: rgb(0,0,0),
      })
    }
  }
  const out = await doc.save()
  return out
}
