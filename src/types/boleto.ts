// Tipos de origem dos dados (formato de leitura)
export type TipoOrigem = 'CNAB_240' | 'CNAB_400' | 'API_CDS';

export const TIPOS_ORIGEM: Record<TipoOrigem, { label: string; descricao: string }> = {
  CNAB_240: {
    label: 'CNAB 240',
    descricao: 'Leitura de arquivo no padrão CNAB 240 posições'
  },
  CNAB_400: {
    label: 'CNAB 400',
    descricao: 'Leitura de arquivo no padrão CNAB 400 posições'
  },
  API_CDS: {
    label: 'Via API / Banco de Dados / CDS',
    descricao: 'Leitura direta via integração com sistema (SAP, CDS, etc.)'
  }
};

// Alias para compatibilidade
export type TipoImpressao = TipoOrigem;
export const TIPOS_IMPRESSAO = TIPOS_ORIGEM;

// Banco emissor
export interface Banco {
  id: string;
  nome_banco: string;
  codigo_banco: string;
  tipo_layout_padrao: TipoImpressao;
  logo_url?: string;
  ativo: boolean;
}

// Configurações específicas do banco
export interface ConfiguracaoBanco {
  id: string;
  banco_id: string;
  taxa_juros_mensal: number;
  multa_percentual: number;
  dias_carencia: number;
  texto_instrucao_padrao: string;
  carteira: string;
  agencia: string;
  conta: string;
  digito_conta?: string;
  codigo_cedente: string;
  convenio?: string; // Código do convênio (usado pelo BB e outros)
  local_pagamento?: string;
}

// Cliente
export interface Cliente {
  id: string;
  business_partner: string;
  razao_social: string;
  cnpj: string;
  lzone: string;
  estado: string;
  cidade: string;
  parceiro_negocio: string;
  agente_frete: string;
  endereco: string;
  cep: string;
  email?: string;
  telefone?: string;
}

// Status da nota fiscal
export type StatusNota = 'aberta' | 'liquidada' | 'cancelada' | 'vencida';

// Nota fiscal / Título
export interface NotaFiscal {
  id: string;
  numero_nota: string;
  serie: string;
  data_emissao: string;
  data_vencimento: string;
  valor_titulo: number;
  moeda: string;
  codigo_cliente: string;
  status: StatusNota;
  referencia_interna: string;
  cliente?: Cliente;
}

// Template PDF importado
export interface TemplatePDF {
  id: string;
  nome: string;
  arquivo_base64?: string; // PDF original em base64
  preview_url?: string;
  layout_detectado: {
    largura_pagina: number;
    altura_pagina: number;
    areas_texto: AreaTextoPDF[];
  };
  criado_em: string;
}

export interface AreaTextoPDF {
  id: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  texto_original?: string;
  campo_mapeado?: string; // variável que será inserida
}

// Modelo de layout de boleto
export interface ModeloBoleto {
  id: string;
  nome_modelo: string;
  banco_id: string;
  bancos_compativeis?: string[]; // IDs dos bancos que podem usar este modelo
  tipo_layout: TipoImpressao;
  padrao: boolean;
  campos_mapeados: CampoMapeado[];
  texto_instrucoes: string;
  template_pdf_id?: string; // Referência ao template PDF importado
  criado_em: string;
  atualizado_em: string;
}

// Campo mapeado no layout
export interface CampoMapeado {
  id: string;
  nome: string;
  variavel: string;
  posicao_x: number;
  posicao_y: number;
  largura: number;
  altura: number;
}

// Boleto gerado
export interface BoletoGerado {
  id: string;
  nota_fiscal_id: string;
  modelo_boleto_id: string;
  banco_id: string;
  nosso_numero: string;
  linha_digitavel: string;
  codigo_barras: string;
  valor: number;
  data_vencimento: string;
  data_geracao: string;
  status: 'gerado' | 'registrado' | 'pago' | 'cancelado';
}

// Filtros de cliente
export interface FiltroCliente {
  lzone?: string[];
  estado?: string[];
  cidade?: string[];
  parceiro_negocio?: string[];
  agente_frete?: string[];
  cnpj?: string;
  razao_social?: string;
}

// Filtros de nota fiscal
export interface FiltroNotaFiscal {
  data_emissao_inicio?: string;
  data_emissao_fim?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  status?: StatusNota[];
  cliente_ids?: string[];
}

// Configurações do sistema
export interface ConfiguracaoSistema {
  modo_demo: boolean;
  api_endpoint?: string;
  api_token?: string;
}

// Tipo de registro no arquivo CNAB (multi-linha)
export type TipoRegistroCNAB = 
  | 'header_arquivo' 
  | 'header_lote' 
  | 'detalhe_segmento_p' 
  | 'detalhe_segmento_q' 
  | 'detalhe_segmento_r' 
  | 'detalhe_segmento_a'
  | 'detalhe_segmento_b'
  | 'detalhe_segmento_s'    // Remessa
  | 'detalhe_segmento_t'    // Retorno
  | 'detalhe_segmento_u'    // Retorno
  | 'detalhe_segmento_y'    // Genérico Y
  | 'detalhe_segmento_y03'  // Remessa/Retorno
  | 'detalhe_segmento_y04'  // Retorno
  | 'detalhe_segmento_y53'  // Remessa
  | 'detalhe'  // CNAB 400 - registro tipo 1
  | 'trailer_lote' 
  | 'trailer_arquivo';

// Identificador da linha no arquivo
export interface IdentificadorLinha {
  posicao: number; // Posição do identificador (1 para CNAB 400, 8 para CNAB 240)
  valor: string;   // Valor esperado ("0", "1", "3", "5", "9" ou "P", "Q", "R")
  segmento?: string; // Para CNAB 240, posição 14
}

// Linha de configuração CNAB (agrupa campos do mesmo tipo de registro)
export interface LinhaCNAB {
  id: string;
  tipo: TipoRegistroCNAB;
  identificador: IdentificadorLinha;
  descricao: string;
  tamanhoLinha: 240 | 400;
  campos: CampoCNABCompleto[];
  ordemExibicao: number;
  corTipo: string;
}

// Campo CNAB com todas as propriedades (estrutura completa)
export interface CampoCNABCompleto {
  id: string;
  nome: string;
  descricao?: string;
  posicaoInicio: number;
  posicaoFim: number;
  tamanho: number;
  tipo: 'numerico' | 'alfanumerico' | 'alfa';
  formato?: 'texto' | 'numero' | 'data_ddmmaa' | 'data_ddmmaaaa' | 'valor_centavos';
  picture?: string;
  conteudoPadrao?: string;
  obrigatorio: boolean;
  utilizadoNoBoleto: boolean;
  campoDestino?: string;
  cor: string;
  valorExemplo?: string;
}

// Tipo de linha no arquivo CNAB (compatibilidade legada)
export type TipoLinhaCNAB = 'header' | 'detalhe' | 'trailer' | 'header_lote' | 'trailer_lote';

// Campo CNAB (estrutura simplificada para compatibilidade)
export interface CampoCNAB {
  id: string;
  nome: string;
  campo_destino: string;
  posicao_inicio: number;
  posicao_fim: number;
  tipo_registro?: string;
  formato?: 'texto' | 'numero' | 'data_ddmmaa' | 'data_ddmmaaaa' | 'valor_centavos';
  tipo_linha?: TipoLinhaCNAB;
  cor?: string;
}

// Configuração de layout CNAB por banco (estrutura atualizada com suporte a múltiplas linhas)
export interface ConfiguracaoCNAB {
  id: string;
  banco_id: string;
  tipo_cnab: 'CNAB_240' | 'CNAB_400';
  nome: string;
  descricao?: string;
  // Nova estrutura: linhas organizadas por tipo de registro
  linhas?: LinhaCNAB[];
  // Estrutura legada: campos simples (mantido para compatibilidade)
  campos: CampoCNAB[];
  criado_em: string;
  atualizado_em: string;
}

// Resumo de geração de boletos
export interface ResumoGeracao {
  tipo_impressao: TipoImpressao;
  banco: Banco;
  clientes_selecionados: number;
  notas_selecionadas: number;
  modelo_layout: ModeloBoleto;
  valor_total: number;
}
