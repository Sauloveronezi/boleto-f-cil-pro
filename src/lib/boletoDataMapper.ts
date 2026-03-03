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
  calcularDVNossoNumeroItau,
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
/**
 * Busca valor no row de forma case-insensitive
 */
function getRowValue(row: Record<string, any>, campo: string): any {
  if (campo in row) return row[campo];
  const lower = campo.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lower) return row[key];
  }
  return undefined;
}

function aplicarTransformacao(
  row: Record<string, any>,
  mapeamento: MapeamentoCampo,
): string {
  const { fonte_campo, tipo_transformacao, parametros } = mapeamento;

  switch (tipo_transformacao) {
    case 'direto':
    default: {
      // Direto: retorna apenas o valor do campo fonte, sem transformação
      const val = getRowValue(row, fonte_campo);
      return val != null ? String(val) : '';
    }
    case 'ultimos_N': {
      const val = getRowValue(row, fonte_campo);
      const n = parametros?.n || 4;
      if (val == null) return '';
      const str = String(val).replace(/\D/g, '');
      return str.slice(-n);
    }
    case 'primeiros_N': {
      const val = getRowValue(row, fonte_campo);
      const n = parametros?.n || 3;
      if (val == null) return '';
      const str = String(val).replace(/\D/g, '');
      return str.slice(0, n);
    }
    case 'soma': {
      const campos: string[] = parametros?.campos || [fonte_campo];
      let soma = 0;
      for (const c of campos) {
        const v = getRowValue(row, c);
        if (v != null) soma += Number(v) || 0;
      }
      return soma ? String(soma) : '';
    }
    case 'concatenar': {
      const campos: string[] = parametros?.campos || [fonte_campo];
      const sep = parametros?.separador || '';
      const partes = campos.map(c => {
        const v = getRowValue(row, c);
        return v != null ? String(v) : '';
      }).filter(Boolean);
      return partes.join(sep);
    }
    case 'composicao': {
      // Composição avançada: cada parte define campo, extração (primeiros/ultimos/completo) e separador
      const partes: Array<{
        campo: string;
        extracao: 'completo' | 'primeiros' | 'ultimos';
        n?: number;
        separador?: string;
      }> = parametros?.partes || [];
      if (partes.length === 0) {
        const val = getRowValue(row, fonte_campo);
        return val != null ? String(val) : '';
      }
      let resultado = '';
      for (let i = 0; i < partes.length; i++) {
        const parte = partes[i];
        const val = getRowValue(row, parte.campo);
        if (val == null) continue;
        let str = String(val);
        const digits = str.replace(/\D/g, '');
        switch (parte.extracao) {
          case 'primeiros':
            str = digits.slice(0, parte.n || 3);
            break;
          case 'ultimos':
            str = digits.slice(-(parte.n || 4));
            break;
          case 'completo':
          default:
            break;
        }
        if (i > 0 && parte.separador) {
          resultado += parte.separador;
        }
        resultado += str;
      }
      return resultado;
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
  nossoNumeroRaw: string,
): string {
  const ag = agencia.replace(/\D/g, '').padStart(4, '0');
  const ct = conta.replace(/\D/g, '').padStart(8, '0');
  // Nosso número: apenas dígitos para cálculos bancários
  const nossoNumero = nossoNumeroRaw.replace(/\D/g, '');

  // Conta sem DV: se tem hífen ou barra, pegar só a parte principal
  const contaSemDV = conta.split(/[-\/]/)[0].replace(/\D/g, '');

  switch (codigoBanco) {
    case '237': { // Bradesco
      // Carteira Bradesco: exatamente 2 dígitos (ex: "004" → "04")
      const cartBrad = carteira.replace(/\D/g, '').slice(-2).padStart(2, '0');
      // Conta Bradesco: 7 dígitos sem DV
      const contaBrad = contaSemDV.padStart(7, '0').slice(-7);
      return `${ag}${cartBrad}${nossoNumero.slice(-11).padStart(11, '0')}${contaBrad}0`.slice(0, 25);
    }
    case '341': { // Itaú
      const cart = carteira.replace(/\D/g, '').padStart(3, '0');
      // Se o nosso número já contém o prefixo da carteira, remover
      let nnLimpo = nossoNumero;
      if (nnLimpo.startsWith(cart) && nnLimpo.length > 8) {
        nnLimpo = nnLimpo.substring(cart.length);
      }
      // Usar os PRIMEIROS 8 dígitos (o 9º é o DV, não faz parte do cálculo)
      const nn = nnLimpo.length > 8 ? nnLimpo.slice(0, 8) : nnLimpo.padStart(8, '0');
      const agIt = ag.slice(-4);
      // Conta Itaú: 5 dígitos sem DV
      const ctIt = contaSemDV.padStart(5, '0').slice(-5);
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
    
    // Validar que o código tem apenas dígitos e 43 posições (sem DV)
    if (codigoSemDV.length !== 43 || !/^\d+$/.test(codigoSemDV)) {
      console.warn('[boletoDataMapper] Código de barras inválido (não-numérico ou tamanho errado):', codigoSemDV);
      return null;
    }
    
    const dv = calcularModulo11(codigoSemDV);
    if (dv === null || dv === undefined) {
      console.warn('[boletoDataMapper] DV inválido para código de barras');
      return null;
    }

    const codigoBarras = `${banco3}${moeda}${dv}${fatorVencimento}${valorFmt}${campoLivre}`;
    
    // Validação final: deve ser exatamente 44 dígitos numéricos
    if (codigoBarras.length !== 44 || !/^\d{44}$/.test(codigoBarras)) {
      console.warn('[boletoDataMapper] Código de barras final inválido:', codigoBarras);
      return null;
    }

    const linhaDigitavel = gerarLinhaDigitavel(codigoBarras);
    if (!linhaDigitavel) {
      console.warn('[boletoDataMapper] Linha digitável não gerada');
      return null;
    }

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
  textoInstrucaoPadrao?: string;
  taxaJurosMensal?: number;
  multaPercentual?: number;
  diasCarencia?: number;
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

  // Beneficiário: extrair do payee (SAP) se disponível
  result.beneficiario_nome = row.payeeadditionalname || row.beneficiario_nome || '';
  result.beneficiario_cnpj = row.beneficiario_cnpj || '';
  result.beneficiario_endereco = row.beneficiario_endereco || '';

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
  // Sempre extrair apenas 3 dígitos do código do banco para cálculos
  const rawBancoCodigo = dados.banco_codigo || row.banco || '';
  const codigoBanco = extractBankCode(rawBancoCodigo);
  dados.banco_codigo = codigoBanco;
  dados.banco_nome = configBanco?.nomeBanco || dados.banco_nome || '';

  // Injetar logo do banco baseada no código
  if (!dados.banco_logo_url || dados.banco_logo_url === '/placeholder.svg') {
    const logoMap: Record<string, string> = {
      '237': '/logos/banco_237.png',
      '341': '/logos/banco_341.png',
      '033': '/logos/banco_033.png',
      '001': '/logos/banco_001.png',
      '104': '/logos/banco_104.png',
      '748': '/logos/banco_748.png',
    };
    dados.banco_logo_url = logoMap[codigoBanco] || '';
  }

  // Gerar código do banco formatado (ex: "237-2", "341-7")
  if (!dados.banco_codigo_formatado && codigoBanco) {
    const dvBanco = calcularModulo11(codigoBanco.padStart(3, '0'));
    dados.banco_codigo_formatado = `${codigoBanco}-${dvBanco}`;
  }
  const benefNome = configBanco?.beneficiarioNome || dados.beneficiario_nome || '';
  const benefCnpj = configBanco?.beneficiarioCnpj || dados.beneficiario_cnpj || '';
  dados.beneficiario_cnpj = benefCnpj;
  dados.beneficiario_nome = benefNome && benefCnpj ? `${benefNome} - ${benefCnpj}` : benefNome;
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
  if (!dados.instrucoes) {
    // Usar texto_instrucao_padrao do banco com substituição de variáveis
    const valorDoc = Number(dados.valor_documento || dados.valor_cobrado || row.valor || 0);
    const jurosPerc = configBanco?.taxaJurosMensal || 0;
    const multaPerc = configBanco?.multaPercentual || 0;
    const valorMulta = valorDoc > 0 && multaPerc > 0 ? (multaPerc / 100) * valorDoc : 0;
    const jurosDiario = valorDoc > 0 && jurosPerc > 0 ? ((jurosPerc / 100) / 30) * valorDoc : 0;
    const valorDesconto = Number(row.valor_desconto || 0);
    const dataDesconto = row.data_desconto || row.CashDiscount1DueDate || '';

    // Formatar valores em moeda pt-BR
    const fmtCurrency = (v: number) => v > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
      : 'R$ 0,00';
    // Formatar data dd/mm/yyyy
    const fmtDate = (d: string) => {
      if (!d) return '';
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
        const [a, m, dd] = d.substring(0, 10).split('-');
        return `${dd}/${m}/${a}`;
      }
      return d;
    };

    if (configBanco?.textoInstrucaoPadrao) {
      // Substituir variáveis no texto cadastrado
      let texto = configBanco.textoInstrucaoPadrao;
      texto = texto.replace(/\{VALOR_MULTA\}/gi, fmtCurrency(valorMulta));
      texto = texto.replace(/\{VALOR_JUROS_DIARIO\}/gi, fmtCurrency(jurosDiario));
      texto = texto.replace(/\{VALOR_JUROS\}/gi, fmtCurrency(jurosDiario));
      texto = texto.replace(/\{PERCENTUAL_MULTA\}/gi, `${multaPerc.toFixed(1).replace('.', ',')}%`);
      texto = texto.replace(/\{PERCENTUAL_JUROS\}/gi, `${jurosPerc.toFixed(1).replace('.', ',')}%`);
      texto = texto.replace(/\{VALOR_DESCONTO\}/gi, fmtCurrency(valorDesconto));
      texto = texto.replace(/\{DATAVENCIMENTODESCONTO\}/gi, fmtDate(dataDesconto));
      texto = texto.replace(/\{DATA_DESCONTO\}/gi, fmtDate(dataDesconto));
      texto = texto.replace(/\{VALOR_DOCUMENTO\}/gi, fmtCurrency(valorDoc));
      dados.instrucoes = texto;
    } else {
      // Fallback sem texto configurado
      const instrParts: string[] = [];
      if (valorMulta > 0) {
        instrParts.push(`APÓS O VENCIMENTO COBRAR MULTA DE ${fmtCurrency(valorMulta)}`);
      }
      if (jurosDiario > 0) {
        instrParts.push(`Cobrar juros de ${fmtCurrency(jurosDiario)} de mora diária`);
      }
      if (valorDesconto > 0 && dataDesconto) {
        instrParts.push(`Até ${fmtDate(dataDesconto)} desconto de ${fmtCurrency(valorDesconto)}`);
      }
      dados.instrucoes = instrParts.join('\n') || '';
    }
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

  // Formatar nosso_numero visual: carteira/número-dígito
  const carteiraDigits = carteira.replace(/\D/g, '');
  switch (codigoBanco) {
    case '341': { // Itaú: carteira/NNNNNNNN-D
      const nnItau = nossoNumeroRaw.replace(/\D/g, '').slice(-8).padStart(8, '0');
      const dvItau = calcularDVNossoNumeroItau(agencia, conta, carteiraDigits, nnItau);
      dados.nosso_numero = `${carteiraDigits}/${nnItau}-${dvItau}`;
      break;
    }
    case '237': { // Bradesco: carteira/NNNNNNNNNNN-D
      const cartBradVisual = carteiraDigits.slice(-2).padStart(2, '0');
      const nnBrad = nossoNumeroRaw.replace(/\D/g, '').slice(-11).padStart(11, '0');
      const dvBrad = calcularModulo11(nnBrad);
      dados.nosso_numero = `${cartBradVisual}/${nnBrad}-${dvBrad}`;
      break;
    }
    default:
      dados.nosso_numero = nossoNumeroRaw;
  }

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

  // ===== Formatar datas para dd/mm/yyyy (após cálculos de barras que precisam de yyyy-mm-dd) =====
  const camposData = ['data_vencimento', 'data_emissao', 'data_documento', 'data_processamento'];
  for (const campo of camposData) {
    const val = dados[campo];
    if (val && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const [ano, mes, dia] = val.substring(0, 10).split('-');
      dados[campo] = `${dia}/${mes}/${ano}`;
    }
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
