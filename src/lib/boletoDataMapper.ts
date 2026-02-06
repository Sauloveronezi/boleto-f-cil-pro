/**
 * Mapeia os dados brutos da tabela vv_b_boletos_api para os nomes
 * semânticos usados nos templates de boleto (source_ref).
 * 
 * Ex: vv_b_boletos_api.dyn_nome_do_cliente → pagador_nome
 */
import type { DadosBoleto } from './pdfModelRenderer';

/**
 * Transforma um registro da tabela vv_b_boletos_api em DadosBoleto
 * pronto para o renderer de templates.
 */
export function mapBoletoApiToDadosBoleto(row: Record<string, any>): DadosBoleto {
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

  // Banco / Beneficiário (podem vir de config da empresa)
  dados.banco_codigo = row.banco || '';
  dados.banco_nome = '';
  dados.agencia_codigo = '';
  dados.beneficiario_nome = '';
  dados.beneficiario_cnpj = '';
  dados.beneficiario_endereco = '';

  // Números do boleto
  dados.nosso_numero = row.numero_cobranca || '';
  dados.codigo_barras = row.codigo_barras || '';
  dados.linha_digitavel = row.linha_digitavel || '';

  // Campos fixos padrão
  dados.local_pagamento = 'PAGÁVEL PREFERENCIALMENTE NA REDE BRADESCO.';
  dados.especie_documento = 'DM';
  dados.aceite = 'N';
  dados.especie_moeda = 'R$';
  dados.carteira = '09';

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
    { key: 'local_pagamento', label: 'Local Pagamento', value: dados.local_pagamento || '' },
  ];
  return items.filter(i => i.value);
}
