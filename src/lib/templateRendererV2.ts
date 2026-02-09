/**
 * Template Renderer V2 - Usa as tabelas normalizadas vv_b_boleto_templates / vv_b_boleto_template_fields
 * Substitui o antigo templateRenderer.ts
 */
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';
import type { BoletoTemplateRow, BoletoTemplateFieldRow } from '@/hooks/useBoletoTemplates';
import type { DadosBoleto } from './pdfModelRenderer';

// ===== Constantes =====
const MM_TO_PT = 72 / 25.4;  // 1mm ≈ 2.8346pt

function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

// ===== Utilitários =====

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 0, g: 0, b: 0 };
}

function resolveValue(sourceRef: string | null | undefined, dados: DadosBoleto): string {
  if (!sourceRef) return '';
  
  // literal:texto
  if (sourceRef.startsWith('literal:')) {
    return sourceRef.slice('literal:'.length);
  }

  // Variável direta: busca no DadosBoleto
  const valor = dados[sourceRef];
  if (valor === undefined || valor === null || valor === '') return '';
  return String(valor);
}

function formatValue(raw: string, format: string | null | undefined): string {
  if (!raw || !format) return raw;

  if (format === 'currency_ptbr') {
    const n = parseFloat(raw.replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (isNaN(n) || n === 0) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }
  if (format === 'date_ddmmyyyy') {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw; // Já pode estar formatada
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  if (format === 'mask_cnpj') {
    const s = String(raw).replace(/\D/g, '');
    if (!s || s === '00000000000000') return '';
    if (s.length === 14) {
      return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
    }
    if (s.length === 11) {
      return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
    }
    return raw;
  }
  if (format === 'upper') return raw.toUpperCase();
  if (format === 'numeric_only') return raw.replace(/\D/g, '');
  return raw;
}

// ===== Código de barras I2of5 =====

function drawBarcodeI25(page: PDFPage, value: string, x: number, y: number, w: number, h: number) {
  const s = value.replace(/\D/g, '');
  if (!s || s.length < 2) return;

  const patterns: Record<string, string> = {
    '0': 'nnwwn', '1': 'wnnnw', '2': 'nwnnw', '3': 'wwnnn', '4': 'nnwnw',
    '5': 'wnwnn', '6': 'nwwnn', '7': 'nnnww', '8': 'wnnwn', '9': 'nwnwn',
  };
  const modules = { n: 1, w: 3 };
  const quiet = modules.w * 2;
  const start = 'nnnn';
  const stop = 'wnn';

  // Build bar widths
  const bars: number[] = [];
  const addChar = (p: string) => { for (const c of p) bars.push(c === 'w' ? modules.w : modules.n); };

  addChar(start);
  for (let i = 0; i < s.length; i += 2) {
    const a = patterns[s[i]] || 'nnnnn';
    const b = patterns[s[i + 1]] || 'nnnnn';
    for (let j = 0; j < 5; j++) {
      addChar(a[j]);
      addChar(b[j]);
    }
  }
  addChar(stop);

  const totalModules = bars.reduce((sum, m) => sum + m, 0) + quiet * 2;
  const unit = w / totalModules;
  let drawX = x + quiet * unit;
  let isBar = true;

  for (const m of bars) {
    const barW = m * unit;
    if (isBar) {
      page.drawRectangle({ x: drawX, y, width: barW, height: h, color: rgb(0, 0, 0) });
    }
    drawX += barW;
    isBar = !isBar;
  }
}

// ===== Fontes =====

async function loadFonts(doc: PDFDocument) {
  return {
    helvetica: await doc.embedFont(StandardFonts.Helvetica),
    helveticaBold: await doc.embedFont(StandardFonts.HelveticaBold),
    times: await doc.embedFont(StandardFonts.TimesRoman),
    timesBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    courier: await doc.embedFont(StandardFonts.Courier),
    courierBold: await doc.embedFont(StandardFonts.CourierBold),
  };
}

type FontMap = Awaited<ReturnType<typeof loadFonts>>;

function getFont(fonts: FontMap, family: string, bold: boolean): PDFFont {
  const f = (family || 'helvetica').toLowerCase();
  if (f.includes('times')) return bold ? fonts.timesBold : fonts.times;
  if (f.includes('courier')) return bold ? fonts.courierBold : fonts.courier;
  return bold ? fonts.helveticaBold : fonts.helvetica;
}

// ===== Carregamento do PDF base =====

async function fetchPdf(url: string): Promise<ArrayBuffer> {
  // Se for path relativo (público), usa fetch direto
  if (url.startsWith('/')) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro ao baixar PDF: ${res.status}`);
    return res.arrayBuffer();
  }

  // Se for path do storage, gera signed URL
  const { data, error } = await supabase.storage
    .from('boleto_templates')
    .createSignedUrl(url, 3600);

  if (error || !data?.signedUrl) {
    // Fallback para o PDF público local
    console.warn('[templateRendererV2] Fallback para PDF público:', url);
    const res = await fetch('/templates/modelo_padrao_bradesco.pdf');
    if (!res.ok) throw new Error('Falha no fallback do PDF base');
    return res.arrayBuffer();
  }

  const res = await fetch(data.signedUrl);
  if (!res.ok) throw new Error(`Erro ao baixar PDF assinado: ${res.status}`);
  return res.arrayBuffer();
}

// ===== Renderização principal =====

export interface RenderOptions {
  usarFundo?: boolean;
  debugBorders?: boolean;
  borderColor?: { r: number; g: number; b: number };
  showFieldLabels?: boolean;
  labelFontSize?: number;
}

export async function renderBoletoV2(
  template: BoletoTemplateRow,
  fields: BoletoTemplateFieldRow[],
  dados: DadosBoleto,
  usarFundoOrOptions: boolean | RenderOptions = true,
  debugBorders: boolean = false,
): Promise<Uint8Array> {
  // Support both old signature and new options object
  let opts: RenderOptions;
  if (typeof usarFundoOrOptions === 'boolean') {
    opts = { usarFundo: usarFundoOrOptions, debugBorders };
  } else {
    opts = usarFundoOrOptions;
  }
  const usarFundo = opts.usarFundo ?? true;
  const showBorders = opts.debugBorders ?? false;
  const borderCol = opts.borderColor ?? { r: 1, g: 0, b: 0 };
  const showLabels = opts.showFieldLabels ?? showBorders;
  const labelSize = opts.labelFontSize ?? 5;
  const pdfBytes = await fetchPdf(template.background_pdf_url);
  let doc: PDFDocument;
  let page: PDFPage;

  if (usarFundo) {
    doc = await PDFDocument.load(pdfBytes);
    const pages = doc.getPages();
    if (pages.length === 0) throw new Error('PDF base sem páginas');
    page = pages[0];
  } else {
    const tmpDoc = await PDFDocument.load(pdfBytes);
    const tmpPage = tmpDoc.getPages()[0];
    if (!tmpPage) throw new Error('PDF base sem páginas');
    const { width, height } = tmpPage.getSize();
    doc = await PDFDocument.create();
    page = doc.addPage([width, height]);
  }

  const { height: pageH } = page.getSize();
  const fonts = await loadFonts(doc);

  // Processar cada campo visível
  for (const field of fields.filter(f => f.visible !== false)) {
    const [x1mm, y1mm, x2mm, y2mm] = field.bbox;
    const x = mmToPt(x1mm);
    const w = mmToPt(x2mm - x1mm);
    const h = mmToPt(y2mm - y1mm);
    const y = pageH - mmToPt(y1mm) - h; // PDF: y from bottom

    // Debug/Layout: desenhar bordas e label do campo
    if (showBorders) {
      page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(borderCol.r, borderCol.g, borderCol.b), borderWidth: 0.5 });
      if (showLabels) {
        const labelText = field.key || '';
        const labelFont = fonts.helvetica;
        page.drawText(labelText, { x: x + 1, y: y + h - labelSize - 1, size: labelSize, font: labelFont, color: rgb(borderCol.r, borderCol.g, borderCol.b) });
      }
    }

    // Código de barras
    if (field.is_barcode) {
      const barValue = resolveValue(field.source_ref, dados) || resolveValue(field.key, dados);
      if (barValue) drawBarcodeI25(page, barValue, x, y, w, h);
      continue;
    }

    // Texto - try source_ref first, then key as fallback
    const rawValue = resolveValue(field.source_ref, dados) || resolveValue(field.key, dados);
    const value = formatValue(rawValue, field.format);
    if (!value) continue;

    const font = getFont(fonts, field.font_family, field.bold);
    let fontSize = field.font_size || 10;
    const textColor = hexToRgb(field.color || '#000000');

    // Shrink to fit
    let textWidth = font.widthOfTextAtSize(value, fontSize);
    if (textWidth > w - 2 && textWidth > 0) {
      const scale = (w - 2) / textWidth;
      fontSize = Math.max(5, fontSize * scale);
      textWidth = font.widthOfTextAtSize(value, fontSize);
    }

    // Alinhamento horizontal
    let txX = x + 1;
    if (field.align === 'center') txX = x + (w - textWidth) / 2;
    if (field.align === 'right') txX = x + w - textWidth - 1;

    // Centralizar verticalmente
    const txY = y + (h - fontSize) / 2;

    page.drawText(value, {
      x: txX,
      y: txY,
      size: fontSize,
      font,
      color: rgb(textColor.r, textColor.g, textColor.b),
    });
  }

  return doc.save();
}

// ===== Renderização em lote =====

export async function renderBoletosV2(
  template: BoletoTemplateRow,
  fields: BoletoTemplateFieldRow[],
  dadosList: DadosBoleto[],
  usarFundo: boolean = true,
): Promise<Uint8Array> {
  const outputDoc = await PDFDocument.create();

  for (const dados of dadosList) {
    const boletoBytes = await renderBoletoV2(template, fields, dados, usarFundo);
    const boletoPdf = await PDFDocument.load(boletoBytes);
    const [copiedPage] = await outputDoc.copyPages(boletoPdf, [0]);
    outputDoc.addPage(copiedPage);
  }

  return outputDoc.save();
}

// ===== Download helper =====

export function downloadPdfV2(pdfBytes: Uint8Array, filename: string = 'boletos.pdf'): void {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
