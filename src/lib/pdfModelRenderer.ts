import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';

export interface ElementoParaRender {
  id: string;
  tipo: 'campo' | 'texto' | 'linha' | 'retangulo';
  nome: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  variavel?: string;
  textoFixo?: string;
  fonte?: string;
  tamanhoFonte?: number;
  negrito?: boolean;
  italico?: boolean;
  alinhamento?: 'left' | 'center' | 'right';
  corTexto?: string;
  corFundo?: string;
  bordaSuperior?: boolean;
  bordaInferior?: boolean;
  bordaEsquerda?: boolean;
  bordaDireita?: boolean;
  espessuraBorda?: number;
  corBorda?: string;
  visivel?: boolean;
}

export interface DadosBoleto {
  banco_nome?: string;
  banco_codigo?: string;
  agencia?: string;
  conta?: string;
  digito_agencia?: string;
  digito_conta?: string;
  beneficiario_nome?: string;
  beneficiario_cnpj?: string;
  beneficiario_endereco?: string;
  beneficiario_cidade?: string;
  pagador_nome?: string;
  pagador_cnpj?: string;
  pagador_endereco?: string;
  pagador_cidade_uf?: string;
  pagador_cep?: string;
  // Aliases para compatibilidade com variáveis comuns
  cliente_razao_social?: string;
  cliente_cnpj?: string;
  cliente_endereco?: string;
  nosso_numero?: string;
  numero_documento?: string;
  numero_nota?: string;
  data_documento?: string;
  data_vencimento?: string;
  data_emissao?: string;
  data_processamento?: string;
  valor_documento?: string;
  valor_titulo?: string;
  valor_cobrado?: string;
  especie_documento?: string;
  aceite?: string;
  carteira?: string;
  especie_moeda?: string;
  quantidade?: string;
  valor_moeda?: string;
  local_pagamento?: string;
  linha_digitavel?: string;
  codigo_barras?: string;
  instrucoes?: string;
  sacador_avalista?: string;
  [key: string]: string | undefined;
}

// Conversion: mm to PDF points (1mm = 2.83465 points)
const MM_TO_POINTS = 2.83465;

/**
 * Converts hex color to RGB values (0-1 range)
 */
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

/**
 * Replaces variable placeholders with actual values
 */
function substituirVariaveis(texto: string | undefined, dados: DadosBoleto): string {
  if (!texto) return '';
  
  return texto.replace(/\{\{(\w+)\}\}/g, (match, variavel) => {
    return dados[variavel] || match;
  });
}

/**
 * Loads the base PDF from Supabase Storage
 */
export async function carregarPDFBase(storagePath: string): Promise<ArrayBuffer> {
  // Get signed URL
  const { data, error } = await supabase.storage
    .from('boleto_templates')
    .createSignedUrl(storagePath, 3600);
  
  if (error || !data?.signedUrl) {
    throw new Error(`Erro ao obter URL do PDF: ${error?.message || 'URL não disponível'}`);
  }
  
  // Fetch PDF
  const response = await fetch(data.signedUrl);
  if (!response.ok) {
    throw new Error(`Erro ao baixar PDF: ${response.statusText}`);
  }
  
  return await response.arrayBuffer();
}

/**
 * Renders a single boleto using the base PDF and overlay elements
 */
export async function renderizarBoleto(
  pdfBaseBytes: ArrayBuffer,
  elementos: ElementoParaRender[],
  dados: DadosBoleto,
  escala: number = 2, // Scale used in the editor (mm to px)
  usarFundoPdf: boolean = true
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  let page: PDFPage;

  if (usarFundoPdf) {
    // Load the base PDF
    pdfDoc = await PDFDocument.load(pdfBaseBytes);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new Error('PDF base não contém páginas');
    }
    page = pages[0];
  } else {
    // Create a new PDF with the same dimensions as the base PDF
    const tempDoc = await PDFDocument.load(pdfBaseBytes);
    const tempPages = tempDoc.getPages();
    if (tempPages.length === 0) {
      throw new Error('PDF base não contém páginas');
    }
    const tempPage = tempPages[0];
    const { width, height } = tempPage.getSize();

    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([width, height]);
  }
  
  const { height: pageHeight } = page.getSize();
  
  // Load fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  
  const getFonte = (elemento: ElementoParaRender): PDFFont => {
    const fontName = elemento.fonte || 'helvetica';
    const isBold = elemento.negrito;
    
    switch (fontName.toLowerCase()) {
      case 'times':
        return isBold ? timesBold : times;
      case 'courier':
        return isBold ? courierBold : courier;
      default:
        return isBold ? helveticaBold : helvetica;
    }
  };
  
  // Process each visible element
  for (const elemento of elementos.filter(e => e.visivel !== false)) {
    // Convert editor coordinates (px with scale) to PDF points
    // Editor uses: x, y from top-left, in pixels (scaled mm * escala)
    // PDF uses: x, y from bottom-left, in points
    
    const xPoints = (elemento.x / escala) * MM_TO_POINTS;
    const yPoints = pageHeight - ((elemento.y / escala) * MM_TO_POINTS) - ((elemento.altura / escala) * MM_TO_POINTS);
    const widthPoints = (elemento.largura / escala) * MM_TO_POINTS;
    const heightPoints = (elemento.altura / escala) * MM_TO_POINTS;
    
    // Handle background color
    if (elemento.corFundo && elemento.corFundo !== 'transparent') {
      const bgColor = hexToRgb(elemento.corFundo);
      page.drawRectangle({
        x: xPoints,
        y: yPoints,
        width: widthPoints,
        height: heightPoints,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      });
    }
    
    // Handle borders
    const borderWidth = (elemento.espessuraBorda || 1) * (MM_TO_POINTS / escala);
    const borderColor = hexToRgb(elemento.corBorda || '#000000');
    
    if (elemento.bordaSuperior) {
      page.drawLine({
        start: { x: xPoints, y: yPoints + heightPoints },
        end: { x: xPoints + widthPoints, y: yPoints + heightPoints },
        thickness: borderWidth,
        color: rgb(borderColor.r, borderColor.g, borderColor.b),
      });
    }
    if (elemento.bordaInferior) {
      page.drawLine({
        start: { x: xPoints, y: yPoints },
        end: { x: xPoints + widthPoints, y: yPoints },
        thickness: borderWidth,
        color: rgb(borderColor.r, borderColor.g, borderColor.b),
      });
    }
    if (elemento.bordaEsquerda) {
      page.drawLine({
        start: { x: xPoints, y: yPoints },
        end: { x: xPoints, y: yPoints + heightPoints },
        thickness: borderWidth,
        color: rgb(borderColor.r, borderColor.g, borderColor.b),
      });
    }
    if (elemento.bordaDireita) {
      page.drawLine({
        start: { x: xPoints + widthPoints, y: yPoints },
        end: { x: xPoints + widthPoints, y: yPoints + heightPoints },
        thickness: borderWidth,
        color: rgb(borderColor.r, borderColor.g, borderColor.b),
      });
    }
    
    // Handle lines
    if (elemento.tipo === 'linha') {
      const lineColor = hexToRgb(elemento.corFundo || '#000000');
      const isHorizontal = elemento.largura > elemento.altura;
      
      if (isHorizontal) {
        page.drawLine({
          start: { x: xPoints, y: yPoints + heightPoints / 2 },
          end: { x: xPoints + widthPoints, y: yPoints + heightPoints / 2 },
          thickness: heightPoints,
          color: rgb(lineColor.r, lineColor.g, lineColor.b),
        });
      } else {
        page.drawLine({
          start: { x: xPoints + widthPoints / 2, y: yPoints },
          end: { x: xPoints + widthPoints / 2, y: yPoints + heightPoints },
          thickness: widthPoints,
          color: rgb(lineColor.r, lineColor.g, lineColor.b),
        });
      }
    }
    
    // Handle text (campo or texto)
    if (elemento.tipo === 'campo' || elemento.tipo === 'texto') {
      const texto = elemento.tipo === 'texto' 
        ? elemento.textoFixo || ''
        : substituirVariaveis(elemento.variavel, dados);
      
      if (texto) {
        const fonte = getFonte(elemento);
        const fontSize = (elemento.tamanhoFonte || 10) * (MM_TO_POINTS / escala);
        const textColor = hexToRgb(elemento.corTexto || '#000000');
        
        // Calculate text position based on alignment
        const textWidth = fonte.widthOfTextAtSize(texto, fontSize);
        let textX = xPoints;
        
        if (elemento.alinhamento === 'center') {
          textX = xPoints + (widthPoints - textWidth) / 2;
        } else if (elemento.alinhamento === 'right') {
          textX = xPoints + widthPoints - textWidth;
        }
        
        // Vertical centering
        const textY = yPoints + (heightPoints - fontSize) / 2;
        
        page.drawText(texto, {
          x: textX,
          y: textY,
          size: fontSize,
          font: fonte,
          color: rgb(textColor.r, textColor.g, textColor.b),
        });
      }
    }
  }
  
  // Return the modified PDF
  return await pdfDoc.save();
}

/**
 * Generates multiple boletos in a single PDF
 */
export async function gerarBoletosComModelo(
  storagePath: string,
  elementos: ElementoParaRender[],
  dadosBoletos: DadosBoleto[],
  escala: number = 2,
  usarFundoPdf: boolean = false
): Promise<Uint8Array> {
  // Load base PDF
  const pdfBaseBytes = await carregarPDFBase(storagePath);
  const basePdf = await PDFDocument.load(pdfBaseBytes);
  
  // Create output PDF
  const outputPdf = await PDFDocument.create();
  
  for (const dados of dadosBoletos) {
    // Render this boleto
    const boletoBytes = await renderizarBoleto(pdfBaseBytes, elementos, dados, escala, usarFundoPdf);
    const boletoPdf = await PDFDocument.load(boletoBytes);
    
    // Copy page to output
    const [copiedPage] = await outputPdf.copyPages(boletoPdf, [0]);
    outputPdf.addPage(copiedPage);
  }
  
  return await outputPdf.save();
}

/**
 * Downloads the generated PDF
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string = 'boletos.pdf'): void {
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
