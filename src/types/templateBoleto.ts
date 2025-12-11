// Tipos de campo padrão que um boleto deve ter
export type CampoBoletoTipo = 
  // Dados do Banco
  | 'banco_codigo'
  | 'banco_nome'
  | 'banco_logo'
  
  // Dados do Beneficiário (Cedente)
  | 'beneficiario_nome'
  | 'beneficiario_cnpj'
  | 'beneficiario_endereco'
  | 'beneficiario_cidade_uf'
  | 'beneficiario_cep'
  
  // Dados do Pagador (Sacado)
  | 'pagador_nome'
  | 'pagador_cnpj'
  | 'pagador_endereco'
  | 'pagador_cidade_uf'
  | 'pagador_cep'
  
  // Dados do Título
  | 'nosso_numero'
  | 'numero_documento'
  | 'especie_documento'
  | 'aceite'
  | 'data_documento'
  | 'data_processamento'
  | 'data_vencimento'
  | 'valor_documento'
  | 'valor_cobrado'
  | 'desconto_abatimento'
  | 'outras_deducoes'
  | 'mora_multa'
  | 'outros_acrescimos'
  
  // Dados Bancários
  | 'agencia_codigo'
  | 'carteira'
  | 'especie_moeda'
  | 'quantidade'
  | 'valor_moeda'
  | 'local_pagamento'
  
  // Código de Barras
  | 'linha_digitavel'
  | 'codigo_barras'
  
  // Instruções
  | 'instrucoes'
  
  // Campos personalizados
  | 'custom';

// Configuração visual de um campo no template
export interface CampoTemplateBoleto {
  id: string;
  tipo: CampoBoletoTipo;
  label: string; // Nome do campo para exibição
  
  // Posição no PDF (em mm, origem no canto superior esquerdo)
  x: number;
  y: number;
  largura: number;
  altura: number;
  
  // Estilo do texto
  fonte?: 'helvetica' | 'courier' | 'times';
  tamanho_fonte?: number;
  negrito?: boolean;
  italico?: boolean;
  alinhamento?: 'left' | 'center' | 'right';
  cor?: string; // Formato hex
  
  // Para campos de caixa/retângulo
  borda?: boolean;
  cor_fundo?: string;
  
  // Campo customizado
  valor_fixo?: string; // Texto fixo (para labels)
  variavel?: string; // Variável a ser substituída
  
  // Formato de exibição
  formato?: 'texto' | 'moeda' | 'data' | 'cpf_cnpj';
}

// Template completo de um boleto
export interface TemplateBoletoCompleto {
  id: string;
  nome: string;
  descricao?: string;
  
  // Dimensões da página
  largura_pagina: number; // mm
  altura_pagina: number; // mm
  orientacao: 'portrait' | 'landscape';
  
  // Margens
  margem_superior: number;
  margem_inferior: number;
  margem_esquerda: number;
  margem_direita: number;
  
  // Campos do template
  campos: CampoTemplateBoleto[];
  
  // PDF original importado (base64)
  pdf_original_base64?: string;
  
  // Bancos compatíveis
  bancos_compativeis: string[];
  
  // Metadados
  criado_em: string;
  atualizado_em: string;
}

// Definição padrão de todos os campos de um boleto
export const CAMPOS_BOLETO_PADRAO: { tipo: CampoBoletoTipo; label: string; obrigatorio: boolean }[] = [
  // Banco
  { tipo: 'banco_codigo', label: 'Código do Banco', obrigatorio: true },
  { tipo: 'banco_nome', label: 'Nome do Banco', obrigatorio: true },
  { tipo: 'banco_logo', label: 'Logo do Banco', obrigatorio: false },
  
  // Beneficiário
  { tipo: 'beneficiario_nome', label: 'Nome do Beneficiário', obrigatorio: true },
  { tipo: 'beneficiario_cnpj', label: 'CNPJ do Beneficiário', obrigatorio: true },
  { tipo: 'beneficiario_endereco', label: 'Endereço do Beneficiário', obrigatorio: false },
  { tipo: 'beneficiario_cidade_uf', label: 'Cidade/UF do Beneficiário', obrigatorio: false },
  { tipo: 'beneficiario_cep', label: 'CEP do Beneficiário', obrigatorio: false },
  
  // Pagador
  { tipo: 'pagador_nome', label: 'Nome do Pagador', obrigatorio: true },
  { tipo: 'pagador_cnpj', label: 'CPF/CNPJ do Pagador', obrigatorio: true },
  { tipo: 'pagador_endereco', label: 'Endereço do Pagador', obrigatorio: true },
  { tipo: 'pagador_cidade_uf', label: 'Cidade/UF do Pagador', obrigatorio: true },
  { tipo: 'pagador_cep', label: 'CEP do Pagador', obrigatorio: true },
  
  // Título
  { tipo: 'nosso_numero', label: 'Nosso Número', obrigatorio: true },
  { tipo: 'numero_documento', label: 'Número do Documento', obrigatorio: true },
  { tipo: 'especie_documento', label: 'Espécie Doc.', obrigatorio: true },
  { tipo: 'aceite', label: 'Aceite', obrigatorio: true },
  { tipo: 'data_documento', label: 'Data do Documento', obrigatorio: true },
  { tipo: 'data_processamento', label: 'Data Processamento', obrigatorio: true },
  { tipo: 'data_vencimento', label: 'Data de Vencimento', obrigatorio: true },
  { tipo: 'valor_documento', label: 'Valor do Documento', obrigatorio: true },
  { tipo: 'valor_cobrado', label: 'Valor Cobrado', obrigatorio: false },
  { tipo: 'desconto_abatimento', label: 'Desconto/Abatimento', obrigatorio: false },
  { tipo: 'outras_deducoes', label: 'Outras Deduções', obrigatorio: false },
  { tipo: 'mora_multa', label: 'Mora/Multa', obrigatorio: false },
  { tipo: 'outros_acrescimos', label: 'Outros Acréscimos', obrigatorio: false },
  
  // Dados Bancários
  { tipo: 'agencia_codigo', label: 'Agência/Código Beneficiário', obrigatorio: true },
  { tipo: 'carteira', label: 'Carteira', obrigatorio: true },
  { tipo: 'especie_moeda', label: 'Espécie Moeda', obrigatorio: true },
  { tipo: 'quantidade', label: 'Quantidade', obrigatorio: false },
  { tipo: 'valor_moeda', label: 'Valor Moeda', obrigatorio: false },
  { tipo: 'local_pagamento', label: 'Local de Pagamento', obrigatorio: true },
  
  // Código de Barras
  { tipo: 'linha_digitavel', label: 'Linha Digitável', obrigatorio: true },
  { tipo: 'codigo_barras', label: 'Código de Barras', obrigatorio: true },
  
  // Instruções
  { tipo: 'instrucoes', label: 'Instruções', obrigatorio: true },
];

// Criar template padrão FEBRABAN
export function criarTemplatePadraoFEBRABAN(): TemplateBoletoCompleto {
  return {
    id: 'template_febraban_padrao',
    nome: 'Modelo FEBRABAN Padrão',
    descricao: 'Layout padrão de boleto seguindo especificações FEBRABAN',
    largura_pagina: 210,
    altura_pagina: 297,
    orientacao: 'portrait',
    margem_superior: 15,
    margem_inferior: 15,
    margem_esquerda: 15,
    margem_direita: 15,
    bancos_compativeis: [],
    campos: [
      // Header - Banco
      { id: '1', tipo: 'banco_codigo', label: 'Código Banco', x: 15, y: 15, largura: 20, altura: 12, fonte: 'helvetica', tamanho_fonte: 14, negrito: true, borda: true },
      { id: '2', tipo: 'banco_nome', label: 'Nome Banco', x: 35, y: 15, largura: 100, altura: 12, fonte: 'helvetica', tamanho_fonte: 12, negrito: true, borda: true },
      
      // Linha Digitável
      { id: '3', tipo: 'linha_digitavel', label: 'Linha Digitável', x: 15, y: 30, largura: 180, altura: 10, fonte: 'courier', tamanho_fonte: 11, negrito: true, borda: true, cor_fundo: '#f5f5f5' },
      
      // Local de Pagamento
      { id: '4', tipo: 'local_pagamento', label: 'Local de Pagamento', x: 15, y: 43, largura: 180, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true, valor_fixo: 'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO' },
      
      // Beneficiário
      { id: '5', tipo: 'beneficiario_nome', label: 'Beneficiário', x: 15, y: 55, largura: 126, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, negrito: true, borda: true },
      { id: '6', tipo: 'agencia_codigo', label: 'Agência/Código', x: 141, y: 55, largura: 54, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true },
      
      // Linha de Documentos
      { id: '7', tipo: 'data_documento', label: 'Data Documento', x: 15, y: 67, largura: 36, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true, formato: 'data' },
      { id: '8', tipo: 'numero_documento', label: 'Nº Documento', x: 51, y: 67, largura: 36, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true },
      { id: '9', tipo: 'especie_documento', label: 'Espécie Doc', x: 87, y: 67, largura: 36, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true },
      { id: '10', tipo: 'aceite', label: 'Aceite', x: 123, y: 67, largura: 36, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true },
      { id: '11', tipo: 'data_processamento', label: 'Data Process.', x: 159, y: 67, largura: 36, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true, formato: 'data' },
      
      // Linha de Valores
      { id: '12', tipo: 'carteira', label: 'Carteira', x: 51, y: 79, largura: 36, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true },
      { id: '13', tipo: 'especie_moeda', label: 'Moeda', x: 87, y: 79, largura: 36, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true },
      { id: '14', tipo: 'quantidade', label: 'Quantidade', x: 123, y: 79, largura: 36, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true },
      { id: '15', tipo: 'valor_documento', label: 'Valor Documento', x: 159, y: 79, largura: 36, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, negrito: true, borda: true, formato: 'moeda' },
      
      // Nosso Número e Vencimento
      { id: '16', tipo: 'nosso_numero', label: 'Nosso Número', x: 15, y: 91, largura: 126, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, negrito: true, borda: true },
      { id: '17', tipo: 'data_vencimento', label: 'Vencimento', x: 141, y: 91, largura: 27, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, negrito: true, borda: true, formato: 'data' },
      { id: '18', tipo: 'valor_cobrado', label: 'Valor Cobrado', x: 168, y: 91, largura: 27, altura: 12, fonte: 'helvetica', tamanho_fonte: 9, borda: true, formato: 'moeda' },
      
      // Pagador
      { id: '19', tipo: 'pagador_nome', label: 'Pagador', x: 15, y: 103, largura: 180, altura: 8, fonte: 'helvetica', tamanho_fonte: 9, negrito: true, borda: false },
      { id: '20', tipo: 'pagador_cnpj', label: 'CNPJ Pagador', x: 15, y: 111, largura: 60, altura: 6, fonte: 'helvetica', tamanho_fonte: 8, borda: false, formato: 'cpf_cnpj' },
      { id: '21', tipo: 'pagador_endereco', label: 'Endereço Pagador', x: 15, y: 117, largura: 180, altura: 6, fonte: 'helvetica', tamanho_fonte: 8, borda: false },
      { id: '22', tipo: 'pagador_cidade_uf', label: 'Cidade/UF', x: 15, y: 123, largura: 100, altura: 6, fonte: 'helvetica', tamanho_fonte: 8, borda: false },
      { id: '23', tipo: 'pagador_cep', label: 'CEP', x: 115, y: 123, largura: 40, altura: 6, fonte: 'helvetica', tamanho_fonte: 8, borda: false },
      
      // Instruções
      { id: '24', tipo: 'instrucoes', label: 'Instruções', x: 15, y: 133, largura: 180, altura: 18, fonte: 'helvetica', tamanho_fonte: 8, borda: true },
      
      // Código de Barras
      { id: '25', tipo: 'codigo_barras', label: 'Código de Barras', x: 15, y: 155, largura: 180, altura: 35, fonte: 'courier', tamanho_fonte: 9 },
    ],
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}
