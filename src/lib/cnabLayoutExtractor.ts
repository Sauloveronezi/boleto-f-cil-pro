/**
 * Extrator de Layout CNAB a partir de Manual PDF
 * Suporta formatos Itaú e Bradesco
 */

import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import {
  LayoutSpec,
  LayoutField,
  LayoutRecord,
  CnabLayout,
  BankInfo,
  ParsedTableRow,
  DetectedLayoutBlock,
  PdfTextLine,
  PdfAnalysisResult,
  CnabDataType,
  DefaultFill,
  RequiredIn,
  MatchKeys,
  KNOWN_DESTINATIONS,
  RECORD_TYPE_PATTERNS,
  LAYOUT_FIELD_COLORS,
} from '@/types/cnabLayoutSpec';

// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * REGEX PATTERNS para extração de tabelas
 */

// Padrão Itaú: "NOME DO CAMPO | SIGNIFICADO | 001-003 | 9(03) | Conteúdo"
const RE_ITAU = /^(?<field>.+?)\s+(?<desc>.+?)\s+(?<start>\d{1,3})\s*[-a]\s*(?<end>\d{1,3})\s+(?<picture>[X9]\([^)]+\)(?:V9\([^)]+\))?)\s*(?<content>.*)?$/i;

// Padrão Itaú alternativo: "Campo | 001 | 003 | 9(03)"
const RE_ITAU_ALT = /^(?<field>[A-Za-záàâãéèêíïóôõúçÁÀÂÃÉÈÊÍÏÓÔÕÚÇ\s\-\/\.]+?)\s+(?<start>\d{1,3})\s+(?<end>\d{1,3})\s+(?<picture>[X9]\([^)]+\)(?:V9\([^)]+\))?)/i;

// Padrão Bradesco: "01.0 Campo Nome | 1 | 3 | 3 | - | Num | Default"
const RE_BRADESCO = /^(\d{1,2}\.\d)\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})(?:\s+(\d{1,3}))?(?:\s+(\d{1,2}))?(?:\s+(\d{1,2}))?\s*[-–]?\s*(Num|Alfa|Alpha|X|9)?\s*(.*)$/i;

// Padrão FEBRABAN: "G001 | Código do Banco | 001 | 003 | 003"
const RE_FEBRABAN = /^([A-Z]\d{3})\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})(?:\s+(\d{1,3}))?/i;

// Padrão genérico com posições: "Campo 001 003" ou "001-003 Campo"
const RE_GENERIC_POS = /^(.+?)\s+(\d{1,3})\s*[-–a]\s*(\d{1,3})$/i;
const RE_GENERIC_POS_FIRST = /^(\d{1,3})\s*[-–a]\s*(\d{1,3})\s+(.+)$/i;

// Detectar tamanho de registro
const RE_RECORD_SIZE = /tamanho\s*(?:do\s*)?registro\s*[=:]\s*(\d{3})\s*(?:bytes|posições|pos\.?)?/i;

// Detectar cabeçalhos de tabela
const TABLE_HEADERS = [
  'nome do campo', 'significado', 'posição', 'picture', 'conteúdo',
  'campo', 'de', 'até', 'nº', 'formato', 'default', 'descrição',
  'pos', 'tamanho', 'tipo', 'dig', 'dec'
];

/**
 * Extrair linhas de texto do PDF com coordenadas
 */
async function extractPdfLines(file: File): Promise<{ pages: { pageNumber: number; lines: PdfTextLine[] }[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const pages: { pageNumber: number; lines: PdfTextLine[] }[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items as TextItem[];

    // Ordenar por Y (decrescente) e X (crescente)
    const sortedItems = items
      .filter(item => item.str.trim())
      .map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        w: item.width ?? 0,
        h: item.height ?? 0,
      }))
      .sort((a, b) => (b.y - a.y) || (a.x - b.x));

    // Agrupar em linhas por proximidade de Y
    const lineBuckets: typeof sortedItems[] = [];
    const yTolerance = 3.0;

    for (const item of sortedItems) {
      const last = lineBuckets[lineBuckets.length - 1];
      if (!last) {
        lineBuckets.push([item]);
        continue;
      }
      const yRef = last[0].y;
      if (Math.abs(item.y - yRef) <= yTolerance) {
        last.push(item);
      } else {
        lineBuckets.push([item]);
      }
    }

    // Montar linhas de texto
    const lines: PdfTextLine[] = lineBuckets.map(bucket => {
      bucket.sort((a, b) => a.x - b.x);
      
      let text = '';
      let prevX = -Infinity;
      
      for (const t of bucket) {
        const gap = t.x - prevX;
        if (text && gap > 8) text += ' ';
        text += t.str;
        prevX = t.x + t.w;
      }
      
      return {
        text: text.replace(/\s+/g, ' ').trim(),
        y: bucket[0].y,
        x: bucket[0].x,
        pageNumber: p,
      };
    }).filter(l => l.text.length > 0);

    pages.push({ pageNumber: p, lines });
  }

  return { pages };
}

/**
 * Detectar tipo de registro a partir do texto
 */
function detectRecordType(text: string): string | null {
  const lower = text.toLowerCase();
  
  for (const [recordType, patterns] of Object.entries(RECORD_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        return recordType;
      }
    }
  }
  
  return null;
}

/**
 * Detectar tamanho do registro (240 ou 400)
 */
function detectRecordSize(lines: string[]): 240 | 400 | null {
  for (const line of lines) {
    const match = line.match(RE_RECORD_SIZE);
    if (match) {
      const size = parseInt(match[1]);
      if (size === 240) return 240;
      if (size === 400) return 400;
    }
    
    // Também detectar pelo contexto
    if (line.toLowerCase().includes('cnab 240') || line.includes('240 posições')) {
      return 240;
    }
    if (line.toLowerCase().includes('cnab 400') || line.includes('400 posições')) {
      return 400;
    }
  }
  return null;
}

/**
 * Verificar se uma linha é cabeçalho de tabela
 */
function isTableHeader(text: string): boolean {
  const lower = text.toLowerCase();
  const matchCount = TABLE_HEADERS.filter(h => lower.includes(h)).length;
  return matchCount >= 2;
}

/**
 * Inferir tipo de dado a partir do picture
 */
function inferDataType(picture: string, fieldName: string): CnabDataType {
  const lower = fieldName.toLowerCase();
  const picLower = picture?.toLowerCase() || '';
  
  // Por picture
  if (picLower.includes('v') || picLower.includes('9v')) {
    return 'decimal';
  }
  if (picLower === 'num' || picture?.startsWith('9')) {
    return 'num';
  }
  if (picLower === 'alfa' || picLower === 'alpha' || picture?.startsWith('X')) {
    return 'alfa';
  }
  
  // Por nome do campo
  if (lower.includes('data') || lower.includes('vencimento') || lower.includes('emissão')) {
    return 'date';
  }
  if (lower.includes('hora')) {
    return 'time';
  }
  if (lower.includes('valor') || lower.includes('mora') || lower.includes('multa') || lower.includes('desconto')) {
    return 'decimal';
  }
  if (lower.includes('cnab') || lower.includes('branco') || lower.includes('filler') || lower.includes('uso exclusivo')) {
    return 'cnab_filler';
  }
  
  return 'alfa';
}

/**
 * Inferir destino do campo
 */
function inferDestination(fieldName: string): string | undefined {
  const normalized = fieldName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  // Verificar mapeamentos conhecidos
  for (const [key, dest] of Object.entries(KNOWN_DESTINATIONS)) {
    if (normalized.includes(key)) {
      return dest;
    }
  }
  
  // Regras específicas
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('nosso') && lower.includes('numero') || lower.includes('número')) {
    return 'nosso_numero';
  }
  if (lower.includes('data') && lower.includes('vencimento')) {
    return 'data_vencimento';
  }
  if ((lower.includes('nome') && (lower.includes('sacado') || lower.includes('pagador'))) ||
      (lower === 'sacado' || lower === 'pagador')) {
    return 'sacado_nome';
  }
  if ((lower.includes('cpf') || lower.includes('cnpj')) && 
      (lower.includes('sacado') || lower.includes('pagador'))) {
    return 'sacado_cpf_cnpj';
  }
  if (lower.includes('valor') && (lower.includes('titulo') || lower.includes('título') || lower.includes('nominal'))) {
    return 'valor';
  }
  if (lower.includes('codigo') && lower.includes('banco') || lower === 'banco') {
    return 'codigo_banco';
  }
  if (lower === 'agencia' || lower === 'agência') {
    return 'agencia';
  }
  if (lower === 'conta' || lower.includes('conta corrente')) {
    return 'conta';
  }
  
  return undefined;
}

/**
 * Parsear uma linha de tabela usando múltiplos padrões
 */
function parseTableRow(line: string): ParsedTableRow | null {
  // Ignorar cabeçalhos
  if (isTableHeader(line)) {
    return null;
  }
  
  let result: ParsedTableRow | null = null;

  // Tentar padrão Bradesco
  let match = line.match(RE_BRADESCO);
  if (match) {
    const [, seqNum, field, startStr, endStr, lenStr, digStr, decStr, type, defaultVal] = match;
    result = {
      field: field.trim(),
      description: field.trim(),
      start: parseInt(startStr),
      end: parseInt(endStr),
      picture: type || undefined,
      digits: digStr ? parseInt(digStr) : undefined,
      decimals: decStr ? parseInt(decStr) : undefined,
      default_value: defaultVal?.trim() || undefined,
    };
  }
  
  // Tentar padrão Itaú
  if (!result) {
    match = line.match(RE_ITAU);
    if (match?.groups) {
      result = {
        field: match.groups.field.trim(),
        description: match.groups.desc.trim(),
        start: parseInt(match.groups.start),
        end: parseInt(match.groups.end),
        picture: match.groups.picture?.trim(),
        content: match.groups.content?.trim() || undefined,
      };
    }
  }
  
  // Tentar padrão Itaú alternativo
  if (!result) {
    match = line.match(RE_ITAU_ALT);
    if (match?.groups) {
      result = {
        field: match.groups.field.trim(),
        description: match.groups.field.trim(),
        start: parseInt(match.groups.start),
        end: parseInt(match.groups.end),
        picture: match.groups.picture?.trim(),
      };
    }
  }
  
  // Tentar padrão FEBRABAN
  if (!result) {
    match = line.match(RE_FEBRABAN);
    if (match) {
      result = {
        field: match[2].trim(),
        description: match[2].trim(),
        start: parseInt(match[3]),
        end: parseInt(match[4]),
      };
    }
  }
  
  // Tentar padrões genéricos
  if (!result) {
    match = line.match(RE_GENERIC_POS);
    if (match) {
      result = {
        field: match[1].trim(),
        description: match[1].trim(),
        start: parseInt(match[2]),
        end: parseInt(match[3]),
      };
    }
  }
  
  if (!result) {
    match = line.match(RE_GENERIC_POS_FIRST);
    if (match) {
      result = {
        field: match[3].trim(),
        description: match[3].trim(),
        start: parseInt(match[1]),
        end: parseInt(match[2]),
      };
    }
  }
  
  // Validações
  if (result) {
    // Limpar nome do campo
    result.field = result.field
      .replace(/^[-–—]\s*/, '')
      .replace(/\s*[-–—]$/, '')
      .replace(/^\d{1,2}\.\d\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Validar posições
    if (result.start > result.end) return null;
    if (result.end > 500) return null; // Limite razoável
    if (result.field.length < 2) return null;
    
    // Inferir tipo de dado
    result.data_type = inferDataType(result.picture || '', result.field);
  }
  
  return result;
}

/**
 * Detectar blocos de layout no documento
 */
function detectLayoutBlocks(pages: { pageNumber: number; lines: PdfTextLine[] }[]): DetectedLayoutBlock[] {
  const blocks: DetectedLayoutBlock[] = [];
  let currentBlock: DetectedLayoutBlock | null = null;
  let recordSize: 240 | 400 = 240;
  
  for (const page of pages) {
    const allLines = page.lines.map(l => l.text);
    
    // Detectar tamanho do registro nesta página
    const detectedSize = detectRecordSize(allLines);
    if (detectedSize) {
      recordSize = detectedSize;
    }
    
    for (const line of page.lines) {
      const text = line.text;
      
      // Detectar início de novo bloco
      const recordType = detectRecordType(text);
      if (recordType) {
        // Salvar bloco anterior se existir
        if (currentBlock && currentBlock.rows.length > 0) {
          blocks.push(currentBlock);
        }
        
        // Iniciar novo bloco
        currentBlock = {
          page: page.pageNumber,
          record_name: recordType,
          record_size: recordSize,
          rows: [],
          raw_lines: [],
        };
        continue;
      }
      
      // Se temos um bloco ativo, tentar parsear linhas
      if (currentBlock) {
        currentBlock.raw_lines.push(text);
        
        const row = parseTableRow(text);
        if (row) {
          currentBlock.rows.push(row);
        }
      }
    }
  }
  
  // Salvar último bloco
  if (currentBlock && currentBlock.rows.length > 0) {
    blocks.push(currentBlock);
  }
  
  return blocks;
}

/**
 * Converter bloco detectado em registro do layout
 */
function blockToLayoutRecord(block: DetectedLayoutBlock): LayoutRecord {
  const matchKeys: MatchKeys = {
    tipo_registro_pos: { start: block.record_size === 240 ? 8 : 1, value: '0' },
  };
  
  // Configurar match_keys baseado no tipo de registro
  switch (block.record_name) {
    case 'HEADER_ARQUIVO':
      matchKeys.tipo_registro_pos = { start: block.record_size === 240 ? 8 : 1, value: '0' };
      break;
    case 'HEADER_LOTE':
      matchKeys.tipo_registro_pos = { start: 8, value: '1' };
      break;
    case 'DETALHE_P':
      matchKeys.tipo_registro_pos = { start: 8, value: '3' };
      matchKeys.segmento_pos = { start: 14, value: 'P' };
      break;
    case 'DETALHE_Q':
      matchKeys.tipo_registro_pos = { start: 8, value: '3' };
      matchKeys.segmento_pos = { start: 14, value: 'Q' };
      break;
    case 'DETALHE_R':
      matchKeys.tipo_registro_pos = { start: 8, value: '3' };
      matchKeys.segmento_pos = { start: 14, value: 'R' };
      break;
    case 'DETALHE_A':
      matchKeys.tipo_registro_pos = { start: 8, value: '3' };
      matchKeys.segmento_pos = { start: 14, value: 'A' };
      break;
    case 'DETALHE':
      matchKeys.tipo_registro_pos = { start: 1, value: '1' };
      break;
    case 'TRAILER_LOTE':
      matchKeys.tipo_registro_pos = { start: 8, value: '5' };
      break;
    case 'TRAILER_ARQUIVO':
      matchKeys.tipo_registro_pos = { start: block.record_size === 240 ? 8 : 1, value: '9' };
      break;
  }
  
  // Converter rows em fields
  const fields: LayoutField[] = block.rows.map((row, index) => {
    const normalized = row.field
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Determinar preenchimento padrão
    let defaultFill: DefaultFill = 'spaces';
    if (row.data_type === 'num' || row.data_type === 'decimal' || row.data_type === 'date') {
      defaultFill = 'zeros';
    }
    if (row.default_value) {
      defaultFill = 'manual_value';
    }
    
    return {
      field_name_original: row.field,
      field_name_normalized: normalized,
      description: row.description,
      start_pos: row.start,
      end_pos: row.end,
      length: row.end - row.start + 1,
      data_type: row.data_type || 'alfa',
      picture_raw: row.picture,
      decimals: row.decimals,
      default_fill: defaultFill,
      required_in: 'ambos' as RequiredIn,
      notes: row.notes || [],
      campo_destino: inferDestination(row.field),
      cor: LAYOUT_FIELD_COLORS[index % LAYOUT_FIELD_COLORS.length],
    };
  });
  
  return {
    record_name: block.record_name,
    match_keys: matchKeys,
    fields,
  };
}

/**
 * Detectar código do banco pelo nome ou conteúdo
 */
function detectBankCode(lines: string[]): { code: string; name: string } {
  const joinedText = lines.join(' ').toLowerCase();
  
  const banks = [
    { code: '001', name: 'Banco do Brasil', patterns: ['banco do brasil', 'bb'] },
    { code: '033', name: 'Santander', patterns: ['santander'] },
    { code: '104', name: 'Caixa Econômica Federal', patterns: ['caixa', 'cef'] },
    { code: '237', name: 'Bradesco', patterns: ['bradesco'] },
    { code: '341', name: 'Itaú', patterns: ['itaú', 'itau', 'itaubba', 'sisdeb'] },
    { code: '422', name: 'Safra', patterns: ['safra'] },
    { code: '748', name: 'Sicredi', patterns: ['sicredi'] },
    { code: '756', name: 'Sicoob', patterns: ['sicoob'] },
  ];
  
  for (const bank of banks) {
    for (const pattern of bank.patterns) {
      if (joinedText.includes(pattern)) {
        return { code: bank.code, name: bank.name };
      }
    }
  }
  
  return { code: '000', name: 'Não identificado' };
}

/**
 * Validar layout (detectar sobreposições e gaps)
 */
function validateLayout(records: LayoutRecord[], recordSize: number): string[] {
  const warnings: string[] = [];
  
  for (const record of records) {
    const fields = [...record.fields].sort((a, b) => a.start_pos - b.start_pos);
    
    // Verificar sobreposições
    for (let i = 0; i < fields.length - 1; i++) {
      if (fields[i].end_pos >= fields[i + 1].start_pos) {
        warnings.push(
          `Sobreposição em ${record.record_name}: "${fields[i].field_name_original}" (${fields[i].start_pos}-${fields[i].end_pos}) ` +
          `sobrepõe "${fields[i + 1].field_name_original}" (${fields[i + 1].start_pos}-${fields[i + 1].end_pos})`
        );
      }
    }
    
    // Verificar cobertura (gaps)
    let expectedStart = 1;
    for (const field of fields) {
      if (field.start_pos > expectedStart) {
        warnings.push(
          `Gap em ${record.record_name}: posições ${expectedStart}-${field.start_pos - 1} não cobertas ` +
          `(antes de "${field.field_name_original}")`
        );
      }
      expectedStart = field.end_pos + 1;
    }
    
    if (expectedStart <= recordSize) {
      warnings.push(
        `${record.record_name}: posições ${expectedStart}-${recordSize} não cobertas (final do registro)`
      );
    }
  }
  
  return warnings;
}

/**
 * Função principal: Analisar PDF e extrair LayoutSpec
 */
export async function extractCnabLayoutFromPdf(file: File): Promise<PdfAnalysisResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Extrair linhas do PDF
    const { pages } = await extractPdfLines(file);
    
    if (pages.length === 0) {
      return {
        success: false,
        errors: ['Não foi possível extrair conteúdo do PDF'],
        warnings: [],
        pages_analyzed: 0,
        fields_extracted: 0,
      };
    }
    
    // Coletar todas as linhas para análise inicial
    const allLines = pages.flatMap(p => p.lines.map(l => l.text));
    
    // Detectar banco
    const bank = detectBankCode(allLines);
    
    // Detectar tamanho do registro
    let recordSize: 240 | 400 = detectRecordSize(allLines) || 240;
    
    // Detectar blocos de layout
    const blocks = detectLayoutBlocks(pages);
    
    if (blocks.length === 0) {
      return {
        success: false,
        errors: ['Nenhum layout CNAB detectado no PDF. Verifique se o arquivo contém tabelas de layout.'],
        warnings: [],
        pages_analyzed: pages.length,
        fields_extracted: 0,
      };
    }
    
    // Converter blocos em registros
    const records = blocks.map(blockToLayoutRecord);
    
    // Validar layout
    const validationWarnings = validateLayout(records, recordSize);
    warnings.push(...validationWarnings);
    
    // Contar campos extraídos
    const totalFields = records.reduce((sum, r) => sum + r.fields.length, 0);
    
    // Montar LayoutSpec
    const layoutSpec: LayoutSpec = {
      bank: {
        code: bank.code,
        name: bank.name,
      },
      layouts: [{
        layout_id: `${bank.code}_${recordSize}_${Date.now()}`,
        record_size: recordSize,
        records,
        notes_catalog: {},
        warnings,
      }],
      extracted_at: new Date().toISOString(),
      source_file: file.name,
    };
    
    return {
      success: true,
      layoutSpec,
      errors: [],
      warnings,
      pages_analyzed: pages.length,
      fields_extracted: totalFields,
    };
    
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    return {
      success: false,
      errors: [`Erro ao processar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
      warnings,
      pages_analyzed: 0,
      fields_extracted: 0,
    };
  }
}

/**
 * Converter LayoutSpec para CampoDetectado[] (compatibilidade)
 */
export function layoutSpecToCamposDetectados(layoutSpec: LayoutSpec): import('@/lib/pdfLayoutParser').CampoDetectado[] {
  const campos: import('@/lib/pdfLayoutParser').CampoDetectado[] = [];
  let idCounter = 0;
  
  for (const layout of layoutSpec.layouts) {
    for (const record of layout.records) {
      // Mapear record_name para TipoLinha
      let tipoLinha: import('@/components/cnab/CnabTextEditor').TipoLinha = 'detalhe';
      switch (record.record_name) {
        case 'HEADER_ARQUIVO':
          tipoLinha = 'header_arquivo';
          break;
        case 'HEADER_LOTE':
          tipoLinha = 'header_lote';
          break;
        case 'DETALHE_P':
          tipoLinha = 'detalhe_segmento_p';
          break;
        case 'DETALHE_Q':
          tipoLinha = 'detalhe_segmento_q';
          break;
        case 'DETALHE_R':
          tipoLinha = 'detalhe_segmento_r';
          break;
        case 'TRAILER_LOTE':
          tipoLinha = 'trailer_lote';
          break;
        case 'TRAILER_ARQUIVO':
          tipoLinha = 'trailer_arquivo';
          break;
      }
      
      for (const field of record.fields) {
        idCounter++;
        
        // Mapear data_type para tipo
        let tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor' = 'alfanumerico';
        switch (field.data_type) {
          case 'num':
            tipo = 'numerico';
            break;
          case 'decimal':
            tipo = 'valor';
            break;
          case 'date':
            tipo = 'data';
            break;
          case 'alfa':
          case 'cnab_filler':
          default:
            tipo = 'alfanumerico';
            break;
        }
        
        campos.push({
          id: String(idCounter),
          nome: field.field_name_original,
          posicaoInicio: field.start_pos,
          posicaoFim: field.end_pos,
          tamanho: field.length,
          tipo,
          destino: field.campo_destino || '',
          valor: '(do PDF)',
          confianca: 90,
          tipoLinha,
          cor: field.cor || LAYOUT_FIELD_COLORS[idCounter % LAYOUT_FIELD_COLORS.length],
        });
      }
    }
  }
  
  return campos;
}
