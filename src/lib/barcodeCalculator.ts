/**
 * Calculador de Código de Barras para Boletos Bancários (Padrão FEBRABAN)
 * 
 * IMPORTANTE: Estes boletos são PRÉ-REGISTRO - o código de barras é calculado
 * mas ainda não foi registrado no banco. O registro real ocorrerá posteriormente.
 */

import { Banco, NotaFiscal, ConfiguracaoBanco } from '@/types/boleto';

// Calcula o fator de vencimento (dias desde 07/10/1997)
export function calcularFatorVencimento(dataVencimento: string): string {
  const dataBase = new Date('1997-10-07');
  const dataVenc = new Date(dataVencimento);
  const diffTime = dataVenc.getTime() - dataBase.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Fator de vencimento é limitado a 4 dígitos (até 9999)
  // Após 21/02/2025, reinicia a contagem
  const fator = diffDays > 9999 ? diffDays % 9999 + 1000 : diffDays;
  return fator.toString().padStart(4, '0');
}

// Calcula módulo 10 (usado para dígitos verificadores de campos)
export function calcularModulo10(numero: string): number {
  let soma = 0;
  let peso = 2;
  
  for (let i = numero.length - 1; i >= 0; i--) {
    let resultado = parseInt(numero[i]) * peso;
    if (resultado > 9) {
      resultado = Math.floor(resultado / 10) + (resultado % 10);
    }
    soma += resultado;
    peso = peso === 2 ? 1 : 2;
  }
  
  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

// Calcula módulo 11 (usado para dígito verificador geral do código de barras)
export function calcularModulo11(numero: string): number {
  let soma = 0;
  let peso = 2;
  
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += parseInt(numero[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  const resto = soma % 11;
  const dv = 11 - resto;
  
  // Se o DV for 0, 10 ou 11, usa-se 1
  if (dv === 0 || dv === 10 || dv === 11) {
    return 1;
  }
  return dv;
}

// Formata valor para código de barras (10 dígitos, sem pontos/vírgulas)
export function formatarValorCodigoBarras(valor: number): string {
  const valorCentavos = Math.round(valor * 100);
  return valorCentavos.toString().padStart(10, '0');
}

// Gera nosso número conforme padrão do banco
export function gerarNossoNumero(
  banco: Banco, 
  nota: NotaFiscal, 
  configuracao?: ConfiguracaoBanco
): string {
  const codigoBanco = banco.codigo_banco;
  
  // Cada banco tem seu formato de nosso número
  // Este é um cálculo genérico - em produção, cada banco tem regras específicas
  const sequencial = nota.numero_nota.replace(/\D/g, '').padStart(8, '0');
  const carteira = configuracao?.carteira || '17';
  
  switch (codigoBanco) {
    case '001': // Banco do Brasil
      // Formato: Convênio (7) + Sequencial (10)
      const convenio = configuracao?.convenio || '1234567';
      return `${convenio.padStart(7, '0')}${sequencial.slice(-10).padStart(10, '0')}`;
    
    case '033': // Santander
      // Formato: 13 dígitos
      return sequencial.padStart(13, '0');
    
    case '104': // Caixa Econômica
      // Formato: 17 dígitos
      return sequencial.padStart(17, '0');
    
    case '237': // Bradesco
      // Formato: Carteira (2) + Sequencial (11)
      return `${carteira.padStart(2, '0')}${sequencial.slice(-11).padStart(11, '0')}`;
    
    case '341': // Itaú
      // Formato: Agência (4) + Conta (5) + Carteira (3) + Sequencial (8)
      const agencia = configuracao?.agencia?.replace(/\D/g, '') || '0000';
      const conta = configuracao?.conta?.replace(/\D/g, '') || '00000';
      return `${agencia.padStart(4, '0')}${conta.slice(-5).padStart(5, '0')}${carteira.padStart(3, '0')}${sequencial.slice(-8).padStart(8, '0')}`;
    
    default:
      // Formato padrão: 11 dígitos
      return sequencial.padStart(11, '0');
  }
}

// Gera campo livre conforme padrão do banco (25 posições - posições 20 a 44)
export function gerarCampoLivre(
  banco: Banco,
  nota: NotaFiscal,
  configuracao?: ConfiguracaoBanco
): string {
  const codigoBanco = banco.codigo_banco;
  const nossoNumero = gerarNossoNumero(banco, nota, configuracao);
  const agencia = configuracao?.agencia?.replace(/\D/g, '').padStart(4, '0') || '0000';
  const conta = configuracao?.conta?.replace(/\D/g, '').padStart(8, '0') || '00000000';
  const carteira = configuracao?.carteira || '17';
  
  // Cada banco tem estrutura diferente para o campo livre
  switch (codigoBanco) {
    case '001': // Banco do Brasil
      // Formato BB: Convênio maior que 6 dígitos
      return nossoNumero.slice(0, 17).padStart(17, '0') + '21'; // 21 = produto cobrança
    
    case '033': // Santander
      // Formato: 9 + Agência + Conta + Nosso Número + 0 + Carteira
      return `9${agencia.slice(-4)}${conta.slice(-7)}${nossoNumero.slice(-13)}0${carteira.slice(-2)}`.slice(0, 25);
    
    case '104': // Caixa
      // Formato simplificado
      return `${nossoNumero.padStart(17, '0')}${agencia}${carteira.padStart(4, '0')}`.slice(0, 25);
    
    case '237': // Bradesco
      // Formato: Agência + Carteira + Nosso Número + Conta + Zero
      return `${agencia}${carteira.padStart(2, '0')}${nossoNumero.slice(-11)}${conta.slice(-7)}0`.slice(0, 25);
    
    case '341': // Itaú
      // Formato: Carteira + Nosso Número + Dígito + Agência + Conta + Dígito + 000
      const dvItau = calcularModulo10(`${carteira}${nossoNumero.slice(-8)}`);
      return `${carteira.padStart(3, '0')}${nossoNumero.slice(-8)}${dvItau}${agencia}${conta.slice(-5)}${calcularModulo10(agencia + conta.slice(-5))}000`.slice(0, 25);
    
    default:
      // Campo livre genérico
      return `${agencia}${conta.slice(-8)}${nossoNumero.slice(-13)}`.padStart(25, '0');
  }
}

// Interface para dados do código de barras
export interface DadosCodigoBarras {
  codigoBarras: string;
  linhaDigitavel: string;
  nossoNumero: string;
  fatorVencimento: string;
  valorFormatado: string;
  digitoVerificador: number;
}

// Gera código de barras completo (44 posições)
export function gerarCodigoBarras(
  banco: Banco,
  nota: NotaFiscal,
  configuracao?: ConfiguracaoBanco
): DadosCodigoBarras {
  const codigoBanco = banco.codigo_banco.padStart(3, '0');
  const moeda = '9'; // Real
  const fatorVencimento = calcularFatorVencimento(nota.data_vencimento);
  const valor = formatarValorCodigoBarras(nota.valor_titulo);
  const campoLivre = gerarCampoLivre(banco, nota, configuracao);
  const nossoNumero = gerarNossoNumero(banco, nota, configuracao);
  
  // Monta código sem o DV (posições 1-4 + 6-44)
  const codigoSemDV = `${codigoBanco}${moeda}${fatorVencimento}${valor}${campoLivre}`;
  
  // Calcula DV geral (posição 5)
  const digitoVerificador = calcularModulo11(codigoSemDV);
  
  // Monta código completo
  const codigoBarras = `${codigoBanco}${moeda}${digitoVerificador}${fatorVencimento}${valor}${campoLivre}`;
  
  // Gera linha digitável
  const linhaDigitavel = gerarLinhaDigitavel(codigoBarras);
  
  return {
    codigoBarras,
    linhaDigitavel,
    nossoNumero,
    fatorVencimento,
    valorFormatado: valor,
    digitoVerificador
  };
}

// Gera linha digitável a partir do código de barras (47 posições com DVs)
export function gerarLinhaDigitavel(codigoBarras: string): string {
  // Campo 1: Banco + Moeda + 5 primeiras posições do campo livre + DV
  const campo1 = codigoBarras.substring(0, 4) + codigoBarras.substring(19, 24);
  const dv1 = calcularModulo10(campo1);
  const campo1Formatado = `${campo1.substring(0, 5)}.${campo1.substring(5)}${dv1}`;
  
  // Campo 2: Posições 6-10 do campo livre + DV
  const campo2 = codigoBarras.substring(24, 34);
  const dv2 = calcularModulo10(campo2);
  const campo2Formatado = `${campo2.substring(0, 5)}.${campo2.substring(5)}${dv2}`;
  
  // Campo 3: Posições 11-25 do campo livre + DV
  const campo3 = codigoBarras.substring(34, 44);
  const dv3 = calcularModulo10(campo3);
  const campo3Formatado = `${campo3.substring(0, 5)}.${campo3.substring(5)}${dv3}`;
  
  // Campo 4: DV geral
  const campo4 = codigoBarras.substring(4, 5);
  
  // Campo 5: Fator vencimento + Valor
  const campo5 = codigoBarras.substring(5, 19);
  
  return `${campo1Formatado} ${campo2Formatado} ${campo3Formatado} ${campo4} ${campo5}`;
}

// Gera representação visual do código de barras (array de larguras)
export function gerarBarrasVisuais(codigoBarras: string): number[] {
  // Tabela de codificação ITF (Interleaved 2 of 5)
  const ITF_PATTERNS: Record<string, string> = {
    '0': 'NNWWN',
    '1': 'WNNNW',
    '2': 'NWNNW',
    '3': 'WWNNN',
    '4': 'NNWNW',
    '5': 'WNWNN',
    '6': 'NWWNN',
    '7': 'NNNWW',
    '8': 'WNNWN',
    '9': 'NWNWN'
  };
  
  const barras: number[] = [];
  
  // Start pattern: NNNN
  barras.push(1, 1, 1, 1);
  
  // Codifica pares de dígitos
  for (let i = 0; i < codigoBarras.length; i += 2) {
    const d1 = codigoBarras[i];
    const d2 = codigoBarras[i + 1] || '0';
    
    const p1 = ITF_PATTERNS[d1] || 'NNWWN';
    const p2 = ITF_PATTERNS[d2] || 'NNWWN';
    
    // Intercala barras (ímpares) com espaços (pares)
    for (let j = 0; j < 5; j++) {
      // Barra (preto)
      barras.push(p1[j] === 'W' ? 3 : 1);
      // Espaço (branco) - representado como negativo
      barras.push(p2[j] === 'W' ? -3 : -1);
    }
  }
  
  // Stop pattern: WNN
  barras.push(3, 1, 1);
  
  return barras;
}

// Valida código de barras
export function validarCodigoBarras(codigoBarras: string): boolean {
  if (codigoBarras.length !== 44) return false;
  if (!/^\d+$/.test(codigoBarras)) return false;
  
  // Extrai código sem DV e verifica
  const codigoSemDV = codigoBarras.substring(0, 4) + codigoBarras.substring(5);
  const dvCalculado = calcularModulo11(codigoSemDV);
  const dvInformado = parseInt(codigoBarras[4]);
  
  return dvCalculado === dvInformado;
}
