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
  codigo_cedente: string;
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

// Modelo de layout de boleto
export interface ModeloBoleto {
  id: string;
  nome_modelo: string;
  banco_id: string;
  tipo_layout: TipoImpressao;
  padrao: boolean;
  campos_mapeados: CampoMapeado[];
  texto_instrucoes: string;
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

// Configuração de layout CNAB por banco
export interface ConfiguracaoCNAB {
  id: string;
  banco_id: string;
  tipo_cnab: 'CNAB_240' | 'CNAB_400';
  nome: string;
  descricao?: string;
  // Posições dos campos no arquivo (início-fim, 1-indexed)
  campos: CampoCNAB[];
  criado_em: string;
  atualizado_em: string;
}

// Tipo de linha no arquivo CNAB
export type TipoLinhaCNAB = 'header' | 'detalhe' | 'trailer' | 'header_lote' | 'trailer_lote';

export interface CampoCNAB {
  id: string;
  nome: string;
  campo_destino: 'cnpj' | 'razao_social' | 'valor' | 'vencimento' | 'nosso_numero' | 'endereco' | 'numero_nota' | 'cidade' | 'estado' | 'cep' | 'custom';
  posicao_inicio: number;
  posicao_fim: number;
  tipo_registro?: string; // Ex: '1', '3', 'P', etc.
  formato?: 'texto' | 'numero' | 'data_ddmmaa' | 'data_ddmmaaaa' | 'valor_centavos';
  tipo_linha?: TipoLinhaCNAB; // Em qual tipo de linha este campo aparece
  cor?: string; // Cor para destaque visual
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
