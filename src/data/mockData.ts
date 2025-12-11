import { Banco, Cliente, NotaFiscal, ModeloBoleto, ConfiguracaoBanco } from '@/types/boleto';

export const bancosMock: Banco[] = [
  {
    id: '1',
    nome_banco: 'Banco do Brasil',
    codigo_banco: '001',
    tipo_layout_padrao: 'CNAB_240',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '2',
    nome_banco: 'Bradesco',
    codigo_banco: '237',
    tipo_layout_padrao: 'CNAB_400',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '3',
    nome_banco: 'Itaú Unibanco',
    codigo_banco: '341',
    tipo_layout_padrao: 'CNAB_240',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '4',
    nome_banco: 'Santander',
    codigo_banco: '033',
    tipo_layout_padrao: 'CNAB_240',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '5',
    nome_banco: 'Caixa Econômica Federal',
    codigo_banco: '104',
    tipo_layout_padrao: 'CNAB_240',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '6',
    nome_banco: 'Sicredi',
    codigo_banco: '748',
    tipo_layout_padrao: 'CNAB_400',
    logo_url: '/placeholder.svg',
    ativo: true
  }
];

export const configuracoesBancoMock: ConfiguracaoBanco[] = [
  {
    id: '1',
    banco_id: '1',
    taxa_juros_mensal: 1.0,
    multa_percentual: 2.0,
    dias_carencia: 0,
    texto_instrucao_padrao: 'Não receber após 30 dias do vencimento. Cobrar juros de 1% ao mês e multa de 2% após o vencimento.',
    carteira: '17',
    agencia: '1234',
    conta: '56789-0',
    codigo_cedente: '123456'
  },
  {
    id: '2',
    banco_id: '2',
    taxa_juros_mensal: 1.5,
    multa_percentual: 2.0,
    dias_carencia: 1,
    texto_instrucao_padrao: 'Após vencimento, cobrar multa de 2% e juros de 1,5% ao mês.',
    carteira: '09',
    agencia: '5678',
    conta: '12345-6',
    codigo_cedente: '789012'
  },
  {
    id: '3',
    banco_id: '3',
    taxa_juros_mensal: 1.0,
    multa_percentual: 2.0,
    dias_carencia: 0,
    texto_instrucao_padrao: 'Sr. Caixa, não receber após 60 dias do vencimento.',
    carteira: '109',
    agencia: '9012',
    conta: '34567-8',
    codigo_cedente: '345678'
  }
];

export const clientesMock: Cliente[] = [
  {
    id: '1',
    business_partner: 'BP001',
    razao_social: 'Transportadora ABC Ltda',
    cnpj: '12.345.678/0001-90',
    lzone: 'Sudeste',
    estado: 'SP',
    cidade: 'São Paulo',
    parceiro_negocio: 'Grupo Logístico Alpha',
    agente_frete: 'Agente SP-01',
    endereco: 'Av. Paulista, 1000 - Bela Vista',
    cep: '01310-100',
    email: 'contato@transportadoraabc.com.br',
    telefone: '(11) 3456-7890'
  },
  {
    id: '2',
    business_partner: 'BP002',
    razao_social: 'Logística Express S/A',
    cnpj: '23.456.789/0001-01',
    lzone: 'Sudeste',
    estado: 'RJ',
    cidade: 'Rio de Janeiro',
    parceiro_negocio: 'Rede Express',
    agente_frete: 'Agente RJ-01',
    endereco: 'Rua do Comércio, 500 - Centro',
    cep: '20010-020',
    email: 'financeiro@logisticaexpress.com.br',
    telefone: '(21) 2345-6789'
  },
  {
    id: '3',
    business_partner: 'BP003',
    razao_social: 'Distribuidora Norte Sul Eireli',
    cnpj: '34.567.890/0001-12',
    lzone: 'Sul',
    estado: 'PR',
    cidade: 'Curitiba',
    parceiro_negocio: 'Grupo Norte Sul',
    agente_frete: 'Agente PR-01',
    endereco: 'Av. das Indústrias, 2000 - CIC',
    cep: '81170-000',
    email: 'contato@nortesul.com.br',
    telefone: '(41) 3456-7890'
  },
  {
    id: '4',
    business_partner: 'BP004',
    razao_social: 'Comércio e Transportes Beta ME',
    cnpj: '45.678.901/0001-23',
    lzone: 'Nordeste',
    estado: 'BA',
    cidade: 'Salvador',
    parceiro_negocio: 'Rede Nordeste',
    agente_frete: 'Agente BA-01',
    endereco: 'Av. Tancredo Neves, 1500 - Caminho das Árvores',
    cep: '41820-020',
    email: 'beta@transportesbeta.com.br',
    telefone: '(71) 3456-7890'
  },
  {
    id: '5',
    business_partner: 'BP005',
    razao_social: 'Fretes e Cargas Ltda',
    cnpj: '56.789.012/0001-34',
    lzone: 'Centro-Oeste',
    estado: 'GO',
    cidade: 'Goiânia',
    parceiro_negocio: 'Grupo Centro Brasil',
    agente_frete: 'Agente GO-01',
    endereco: 'Av. T-63, 500 - Setor Bueno',
    cep: '74230-100',
    email: 'fretescargas@email.com.br',
    telefone: '(62) 3456-7890'
  },
  {
    id: '6',
    business_partner: 'BP006',
    razao_social: 'Amazônia Logística S/A',
    cnpj: '67.890.123/0001-45',
    lzone: 'Norte',
    estado: 'AM',
    cidade: 'Manaus',
    parceiro_negocio: 'Grupo Amazônia',
    agente_frete: 'Agente AM-01',
    endereco: 'Av. Djalma Batista, 1000 - Chapada',
    cep: '69050-010',
    email: 'contato@amazonialog.com.br',
    telefone: '(92) 3456-7890'
  },
  {
    id: '7',
    business_partner: 'BP007',
    razao_social: 'MG Transportes e Logística Ltda',
    cnpj: '78.901.234/0001-56',
    lzone: 'Sudeste',
    estado: 'MG',
    cidade: 'Belo Horizonte',
    parceiro_negocio: 'Grupo Logístico Alpha',
    agente_frete: 'Agente MG-01',
    endereco: 'Av. do Contorno, 3000 - Funcionários',
    cep: '30110-017',
    email: 'mgtransportes@email.com.br',
    telefone: '(31) 3456-7890'
  },
  {
    id: '8',
    business_partner: 'BP008',
    razao_social: 'RS Cargas e Encomendas S/A',
    cnpj: '89.012.345/0001-67',
    lzone: 'Sul',
    estado: 'RS',
    cidade: 'Porto Alegre',
    parceiro_negocio: 'Rede Sul',
    agente_frete: 'Agente RS-01',
    endereco: 'Av. Ipiranga, 5000 - Jardim Botânico',
    cep: '90610-000',
    email: 'rscargas@email.com.br',
    telefone: '(51) 3456-7890'
  }
];

export const notasFiscaisMock: NotaFiscal[] = [
  {
    id: '1',
    numero_nota: '000123',
    serie: '1',
    data_emissao: '2024-11-15',
    data_vencimento: '2024-12-15',
    valor_titulo: 15750.50,
    moeda: 'BRL',
    codigo_cliente: '1',
    status: 'aberta',
    referencia_interna: 'REF-2024-001'
  },
  {
    id: '2',
    numero_nota: '000124',
    serie: '1',
    data_emissao: '2024-11-18',
    data_vencimento: '2024-12-18',
    valor_titulo: 8320.00,
    moeda: 'BRL',
    codigo_cliente: '1',
    status: 'aberta',
    referencia_interna: 'REF-2024-002'
  },
  {
    id: '3',
    numero_nota: '000125',
    serie: '1',
    data_emissao: '2024-11-10',
    data_vencimento: '2024-12-10',
    valor_titulo: 22450.75,
    moeda: 'BRL',
    codigo_cliente: '2',
    status: 'aberta',
    referencia_interna: 'REF-2024-003'
  },
  {
    id: '4',
    numero_nota: '000126',
    serie: '1',
    data_emissao: '2024-10-20',
    data_vencimento: '2024-11-20',
    valor_titulo: 5680.00,
    moeda: 'BRL',
    codigo_cliente: '2',
    status: 'vencida',
    referencia_interna: 'REF-2024-004'
  },
  {
    id: '5',
    numero_nota: '000127',
    serie: '1',
    data_emissao: '2024-11-20',
    data_vencimento: '2024-12-20',
    valor_titulo: 31200.00,
    moeda: 'BRL',
    codigo_cliente: '3',
    status: 'aberta',
    referencia_interna: 'REF-2024-005'
  },
  {
    id: '6',
    numero_nota: '000128',
    serie: '1',
    data_emissao: '2024-11-22',
    data_vencimento: '2024-12-22',
    valor_titulo: 12890.25,
    moeda: 'BRL',
    codigo_cliente: '4',
    status: 'aberta',
    referencia_interna: 'REF-2024-006'
  },
  {
    id: '7',
    numero_nota: '000129',
    serie: '1',
    data_emissao: '2024-11-05',
    data_vencimento: '2024-12-05',
    valor_titulo: 7540.00,
    moeda: 'BRL',
    codigo_cliente: '5',
    status: 'aberta',
    referencia_interna: 'REF-2024-007'
  },
  {
    id: '8',
    numero_nota: '000130',
    serie: '1',
    data_emissao: '2024-10-15',
    data_vencimento: '2024-11-15',
    valor_titulo: 18900.00,
    moeda: 'BRL',
    codigo_cliente: '6',
    status: 'liquidada',
    referencia_interna: 'REF-2024-008'
  },
  {
    id: '9',
    numero_nota: '000131',
    serie: '1',
    data_emissao: '2024-11-25',
    data_vencimento: '2024-12-25',
    valor_titulo: 9870.50,
    moeda: 'BRL',
    codigo_cliente: '7',
    status: 'aberta',
    referencia_interna: 'REF-2024-009'
  },
  {
    id: '10',
    numero_nota: '000132',
    serie: '1',
    data_emissao: '2024-11-28',
    data_vencimento: '2024-12-28',
    valor_titulo: 45320.00,
    moeda: 'BRL',
    codigo_cliente: '8',
    status: 'aberta',
    referencia_interna: 'REF-2024-010'
  }
];

export const modelosBoletoMock: ModeloBoleto[] = [
  {
    id: '1',
    nome_modelo: 'Modelo Padrão BB',
    banco_id: '1',
    tipo_layout: 'CNAB_240',
    padrao: true,
    campos_mapeados: [
      { id: '1', nome: 'Razão Social', variavel: '{{cliente_razao_social}}', posicao_x: 10, posicao_y: 50, largura: 200, altura: 20 },
      { id: '2', nome: 'CNPJ', variavel: '{{cliente_cnpj}}', posicao_x: 10, posicao_y: 70, largura: 150, altura: 20 },
      { id: '3', nome: 'Valor', variavel: '{{valor_titulo}}', posicao_x: 300, posicao_y: 100, largura: 100, altura: 20 },
      { id: '4', nome: 'Vencimento', variavel: '{{data_vencimento}}', posicao_x: 300, posicao_y: 120, largura: 100, altura: 20 }
    ],
    texto_instrucoes: 'Não receber após 30 dias do vencimento. Cobrar juros de {{taxa_juros}}% ao mês e multa de {{multa}}% após o vencimento.',
    criado_em: '2024-01-15',
    atualizado_em: '2024-11-01'
  },
  {
    id: '2',
    nome_modelo: 'Modelo Padrão Bradesco',
    banco_id: '2',
    tipo_layout: 'CNAB_400',
    padrao: true,
    campos_mapeados: [
      { id: '1', nome: 'Razão Social', variavel: '{{cliente_razao_social}}', posicao_x: 10, posicao_y: 50, largura: 200, altura: 20 },
      { id: '2', nome: 'CNPJ', variavel: '{{cliente_cnpj}}', posicao_x: 10, posicao_y: 70, largura: 150, altura: 20 },
      { id: '3', nome: 'Valor', variavel: '{{valor_titulo}}', posicao_x: 300, posicao_y: 100, largura: 100, altura: 20 }
    ],
    texto_instrucoes: 'Após vencimento, cobrar multa de {{multa}}% e juros de {{taxa_juros}}% ao mês.',
    criado_em: '2024-02-10',
    atualizado_em: '2024-10-15'
  },
  {
    id: '3',
    nome_modelo: 'Modelo Corporativo Itaú',
    banco_id: '3',
    tipo_layout: 'CNAB_240',
    padrao: true,
    campos_mapeados: [
      { id: '1', nome: 'Razão Social', variavel: '{{cliente_razao_social}}', posicao_x: 10, posicao_y: 50, largura: 200, altura: 20 },
      { id: '2', nome: 'CNPJ', variavel: '{{cliente_cnpj}}', posicao_x: 10, posicao_y: 70, largura: 150, altura: 20 }
    ],
    texto_instrucoes: 'Sr. Caixa, não receber após 60 dias do vencimento.',
    criado_em: '2024-03-05',
    atualizado_em: '2024-09-20'
  }
];

// Funções auxiliares para filtros
export const getEstadosUnicos = (): string[] => {
  return [...new Set(clientesMock.map(c => c.estado))].sort();
};

export const getCidadesUnicas = (): string[] => {
  return [...new Set(clientesMock.map(c => c.cidade))].sort();
};

export const getLzonesUnicos = (): string[] => {
  return [...new Set(clientesMock.map(c => c.lzone))].sort();
};

export const getParceirosUnicos = (): string[] => {
  return [...new Set(clientesMock.map(c => c.parceiro_negocio))].sort();
};

export const getAgentesUnicos = (): string[] => {
  return [...new Set(clientesMock.map(c => c.agente_frete))].sort();
};
