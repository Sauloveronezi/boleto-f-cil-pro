import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { TipoLinha } from '@/components/cnab/CnabTextEditor';
import { CORES_CAMPOS } from '@/types/cnab';
import { extractCnabLayoutFromPdf, layoutSpecToCamposDetectados } from './cnabLayoutExtractor';

// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface CampoDetectado {
  id: string;
  nome: string;
  posicaoInicio: number;
  posicaoFim: number;
  tamanho: number;
  tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor';
  destino: string;
  valor: string;
  confianca: number;
  tipoLinha: TipoLinha;
  cor: string;
}

/**
 * Parser principal de PDF de layout CNAB
 * Usa o novo extrator robusto que suporta formatos Itaú e Bradesco
 */
export async function parseCnabPdf(file: File): Promise<CampoDetectado[]> {
  try {
    // Usar o novo extrator robusto
    const result = await extractCnabLayoutFromPdf(file);
    
    if (result.success && result.layoutSpec) {
      // Converter LayoutSpec para CampoDetectado[]
      const campos = layoutSpecToCamposDetectados(result.layoutSpec);
      
      if (campos.length > 0) {
        console.log(`Parser robusto: ${campos.length} campos extraídos de ${result.pages_analyzed} páginas`);
        if (result.warnings.length > 0) {
          console.warn('Avisos do parser:', result.warnings);
        }
        return campos;
      }
    }
    
    // Se o parser robusto falhou, tentar fallback
    console.warn('Parser robusto não encontrou campos, tentando fallback...');
    if (result.errors.length > 0) {
      console.warn('Erros do parser robusto:', result.errors);
    }
    
    return await parseCnabPdfFallback(file);
    
  } catch (error) {
    console.error('Erro no parser principal:', error);
    return await parseCnabPdfFallback(file);
  }
}

/**
 * Parser de fallback (versão simplificada)
 */
async function parseCnabPdfFallback(file: File): Promise<CampoDetectado[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let campos: CampoDetectado[] = [];
  let currentSegment: TipoLinha = 'header_arquivo';
  let idCounter = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    const items = textContent.items as TextItem[];
    const lines: { text: string; y: number; x: number }[] = [];
    
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    let currentLine: { text: string; y: number; x: number } | null = null;
    
    items.forEach(item => {
      const y = item.transform[5];
      const x = item.transform[4];
      const text = item.str;
      
      if (!text.trim()) return;

      if (!currentLine || Math.abs(currentLine.y - y) > 5) {
        if (currentLine) lines.push(currentLine);
        currentLine = { text, y, x };
      } else {
        currentLine.text += ' ' + text;
      }
    });
    if (currentLine) lines.push(currentLine);

    for (const line of lines) {
      const text = line.text.toUpperCase();
      
      // Detectar mudança de segmento
      if ((text.includes('HEADER') && text.includes('ARQUIVO')) || text.includes('REGISTRO 0')) {
        currentSegment = 'header_arquivo';
      } else if ((text.includes('HEADER') && text.includes('LOTE')) || text.includes('REGISTRO 1')) {
        currentSegment = 'header_lote';
      } else if ((text.includes('TRAILER') && text.includes('LOTE')) || text.includes('REGISTRO 5')) {
        currentSegment = 'trailer_lote';
      } else if ((text.includes('TRAILER') && text.includes('ARQUIVO')) || text.includes('REGISTRO 9')) {
        currentSegment = 'trailer_arquivo';
      } else if (text.match(/SEGMENTO\s+Y\s*[-–]?\s*03/) || text.match(/Y\s*[-–]?\s*03/)) {
        currentSegment = 'detalhe_segmento_y03';
      } else if (text.match(/SEGMENTO\s+Y\s*[-–]?\s*53/) || text.match(/Y\s*[-–]?\s*53/)) {
        currentSegment = 'detalhe_segmento_y53';
      } else if (text.match(/SEGMENTO\s+Y\s*[-–]?\s*04/) || text.match(/Y\s*[-–]?\s*04/)) {
        currentSegment = 'detalhe_segmento_y04';
      } else if (text.includes('SEGMENTO Y') && !text.match(/Y\s*[-–]?\s*\d{2}/)) {
        currentSegment = 'detalhe_segmento_y';
      } else if (text.includes('SEGMENTO S') || (text.includes('DETALHE') && text.includes(' S '))) {
        currentSegment = 'detalhe_segmento_s';
      } else if (text.includes('SEGMENTO T') || (text.includes('DETALHE') && text.includes(' T '))) {
        currentSegment = 'detalhe_segmento_t';
      } else if (text.includes('SEGMENTO U') || (text.includes('DETALHE') && text.includes(' U '))) {
        currentSegment = 'detalhe_segmento_u';
      } else if (text.includes('SEGMENTO P') || (text.includes('DETALHE') && text.includes(' P '))) {
        currentSegment = 'detalhe_segmento_p';
      } else if (text.includes('SEGMENTO Q') || (text.includes('DETALHE') && text.includes(' Q '))) {
        currentSegment = 'detalhe_segmento_q';
      } else if (text.includes('SEGMENTO R') || (text.includes('DETALHE') && text.includes(' R '))) {
        currentSegment = 'detalhe_segmento_r';
      } else if (text.includes('SEGMENTO A') || (text.includes('DETALHE') && text.includes(' A '))) {
        currentSegment = 'detalhe_segmento_a';
      } else if (text.includes('SEGMENTO B') || (text.includes('DETALHE') && text.includes(' B '))) {
        currentSegment = 'detalhe_segmento_b';
      } else if (text.includes('DETALHE') && !text.includes('SEGMENTO')) {
        currentSegment = 'detalhe';
      }

      const field = extractFieldFromLine(line.text, currentSegment);
      if (field) {
        idCounter++;
        campos.push({
          ...field,
          id: String(idCounter),
          tipoLinha: currentSegment,
          cor: CORES_CAMPOS[idCounter % CORES_CAMPOS.length],
          confianca: field.nome.length > 50 ? 70 : 90,
          valor: '(do PDF)'
        });
      }
    }
  }

  // Filtrar duplicatas
  campos = campos.filter((c, index, self) => 
    index === self.findIndex((t) => (
      t.posicaoInicio === c.posicaoInicio && 
      t.tipoLinha === c.tipoLinha
    ))
  );

  return campos.sort((a, b) => {
    if (a.tipoLinha !== b.tipoLinha) {
       const ordem: Record<string, number> = {
         'header_arquivo': 1,
         'header_lote': 2,
         'detalhe': 3,
         'detalhe_segmento_p': 4,
         'detalhe_segmento_q': 5,
         'detalhe_segmento_r': 6,
         'detalhe_segmento_s': 7,
         'detalhe_segmento_t': 8,
         'detalhe_segmento_u': 9,
         'detalhe_segmento_a': 10,
         'detalhe_segmento_b': 11,
         'detalhe_segmento_y': 12,
         'detalhe_segmento_y03': 13,
         'detalhe_segmento_y04': 14,
         'detalhe_segmento_y53': 15,
         'trailer_lote': 98,
         'trailer_arquivo': 99
       };
       return (ordem[a.tipoLinha] || 50) - (ordem[b.tipoLinha] || 50);
    }
    return a.posicaoInicio - b.posicaoInicio;
  });
}

function extractFieldFromLine(text: string, segment: TipoLinha): Omit<CampoDetectado, 'id' | 'tipoLinha' | 'cor' | 'confianca' | 'valor'> | null {
  let start = 0;
  let end = 0;
  let name = '';
  let picture = '';

  // Padrões para extração de tabelas de layout CNAB
  const patterns = [
    // Padrão Bradesco: "01.0 Campo Nome | 1 | 3 | 3 | Num"
    /^(\d{1,2}\.\d)\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(Num|Alfa|X\(\d+\)|9\(\d+\))/i,
    
    // Padrão Itaú: "Campo | 001-003 | 9(03)"
    /^([A-Za-záàâãéèêíïóôõúç\s\/\-\.]+?)\s+(\d{1,3})\s*[-–a]\s*(\d{1,3})\s+([X9]\([^)]+\)(?:V9\([^)]+\))?)/i,
    
    // Padrão FEBRABAN: "G001 | Código do Banco | 001 | 003"
    /^[A-Z]\d{3}\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})/i,
    
    // Padrão com Picture: "NOME 001 003 9(03)"
    /(.+?)\s+(\d{1,3})\s+(\d{1,3})\s+([X9]\(\d+\)(?:V9\(\d+\))?)/i,
    
    // Padrão genérico: posição início-fim
    /^(\d{1,3})\s*(?:-|a|à|\s)\s*(\d{1,3})\s+(.+)$/i,
    /^(.+)\s+(\d{1,3})\s*(?:-|a|à|\s)\s*(\d{1,3})$/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      if (regex.source.startsWith('^(\\d{1,2}\\.\\d)')) {
        name = match[2].trim();
        start = parseInt(match[3]);
        end = parseInt(match[4]);
        picture = match[6] || '';
      } else if (regex.source.includes('A-Z]\\d{3}')) {
        name = match[1].trim();
        start = parseInt(match[2]);
        end = parseInt(match[3]);
      } else if (regex.source.startsWith('^([A-Za-z')) {
        name = match[1].trim();
        start = parseInt(match[2]);
        end = parseInt(match[3]);
        picture = match[4] || '';
      } else if (regex.source.includes('X9]\\(\\d+\\)\\(')) {
        name = match[1].trim();
        start = parseInt(match[2]);
        end = parseInt(match[3]);
        picture = match[4];
      } else if (regex.source.startsWith('^(\\d{1,3})\\s*')) {
        start = parseInt(match[1]);
        end = parseInt(match[2]);
        name = match[3].trim();
      } else if (regex.source.startsWith('^(.+)\\s+')) {
        name = match[1].trim();
        start = parseInt(match[2]);
        end = parseInt(match[3]);
      }
      break;
    }
  }

  // Fallback: busca por dois números que pareçam posições
  if (!start || !end || !name) {
    const regexDeep = /(\d{1,3})\s*(?:-|a|à)\s*(\d{1,3})/;
    const deepMatch = text.match(regexDeep);
    if (deepMatch) {
      start = parseInt(deepMatch[1]);
      end = parseInt(deepMatch[2]);
      const parts = text.split(deepMatch[0]);
      name = parts[0].trim();
      if (!name && parts[1]) name = parts[1].trim();
    }
  }
  
  if (start > 0 && end > 0 && name) {
    name = name.trim()
      .replace(/^[-–—]\s*/, '')
      .replace(/\s*[-–—]$/, '')
      .replace(/^\d{1,2}\.\d\s*/, '')
      .replace(/\s+/g, ' ');
    
    if (start > end) return null;
    if (end > 444) return null;
    if (name.length < 2) return null;
    
    const lowerName = name.toLowerCase();
    const headerWords = ['de', 'até', 'pos', 'posição', 'nome do campo', 'conteúdo', 'picture', 
                         'formato', 'default', 'descrição', 'nº', 'campo', 'tamanho'];
    if (headerWords.includes(lowerName)) {
      return null;
    }

    const { tipo, destino } = inferTypeAndDestiny(name, picture);

    return {
      nome: name,
      posicaoInicio: start,
      posicaoFim: end,
      tamanho: end - start + 1,
      tipo,
      destino
    };
  }
  
  return null;
}

function inferTypeAndDestiny(name: string, picture: string = ''): { tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor', destino: string } {
  const lower = name.toLowerCase();
  let tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor' = 'alfanumerico';
  let destino = '';

  // Inferir pelo Picture
  if (picture) {
    const picLower = picture.toLowerCase();
    if (picLower.includes('v') || picLower.includes('9v')) {
      tipo = 'valor';
    } else if (picture.startsWith('9') || picLower === 'num') {
      tipo = 'numerico';
    } else if (picture.startsWith('X') || picLower === 'alfa') {
      tipo = 'alfanumerico';
    }
  }

  // Refinar pelo nome
  if (lower.includes('valor') || lower.includes('mora') || lower.includes('multa') || lower.includes('desconto')) {
    tipo = 'valor';
    destino = 'valor';
  } else if (lower.includes('data') || lower.includes('vencimento') || lower.includes('emissão') || lower.includes('geração')) {
    tipo = 'data';
    if (lower.includes('vencimento')) destino = 'data_vencimento';
    else if (lower.includes('emissão')) destino = 'data_emissao';
    else if (lower.includes('geração')) destino = 'data_geracao';
  } else if (lower.includes('cnpj') || lower.includes('cpf') || lower.includes('inscrição')) {
    if (!picture || picture.toLowerCase().includes('num') || picture.startsWith('9')) tipo = 'numerico';
    destino = 'sacado_cpf_cnpj'; 
  } else if (lower.includes('nosso número') || lower.includes('nosso numero')) {
    if (!picture || picture.toLowerCase().includes('num') || picture.startsWith('9')) tipo = 'numerico';
    destino = 'nosso_numero';
  } else if (lower.includes('banco') && (lower.includes('código') || lower.includes('codigo'))) {
    tipo = 'numerico';
    destino = 'codigo_banco';
  } else if (lower.includes('agência') || lower.includes('agencia')) {
    tipo = 'numerico';
    destino = 'agencia';
  } else if (lower.includes('conta') && !lower.includes('conta-corrente')) {
    tipo = 'numerico';
    destino = 'conta';
  } else if (lower.includes('nome') && (lower.includes('empresa') || lower.includes('beneficiário') || lower.includes('cedente'))) {
    destino = 'razao_social';
  } else if (lower.includes('nome') && (lower.includes('pagador') || lower.includes('sacado'))) {
    destino = 'sacado_nome';
  } else if (lower.includes('convênio') || lower.includes('convenio')) {
    destino = 'convenio';
  } else if (lower.includes('carteira')) {
    destino = 'carteira';
  } else if (lower.includes('sequência') || lower.includes('sequencial') || lower.includes('nsa')) {
    tipo = 'numerico';
    destino = 'sequencial';
  }

  return { tipo, destino };
}
