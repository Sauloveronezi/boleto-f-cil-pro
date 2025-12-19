import { TipoRegistroCNAB, CampoCNABCompleto, LinhaCNAB } from './boleto';

// Labels para tipos de linha
export const LABELS_TIPO_LINHA: Record<TipoRegistroCNAB, string> = {
  header_arquivo: 'Header de Arquivo',
  header_lote: 'Header de Lote',
  detalhe: 'Detalhe',
  detalhe_segmento_p: 'Detalhe Segmento P',
  detalhe_segmento_q: 'Detalhe Segmento Q',
  detalhe_segmento_r: 'Detalhe Segmento R',
  detalhe_segmento_a: 'Detalhe Segmento A',
  detalhe_segmento_b: 'Detalhe Segmento B',
  trailer_lote: 'Trailer de Lote',
  trailer_arquivo: 'Trailer de Arquivo',
};

// Cores para tipos de linha (borda esquerda)
export const CORES_TIPO_LINHA: Record<TipoRegistroCNAB, string> = {
  header_arquivo: 'border-l-blue-500',
  header_lote: 'border-l-cyan-500',
  detalhe: 'border-l-green-500',
  detalhe_segmento_p: 'border-l-emerald-500',
  detalhe_segmento_q: 'border-l-teal-500',
  detalhe_segmento_r: 'border-l-lime-500',
  detalhe_segmento_a: 'border-l-amber-500',
  detalhe_segmento_b: 'border-l-orange-500',
  trailer_lote: 'border-l-violet-500',
  trailer_arquivo: 'border-l-purple-500',
};

// Cores para campos (paleta de cores distintas)
export const CORES_CAMPOS: string[] = [
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
  'bg-green-200/70',
  'bg-yellow-200/70',
  'bg-rose-200/70',
  'bg-sky-200/70',
];

// Identificar tipo de linha baseado no conteúdo
export function identificarTipoLinha(linha: string, tipoCNAB: 'CNAB_240' | 'CNAB_400'): TipoRegistroCNAB {
  if (!linha || linha.trim().length === 0) {
    return 'detalhe';
  }

  if (tipoCNAB === 'CNAB_240') {
    const tipoRegistro = linha.charAt(7);
    const segmento = linha.charAt(13)?.toUpperCase();

    switch (tipoRegistro) {
      case '0':
        return 'header_arquivo';
      case '1':
        return 'header_lote';
      case '3':
        switch (segmento) {
          case 'P':
            return 'detalhe_segmento_p';
          case 'Q':
            return 'detalhe_segmento_q';
          case 'R':
            return 'detalhe_segmento_r';
          case 'A':
            return 'detalhe_segmento_a';
          case 'B':
            return 'detalhe_segmento_b';
          default:
            return 'detalhe';
        }
      case '5':
        return 'trailer_lote';
      case '9':
        return 'trailer_arquivo';
      default:
        return 'detalhe';
    }
  } else {
    // CNAB 400
    const tipoRegistro = linha.charAt(0);
    switch (tipoRegistro) {
      case '0':
        return 'header_arquivo';
      case '1':
        return 'detalhe';
      case '9':
        return 'trailer_arquivo';
      default:
        return 'detalhe';
    }
  }
}

let campoIdCounter = 0;
function gerarIdCampo(): string {
  return `campo_${++campoIdCounter}_${Date.now()}`;
}

// Gerar linhas padrão para CNAB 240
export function gerarLinhasCNAB240(): LinhaCNAB[] {
  return [
    {
      id: 'linha_header_arquivo_240',
      tipo: 'header_arquivo',
      identificador: { posicao: 8, valor: '0' },
      descricao: 'Header de Arquivo',
      tamanhoLinha: 240,
      campos: gerarCamposHeaderArquivo240(),
      ordemExibicao: 1,
      corTipo: CORES_TIPO_LINHA.header_arquivo,
    },
    {
      id: 'linha_header_lote_240',
      tipo: 'header_lote',
      identificador: { posicao: 8, valor: '1' },
      descricao: 'Header de Lote',
      tamanhoLinha: 240,
      campos: gerarCamposHeaderLote240(),
      ordemExibicao: 2,
      corTipo: CORES_TIPO_LINHA.header_lote,
    },
    {
      id: 'linha_detalhe_p_240',
      tipo: 'detalhe_segmento_p',
      identificador: { posicao: 8, valor: '3', segmento: 'P' },
      descricao: 'Detalhe Segmento P - Dados do Título',
      tamanhoLinha: 240,
      campos: gerarCamposDetalheP240(),
      ordemExibicao: 3,
      corTipo: CORES_TIPO_LINHA.detalhe_segmento_p,
    },
    {
      id: 'linha_detalhe_q_240',
      tipo: 'detalhe_segmento_q',
      identificador: { posicao: 8, valor: '3', segmento: 'Q' },
      descricao: 'Detalhe Segmento Q - Dados do Sacado',
      tamanhoLinha: 240,
      campos: gerarCamposDetalheQ240(),
      ordemExibicao: 4,
      corTipo: CORES_TIPO_LINHA.detalhe_segmento_q,
    },
    {
      id: 'linha_trailer_lote_240',
      tipo: 'trailer_lote',
      identificador: { posicao: 8, valor: '5' },
      descricao: 'Trailer de Lote',
      tamanhoLinha: 240,
      campos: gerarCamposTrailerLote240(),
      ordemExibicao: 5,
      corTipo: CORES_TIPO_LINHA.trailer_lote,
    },
    {
      id: 'linha_trailer_arquivo_240',
      tipo: 'trailer_arquivo',
      identificador: { posicao: 8, valor: '9' },
      descricao: 'Trailer de Arquivo',
      tamanhoLinha: 240,
      campos: gerarCamposTrailerArquivo240(),
      ordemExibicao: 6,
      corTipo: CORES_TIPO_LINHA.trailer_arquivo,
    },
  ];
}

// Gerar linhas padrão para CNAB 400
export function gerarLinhasCNAB400(): LinhaCNAB[] {
  return [
    {
      id: 'linha_header_400',
      tipo: 'header_arquivo',
      identificador: { posicao: 1, valor: '0' },
      descricao: 'Header de Arquivo',
      tamanhoLinha: 400,
      campos: gerarCamposHeader400(),
      ordemExibicao: 1,
      corTipo: CORES_TIPO_LINHA.header_arquivo,
    },
    {
      id: 'linha_detalhe_400',
      tipo: 'detalhe',
      identificador: { posicao: 1, valor: '1' },
      descricao: 'Detalhe',
      tamanhoLinha: 400,
      campos: gerarCamposDetalhe400(),
      ordemExibicao: 2,
      corTipo: CORES_TIPO_LINHA.detalhe,
    },
    {
      id: 'linha_trailer_400',
      tipo: 'trailer_arquivo',
      identificador: { posicao: 1, valor: '9' },
      descricao: 'Trailer de Arquivo',
      tamanhoLinha: 400,
      campos: gerarCamposTrailer400(),
      ordemExibicao: 3,
      corTipo: CORES_TIPO_LINHA.trailer_arquivo,
    },
  ];
}

// Campos Header Arquivo CNAB 240
function gerarCamposHeaderArquivo240(): CampoCNABCompleto[] {
  return [
    { id: gerarIdCampo(), nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Código do banco na compensação', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tipo: 'numerico', tamanho: 4, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Lote de serviço', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de registro', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'CNAB', posicaoInicio: 9, posicaoFim: 17, tipo: 'alfanumerico', tamanho: 9, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Uso FEBRABAN', cor: CORES_CAMPOS[3] },
    { id: gerarIdCampo(), nome: 'Tipo de Inscrição Empresa', posicaoInicio: 18, posicaoFim: 18, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: '1=CPF 2=CNPJ', cor: CORES_CAMPOS[4] },
    { id: gerarIdCampo(), nome: 'CNPJ/CPF Empresa', posicaoInicio: 19, posicaoFim: 32, tipo: 'numerico', tamanho: 14, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'CNPJ ou CPF da empresa', cor: CORES_CAMPOS[5] },
    { id: gerarIdCampo(), nome: 'Convênio', posicaoInicio: 33, posicaoFim: 52, tipo: 'alfanumerico', tamanho: 20, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Código do convênio no banco', cor: CORES_CAMPOS[6] },
    { id: gerarIdCampo(), nome: 'Agência', posicaoInicio: 53, posicaoFim: 57, tipo: 'numerico', tamanho: 5, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Agência mantenedora da conta', campoDestino: 'agencia', cor: CORES_CAMPOS[7] },
    { id: gerarIdCampo(), nome: 'DV Agência', posicaoInicio: 58, posicaoFim: 58, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Dígito verificador da agência', campoDestino: 'agencia_dv', cor: CORES_CAMPOS[8] },
    { id: gerarIdCampo(), nome: 'Conta Corrente', posicaoInicio: 59, posicaoFim: 70, tipo: 'numerico', tamanho: 12, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Número da conta corrente', campoDestino: 'conta', cor: CORES_CAMPOS[9] },
    { id: gerarIdCampo(), nome: 'DV Conta', posicaoInicio: 71, posicaoFim: 71, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Dígito verificador da conta', campoDestino: 'conta_dv', cor: CORES_CAMPOS[10] },
    { id: gerarIdCampo(), nome: 'DV Agência/Conta', posicaoInicio: 72, posicaoFim: 72, tipo: 'alfanumerico', tamanho: 1, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Dígito verificador ag/conta', cor: CORES_CAMPOS[11] },
    { id: gerarIdCampo(), nome: 'Nome da Empresa', posicaoInicio: 73, posicaoFim: 102, tipo: 'alfanumerico', tamanho: 30, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Nome da empresa', campoDestino: 'cedente', cor: CORES_CAMPOS[12] },
    { id: gerarIdCampo(), nome: 'Nome do Banco', posicaoInicio: 103, posicaoFim: 132, tipo: 'alfanumerico', tamanho: 30, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Nome do banco', cor: CORES_CAMPOS[13] },
    { id: gerarIdCampo(), nome: 'CNAB', posicaoInicio: 133, posicaoFim: 142, tipo: 'alfanumerico', tamanho: 10, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Uso FEBRABAN', cor: CORES_CAMPOS[14] },
    { id: gerarIdCampo(), nome: 'Código Remessa/Retorno', posicaoInicio: 143, posicaoFim: 143, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: '1=Remessa 2=Retorno', cor: CORES_CAMPOS[15] },
    { id: gerarIdCampo(), nome: 'Data Geração', posicaoInicio: 144, posicaoFim: 151, tipo: 'numerico', tamanho: 8, formato: 'data_ddmmaaaa', obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Data de geração do arquivo', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Hora Geração', posicaoInicio: 152, posicaoFim: 157, tipo: 'numerico', tamanho: 6, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Hora de geração do arquivo', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Número Sequencial', posicaoInicio: 158, posicaoFim: 163, tipo: 'numerico', tamanho: 6, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Número sequencial do arquivo', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'Versão Layout', posicaoInicio: 164, posicaoFim: 166, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Versão do layout do arquivo', cor: CORES_CAMPOS[3] },
  ];
}

// Campos Header Lote CNAB 240
function gerarCamposHeaderLote240(): CampoCNABCompleto[] {
  return [
    { id: gerarIdCampo(), nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do banco', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tipo: 'numerico', tamanho: 4, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Número do lote', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de registro = 1', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'Tipo de Operação', posicaoInicio: 9, posicaoFim: 9, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de operação', cor: CORES_CAMPOS[3] },
    { id: gerarIdCampo(), nome: 'Tipo de Serviço', posicaoInicio: 10, posicaoFim: 11, tipo: 'numerico', tamanho: 2, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de serviço', cor: CORES_CAMPOS[4] },
    { id: gerarIdCampo(), nome: 'Forma de Lançamento', posicaoInicio: 12, posicaoFim: 13, tipo: 'numerico', tamanho: 2, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Forma de lançamento', cor: CORES_CAMPOS[5] },
    { id: gerarIdCampo(), nome: 'Versão Layout Lote', posicaoInicio: 14, posicaoFim: 16, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Versão do layout do lote', cor: CORES_CAMPOS[6] },
  ];
}

// Campos Detalhe Segmento P CNAB 240
function gerarCamposDetalheP240(): CampoCNABCompleto[] {
  return [
    { id: gerarIdCampo(), nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do banco', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tipo: 'numerico', tamanho: 4, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Número do lote', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de registro = 3', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'Número Sequencial', posicaoInicio: 9, posicaoFim: 13, tipo: 'numerico', tamanho: 5, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Número sequencial do registro', cor: CORES_CAMPOS[3] },
    { id: gerarIdCampo(), nome: 'Segmento', posicaoInicio: 14, posicaoFim: 14, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do segmento = P', cor: CORES_CAMPOS[4] },
    { id: gerarIdCampo(), nome: 'CNAB', posicaoInicio: 15, posicaoFim: 15, tipo: 'alfanumerico', tamanho: 1, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Uso FEBRABAN', cor: CORES_CAMPOS[5] },
    { id: gerarIdCampo(), nome: 'Código Movimento', posicaoInicio: 16, posicaoFim: 17, tipo: 'numerico', tamanho: 2, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do movimento', cor: CORES_CAMPOS[6] },
    { id: gerarIdCampo(), nome: 'Agência', posicaoInicio: 18, posicaoFim: 22, tipo: 'numerico', tamanho: 5, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Agência mantenedora', campoDestino: 'agencia', cor: CORES_CAMPOS[7] },
    { id: gerarIdCampo(), nome: 'DV Agência', posicaoInicio: 23, posicaoFim: 23, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'DV da agência', campoDestino: 'agencia_dv', cor: CORES_CAMPOS[8] },
    { id: gerarIdCampo(), nome: 'Conta Corrente', posicaoInicio: 24, posicaoFim: 35, tipo: 'numerico', tamanho: 12, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Número da conta', campoDestino: 'conta', cor: CORES_CAMPOS[9] },
    { id: gerarIdCampo(), nome: 'DV Conta', posicaoInicio: 36, posicaoFim: 36, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'DV da conta', campoDestino: 'conta_dv', cor: CORES_CAMPOS[10] },
    { id: gerarIdCampo(), nome: 'DV Agência/Conta', posicaoInicio: 37, posicaoFim: 37, tipo: 'alfanumerico', tamanho: 1, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'DV agência/conta', cor: CORES_CAMPOS[11] },
    { id: gerarIdCampo(), nome: 'Nosso Número', posicaoInicio: 38, posicaoFim: 57, tipo: 'alfanumerico', tamanho: 20, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Identificação do título no banco', campoDestino: 'nosso_numero', cor: CORES_CAMPOS[12] },
    { id: gerarIdCampo(), nome: 'Carteira', posicaoInicio: 58, posicaoFim: 58, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Código da carteira', campoDestino: 'carteira', cor: CORES_CAMPOS[13] },
    { id: gerarIdCampo(), nome: 'Cadastramento', posicaoInicio: 59, posicaoFim: 59, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Cadastramento de título', cor: CORES_CAMPOS[14] },
    { id: gerarIdCampo(), nome: 'Documento', posicaoInicio: 60, posicaoFim: 60, tipo: 'alfanumerico', tamanho: 1, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Tipo de documento', cor: CORES_CAMPOS[15] },
    { id: gerarIdCampo(), nome: 'Emissão Boleto', posicaoInicio: 61, posicaoFim: 61, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Emissão do boleto', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Distribuição Boleto', posicaoInicio: 62, posicaoFim: 62, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Distribuição do boleto', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Número Documento', posicaoInicio: 63, posicaoFim: 77, tipo: 'alfanumerico', tamanho: 15, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Número do documento', campoDestino: 'numero_documento', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'Data Vencimento', posicaoInicio: 78, posicaoFim: 85, tipo: 'numerico', tamanho: 8, formato: 'data_ddmmaaaa', obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Data de vencimento', campoDestino: 'data_vencimento', cor: CORES_CAMPOS[3] },
    { id: gerarIdCampo(), nome: 'Valor Título', posicaoInicio: 86, posicaoFim: 100, tipo: 'numerico', tamanho: 15, formato: 'valor_centavos', obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Valor nominal do título', campoDestino: 'valor', cor: CORES_CAMPOS[4] },
    { id: gerarIdCampo(), nome: 'Agência Cobradora', posicaoInicio: 101, posicaoFim: 105, tipo: 'numerico', tamanho: 5, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Agência cobradora', cor: CORES_CAMPOS[5] },
    { id: gerarIdCampo(), nome: 'DV Agência Cobradora', posicaoInicio: 106, posicaoFim: 106, tipo: 'alfanumerico', tamanho: 1, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'DV agência cobradora', cor: CORES_CAMPOS[6] },
    { id: gerarIdCampo(), nome: 'Espécie Título', posicaoInicio: 107, posicaoFim: 108, tipo: 'numerico', tamanho: 2, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Espécie do título', campoDestino: 'especie', cor: CORES_CAMPOS[7] },
    { id: gerarIdCampo(), nome: 'Aceite', posicaoInicio: 109, posicaoFim: 109, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Aceite', campoDestino: 'aceite', cor: CORES_CAMPOS[8] },
    { id: gerarIdCampo(), nome: 'Data Emissão', posicaoInicio: 110, posicaoFim: 117, tipo: 'numerico', tamanho: 8, formato: 'data_ddmmaaaa', obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Data de emissão', campoDestino: 'data_emissao', cor: CORES_CAMPOS[9] },
  ];
}

// Campos Detalhe Segmento Q CNAB 240 (Dados do Sacado/Pagador)
function gerarCamposDetalheQ240(): CampoCNABCompleto[] {
  return [
    { id: gerarIdCampo(), nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do banco', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tipo: 'numerico', tamanho: 4, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Número do lote', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de registro = 3', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'Número Sequencial', posicaoInicio: 9, posicaoFim: 13, tipo: 'numerico', tamanho: 5, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Número sequencial', cor: CORES_CAMPOS[3] },
    { id: gerarIdCampo(), nome: 'Segmento', posicaoInicio: 14, posicaoFim: 14, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do segmento = Q', cor: CORES_CAMPOS[4] },
    { id: gerarIdCampo(), nome: 'CNAB', posicaoInicio: 15, posicaoFim: 15, tipo: 'alfanumerico', tamanho: 1, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Uso FEBRABAN', cor: CORES_CAMPOS[5] },
    { id: gerarIdCampo(), nome: 'Código Movimento', posicaoInicio: 16, posicaoFim: 17, tipo: 'numerico', tamanho: 2, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do movimento', cor: CORES_CAMPOS[6] },
    { id: gerarIdCampo(), nome: 'Tipo Inscrição Sacado', posicaoInicio: 18, posicaoFim: 18, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: '1=CPF 2=CNPJ', cor: CORES_CAMPOS[7] },
    { id: gerarIdCampo(), nome: 'CPF/CNPJ Sacado', posicaoInicio: 19, posicaoFim: 33, tipo: 'numerico', tamanho: 15, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'CPF/CNPJ do sacado', campoDestino: 'sacado_documento', cor: CORES_CAMPOS[8] },
    { id: gerarIdCampo(), nome: 'Nome Sacado', posicaoInicio: 34, posicaoFim: 73, tipo: 'alfanumerico', tamanho: 40, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Nome do sacado/pagador', campoDestino: 'sacado_nome', cor: CORES_CAMPOS[9] },
    { id: gerarIdCampo(), nome: 'Endereço Sacado', posicaoInicio: 74, posicaoFim: 113, tipo: 'alfanumerico', tamanho: 40, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Endereço do sacado', campoDestino: 'sacado_endereco', cor: CORES_CAMPOS[10] },
    { id: gerarIdCampo(), nome: 'Bairro Sacado', posicaoInicio: 114, posicaoFim: 128, tipo: 'alfanumerico', tamanho: 15, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Bairro do sacado', campoDestino: 'sacado_bairro', cor: CORES_CAMPOS[11] },
    { id: gerarIdCampo(), nome: 'CEP Sacado', posicaoInicio: 129, posicaoFim: 133, tipo: 'numerico', tamanho: 5, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'CEP do sacado', campoDestino: 'sacado_cep', cor: CORES_CAMPOS[12] },
    { id: gerarIdCampo(), nome: 'Sufixo CEP', posicaoInicio: 134, posicaoFim: 136, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Sufixo do CEP', campoDestino: 'sacado_cep_sufixo', cor: CORES_CAMPOS[13] },
    { id: gerarIdCampo(), nome: 'Cidade Sacado', posicaoInicio: 137, posicaoFim: 151, tipo: 'alfanumerico', tamanho: 15, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Cidade do sacado', campoDestino: 'sacado_cidade', cor: CORES_CAMPOS[14] },
    { id: gerarIdCampo(), nome: 'UF Sacado', posicaoInicio: 152, posicaoFim: 153, tipo: 'alfanumerico', tamanho: 2, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'UF do sacado', campoDestino: 'sacado_uf', cor: CORES_CAMPOS[15] },
  ];
}

// Campos Trailer Lote CNAB 240
function gerarCamposTrailerLote240(): CampoCNABCompleto[] {
  return [
    { id: gerarIdCampo(), nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do banco', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tipo: 'numerico', tamanho: 4, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Número do lote', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de registro = 5', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'CNAB', posicaoInicio: 9, posicaoFim: 17, tipo: 'alfanumerico', tamanho: 9, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Uso FEBRABAN', cor: CORES_CAMPOS[3] },
    { id: gerarIdCampo(), nome: 'Qtd Registros Lote', posicaoInicio: 18, posicaoFim: 23, tipo: 'numerico', tamanho: 6, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Quantidade de registros no lote', cor: CORES_CAMPOS[4] },
  ];
}

// Campos Trailer Arquivo CNAB 240
function gerarCamposTrailerArquivo240(): CampoCNABCompleto[] {
  return [
    { id: gerarIdCampo(), nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do banco', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tipo: 'numerico', tamanho: 4, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Lote = 9999', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de registro = 9', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'CNAB', posicaoInicio: 9, posicaoFim: 17, tipo: 'alfanumerico', tamanho: 9, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Uso FEBRABAN', cor: CORES_CAMPOS[3] },
    { id: gerarIdCampo(), nome: 'Qtd Lotes', posicaoInicio: 18, posicaoFim: 23, tipo: 'numerico', tamanho: 6, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Quantidade de lotes', cor: CORES_CAMPOS[4] },
    { id: gerarIdCampo(), nome: 'Qtd Registros', posicaoInicio: 24, posicaoFim: 29, tipo: 'numerico', tamanho: 6, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Quantidade de registros', cor: CORES_CAMPOS[5] },
  ];
}

// Campos Header CNAB 400
function gerarCamposHeader400(): CampoCNABCompleto[] {
  return [
    { id: gerarIdCampo(), nome: 'Tipo de Registro', posicaoInicio: 1, posicaoFim: 1, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de registro = 0', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Operação', posicaoInicio: 2, posicaoFim: 2, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de operação', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Literal Remessa', posicaoInicio: 3, posicaoFim: 9, tipo: 'alfanumerico', tamanho: 7, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Identificação literal', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'Código Serviço', posicaoInicio: 10, posicaoFim: 11, tipo: 'numerico', tamanho: 2, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Código do serviço', cor: CORES_CAMPOS[3] },
    { id: gerarIdCampo(), nome: 'Literal Serviço', posicaoInicio: 12, posicaoFim: 26, tipo: 'alfanumerico', tamanho: 15, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Literal do serviço', cor: CORES_CAMPOS[4] },
    { id: gerarIdCampo(), nome: 'Agência', posicaoInicio: 27, posicaoFim: 30, tipo: 'numerico', tamanho: 4, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Código da agência', campoDestino: 'agencia', cor: CORES_CAMPOS[5] },
    { id: gerarIdCampo(), nome: 'Zeros', posicaoInicio: 31, posicaoFim: 32, tipo: 'numerico', tamanho: 2, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Zeros', cor: CORES_CAMPOS[6] },
    { id: gerarIdCampo(), nome: 'Conta Corrente', posicaoInicio: 33, posicaoFim: 37, tipo: 'numerico', tamanho: 5, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Número da conta', campoDestino: 'conta', cor: CORES_CAMPOS[7] },
    { id: gerarIdCampo(), nome: 'DV Conta', posicaoInicio: 38, posicaoFim: 38, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'DV da conta', campoDestino: 'conta_dv', cor: CORES_CAMPOS[8] },
    { id: gerarIdCampo(), nome: 'Brancos', posicaoInicio: 39, posicaoFim: 46, tipo: 'alfanumerico', tamanho: 8, obrigatorio: false, utilizadoNoBoleto: false, descricao: 'Brancos', cor: CORES_CAMPOS[9] },
    { id: gerarIdCampo(), nome: 'Nome Empresa', posicaoInicio: 47, posicaoFim: 76, tipo: 'alfanumerico', tamanho: 30, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Nome da empresa', campoDestino: 'cedente', cor: CORES_CAMPOS[10] },
    { id: gerarIdCampo(), nome: 'Código Banco', posicaoInicio: 77, posicaoFim: 79, tipo: 'numerico', tamanho: 3, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Código do banco', cor: CORES_CAMPOS[11] },
    { id: gerarIdCampo(), nome: 'Nome Banco', posicaoInicio: 80, posicaoFim: 94, tipo: 'alfanumerico', tamanho: 15, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Nome do banco', cor: CORES_CAMPOS[12] },
    { id: gerarIdCampo(), nome: 'Data Gravação', posicaoInicio: 95, posicaoFim: 100, tipo: 'numerico', tamanho: 6, formato: 'data_ddmmaa', obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Data de gravação DDMMAA', cor: CORES_CAMPOS[13] },
  ];
}

// Campos Detalhe CNAB 400
function gerarCamposDetalhe400(): CampoCNABCompleto[] {
  return [
    { id: gerarIdCampo(), nome: 'Tipo de Registro', posicaoInicio: 1, posicaoFim: 1, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de registro = 1', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Agência', posicaoInicio: 18, posicaoFim: 21, tipo: 'numerico', tamanho: 4, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Agência mantenedora', campoDestino: 'agencia', cor: CORES_CAMPOS[1] },
    { id: gerarIdCampo(), nome: 'Conta', posicaoInicio: 22, posicaoFim: 29, tipo: 'numerico', tamanho: 8, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Conta corrente', campoDestino: 'conta', cor: CORES_CAMPOS[2] },
    { id: gerarIdCampo(), nome: 'DV Conta', posicaoInicio: 30, posicaoFim: 30, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'DV da conta', campoDestino: 'conta_dv', cor: CORES_CAMPOS[3] },
    { id: gerarIdCampo(), nome: 'Nosso Número', posicaoInicio: 63, posicaoFim: 70, tipo: 'numerico', tamanho: 8, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Nosso número', campoDestino: 'nosso_numero', cor: CORES_CAMPOS[5] },
    { id: gerarIdCampo(), nome: 'DV Nosso Número', posicaoInicio: 71, posicaoFim: 71, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'DV do nosso número', campoDestino: 'nosso_numero_dv', cor: CORES_CAMPOS[6] },
    { id: gerarIdCampo(), nome: 'Carteira', posicaoInicio: 108, posicaoFim: 108, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Código da carteira', campoDestino: 'carteira', cor: CORES_CAMPOS[4] },
    { id: gerarIdCampo(), nome: 'Número Documento', posicaoInicio: 117, posicaoFim: 126, tipo: 'alfanumerico', tamanho: 10, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Número do documento', campoDestino: 'numero_documento', cor: CORES_CAMPOS[7] },
    { id: gerarIdCampo(), nome: 'Data Vencimento', posicaoInicio: 121, posicaoFim: 126, tipo: 'numerico', tamanho: 6, formato: 'data_ddmmaa', obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Data de vencimento DDMMAA', campoDestino: 'data_vencimento', cor: CORES_CAMPOS[8] },
    { id: gerarIdCampo(), nome: 'Valor Título', posicaoInicio: 127, posicaoFim: 139, tipo: 'numerico', tamanho: 13, formato: 'valor_centavos', obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Valor do título', campoDestino: 'valor', cor: CORES_CAMPOS[9] },
    { id: gerarIdCampo(), nome: 'Espécie', posicaoInicio: 149, posicaoFim: 150, tipo: 'numerico', tamanho: 2, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Espécie do título', campoDestino: 'especie', cor: CORES_CAMPOS[10] },
    { id: gerarIdCampo(), nome: 'Aceite', posicaoInicio: 151, posicaoFim: 151, tipo: 'alfanumerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Aceite', campoDestino: 'aceite', cor: CORES_CAMPOS[11] },
    { id: gerarIdCampo(), nome: 'Data Emissão', posicaoInicio: 152, posicaoFim: 157, tipo: 'numerico', tamanho: 6, formato: 'data_ddmmaa', obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Data de emissão DDMMAA', campoDestino: 'data_emissao', cor: CORES_CAMPOS[12] },
    { id: gerarIdCampo(), nome: 'Nome Sacado', posicaoInicio: 235, posicaoFim: 274, tipo: 'alfanumerico', tamanho: 40, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Nome do sacado', campoDestino: 'sacado_nome', cor: CORES_CAMPOS[13] },
    { id: gerarIdCampo(), nome: 'Endereço Sacado', posicaoInicio: 275, posicaoFim: 314, tipo: 'alfanumerico', tamanho: 40, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'Endereço do sacado', campoDestino: 'sacado_endereco', cor: CORES_CAMPOS[14] },
    { id: gerarIdCampo(), nome: 'CEP Sacado', posicaoInicio: 327, posicaoFim: 334, tipo: 'numerico', tamanho: 8, obrigatorio: true, utilizadoNoBoleto: true, descricao: 'CEP do sacado', campoDestino: 'sacado_cep', cor: CORES_CAMPOS[15] },
  ];
}

// Campos Trailer CNAB 400
function gerarCamposTrailer400(): CampoCNABCompleto[] {
  return [
    { id: gerarIdCampo(), nome: 'Tipo de Registro', posicaoInicio: 1, posicaoFim: 1, tipo: 'numerico', tamanho: 1, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Tipo de registro = 9', cor: CORES_CAMPOS[0] },
    { id: gerarIdCampo(), nome: 'Número Sequencial', posicaoInicio: 395, posicaoFim: 400, tipo: 'numerico', tamanho: 6, obrigatorio: true, utilizadoNoBoleto: false, descricao: 'Número sequencial do registro', cor: CORES_CAMPOS[1] },
  ];
}
