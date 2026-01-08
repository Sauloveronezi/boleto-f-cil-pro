/**
 * LayoutSpec - Estrutura JSON para layouts CNAB extraídos de manuais de banco
 * Suporta diferentes formatos de manuais (Itaú, Bradesco, etc.)
 */

// Tipos de dados normalizados
export type CnabDataType = 
  | 'alfa'      // Alfanumérico (preenche com espaços)
  | 'num'       // Numérico (preenche com zeros)
  | 'decimal'   // Numérico com decimais (ex: 9(13)V9(2))
  | 'date'      // Data
  | 'time'      // Hora
  | 'enum'      // Valores enumerados
  | 'cnab_filler'; // Filler/Brancos/Zeros

// Preenchimento padrão
export type DefaultFill = 'spaces' | 'zeros' | 'manual_value';

// Onde o campo é requerido
export type RequiredIn = 'remessa' | 'retorno' | 'ambos';

// Informações do banco
export interface BankInfo {
  code: string;           // Código do banco (ex: "341", "237")
  name: string;           // Nome do banco
  layout_version?: string; // Versão do layout
  manual_version?: string; // Versão do manual
}

// Campo individual do layout
export interface LayoutField {
  // Identificação
  field_name_original: string;   // Nome como no manual
  field_name_normalized: string; // Nome normalizado (snake_case)
  description: string;           // Significado/descrição
  
  // Posições
  start_pos: number;       // Posição inicial (base 1, inclusivo)
  end_pos: number;         // Posição final (base 1, inclusivo)
  length: number;          // Tamanho (end - start + 1)
  
  // Tipo e formato
  data_type: CnabDataType;
  picture_raw?: string;    // Picture original (ex: "X(30)", "9(13)V9(2)")
  decimals?: number;       // Casas decimais quando houver
  
  // Comportamento
  default_fill: DefaultFill;
  required_in: RequiredIn;
  allowed_values?: string[];  // Valores permitidos (enum)
  
  // Notas e regras
  notes: string[];         // Notas aplicáveis
  
  // Destino no sistema
  campo_destino?: string;  // Campo de destino no boleto
  
  // UI
  cor?: string;            // Cor para exibição
}

// Chaves de identificação do registro
export interface MatchKeys {
  banco_pos?: { start: number; end: number; value?: string };
  lote_pos?: { start: number; end: number };
  tipo_registro_pos: { start: number; value: string };
  segmento_pos?: { start: number; value: string };
}

// Registro individual (uma linha do CNAB)
export interface LayoutRecord {
  record_name: string;     // Ex: "HEADER_ARQUIVO", "DETALHE_P"
  match_keys: MatchKeys;   // Chaves para identificar o registro
  fields: LayoutField[];   // Campos do registro
}

// Layout completo (pode haver múltiplos por manual)
export interface CnabLayout {
  layout_id: string;       // Identificador único
  record_size: 240 | 400;  // Tamanho do registro
  records: LayoutRecord[]; // Registros do layout
  notes_catalog: Record<string, string>; // Catálogo de notas
  warnings: string[];      // Avisos de inconsistências
}

// Estrutura principal do LayoutSpec
export interface LayoutSpec {
  bank: BankInfo;
  layouts: CnabLayout[];
  extracted_at: string;    // Data da extração
  source_file?: string;    // Nome do arquivo fonte
}

// Resultado da análise do PDF
export interface PdfAnalysisResult {
  success: boolean;
  layoutSpec?: LayoutSpec;
  errors: string[];
  warnings: string[];
  pages_analyzed: number;
  fields_extracted: number;
}

// Linha de texto extraída do PDF
export interface PdfTextLine {
  text: string;
  y: number;
  x: number;
  pageNumber: number;
}

// Resultado de parsing de uma linha de tabela
export interface ParsedTableRow {
  field: string;
  description: string;
  start: number;
  end: number;
  picture?: string;
  content?: string;
  digits?: number;
  decimals?: number;
  default_value?: string;
  data_type?: CnabDataType;
  notes?: string[];
}

// Bloco de layout detectado no PDF
export interface DetectedLayoutBlock {
  page: number;
  record_name: string;
  record_size: number;
  rows: ParsedTableRow[];
  raw_lines: string[];
}

// Mapeamento de destinos conhecidos
export const KNOWN_DESTINATIONS: Record<string, string> = {
  // Dados do banco/cedente
  'codigo_banco': 'codigo_banco',
  'cod_banco': 'codigo_banco',
  'banco': 'codigo_banco',
  'agencia': 'agencia',
  'ag': 'agencia',
  'conta': 'conta',
  'conta_corrente': 'conta',
  'dv_agencia': 'agencia_dv',
  'dv_conta': 'conta_dv',
  'convenio': 'convenio',
  'codigo_cedente': 'codigo_cedente',
  'cedente': 'cedente',
  'nome_empresa': 'cedente',
  'razao_social': 'cedente',
  
  // Dados do título
  'nosso_numero': 'nosso_numero',
  'identificacao_titulo': 'nosso_numero',
  'numero_documento': 'numero_documento',
  'seu_numero': 'numero_documento',
  'data_vencimento': 'data_vencimento',
  'vencimento': 'data_vencimento',
  'valor_titulo': 'valor',
  'valor_nominal': 'valor',
  'valor': 'valor',
  'carteira': 'carteira',
  'especie_titulo': 'especie',
  'especie': 'especie',
  
  // Dados do sacado/pagador
  'nome_sacado': 'sacado_nome',
  'nome_pagador': 'sacado_nome',
  'sacado': 'sacado_nome',
  'pagador': 'sacado_nome',
  'cpf_cnpj_sacado': 'sacado_cpf_cnpj',
  'inscricao_sacado': 'sacado_cpf_cnpj',
  'endereco_sacado': 'sacado_endereco',
  'endereco_pagador': 'sacado_endereco',
  'cep_sacado': 'sacado_cep',
  'cep_pagador': 'sacado_cep',
  'cidade_sacado': 'sacado_cidade',
  'uf_sacado': 'sacado_uf',
  
  // Datas
  'data_emissao': 'data_emissao',
  'data_geracao': 'data_geracao',
  'data_credito': 'data_credito',
  
  // Valores adicionais
  'valor_desconto': 'valor_desconto',
  'valor_abatimento': 'valor_abatimento',
  'valor_mora': 'valor_mora',
  'valor_multa': 'valor_multa',
  'valor_iof': 'valor_iof',
  'juros_mora': 'juros_mora',
  'multa': 'multa',
  
  // Instruções
  'instrucao1': 'instrucao1',
  'instrucao2': 'instrucao2',
  'mensagem': 'mensagem',
};

// Patterns para identificar tipo de registro
export const RECORD_TYPE_PATTERNS = {
  HEADER_ARQUIVO: ['header de arquivo', 'header arquivo', 'registro 0', 'registro header'],
  HEADER_LOTE: ['header de lote', 'header lote', 'registro 1'],
  DETALHE_P: ['segmento p', 'detalhe p', 'registro 3 - p'],
  DETALHE_Q: ['segmento q', 'detalhe q', 'registro 3 - q'],
  DETALHE_R: ['segmento r', 'detalhe r', 'registro 3 - r'],
  DETALHE_A: ['segmento a', 'detalhe a', 'registro 3 - a'],
  DETALHE_B: ['segmento b', 'detalhe b', 'registro 3 - b'],
  DETALHE: ['detalhe', 'registro 1', 'transação'],
  TRAILER_LOTE: ['trailer de lote', 'trailer lote', 'registro 5'],
  TRAILER_ARQUIVO: ['trailer de arquivo', 'trailer arquivo', 'registro 9'],
};

// Cores para campos
export const LAYOUT_FIELD_COLORS = [
  'bg-blue-200/70',
  'bg-emerald-200/70',
  'bg-amber-200/70',
  'bg-red-200/70',
  'bg-violet-200/70',
  'bg-pink-200/70',
  'bg-cyan-200/70',
  'bg-lime-200/70',
  'bg-orange-200/70',
  'bg-indigo-200/70',
  'bg-teal-200/70',
  'bg-purple-200/70',
];
