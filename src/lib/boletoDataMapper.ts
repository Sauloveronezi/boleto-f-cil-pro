/**
 * Mapeia os dados brutos da tabela vv_b_boletos_api para os nomes
 * semânticos usados nos templates de boleto (source_ref).
 * 
 * Ex: vv_b_boletos_api.dyn_nome_do_cliente → pagador_nome
 */
import type { DadosBoleto } from './pdfModelRenderer';
import {
  calcularFatorVencimento,
  formatarValorCodigoBarras,
  calcularModulo11,
  gerarLinhaDigitavel,
} from './barcodeCalculator';

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
    case '237': // Bradesco: Agência(4) + Carteira(2) + NossoNúmero(11) + Conta(7) + Zero(1)
      return `${ag}${carteira.padStart(2, '0')}${nossoNumero.slice(-11).padStart(11, '0')}${ct.slice(-7)}0`.slice(0, 25);
    case '341': // Itaú: Carteira(3) + NossoNúmero(8) + DAC(1) + Agência(4) + Conta(5) + DAC(1) + Zeros(3)
      return `${carteira.padStart(3, '0')}${nossoNumero.slice(-8).padStart(8, '0')}0${ag.slice(-4)}${ct.slice(-5)}0000`.slice(0, 25);
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

    // Código sem DV (posições 1-4 + 6-44)
    const codigoSemDV = `${banco3}${moeda}${fatorVencimento}${valorFmt}${campoLivre}`;
    const dv = calcularModulo11(codigoSemDV);

    // Código completo (44 dígitos)
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
 * Transforma um registro da tabela vv_b_boletos_api em DadosBoleto
 * pronto para o renderer de templates.
 * Se configBanco for fornecida, calcula código de barras e linha digitável.
 */
export function mapBoletoApiToDadosBoleto(
  row: Record<string, any>,
  configBanco?: ConfigBancoParaCalculo,
): DadosBoleto {
  const dados: DadosBoleto = {};

  // Pagador
  dados.pagador_nome = row.dyn_nome_do_cliente || row.cliente || '';
  dados.pagador_cnpj = row.br_nfpartnercnpj || row.taxnumber1 || row.TaxNumber1 || '';
  dados.pagador_endereco = [row.endereco, row.bairro].filter(Boolean).join(', ');
  dados.pagador_cidade_uf = [row.dyn_cidade, row.uf].filter(Boolean).join('/');
  dados.pagador_cep = row.cep || '';

  // Documento
  dados.numero_documento = row.numero_nota || row.documento || '';
  dados.numero_nota = row.numero_nota || '';
  dados.data_vencimento = row.data_vencimento || row.PaymentDueDate || '';
  dados.data_emissao = row.data_emissao || row.PostingDate || '';
  dados.data_documento = row.data_emissao || row.PostingDate || '';
  dados.data_processamento = row.data_emissao || '';

  // Valores
  const valor = row.valor != null ? Number(row.valor) : 0;
  dados.valor_documento = valor ? String(valor) : '';
  dados.valor_titulo = dados.valor_documento;
  dados.valor_cobrado = dados.valor_documento;

  const valorDesconto = row.valor_desconto != null ? Number(row.valor_desconto) : 0;
  dados.valor_desconto = valorDesconto ? String(valorDesconto) : '';

  // Banco / Beneficiário
  const codigoBanco = extractBankCode(row.banco);
  dados.banco_codigo = codigoBanco;
  dados.banco_nome = configBanco?.nomeBanco || '';
  dados.beneficiario_nome = configBanco?.beneficiarioNome || '';
  dados.beneficiario_cnpj = configBanco?.beneficiarioCnpj || '';
  dados.beneficiario_endereco = configBanco?.beneficiarioEndereco || '';

  // Nosso número (vem do campo numero_cobranca)
  const nossoNumeroRaw = row.numero_cobranca || '';
  dados.nosso_numero = nossoNumeroRaw;

  // Campos fixos padrão - determina local de pagamento pelo banco
  const localPagamentoMap: Record<string, string> = {
    '237': 'PAGÁVEL PREFERENCIALMENTE NA REDE BRADESCO OU BRADESCO EXPRESSO.',
    '341': 'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO.',
    '001': 'PAGÁVEL EM QUALQUER AGÊNCIA BANCÁRIA ATÉ O VENCIMENTO.',
    '033': 'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO.',
    '104': 'PAGÁVEL PREFERENCIALMENTE NAS CASAS LOTÉRICAS ATÉ O VALOR LIMITE.',
  };
  dados.local_pagamento = localPagamentoMap[codigoBanco] || 'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO.';
  dados.especie_documento = 'DM';
  dados.aceite = 'N';
  dados.especie_moeda = 'R$';

  // Agência/Código e carteira
  const agencia = configBanco?.agencia || '';
  const conta = configBanco?.conta || '';
  const carteira = configBanco?.carteira || '09';
  dados.carteira = carteira;
  dados.agencia_codigo = agencia && conta ? `${agencia} / ${conta}` : '';

  // ===== Calcular código de barras e linha digitável =====
  if (configBanco && codigoBanco && dados.data_vencimento && valor > 0 && nossoNumeroRaw) {
    const resultado = calcularCodigoBarrasFromDados(
      codigoBanco,
      dados.data_vencimento,
      valor,
      agencia,
      conta,
      carteira,
      nossoNumeroRaw,
    );
    if (resultado) {
      dados.codigo_barras = resultado.codigoBarras;
      dados.linha_digitavel = resultado.linhaDigitavel;
    }
  } else {
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
    { key: 'valor_desconto', label: 'Desconto', value: dados.valor_desconto || '' },
    { key: 'banco_codigo', label: 'Banco', value: dados.banco_codigo || '' },
    { key: 'codigo_barras', label: 'Código de Barras', value: dados.codigo_barras || '' },
    { key: 'linha_digitavel', label: 'Linha Digitável', value: dados.linha_digitavel || '' },
    { key: 'local_pagamento', label: 'Local Pagamento', value: dados.local_pagamento || '' },
  ];
  return items.filter(i => i.value);
}
