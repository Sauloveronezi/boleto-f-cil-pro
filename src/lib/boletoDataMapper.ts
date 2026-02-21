/**
 * Mapeia os dados brutos da tabela vv_b_boletos_api para os nomes
 * semânticos usados nos templates de boleto (source_ref).
 * 
 * Utiliza a tabela vv_b_boleto_campo_mapeamento para mapeamento dinâmico
 * quando disponível, com fallback para mapeamento hardcoded.
 */
import type { DadosBoleto } from './pdfModelRenderer';
import {
  calcularFatorVencimento,
  formatarValorCodigoBarras,
  calcularModulo11,
  calcularModulo10,
  gerarLinhaDigitavel,
} from './barcodeCalculator';

export interface MapeamentoCampo {
  campo_boleto: string;
  fonte_campo: string;
  tipo_transformacao: string;
  parametros: Record<string, any> | null;
  ativo: boolean;
}

/**
 * Aplica uma regra de transformação de mapeamento sobre os dados brutos
 */
function aplicarTransformacao(
  row: Record<string, any>,
  mapeamento: MapeamentoCampo,
): string {
  const { fonte_campo, tipo_transformacao, parametros } = mapeamento;

  switch (tipo_transformacao) {
    case 'direto':
    default: {
      const val = row[fonte_campo];
      return val != null ? String(val) : '';
    }
    case 'ultimos_N': {
      const val = row[fonte_campo];
      const n = parametros?.n || 4;
      if (val == null) return '';
      const str = String(val).replace(/\D/g, '');
      return str.slice(-n);
    }
    case 'soma': {
      const campos: string[] = parametros?.campos || [fonte_campo];
      let soma = 0;
      for (const c of campos) {
        const v = row[c];
        if (v != null) soma += Number(v) || 0;
      }
      return soma ? String(soma) : '';
    }
    case 'concatenar': {
      const campos: string[] = parametros?.campos || [fonte_campo];
      const sep = parametros?.separador || '';
      const partes = campos.map(c => {
        const v = row[c];
        return v != null ? String(v) : '';
      }).filter(Boolean);
      return partes.join(sep);
    }
  }
}

/**
 * Mapeia os dados do boleto usando as regras dinâmicas da tabela de mapeamento
 */
function aplicarMapeamentoDinamico(
  row: Record<string, any>,
  mapeamentos: MapeamentoCampo[],
): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const m of mapeamentos) {
    if (!m.ativo) continue;
    const valor = aplicarTransformacao(row, m);
    if (valor) {
      resultado[m.campo_boleto] = valor;
    }
  }
  return resultado;
}

/**
 * Extrai os 3 primeiros dígitos numéricos do campo 'banco' para obter o código do banco
 */
function extractBankCode(banco: string | null | undefined): string {
  if (!banco) return '';
  const digits = banco.replace(/\D/g, '');
  return digits.substring(0, 3);
}

/**
 * Gera o campo livre (25 dígitos) conforme padrão do banco
 */
function gerarCampoLivreFromData(
  codigoBanco: string,
  agencia: string,
  conta: string,
  carteira: string,
  nossoNumero: string,
): string {
  const ag = agencia.replace(/\D/g, '').padStart(4, '0');
  const ct = conta.replace(/\D/g, '').padStart(8, '0');

  switch (codigoBanco) {
    case '237': // Bradesco
      return `${ag}${carteira.padStart(2, '0')}${nossoNumero.slice(-11).padStart(11, '0')}${ct.slice(-7)}0`.slice(0, 25);
    case '341': { // Itaú
      const cart = carteira.padStart(3, '0');
      const nn = nossoNumero.slice(-8).padStart(8, '0');
      const agIt = ag.slice(-4);
      const ctIt = ct.slice(-5);
      const dac1 = calcularModulo10(`${agIt}${ctIt}${cart}${nn}`);
      const dac2 = calcularModulo10(`${agIt}${ctIt}`);
      return `${cart}${nn}${dac1}${agIt}${ctIt}${dac2}000`;
    }
    case '001': // BB
      return `${nossoNumero.padStart(17, '0')}21000000`.slice(0, 25);
    case '033': // Santander
      return `9${ag.slice(-4)}${ct.slice(-7)}${nossoNumero.slice(-13)}0${carteira.slice(-2)}`.slice(0, 25);
    default:
      return `${ag}${ct.slice(-8)}${nossoNumero.slice(-13)}`.padStart(25, '0');
  }
}

/**
 * Calcula código de barras (44 dígitos) e linha digitável a partir dos dados do boleto
 */
function calcularCodigoBarrasFromDados(
  codigoBanco: string,
  dataVencimento: string,
  valor: number,
  agencia: string,
  conta: string,
  carteira: string,
  nossoNumero: string,
): { codigoBarras: string; linhaDigitavel: string } | null {
  if (!codigoBanco || !dataVencimento || !valor || !nossoNumero) return null;

  try {
    const banco3 = codigoBanco.padStart(3, '0');
    const moeda = '9';
    const fatorVencimento = calcularFatorVencimento(dataVencimento);
    const valorFmt = formatarValorCodigoBarras(valor);
    const campoLivre = gerarCampoLivreFromData(banco3, agencia, conta, carteira, nossoNumero);

    const codigoSemDV = `${banco3}${moeda}${fatorVencimento}${valorFmt}${campoLivre}`;
    const dv = calcularModulo11(codigoSemDV);

    const codigoBarras = `${banco3}${moeda}${dv}${fatorVencimento}${valorFmt}${campoLivre}`;
    const linhaDigitavel = gerarLinhaDigitavel(codigoBarras);

    return { codigoBarras, linhaDigitavel };
  } catch (e) {
    console.warn('[boletoDataMapper] Erro ao calcular código de barras:', e);
    return null;
  }
}

export interface ConfigBancoParaCalculo {
  agencia: string;
  conta: string;
  carteira: string;
  nomeBanco?: string;
  beneficiarioNome?: string;
  beneficiarioCnpj?: string;
  beneficiarioEndereco?: string;
}

/**
 * Mapeamento fallback (hardcoded) usado quando não há mapeamento dinâmico configurado
 */
function mapeamentoFallback(row: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  
  result.pagador_nome = row.dyn_nome_do_cliente || row.cliente || '';
  result.pagador_cnpj = row.br_nfpartnercnpj || row.taxnumber1 || row.TaxNumber1 || '';
  result.pagador_endereco = [row.endereco, row.bairro].filter(Boolean).join(', ');
  result.pagador_cidade_uf = [row.dyn_cidade, row.uf].filter(Boolean).join('/');
  result.pagador_cep = row.cep || '';
  result.numero_documento = row.numero_nota || row.documento || '';
  result.numero_nota = row.numero_nota || '';
  result.data_vencimento = row.data_vencimento || row.PaymentDueDate || '';
  result.data_emissao = row.data_emissao || row.PostingDate || '';
  result.data_documento = row.data_emissao || row.PostingDate || '';
  result.data_processamento = row.data_emissao || '';
  result.nosso_numero = row.numero_cobranca || '';

  // Valor: valor original = valor + valor_desconto
  const valor = row.valor != null ? Number(row.valor) : 0;
  const valorDesconto = row.valor_desconto != null ? Number(row.valor_desconto) : 0;
  const valorOriginal = valor + valorDesconto;
  result.valor_documento = valorOriginal ? String(valorOriginal) : '';
  result.valor_titulo = result.valor_documento;
  result.valor_cobrado = valor ? String(valor) : '';
  result.valor_desconto = valorDesconto ? String(valorDesconto) : '';

  return result;
}

/**
 * Transforma um registro da tabela vv_b_boletos_api em DadosBoleto
 * pronto para o renderer de templates.
 * 
 * Se mapeamentos dinâmicos forem fornecidos, eles têm prioridade.
 * Se configBanco for fornecida, calcula código de barras e linha digitável.
 */
export function mapBoletoApiToDadosBoleto(
  row: Record<string, any>,
  configBanco?: ConfigBancoParaCalculo,
  mapeamentos?: MapeamentoCampo[],
): DadosBoleto {
  const dados: DadosBoleto = {};

  // ===== Aplicar mapeamento: dinâmico (prioridade) ou fallback =====
  let mapeado: Record<string, string>;
  if (mapeamentos && mapeamentos.length > 0) {
    mapeado = aplicarMapeamentoDinamico(row, mapeamentos);
    console.log('[boletoDataMapper] Usando mapeamento dinâmico com', mapeamentos.length, 'regras');
  } else {
    mapeado = mapeamentoFallback(row);
    console.log('[boletoDataMapper] Usando mapeamento fallback (hardcoded)');
  }

  // Copiar todos os campos mapeados para dados
  for (const [k, v] of Object.entries(mapeado)) {
    if (v) dados[k] = v;
  }

  // ===== Campos derivados que dependem de lógica bancária =====
  const codigoBanco = dados.banco_codigo || extractBankCode(row.banco);
  dados.banco_codigo = codigoBanco;
  dados.banco_nome = configBanco?.nomeBanco || dados.banco_nome || '';
  dados.beneficiario_nome = configBanco?.beneficiarioNome || dados.beneficiario_nome || '';
  dados.beneficiario_cnpj = configBanco?.beneficiarioCnpj || dados.beneficiario_cnpj || '';
  dados.beneficiario_endereco = configBanco?.beneficiarioEndereco || dados.beneficiario_endereco || '';

  // Campos fixos padrão (se não vieram do mapeamento)
  if (!dados.local_pagamento) {
    const localPagamentoMap: Record<string, string> = {
      '237': 'PAGÁVEL PREFERENCIALMENTE NA REDE BRADESCO OU BRADESCO EXPRESSO.',
      '341': 'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO.',
      '001': 'PAGÁVEL EM QUALQUER AGÊNCIA BANCÁRIA ATÉ O VENCIMENTO.',
      '033': 'PAGÁVEL PREFERENCIALMENTE NO SANTANDER',
      '104': 'PAGÁVEL PREFERENCIALMENTE NAS CASAS LOTÉRICAS ATÉ O VALOR LIMITE.',
    };
    dados.local_pagamento = localPagamentoMap[codigoBanco] || 'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO.';
  }
  if (!dados.especie_documento) dados.especie_documento = 'DM';
  if (!dados.aceite) dados.aceite = codigoBanco === '033' ? 'NAO ACEITO' : 'N';
  if (!dados.especie_moeda) dados.especie_moeda = codigoBanco === '033' ? 'REAL' : 'R$';

  // Agência/Código beneficiário - extrair da API se não configurado
  const bankInternalId = row.BankInternalID || row.bankinternalid || '';
  const bankAccountLongId = row.BankAccountLongID || row.bankaccountlongid || '';
  const agenciaApi = bankInternalId ? String(bankInternalId).replace(/\D/g, '').slice(-4) : '';
  const contaApi = bankAccountLongId ? String(bankAccountLongId).replace(/\D/g, '') : '';
  const agencia = configBanco?.agencia || agenciaApi || '';
  const conta = configBanco?.conta || contaApi || '';
  const carteira = configBanco?.carteira || '09';
  if (!dados.carteira) dados.carteira = codigoBanco === '033' ? 'ELETR C/REG' : carteira;

  if (!dados.agencia_codigo) {
    const bancoLast4 = (row.banco || '').replace(/\D/g, '').slice(-4);
    const bankAccLong = row.BankAccountLongID || row.bankaccountlongid || '';
    const bankCtrlKey = row.bankcontrolkey || row.BankControlKey || '';
    if (bancoLast4 && bankAccLong) {
      dados.agencia_codigo = `${bancoLast4} / ${bankAccLong}${bankCtrlKey ? '-' + bankCtrlKey : ''}`;
    } else {
      dados.agencia_codigo = agencia && conta ? `${agencia} / ${conta}` : '';
    }
  }

  // Garantir nosso_numero para cálculo de barras
  const nossoNumeroRaw = dados.nosso_numero || row.numero_cobranca || '';
  dados.nosso_numero = nossoNumeroRaw;

  // ===== Calcular código de barras e linha digitável =====
  // Usar valor do mapeamento (valor_cobrado ou valor_documento) para cálculo do barras
  const valorParaBarras = Number(dados.valor_cobrado || dados.valor_documento || row.valor || 0);

  if (configBanco && codigoBanco && dados.data_vencimento && valorParaBarras > 0 && nossoNumeroRaw) {
    const resultado = calcularCodigoBarrasFromDados(
      codigoBanco,
      dados.data_vencimento,
      valorParaBarras,
      agencia,
      conta,
      carteira,
      nossoNumeroRaw,
    );
    if (resultado) {
      dados.codigo_barras = resultado.codigoBarras;
      dados.linha_digitavel = resultado.linhaDigitavel;
    }
  } else if (!dados.codigo_barras) {
    dados.codigo_barras = row.codigo_barras || '';
    dados.linha_digitavel = row.linha_digitavel || '';
  }

  // Preservar todos os campos originais para acesso direto
  for (const [k, v] of Object.entries(row)) {
    if (v != null && v !== '' && !dados[k]) {
      dados[k] = String(v);
    }
  }

  return dados;
}

/**
 * Retorna uma lista legível de campo → valor para preview
 */
export function getBoletoPreviewData(dados: DadosBoleto): { label: string; value: string; key: string }[] {
  const items = [
    { key: 'pagador_nome', label: 'Pagador', value: dados.pagador_nome || '' },
    { key: 'pagador_cnpj', label: 'CPF/CNPJ Pagador', value: dados.pagador_cnpj || '' },
    { key: 'pagador_endereco', label: 'Endereço Pagador', value: dados.pagador_endereco || '' },
    { key: 'pagador_cidade_uf', label: 'Cidade/UF', value: dados.pagador_cidade_uf || '' },
    { key: 'numero_documento', label: 'Nº Documento', value: dados.numero_documento || '' },
    { key: 'nosso_numero', label: 'Nosso Número', value: dados.nosso_numero || '' },
    { key: 'data_vencimento', label: 'Vencimento', value: dados.data_vencimento || '' },
    { key: 'data_emissao', label: 'Data Emissão', value: dados.data_emissao || '' },
    { key: 'valor_documento', label: 'Valor Documento', value: dados.valor_documento || '' },
    { key: 'valor_cobrado', label: 'Valor Cobrado', value: dados.valor_cobrado || '' },
    { key: 'valor_desconto', label: 'Desconto', value: dados.valor_desconto || '' },
    { key: 'banco_codigo', label: 'Banco', value: dados.banco_codigo || '' },
    { key: 'codigo_barras', label: 'Código de Barras', value: dados.codigo_barras || '' },
    { key: 'linha_digitavel', label: 'Linha Digitável', value: dados.linha_digitavel || '' },
    { key: 'local_pagamento', label: 'Local Pagamento', value: dados.local_pagamento || '' },
  ];
  return items.filter(i => i.value);
}
