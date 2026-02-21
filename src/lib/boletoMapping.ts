import { format } from 'date-fns';
import { DadosBoleto } from './pdfModelRenderer';
import { Cliente, ConfiguracaoBanco, Banco } from '@/types/boleto';

// Interface para os dados vindos da API (vv_b_boletos_api)
export interface BoletoApiData {
  id: string;
  numero_nota: string;
  numero_cobranca?: string;
  data_emissao?: string;
  data_vencimento?: string;
  valor?: number;
  valor_desconto?: number;
  data_desconto?: string;
  dados_extras?: any;
  dyn_nome_do_cliente?: string;
  dyn_cidade?: string;
  dyn_conta?: string;
  dyn_desconto1?: string;
  dyn_desconto_data?: string;
  dyn_zonatransporte?: string;
  taxnumber1?: string;
  uf?: string;
  cliente?: Partial<Cliente>;
  // Adicionar outros campos conforme necessário
}

// Interface para dados da empresa
export interface EmpresaData {
  razao_social: string;
  cnpj: string;
  endereco: string;
  numero: string;
  complemento: string;
  cidade: string;
  estado: string;
  cep: string;
}

/**
 * Mapeia dados da API e outras fontes para o formato DadosBoleto usado na geração do PDF
 */
export function mapearBoletoApiParaModelo(
  boleto: BoletoApiData,
  cliente: Partial<Cliente> | undefined,
  empresa: EmpresaData | undefined,
  banco: Partial<Banco>,
  configuracao: Partial<ConfiguracaoBanco> | undefined,
  dadosCodigoBarras?: { linhaDigitavel: string, codigoBarras: string, nossoNumero?: string, nossoNumeroFormatado?: string }
): DadosBoleto {
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const valorFormatado = formatCurrency(boleto.valor);
  const dataEmissaoFormatada = boleto.data_emissao ? format(new Date(String(boleto.data_emissao).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy') : '';
  const dataVencimentoFormatada = boleto.data_vencimento ? format(new Date(String(boleto.data_vencimento).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy') : '';
  const dataProcessamento = format(new Date(), 'dd/MM/yyyy');
  
  // Tratamento de descontos
  const valorDescontoFormatado = boleto.valor_desconto 
    ? formatCurrency(boleto.valor_desconto) 
    : (boleto.dyn_desconto1 ? formatCurrency(parseFloat(boleto.dyn_desconto1)) : '0,00');
    
  const dataDescontoFormatada = boleto.data_desconto 
    ? format(new Date(String(boleto.data_desconto).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy') 
    : (boleto.dyn_desconto_data || '');

  // Endereço do beneficiário
  const beneficiarioEndereco = empresa 
    ? `${empresa.endereco || ''}, ${empresa.numero || ''} ${empresa.complemento ? `- ${empresa.complemento}` : ''}`
    : '';
  const beneficiarioCidadeUf = empresa ? `${empresa.cidade || ''} - ${empresa.estado || ''}` : '';

  // Endereço do pagador
  const pagadorCidadeUf = (boleto.dyn_cidade || cliente?.cidade)
    ? `${boleto.dyn_cidade || cliente?.cidade}/${boleto.uf || cliente?.estado || ''}`
    : '';

  // Dados extras e fallbacks
  const dadosExtras = boleto.dados_extras || {};

  return {
    // Dados do pagador/cliente
    pagador_nome: boleto.dyn_nome_do_cliente || cliente?.razao_social || '',
    pagador_cnpj: boleto.taxnumber1 || cliente?.cnpj || '',
    pagador_endereco: cliente?.endereco || '',
    pagador_cidade_uf: pagadorCidadeUf,
    pagador_cep: cliente?.cep || '',
    
    // Aliases para variáveis comuns
    cliente_razao_social: boleto.dyn_nome_do_cliente || cliente?.razao_social || '',
    cliente_cnpj: boleto.taxnumber1 || cliente?.cnpj || '',
    cliente_endereco: cliente?.endereco || '',
    
    // Beneficiário (Empresa)
    beneficiario_nome: empresa?.razao_social || '',
    beneficiario_cnpj: empresa?.cnpj || '',
    beneficiario_endereco: beneficiarioEndereco,
    beneficiario_cidade_uf: beneficiarioCidadeUf,
    
    // Dados do título/boleto
    // O valor na tabela já vem com desconto aplicado, então o valor original = valor + valor_desconto
    valor_documento: formatCurrency((boleto.valor || 0) + (boleto.valor_desconto || 0)),
    valor_titulo: formatCurrency((boleto.valor || 0) + (boleto.valor_desconto || 0)),
    valor_cobrado: valorFormatado,
    data_vencimento: dataVencimentoFormatada,
    data_emissao: dataEmissaoFormatada,
    data_processamento: dataProcessamento,
    nosso_numero: dadosCodigoBarras?.nossoNumeroFormatado || dadosCodigoBarras?.nossoNumero || boleto.numero_nota, // Usa formato visual se disponível
    numero_documento: boleto.numero_cobranca || boleto.numero_nota,
    numero_nota: boleto.numero_nota,
    numero_cobranca: boleto.numero_cobranca,

    // Descontos
    valor_desconto: valorDescontoFormatado,
    data_desconto: dataDescontoFormatada,
    
    // Dados do banco
    banco_nome: banco.nome_banco || '',
    banco_codigo: banco.codigo_banco || '',
    agencia: configuracao?.agencia || '',
    conta: configuracao?.conta || (boleto.dyn_conta || ''),
    agencia_codigo: (() => {
      // Agência/Código: últimos 4 dígitos do campo banco / BankAccountLongID - BankControlKey
      const bancoField = (boleto as any).banco || '';
      const agLast4 = bancoField.replace(/\D/g, '').slice(-4);
      const bankAccLong = dadosExtras.BankAccountLongID || dadosExtras.bankaccountlongid || (boleto as any).BankAccountLongID || (boleto as any).bankaccountlongid || '';
      const bankCtrlKey = dadosExtras.BankControlKey || dadosExtras.bankcontrolkey || (boleto as any).bankcontrolkey || '';
      if (agLast4 && bankAccLong) {
        return `${agLast4} / ${bankAccLong}${bankCtrlKey ? '-' + bankCtrlKey : ''}`;
      }
      return `${configuracao?.agencia || ''}/${configuracao?.conta || (boleto.dyn_conta || '')}-${configuracao?.convenio || '0'}`;
    })(),
    carteira: configuracao?.carteira || '',
    codigo_cedente: configuracao?.codigo_cedente || '',
    
    // Extras
    especie_documento: dadosExtras.especie_documento || 'DM',
    aceite: dadosExtras.aceite || 'N',
    especie_moeda: dadosExtras.especie_moeda || 'R$',
    quantidade: dadosExtras.quantidade || '',
    valor_moeda: dadosExtras.valor_moeda || '',
    local_pagamento: dadosExtras.local_pagamento || configuracao?.texto_instrucao_padrao || 'PAGÁVEL EM QUALQUER AGÊNCIA BANCÁRIA ATÉ O VENCIMENTO', // Fallback cruzado
    instrucoes: dadosExtras.instrucoes || configuracao?.texto_instrucao_padrao || '',
    sacador_avalista: dadosExtras.sacador_avalista || '',
    uso_banco: dadosExtras.uso_banco || (boleto.dyn_zonatransporte || ''),
    
    // Campos dinâmicos explícitos (para garantir acesso via variável direta)
    dyn_conta: boleto.dyn_conta || '',
    dyn_zonatransporte: boleto.dyn_zonatransporte || '',
    dyn_nome_do_cliente: boleto.dyn_nome_do_cliente || '',
    dyn_cidade: boleto.dyn_cidade || '',
    dyn_desconto1: boleto.dyn_desconto1 || '',
    dyn_desconto_data: boleto.dyn_desconto_data || '',

    // Espalhar quaisquer outros campos dinâmicos ou não mapeados presentes no objeto original
    ...boleto,
    ...dadosExtras,

    // Linha digitável e código de barras
    linha_digitavel: dadosCodigoBarras?.linhaDigitavel || '00000.00000 00000.000000 00000.000000 0 00000000000000',
    codigo_barras: dadosCodigoBarras?.codigoBarras || '00000000000000000000000000000000000000000000',
  };
}

/**
 * Converte DadosBoleto para um objeto de dados compatível com a geração CNAB.
 * Utiliza chaves padrão que correspondem aos 'campo_destino' na configuração CNAB.
 */
export function mapearModeloParaCNAB(dados: DadosBoleto): Record<string, string> {
  // Remove formatação para CNAB (apenas números e letras)
  const limparFormatacao = (val: string) => val.replace(/[^\w\s]/g, '').trim();
  const limparNumero = (val: string) => val.replace(/\D/g, '');
  const limparData = (val: string) => {
    // Espera formato dd/MM/yyyy
    const parts = val.split('/');
    if (parts.length === 3) return `${parts[0]}${parts[1]}${parts[2].slice(-2)}`; // ddmmaa
    return val.replace(/\D/g, '');
  };

  // 1. Mapeamento explícito de campos padrão com limpeza
  const registroPadrao: Record<string, string> = {
    // Dados do Pagador (Sacado)
    'cnpj_sacado': limparNumero(dados.pagador_cnpj),
    'nome_sacado': dados.pagador_nome.toUpperCase(),
    'endereco_sacado': dados.pagador_endereco.toUpperCase(),
    'bairro_sacado': '', // Não temos no modelo padrão, mas pode ser adicionado
    'cep_sacado': limparNumero(dados.pagador_cep),
    'cidade_sacado': dados.pagador_cidade_uf.split('/')[0]?.trim().toUpperCase() || '',
    'uf_sacado': dados.pagador_cidade_uf.split('/')[1]?.trim().toUpperCase() || '',

    // Dados do Beneficiário (Cedente)
    'cnpj_cedente': limparNumero(dados.beneficiario_cnpj),
    'nome_cedente': dados.beneficiario_nome.toUpperCase(),
    'agencia': limparNumero(dados.agencia),
    'conta': limparNumero(dados.conta),
    'digito_conta': '', // Geralmente extraído da conta
    'carteira': limparNumero(dados.carteira),
    'codigo_cedente': limparNumero(dados.codigo_cedente),

    // Dados do Título
    'nosso_numero': limparNumero(dados.nosso_numero),
    'numero_documento': dados.numero_documento,
    'data_vencimento': limparData(dados.data_vencimento),
    'valor': limparNumero(dados.valor_titulo), // Centavos
    'data_emissao': limparData(dados.data_emissao),
    'especie_documento': dados.especie_documento,
    'aceite': dados.aceite,
    'instrucao1': dados.instrucoes.substring(0, 2), // Exemplo
    'instrucao2': '',

    // Descontos e Juros
    'valor_desconto': limparNumero(dados.valor_desconto),
    'data_desconto': limparData(dados.data_desconto),
    'valor_juros': '0',
    'valor_multa': '0',

    // Campos genéricos/aliases
    'cnpj': limparNumero(dados.pagador_cnpj),
    'razao_social': dados.pagador_nome.toUpperCase(),
    'vencimento': limparData(dados.data_vencimento),
    'endereco': dados.pagador_endereco.toUpperCase(),
    'numero_nota': dados.numero_documento,
    'cidade': dados.pagador_cidade_uf.split('/')[0]?.trim().toUpperCase() || '',
    'estado': dados.pagador_cidade_uf.split('/')[1]?.trim().toUpperCase() || '',
    'cep': limparNumero(dados.pagador_cep),
  };

  // 2. Incluir todos os campos originais de DadosBoleto como fallback/complemento
  // Isso garante que campos dinâmicos (dyn_*) e outros dados não explicitamente mapeados
  // estejam disponíveis para a geração do arquivo se a configuração CNAB solicitar
  const registroCompleto = { ...dados } as Record<string, string>;
  
  // Mesclar, dando prioridade ao mapeamento padrão (que já tem limpeza)
  return {
    ...registroCompleto,
    ...registroPadrao
  };
}

/**
 * Converte dados lidos de um arquivo CNAB de volta para DadosBoleto parcial.
 */
export function mapearCNABParaModelo(dadosCNAB: Record<string, string>): Partial<DadosBoleto> {
  const formatCurrency = (val: string) => {
    if (!val) return '0,00';
    const num = parseInt(val) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatDate = (val: string) => {
    if (!val || val.length < 6) return '';
    // Assume ddmmaa
    const dia = val.substring(0, 2);
    const mes = val.substring(2, 4);
    const ano = val.length === 8 ? val.substring(4, 8) : `20${val.substring(4, 6)}`;
    return `${dia}/${mes}/${ano}`;
  };

  return {
    pagador_nome: dadosCNAB['nome_sacado'] || dadosCNAB['razao_social'] || '',
    pagador_cnpj: dadosCNAB['cnpj_sacado'] || dadosCNAB['cnpj'] || '',
    pagador_endereco: dadosCNAB['endereco_sacado'] || dadosCNAB['endereco'] || '',
    pagador_cep: dadosCNAB['cep_sacado'] || dadosCNAB['cep'] || '',
    pagador_cidade_uf: `${dadosCNAB['cidade_sacado'] || dadosCNAB['cidade'] || ''}/${dadosCNAB['uf_sacado'] || dadosCNAB['estado'] || ''}`,
    
    beneficiario_nome: dadosCNAB['nome_cedente'] || '',
    beneficiario_cnpj: dadosCNAB['cnpj_cedente'] || '',
    
    agencia: dadosCNAB['agencia'] || '',
    conta: dadosCNAB['conta'] || '',
    carteira: dadosCNAB['carteira'] || '',
    codigo_cedente: dadosCNAB['codigo_cedente'] || '',
    
    nosso_numero: dadosCNAB['nosso_numero'] || '',
    numero_documento: dadosCNAB['numero_documento'] || dadosCNAB['numero_nota'] || '',
    data_vencimento: formatDate(dadosCNAB['data_vencimento'] || dadosCNAB['vencimento'] || ''),
    valor_titulo: formatCurrency(dadosCNAB['valor'] || ''),
    data_emissao: formatDate(dadosCNAB['data_emissao'] || ''),
    
    valor_desconto: formatCurrency(dadosCNAB['valor_desconto'] || ''),
    data_desconto: formatDate(dadosCNAB['data_desconto'] || ''),
    
    especie_documento: dadosCNAB['especie_documento'] || '',
    aceite: dadosCNAB['aceite'] || '',
  };
}
