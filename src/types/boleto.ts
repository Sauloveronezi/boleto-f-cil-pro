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

// Resumo de geração de boletos
export interface ResumoGeracao {
  tipo_impressao: TipoImpressao;
  banco: Banco;
  clientes_selecionados: number;
  notas_selecionadas: number;
  modelo_layout: ModeloBoleto;
  valor_total: number;
}
