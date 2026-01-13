/**
 * Extrator de Layout CNAB a partir de Manual PDF
 * Suporta formatos Itaú BBA, Bradesco, Santander e outros
 * 
 * IMPORTANTE: PDFs de bancos diferentes têm formatos de tabela distintos.
 * Este módulo implementa múltiplas estratégias de parsing.
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
import { 
  gerarCamposDetalheP240, 
  gerarCamposDetalheQ240, 
  gerarCamposDetalheR240, 
  gerarCamposHeaderArquivo240, 
  gerarCamposHeaderLote240, 
  gerarCamposTrailerLote240, 
  gerarCamposTrailerArquivo240 
} from '@/types/cnab';

// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * REGEX PATTERNS para extração de tabelas
 */

// === PADRÃO ITAÚ BBA ===
// Formato: "NOME DO CAMPO | SIGNIFICADO | 001 003 | 9(03) | Conteúdo"
// ou: "AGÊNCIA | AGÊNCIA ... | 054 057 | 9(04) | NOTA 1"
const RE_ITAU_BBA_TABLE = /^(.+?)\s{2,}(.+?)\s{2,}(\d{3})\s+(\d{3})\s+([X9]\([^)]+\)(?:V9\([^)]+\))?)\s*(.*)$/i;

// Formato alternativo Itaú: "CAMPO DESCRIÇÃO 001-003 9(03)"
const RE_ITAU_DASH = /^(?<field>.+?)\s+(?<desc>.+?)\s+(?<start>\d{1,3})\s*[-a]\s*(?<end>\d{1,3})\s+(?<picture>[X9]\([^)]+\)(?:V9\([^)]+\))?)\s*(?<content>.*)?$/i;

// === PADRÃO ITAÚ SIMPLES ===
// Formato: "NOME POSIÇÃO PICTURE" - ex: "CÓDIGO DO BANCO 001 003 9(03) 341"
const RE_ITAU_SIMPLE = /^([A-ZÀ-Ú\s\-\/\.]+)\s+(\d{3})\s+(\d{3})\s+([X9]\([^)]+\)(?:V9\([^)]+\))?)\s*(.*)$/i;

// === PADRÃO BRADESCO ===
// Formato: "01.0 Campo Nome | 1 | 3 | 3 | - | Num | Default"
const RE_BRADESCO = /^(\d{1,2}\.\d)\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})(?:\s+(\d{1,3}))?(?:\s+(\d{1,2}))?(?:\s+(\d{1,2}))?\s*[-–]?\s*(Num|Alfa|Alpha|X|9)?\s*(.*)$/i;

// === PADRÃO FEBRABAN ===
// Formato: "G001 | Código do Banco | 001 | 003 | 003"
const RE_FEBRABAN = /^([A-Z]\d{3})\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})(?:\s+(\d{1,3}))?/i;

// === PADRÃO GENÉRICO COM POSIÇÕES ===
const RE_GENERIC_SPACES = /^(.+?)\s{2,}(\d{1,3})\s+(\d{1,3})\s+([X9V\(\)0-9]+)\s*(.*)$/i;
const RE_GENERIC_POS = /^(.+?)\s+(\d{1,3})\s*[-–a]\s*(\d{1,3})$/i;
const RE_GENERIC_POS_FIRST = /^(\d{1,3})\s*[-–a]\s*(\d{1,3})\s+(.+)$/i;
const RE_POSITIONS_ONLY = /^(.+?)\s{2,}(\d{1,3})\s+(\d{1,3})(?:\s+([A-Z0-9\(\)\/]+))?\s*(.*)$/i;
const RE_DATE_PIC = /^(ddmmaaaa|ddmmaa)$/i;
// === PADRÃO TABELA EM GRADE (como manual Bradesco com colunas) ===
// Ex.: "01.0 Banco  Código do Banco na Compensação  001 003  3 0  Num  G001"
const RE_GRID_COLUMNS = /^(\d{1,2}\.\d)\s+([A-Za-zÀ-ú\/\-\s]+?)\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,2})\s+(\d{1,2})\s+(Num|Alfa|Alpha)\s*(\S+)?/i;

// === PADRÃO LINHA MARKDOWN ===
// Formato: "| CAMPO | DESCRIÇÃO | 001 003 | 9(03) | CONTEÚDO |"
const RE_MARKDOWN_TABLE = /^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(\d{1,3})\s*[-–\s]?\s*(\d{1,3})?\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|?$/i;

// Detectar tamanho de registro
const RE_RECORD_SIZE = /tamanho\s*(?:do\s*)?registro\s*[=:]\s*(\d{3})\s*(?:bytes|posições|pos\.?)?/i;

// Detectar cabeçalhos de tabela
const TABLE_HEADERS = [
  'nome do campo', 'significado', 'posição', 'picture', 'conteúdo',
  'campo', 'de', 'até', 'nº', 'formato', 'default', 'descrição',
  'pos', 'tamanho', 'tipo', 'dig', 'dec'
];

// Palavras que indicam que é um campo válido (para ajudar na detecção)
const FIELD_INDICATORS = [
  'código', 'codigo', 'nome', 'data', 'valor', 'número', 'numero', 'tipo',
  'agência', 'agencia', 'conta', 'banco', 'lote', 'registro', 'brancos',
  'zeros', 'complemento', 'reservado', 'sequência', 'sequencia', 'layout',
  'inscrição', 'inscricao', 'convênio', 'convenio', 'empresa', 'detalhe',
  'header', 'trailer', 'cnab', 'serviço', 'servico', 'operação', 'operacao'
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

    // Agrupar em linhas por proximidade de Y (aumentar tolerância)
    const lineBuckets: typeof sortedItems[] = [];
    const yTolerance = 5.0; // Aumentado para melhor agrupamento

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

    // Montar linhas de texto preservando espaçamento entre colunas
    const lines: PdfTextLine[] = lineBuckets.map(bucket => {
      bucket.sort((a, b) => a.x - b.x);
      
      let text = '';
      let prevEnd = -Infinity;
      
      for (const t of bucket) {
        const gap = t.x - prevEnd;
        // Se houver um gap grande, adicionar múltiplos espaços para preservar colunas
        if (text && gap > 20) {
          text += '  '; // Dois espaços indicam separação de coluna
        } else if (text && gap > 4) {
          text += ' ';
        }
        text += t.str;
        prevEnd = t.x + t.w;
      }
      
      return {
        text: text.replace(/\s{3,}/g, '  ').trim(), // Normalizar espaços múltiplos para 2
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
  
  // Priorizar detecção de segmentos específicos antes do genérico "DETALHE"
  if (lower.includes('segmento p')) {
    return 'DETALHE_P';
  }
  if (lower.includes('segmento q')) {
    return 'DETALHE_Q';
  }
  if (lower.includes('segmento r')) {
    return 'DETALHE_R';
  }
  if (lower.includes('segmento a')) {
    return 'DETALHE_A';
  }
  if (lower.includes('segmento b')) {
    return 'DETALHE_B';
  }
  
  // Detecção específica para Itaú BBA
  if (lower.includes('header de arquivo') || lower.includes('header arquivo')) {
    return 'HEADER_ARQUIVO';
  }
  if (lower.includes('header de lote') || lower.includes('header lote')) {
    return 'HEADER_LOTE';
  }
  if (lower.includes('registro detalhe') || lower.includes('detalhe de lote')) {
    return 'DETALHE';
  }
  if (lower.includes('trailer de lote') || lower.includes('trailer lote')) {
    return 'TRAILER_LOTE';
  }
  if (lower.includes('trailer de arquivo') || lower.includes('trailer arquivo')) {
    return 'TRAILER_ARQUIVO';
  }
  
  // Fallback para patterns gerais
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
    if (line.toLowerCase().includes('cnab 240') || line.includes('240 posições') || line.includes('240 bytes')) {
      return 240;
    }
    if (line.toLowerCase().includes('cnab 400') || line.includes('400 posições') || line.includes('400 bytes')) {
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
  
  // Verificar se contém palavras-chave de cabeçalho
  const headerKeywords = ['nome do campo', 'significado', 'posição', 'picture', 'conteúdo'];
  const matchCount = headerKeywords.filter(h => lower.includes(h)).length;
  
  return matchCount >= 2;
}

/**
 * Verificar se a linha parece ser um campo válido de CNAB
 */
function looksLikeField(text: string): boolean {
  const lower = text.toLowerCase();
  
  // Deve conter números de posição (3 dígitos)
  const hasPositions = /\d{3}\s+\d{3}/.test(text) || /\d{1,3}\s*[-–a]\s*\d{1,3}/.test(text);
  
  // Deve conter picture (X ou 9 seguido de parênteses)
  const hasPicture = /[X9]\(\d+\)/i.test(text);
  
  // Ou deve conter indicadores de campo conhecidos
  const hasFieldIndicator = FIELD_INDICATORS.some(ind => lower.includes(ind));
  
  return (hasPositions && hasPicture) || (hasPositions && hasFieldIndicator);
}

/**
 * Inferir tipo de dado a partir do picture
 */
function inferDataType(picture: string, fieldName: string): CnabDataType {
  const lower = fieldName.toLowerCase();
  const picLower = picture?.toLowerCase() || '';
  
  if (RE_DATE_PIC.test(picLower)) {
    return 'date';
  }
  if (picLower.includes('v') || /9\([^)]+\)v9/i.test(picture)) {
    return 'decimal';
  }
  if (picLower === 'num' || picture?.match(/^9\(\d+\)$/)) {
    return 'num';
  }
  if (picLower === 'alfa' || picLower === 'alpha' || picture?.match(/^X\(\d+\)$/i)) {
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
  
  // Inferir pelo tamanho do picture se numérico ou alfa
  if (picture?.startsWith('9')) {
    return 'num';
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
  
  if ((lower.includes('nosso') && (lower.includes('numero') || lower.includes('número')))) {
    return 'nosso_numero';
  }
  if (lower.includes('data') && lower.includes('vencimento')) {
    return 'data_vencimento';
  }
  if ((lower.includes('nome') && (lower.includes('sacado') || lower.includes('pagador') || lower.includes('debitado'))) ||
      (lower === 'sacado' || lower === 'pagador')) {
    return 'sacado_nome';
  }
  if ((lower.includes('cpf') || lower.includes('cnpj') || lower.includes('inscri')) && 
      (lower.includes('sacado') || lower.includes('pagador') || lower.includes('debitado'))) {
    return 'sacado_cpf_cnpj';
  }
  if (lower.includes('valor') && (lower.includes('titulo') || lower.includes('título') || lower.includes('nominal') || lower.includes('agendado') || lower.includes('lancamento'))) {
    return 'valor';
  }
  if ((lower.includes('codigo') || lower.includes('código')) && lower.includes('banco')) {
    return 'codigo_banco';
  }
  if (lower === 'agencia' || lower === 'agência' || lower.includes('número agência') || lower.includes('numero agencia')) {
    return 'agencia';
  }
  if (lower === 'conta' || lower.includes('conta corrente') || lower.includes('c/c')) {
    return 'conta';
  }
  if (lower.includes('convênio') || lower.includes('convenio')) {
    return 'convenio';
  }
  if (lower.includes('sequência') || lower.includes('sequencia')) {
    return 'sequencial';
  }
  if (lower.includes('seu número') || lower.includes('seu numero') || lower.includes('número documento') || lower.includes('numero documento')) {
    return 'numero_documento';
  }
  if (lower.includes('data') && (lower.includes('geração') || lower.includes('geracao'))) {
    return 'data_geracao';
  }
  if (lower.includes('data') && lower.includes('agendada')) {
    return 'data_vencimento';
  }
  
  return undefined;
}

/**
 * Estratégia 1: Parser para formato Itaú BBA
 * Formato: "NOME CAMPO  SIGNIFICADO  001 003  9(03)  Conteúdo"
 */
function parseItauBBA(line: string): ParsedTableRow | null {
  // Ignorar cabeçalhos
  if (isTableHeader(line)) return null;
  
  // Verificar se parece um campo válido
  if (!looksLikeField(line)) return null;
  
  // Padrão 1: Com espaços duplos separando colunas
  let match = line.match(RE_ITAU_BBA_TABLE);
  if (match) {
    return {
      field: match[1].trim(),
      description: match[2].trim(),
      start: parseInt(match[3]),
      end: parseInt(match[4]),
      picture: match[5].trim(),
      content: match[6]?.trim() || undefined,
    };
  }
  
  // Padrão 2: Linha simples com posições
  match = line.match(RE_ITAU_SIMPLE);
  if (match) {
    return {
      field: match[1].trim(),
      description: match[1].trim(),
      start: parseInt(match[2]),
      end: parseInt(match[3]),
      picture: match[4].trim(),
      content: match[5]?.trim() || undefined,
    };
  }
  
  // Padrão 3: Com traço separando posições
  match = line.match(RE_ITAU_DASH);
  if (match?.groups) {
    return {
      field: match.groups.field.trim(),
      description: match.groups.desc.trim(),
      start: parseInt(match.groups.start),
      end: parseInt(match.groups.end),
      picture: match.groups.picture?.trim(),
      content: match.groups.content?.trim() || undefined,
    };
  }
  
  return null;
}

/**
 * Estratégia 2: Parser para formato Markdown (tabelas com |)
 */
function parseMarkdownTable(line: string): ParsedTableRow | null {
  if (!line.includes('|')) return null;
  if (isTableHeader(line)) return null;
  if (line.includes('---')) return null; // Separador markdown
  
  const match = line.match(RE_MARKDOWN_TABLE);
  if (match) {
    const field = match[1].trim();
    const desc = match[2].trim();
    const startStr = match[3];
    const endStr = match[4] || match[3]; // Se não tiver end, usa start
    const picture = match[5].trim();
    const content = match[6]?.trim();
    
    // Validar
    const start = parseInt(startStr);
    const end = parseInt(endStr);
    
    if (isNaN(start) || isNaN(end) || start > end || end > 500) {
      return null;
    }
    
    return {
      field,
      description: desc,
      start,
      end,
      picture,
      content,
    };
  }
  
  return null;
}

/**
 * Estratégia 3: Parser genérico com espaços
 */
function parseGenericSpaces(line: string): ParsedTableRow | null {
  if (isTableHeader(line)) return null;
  if (!looksLikeField(line)) return null;
  
  const match = line.match(RE_GENERIC_SPACES);
  if (match) {
    const start = parseInt(match[2]);
    const end = parseInt(match[3]);
    
    if (start > end || end > 500) return null;
    
    return {
      field: match[1].trim(),
      description: match[1].trim(),
      start,
      end,
      picture: match[4].trim(),
      content: match[5]?.trim() || undefined,
    };
  }
  
  return null;
}

function parsePositionsOnly(line: string): ParsedTableRow | null {
  if (isTableHeader(line)) return null;
  if (!looksLikeField(line)) return null;
  const match = line.match(RE_POSITIONS_ONLY);
  if (match) {
    const field = match[1].trim();
    const start = parseInt(match[2]);
    const end = parseInt(match[3]);
    const picture = match[4]?.trim();
    const content = match[5]?.trim() || undefined;
    if (isNaN(start) || isNaN(end) || start > end || end > 500) {
      return null;
    }
    return {
      field,
      description: field,
      start,
      end,
      picture,
      content,
    };
  }
  return null;
}

/**
 * Estratégia 3.1: Parser para tabela em grade com colunas explícitas (Bradesco)
 */
function parseGridColumns(line: string): ParsedTableRow | null {
  if (isTableHeader(line)) return null;
  const match = line.match(RE_GRID_COLUMNS);
  if (match) {
    const [, campoCodigo, fieldName, desc, startStr, endStr, digStr, decStr, tipoStr, defaultVal] = match;
    const start = parseInt(startStr);
    const end = parseInt(endStr);
    if (isNaN(start) || isNaN(end) || start > end || end > 500) return null;
    const picture = (tipoStr?.toLowerCase().startsWith('num')) ? '9' : 'X';
    const row: ParsedTableRow = {
      field: fieldName.trim(),
      description: desc.trim(),
      start,
      end,
      picture,
      digits: digStr ? parseInt(digStr) : undefined,
      decimals: decStr ? parseInt(decStr) : undefined,
      default_value: defaultVal?.trim(),
      data_type: inferDataType(picture || '', fieldName),
      notes: ['grid_columns'],
    };
    return row;
  }
  return null;
}

/**
 * Estratégia 4: Parser Bradesco
 */
function parseBradesco(line: string): ParsedTableRow | null {
  if (isTableHeader(line)) return null;
  
  const match = line.match(RE_BRADESCO);
  if (match) {
    const [, seqNum, field, startStr, endStr, lenStr, digStr, decStr, type, defaultVal] = match;
    return {
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
  
  return null;
}

/**
 * Estratégia 5: Parser FEBRABAN
 */
function parseFebraban(line: string): ParsedTableRow | null {
  if (isTableHeader(line)) return null;
  
  const match = line.match(RE_FEBRABAN);
  if (match) {
    return {
      field: match[2].trim(),
      description: match[2].trim(),
      start: parseInt(match[3]),
      end: parseInt(match[4]),
    };
  }
  
  return null;
}

/**
 * Parsear uma linha de tabela usando múltiplas estratégias
 */
function parseTableRow(line: string): ParsedTableRow | null {
  // Ignorar linhas muito curtas ou que são claramente não-campos
  if (line.length < 10) return null;
  if (line.match(/^[=\-\*]+$/)) return null; // Separadores
  if (line.toLowerCase().includes('x = alfanumérico') || line.toLowerCase().includes('9 = numérico')) return null;
  if (line.toLowerCase().includes('junho/') || line.match(/^\d{1,2}$/)) return null; // Data ou número de página
  
  let result: ParsedTableRow | null = null;

  // Tentar cada estratégia na ordem de especificidade
  
  // 1. Markdown tables (mais específico)
  result = parseMarkdownTable(line);
  if (result) return finalizeRow(result);
  
  // 2. Itaú BBA (muito comum)
  result = parseItauBBA(line);
  if (result) return finalizeRow(result);
  
  // 2.1 Tabela em grade com colunas explícitas (Bradesco)
  result = parseGridColumns(line);
  if (result) return finalizeRow(result);
  
  // 3. Bradesco
  result = parseBradesco(line);
  if (result) return finalizeRow(result);
  
  // 4. FEBRABAN
  result = parseFebraban(line);
  if (result) return finalizeRow(result);
  
  // 5. Genérico
  result = parseGenericSpaces(line);
  if (result) return finalizeRow(result);
  
  // 6. Apenas posições, com picture opcional
  result = parsePositionsOnly(line);
  if (result) return finalizeRow(result);
  
  return null;
}

function getBankPrefs(): Record<string, string[]> {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('cnab_bank_strategies') : null;
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj;
    return {};
  } catch {
    return {};
  }
}

function saveBankPrefs(prefs: Record<string, string[]>): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cnab_bank_strategies', JSON.stringify(prefs));
    }
  } catch {}
}

function registerBankStrategy(bankCode: string, strategy: string): void {
  const prefs = getBankPrefs();
  const list = prefs[bankCode] || [];
  const newList = [strategy, ...list.filter(s => s !== strategy)];
  prefs[bankCode] = newList.slice(0, 10);
  saveBankPrefs(prefs);
}

function parseTableRowWithPrefs(line: string, bankCode: string | null): ParsedTableRow | null {
  const prefs = bankCode ? getBankPrefs()[bankCode] || [] : [];
  const strategies: Array<{ name: string; fn: (l: string) => ParsedTableRow | null }> = [
    { name: 'markdown', fn: parseMarkdownTable },
    { name: 'itau_bba', fn: parseItauBBA },
    { name: 'grid_columns', fn: parseGridColumns },
    { name: 'bradesco', fn: parseBradesco },
    { name: 'febraban', fn: parseFebraban },
    { name: 'generic_spaces', fn: parseGenericSpaces },
    { name: 'positions_only', fn: parsePositionsOnly },
  ];
  const ordered = [
    ...strategies.filter(s => prefs.includes(s.name)).sort((a, b) => prefs.indexOf(a.name) - prefs.indexOf(b.name)),
    ...strategies.filter(s => !prefs.includes(s.name)),
  ];
  for (const s of ordered) {
    const r = s.fn(line);
    if (r) {
      const res = finalizeRow(r);
      if (res) registerBankStrategy(bankCode || '000', s.name);
      return res;
    }
  }
  return null;
}

/**
 * Finalizar e validar um ParsedTableRow
 */
function finalizeRow(row: ParsedTableRow): ParsedTableRow | null {
  // Limpar nome do campo
  row.field = row.field
    .replace(/^[-–—]\s*/, '')
    .replace(/\s*[-–—]$/, '')
    .replace(/^\d{1,2}\.\d\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/^\(\*\)\s*/, '') // Remove (*) do início
    .trim();
  
  // Validar posições
  if (row.start > row.end) return null;
  if (row.end > 500) return null;
  if (row.start < 1) return null;
  if (row.field.length < 2) return null;
  
  // Inferir tipo de dado
  row.data_type = inferDataType(row.picture || '', row.field);
  
  return row;
}

/**
 * Detectar blocos de layout no documento
 */
function detectLayoutBlocks(pages: { pageNumber: number; lines: PdfTextLine[] }[], bankCode: string | null = null): DetectedLayoutBlock[] {
  const blocks: DetectedLayoutBlock[] = [];
  let currentBlock: DetectedLayoutBlock | null = null;
  let recordSize: 240 | 400 = 240;
  let lastRecordType: string | null = null;
  
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
      if (recordType && recordType !== lastRecordType) {
        // Salvar bloco anterior se existir e tiver campos
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
        lastRecordType = recordType;
        continue;
      }
      
      // Se temos um bloco ativo, tentar parsear linhas
      if (currentBlock) {
        currentBlock.raw_lines.push(text);
        
        const row = parseTableRowWithPrefs(text, bankCode);
        if (row) {
          // Evitar duplicatas (mesmo campo na mesma posição)
          const isDuplicate = currentBlock.rows.some(
            r => r.start === row.start && r.end === row.end
          );
          if (!isDuplicate) {
            currentBlock.rows.push(row);
          }
        }
      }
    }
  }
  
  // Salvar último bloco
  if (currentBlock && currentBlock.rows.length > 0) {
    blocks.push(currentBlock);
  }
  
  // Ordenar campos dentro de cada bloco por posição inicial
  for (const block of blocks) {
    block.rows.sort((a, b) => a.start - b.start);
  }
  
  return blocks;
}

/**
 * Preencher gaps no layout com campos BRANCOS/ZEROS
 */
function fillLayoutGaps(rows: ParsedTableRow[], recordSize: number): ParsedTableRow[] {
  const filledRows: ParsedTableRow[] = [];
  let expectedStart = 1;
  
  const sortedRows = [...rows].sort((a, b) => a.start - b.start);
  
  for (const row of sortedRows) {
    // Se há um gap, preencher com BRANCOS
    if (row.start > expectedStart) {
      filledRows.push({
        field: 'BRANCOS',
        description: 'Complemento de registro (gap preenchido)',
        start: expectedStart,
        end: row.start - 1,
        picture: `X(${row.start - expectedStart})`,
        data_type: 'cnab_filler',
      });
    }
    
    filledRows.push(row);
    expectedStart = row.end + 1;
  }
  
  // Preencher até o final do registro
  if (expectedStart <= recordSize) {
    filledRows.push({
      field: 'BRANCOS',
      description: 'Complemento de registro (final)',
      start: expectedStart,
      end: recordSize,
      picture: `X(${recordSize - expectedStart + 1})`,
      data_type: 'cnab_filler',
    });
  }
  
  return filledRows;
}

/**
 * Converter bloco detectado em registro do layout
 */
function blockToLayoutRecord(block: DetectedLayoutBlock, fillGaps: boolean = true): LayoutRecord {
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
      matchKeys.tipo_registro_pos = { start: 8, value: '3' };
      // Para Itaú BBA, o segmento A está na posição 14
      matchKeys.segmento_pos = { start: 14, value: 'A' };
      break;
    case 'TRAILER_LOTE':
      matchKeys.tipo_registro_pos = { start: 8, value: '5' };
      break;
    case 'TRAILER_ARQUIVO':
      matchKeys.tipo_registro_pos = { start: block.record_size === 240 ? 8 : 1, value: '9' };
      break;
  }
  
  // Preencher gaps se solicitado
  const rows = fillGaps ? fillLayoutGaps(block.rows, block.record_size) : block.rows;
  
  // Converter rows em fields
  const fields: LayoutField[] = rows.map((row, index) => {
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
    { code: '341', name: 'Itaú', patterns: ['itaú', 'itau', 'itaubba', 'itaú bba', 'sisdeb'] },
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
 * Validar layout (detectar sobreposições)
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
    
    // Verificar se o último campo termina no tamanho esperado
    if (fields.length > 0) {
      const lastField = fields[fields.length - 1];
      if (lastField.end_pos !== recordSize) {
        warnings.push(
          `${record.record_name}: Último campo termina em ${lastField.end_pos}, esperado ${recordSize}`
        );
      }
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
    console.log('[CNAB Extractor] Iniciando análise do PDF:', file.name);
    
    // Extrair linhas do PDF
    const { pages } = await extractPdfLines(file);
    
    console.log(`[CNAB Extractor] Extraídas ${pages.length} páginas`);
    
    if (pages.length === 0) {
      return {
        success: false,
        errors: ['Não foi possível extrair conteúdo do PDF'],
        warnings: [],
        pages_analyzed: 0,
        fields_extracted: 0,
      };
    }
    
    // Log de debug: mostrar algumas linhas
    for (const page of pages.slice(0, 3)) {
      console.log(`[CNAB Extractor] Página ${page.pageNumber}:`, page.lines.slice(0, 5).map(l => l.text));
    }
    
    // Coletar todas as linhas para análise inicial
    const allLines = pages.flatMap(p => p.lines.map(l => l.text));
    
    // Detectar banco
    const bank = detectBankCode(allLines);
    console.log(`[CNAB Extractor] Banco detectado: ${bank.name} (${bank.code})`);
    
    // Detectar tamanho do registro
    let recordSize: 240 | 400 = detectRecordSize(allLines) || 240;
    console.log(`[CNAB Extractor] Tamanho do registro: ${recordSize}`);
    
    const blocks = detectLayoutBlocks(pages, bank.code || null);
    console.log(`[CNAB Extractor] Blocos detectados: ${blocks.length}`);
    
    for (const block of blocks) {
      console.log(`[CNAB Extractor] - ${block.record_name}: ${block.rows.length} campos`);
    }
    
    if (blocks.length === 0) {
      return {
        success: false,
        errors: ['Nenhum layout CNAB detectado no PDF. Verifique se o arquivo contém tabelas de layout de campos.'],
        warnings: [],
        pages_analyzed: pages.length,
        fields_extracted: 0,
      };
    }
    
    // Converter blocos em registros
    const records = blocks.map(block => blockToLayoutRecord(block, true));
    
    // Validar layout
    const validationWarnings = validateLayout(records, recordSize);
    warnings.push(...validationWarnings);
    
    // Contar campos extraídos
    const totalFields = records.reduce((sum, r) => sum + r.fields.length, 0);
    console.log(`[CNAB Extractor] Total de campos extraídos: ${totalFields}`);
    
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
    console.error('[CNAB Extractor] Erro ao processar PDF:', error);
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
  const addCampo = (c: import('@/lib/pdfLayoutParser').CampoDetectado) => {
    idCounter++;
    campos.push({ ...c, id: String(idCounter), cor: c.cor || LAYOUT_FIELD_COLORS[idCounter % LAYOUT_FIELD_COLORS.length] });
  };
  
  const convertCampoCompleto = (
    f: ReturnType<typeof gerarCamposDetalheP240>[number],
    tipoLinha: import('@/components/cnab/CnabTextEditor').TipoLinha
  ): import('@/lib/pdfLayoutParser').CampoDetectado => {
    return {
      id: '0',
      nome: f.nome,
      posicaoInicio: f.posicaoInicio,
      posicaoFim: f.posicaoFim,
      tamanho: f.tamanho,
      tipo: f.formato?.includes('data') ? 'data' : f.formato?.includes('valor') ? 'valor' : (f.tipo === 'numerico' ? 'numerico' : 'alfanumerico'),
      destino: f.campoDestino || '',
      valor: '(do PDF)',
      confianca: 80,
      tipoLinha,
      cor: LAYOUT_FIELD_COLORS[idCounter % LAYOUT_FIELD_COLORS.length],
    };
  };
  
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
        case 'DETALHE':
        case 'DETALHE_A':
          tipoLinha = 'detalhe';
          break;
        case 'TRAILER_LOTE':
          tipoLinha = 'trailer_lote';
          break;
        case 'TRAILER_ARQUIVO':
          tipoLinha = 'trailer_arquivo';
          break;
      }
      
      for (const field of record.fields) {
        let tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor' = 'alfanumerico';
        switch (field.data_type) {
          case 'num': tipo = 'numerico'; break;
          case 'decimal': tipo = 'valor'; break;
          case 'date': tipo = 'data'; break;
          default: tipo = 'alfanumerico'; break;
        }
        addCampo({
          id: '0',
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
      
      // Fallback: se o segmento possui poucos campos, completar com definição conhecida
      const segmentoCount = (tl: typeof tipoLinha) => campos.filter(c => c.tipoLinha === tl).length;
      const ensureDefaults = () => {
        if (tipoLinha === 'detalhe_segmento_p' && segmentoCount('detalhe_segmento_p') < 10) {
          for (const f of gerarCamposDetalheP240()) addCampo(convertCampoCompleto(f, 'detalhe_segmento_p'));
        }
        if (tipoLinha === 'detalhe_segmento_q' && segmentoCount('detalhe_segmento_q') < 8) {
          for (const f of gerarCamposDetalheQ240()) addCampo(convertCampoCompleto(f, 'detalhe_segmento_q'));
        }
        if (tipoLinha === 'detalhe_segmento_r' && segmentoCount('detalhe_segmento_r') < 6) {
          for (const f of gerarCamposDetalheR240()) addCampo(convertCampoCompleto(f, 'detalhe_segmento_r'));
        }
        if (tipoLinha === 'header_arquivo' && segmentoCount('header_arquivo') < 10) {
          for (const f of gerarCamposHeaderArquivo240()) addCampo(convertCampoCompleto(f, 'header_arquivo'));
        }
        if (tipoLinha === 'header_lote' && segmentoCount('header_lote') < 6) {
          for (const f of gerarCamposHeaderLote240()) addCampo(convertCampoCompleto(f, 'header_lote'));
        }
        if (tipoLinha === 'trailer_lote' && segmentoCount('trailer_lote') < 3) {
          for (const f of gerarCamposTrailerLote240()) addCampo(convertCampoCompleto(f, 'trailer_lote'));
        }
        if (tipoLinha === 'trailer_arquivo' && segmentoCount('trailer_arquivo') < 3) {
          for (const f of gerarCamposTrailerArquivo240()) addCampo(convertCampoCompleto(f, 'trailer_arquivo'));
        }
      };
      ensureDefaults();
    }
  }
  
  return campos;
}
