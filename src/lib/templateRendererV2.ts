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
    // Append T12:00 to avoid UTC timezone shift showing previous day
    const dateStr = String(raw).substring(0, 10);
    const d = new Date(dateStr + 'T12:00:00');
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

// ===== Logo / imagem =====

async function fetchImageBytes(url: string): Promise<{ bytes: ArrayBuffer; type: 'png' | 'jpg' }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ao baixar imagem: ${res.status}`);
  const buf = await res.arrayBuffer();
  const header = new Uint8Array(buf.slice(0, 4));
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  return { bytes: buf, type: isPng ? 'png' : 'jpg' };
}

// ===== Renderização principal =====

export interface RenderOptions {
  usarFundo?: boolean;
  debugBorders?: boolean;
  borderColor?: { r: number; g: number; b: number };
  showFieldLabels?: boolean;
  labelFontSize?: number;
  /** Always draw grid borders + labels even when usarFundo=true */
  alwaysDrawGrid?: boolean;
}

export async function renderBoletoV2(
  template: BoletoTemplateRow,
  fields: BoletoTemplateFieldRow[],
  dados: DadosBoleto,
  usarFundoOrOptions: boolean | RenderOptions = true,
  debugBorders: boolean = false,
): Promise<Uint8Array> {
  const renderId = `render_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[templateRendererV2] render_start id=${renderId} template=${template.name} fields=${fields.length}`);

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

  // Collision detection: track occupied rectangles
  const occupiedRects: Array<{ x: number; y: number; w: number; h: number; key: string }> = [];

  function checkCollision(x: number, y: number, w: number, h: number, key: string): boolean {
    for (const rect of occupiedRects) {
      const overlapX = x < rect.x + rect.w && x + w > rect.x;
      const overlapY = y < rect.y + rect.h && y + h > rect.y;
      if (overlapX && overlapY) {
        console.warn(`[templateRendererV2] COLLISION: "${key}" overlaps with "${rect.key}"`);
        return true;
      }
    }
    return false;
  }

  // Sort fields by display_order to ensure masks render first
  const sortedFields = [...fields.filter(f => f.visible !== false)].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );

  // Cache for embedded images (logo)
  const imageCache: Record<string, Awaited<ReturnType<typeof doc.embedPng>>> = {};

  // Processar cada campo visível
  for (const field of sortedFields) {
    const [x1mm, y1mm, x2mm, y2mm] = field.bbox;
    const x = mmToPt(x1mm);
    const w = mmToPt(x2mm - x1mm);
    const h = mmToPt(y2mm - y1mm);
    const y = pageH - mmToPt(y1mm) - h; // PDF: y from bottom

    // Background color (para cobrir texto do PDF base)
    if (field.bg_color) {
      const bgC = hexToRgb(field.bg_color);
      page.drawRectangle({ x, y, width: w, height: h, color: rgb(bgC.r, bgC.g, bgC.b) });
    }

    // Grid borders + labels (when no background OR debug mode)
    const drawGrid = showBorders || (!usarFundo);
    if (drawGrid) {
      page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(borderCol.r, borderCol.g, borderCol.b), borderWidth: 0.5 });
      const labelText = field.label || field.key || '';
      if (labelText && !field.key.startsWith('mask_')) {
        const labelFont = fonts.helvetica;
        const labelColor = rgb(0.4, 0.4, 0.4);
        const maxLabelW = labelFont.widthOfTextAtSize(labelText, labelSize);
        const truncLabel = maxLabelW > w - 2 ? labelText.substring(0, Math.floor(labelText.length * (w - 2) / maxLabelW)) : labelText;
        if (truncLabel) {
          page.drawText(truncLabel, { x: x + 1, y: y + h - labelSize - 0.5, size: labelSize, font: labelFont, color: labelColor });
        }
      }
    }

    // === Logo / Image field ===
    if (field.key === 'banco_logo' || field.key === 'via2_banco_logo') {
      const logoUrl = resolveValue(field.source_ref, dados);
      if (logoUrl) {
        try {
          if (!imageCache[logoUrl]) {
            const { bytes, type } = await fetchImageBytes(logoUrl);
            imageCache[logoUrl] = type === 'png'
              ? await doc.embedPng(bytes)
              : await doc.embedJpg(bytes);
          }
          const img = imageCache[logoUrl];
          // Fit image proportionally inside bbox
          const imgDims = img.scale(1);
          const scaleX = w / imgDims.width;
          const scaleY = h / imgDims.height;
          const scale = Math.min(scaleX, scaleY);
          const drawW = imgDims.width * scale;
          const drawH = imgDims.height * scale;
          const imgX = x + (w - drawW) / 2;
          const imgY = y + (h - drawH) / 2;
          page.drawImage(img, { x: imgX, y: imgY, width: drawW, height: drawH });
        } catch (e) {
          console.warn(`[templateRendererV2] Falha ao renderizar logo: ${e}`);
        }
      }
      continue;
    }

    // Código de barras
    if (field.is_barcode) {
      const barValue = resolveValue(field.source_ref, dados) || resolveValue(field.key, dados);
      if (barValue) {
        if (!checkCollision(x, y, w, h, field.key)) {
          drawBarcodeI25(page, barValue, x, y, w, h);
          occupiedRects.push({ x, y, w, h, key: field.key });
        }
      }
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
    const minFontSize = 5;
    if (textWidth > w - 2 && textWidth > 0) {
      const scale = (w - 2) / textWidth;
      fontSize = Math.max(minFontSize, fontSize * scale);
      textWidth = font.widthOfTextAtSize(value, fontSize);
    }

    // Truncate with ellipsis if still overflows
    let displayValue = value;
    if (textWidth > w - 2) {
      let truncated = value;
      while (truncated.length > 1 && font.widthOfTextAtSize(truncated + '…', fontSize) > w - 2) {
        truncated = truncated.slice(0, -1);
      }
      displayValue = truncated + '…';
      textWidth = font.widthOfTextAtSize(displayValue, fontSize);
    }

    // Alinhamento horizontal
    let txX = x + 1;
    if (field.align === 'center') txX = x + (w - textWidth) / 2;
    if (field.align === 'right') txX = x + w - textWidth - 1;

    // Vertical: place text below the label line when grid is drawn
    const labelOffset = drawGrid ? labelSize + 1.5 : 0;
    const availH = h - labelOffset;
    const txY = y + (availH - fontSize) / 2;

    // Collision check for critical fields
    const criticalFields = ['linha_digitavel', 'codigo_barras', 'valor_documento', 'data_vencimento'];
    if (criticalFields.includes(field.key) || criticalFields.includes(field.key.replace('via2_', ''))) {
      if (checkCollision(x, y, w, h, field.key)) {
        console.error(`[templateRendererV2] CRITICAL FIELD COLLISION: "${field.key}"`);
      }
    }

    page.drawText(displayValue, {
      x: txX,
      y: txY,
      size: fontSize,
      font,
      color: rgb(textColor.r, textColor.g, textColor.b),
    });

    if (!field.key.startsWith('mask_')) {
      occupiedRects.push({ x, y, w, h, key: field.key });
    }
  }

  console.log(`[templateRendererV2] render_end id=${renderId} occupiedRects=${occupiedRects.length}`);
  return doc.save();
}

// ===== Renderização em lote =====

export async function renderBoletosV2(
  template: BoletoTemplateRow,
  fields: BoletoTemplateFieldRow[],
  dadosList: DadosBoleto[],
  usarFundoOrOptions: boolean | RenderOptions = true,
): Promise<Uint8Array> {
  const outputDoc = await PDFDocument.create();

  for (const dados of dadosList) {
    const boletoBytes = await renderBoletoV2(template, fields, dados, usarFundoOrOptions);
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
