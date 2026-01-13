import * as pdfjsLib from 'pdfjs-dist';
// Configure worker (use local module path for reliability in Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface PDFDimensions {
  larguraMm: number;
  alturaMm: number;
  larguraPx: number;
  alturaPx: number;
}

// Points to mm conversion (1 point = 0.352778 mm)
const POINTS_TO_MM = 0.352778;

/**
 * Analyzes a PDF file and returns its dimensions
 */
export async function analisarPDF(file: File): Promise<PDFDimensions> {
  const arrayBuffer = await file.arrayBuffer();
  return analisarPDFFromArrayBuffer(arrayBuffer);
}

/**
 * Analyzes a PDF from URL and returns its dimensions
 */
export async function analisarPDFFromUrl(url: string): Promise<PDFDimensions> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return analisarPDFFromArrayBuffer(arrayBuffer);
}

/**
 * Analyzes a PDF from ArrayBuffer and returns its dimensions
 */
export async function analisarPDFFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<PDFDimensions> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  // Get viewport at scale 1
  const viewport = page.getViewport({ scale: 1 });
  
  // Dimensions in points
  const larguraPx = viewport.width;
  const alturaPx = viewport.height;
  
  // Convert to mm
  const larguraMm = Math.round(larguraPx * POINTS_TO_MM);
  const alturaMm = Math.round(alturaPx * POINTS_TO_MM);
  
  return {
    larguraMm,
    alturaMm,
    larguraPx,
    alturaPx,
  };
}

/**
 * Renders a PDF page to an image data URL
 */
export async function renderPDFToImage(
  source: File | string | ArrayBuffer,
  scale: number = 2
): Promise<{ dataUrl: string; width: number; height: number }> {
  let arrayBuffer: ArrayBuffer;
  
  if (source instanceof File) {
    arrayBuffer = await source.arrayBuffer();
  } else if (typeof source === 'string') {
    // It's a URL
    const response = await fetch(source);
    arrayBuffer = await response.arrayBuffer();
  } else {
    arrayBuffer = source;
  }
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale });
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not get canvas context');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Render page
  await page.render({
    canvasContext: context,
    viewport: viewport,
    intent: 'display',
  } as any).promise;
  
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Page format presets
 */
export const PAGE_FORMATS = {
  A4: { larguraMm: 210, alturaMm: 297, label: 'A4 (210 × 297 mm)' },
  A4_LANDSCAPE: { larguraMm: 297, alturaMm: 210, label: 'A4 Paisagem (297 × 210 mm)' },
  BOLETO: { larguraMm: 210, alturaMm: 140, label: 'Boleto (210 × 140 mm)' },
  CARTA: { larguraMm: 216, alturaMm: 279, label: 'Carta (216 × 279 mm)' },
  CUSTOM: { larguraMm: 210, alturaMm: 297, label: 'Personalizado' },
} as const;

export type PageFormatKey = keyof typeof PAGE_FORMATS;
