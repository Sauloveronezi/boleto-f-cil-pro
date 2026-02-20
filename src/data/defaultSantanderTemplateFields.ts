/**
 * Campos padrão do template de boleto Santander (boleto_santander_referencia.pdf)
 * Coordenadas em mm, baseadas em página A4 (210x297mm)
 * Cada campo tem bbox: [x_mm, y_mm, x2_mm, y2_mm]
 * 
 * Referência: boleto real Santander com duas vias (Recibo do Pagador + Ficha de Compensação)
 * Linha digitável de referência: 03399.07164 13900.000004 00003.501046 1 13630000004179
 */

import type { DefaultFieldDef } from './defaultBoletoTemplateFields';

// Offset vertical entre a primeira via (Recibo do Pagador) e segunda via (Ficha de Compensação)
const VIA2_OFFSET_Y = 148;

// Campos da primeira via (Recibo do Pagador)
const camposVia1Santander: DefaultFieldDef[] = [
  // === Cabeçalho / Linha digitável ===
  {
    key: 'linha_digitavel',
    label: 'Linha Digitável',
    source_ref: 'linha_digitavel',
    bbox: [70, 12, 205, 16],
    font_family: 'courier',
    font_size: 9,
    bold: true,
    align: 'right',
    is_digitable_line: true,
    display_order: 1,
    page: 1,
  },

  // === Linha 1: Local de Pagamento | Vencimento ===
  {
    key: 'local_pagamento',
    label: 'Local de Pagamento',
    source_ref: 'local_pagamento',
    bbox: [5, 21, 145, 27],
    font_size: 7,
    align: 'left',
    display_order: 10,
    page: 1,
  },
  {
    key: 'data_vencimento',
    label: 'Vencimento',
    source_ref: 'data_vencimento',
    bbox: [147, 21, 205, 27],
    font_size: 10,
    bold: true,
    align: 'right',
    format: 'date_ddmmyyyy',
    display_order: 11,
    page: 1,
  },

  // === Linha 2: Beneficiário | Agência/Código ===
  {
    key: 'beneficiario_nome',
    label: 'Beneficiário',
    source_ref: 'beneficiario_nome',
    bbox: [5, 31, 145, 37],
    font_size: 8,
    align: 'left',
    display_order: 20,
    page: 1,
  },
  {
    key: 'agencia_codigo',
    label: 'Agência/Cód. do Beneficiário',
    source_ref: 'agencia_codigo',
    bbox: [147, 31, 205, 37],
    font_size: 9,
    align: 'right',
    display_order: 21,
    page: 1,
  },

  // === Endereço Beneficiário (abaixo do nome) ===
  {
    key: 'beneficiario_endereco',
    label: 'Endereço do Beneficiário',
    source_ref: 'beneficiario_endereco',
    bbox: [5, 37, 145, 42],
    font_size: 7,
    align: 'left',
    display_order: 22,
    page: 1,
  },

  // === Linha 3: Data Doc | Nº Doc | Espécie | Aceite | Data Proc | Nosso Número ===
  {
    key: 'data_documento',
    label: 'Data do Documento',
    source_ref: 'data_emissao',
    bbox: [5, 45, 35, 51],
    font_size: 8,
    align: 'center',
    format: 'date_ddmmyyyy',
    display_order: 30,
    page: 1,
  },
  {
    key: 'numero_documento',
    label: 'Nº do Documento',
    source_ref: 'numero_documento',
    bbox: [37, 45, 82, 51],
    font_size: 8,
    align: 'left',
    display_order: 31,
    page: 1,
  },
  {
    key: 'especie_documento',
    label: 'Espécie Doc.',
    source_ref: 'especie_documento',
    bbox: [84, 45, 100, 51],
    font_size: 8,
    align: 'center',
    display_order: 32,
    page: 1,
  },
  {
    key: 'aceite',
    label: 'Aceite',
    source_ref: 'aceite',
    bbox: [102, 45, 118, 51],
    font_size: 8,
    align: 'center',
    display_order: 33,
    page: 1,
  },
  {
    key: 'data_processamento',
    label: 'Data de Processamento',
    source_ref: 'data_processamento',
    bbox: [120, 45, 148, 51],
    font_size: 8,
    align: 'center',
    format: 'date_ddmmyyyy',
    display_order: 34,
    page: 1,
  },
  {
    key: 'nosso_numero',
    label: 'Nosso Número',
    source_ref: 'nosso_numero',
    bbox: [150, 45, 205, 51],
    font_size: 9,
    bold: true,
    align: 'right',
    display_order: 35,
    page: 1,
  },

  // === Linha 4: Uso Banco | Carteira | Espécie | Qtde | Valor | Valor Doc ===
  {
    key: 'uso_banco',
    label: 'Uso do Banco',
    source_ref: 'uso_banco',
    bbox: [5, 55, 35, 61],
    font_size: 8,
    align: 'center',
    display_order: 40,
    page: 1,
  },
  {
    key: 'carteira',
    label: 'Carteira',
    source_ref: 'carteira',
    bbox: [37, 55, 60, 61],
    font_size: 8,
    align: 'center',
    display_order: 41,
    page: 1,
  },
  {
    key: 'especie_moeda',
    label: 'Espécie Moeda',
    source_ref: 'especie_moeda',
    bbox: [62, 55, 80, 61],
    font_size: 8,
    align: 'center',
    display_order: 42,
    page: 1,
  },
  {
    key: 'quantidade',
    label: 'Quantidade',
    source_ref: 'quantidade',
    bbox: [82, 55, 110, 61],
    font_size: 8,
    align: 'right',
    display_order: 43,
    page: 1,
  },
  {
    key: 'valor_moeda',
    label: '(x) Valor',
    source_ref: 'valor_moeda',
    bbox: [112, 55, 148, 61],
    font_size: 8,
    align: 'right',
    display_order: 44,
    page: 1,
  },
  {
    key: 'valor_documento',
    label: '(=) Valor do Documento',
    source_ref: 'valor_documento',
    bbox: [150, 55, 205, 61],
    font_size: 10,
    bold: true,
    align: 'right',
    format: 'currency_ptbr',
    display_order: 45,
    page: 1,
  },

  // === Instruções e valores à direita ===
  {
    key: 'instrucoes',
    label: 'Instruções',
    source_ref: 'instrucoes',
    bbox: [5, 64, 148, 91],
    font_size: 7,
    align: 'left',
    display_order: 50,
    page: 1,
  },
  {
    key: 'desconto',
    label: '(-) Descontos/Abatimentos',
    source_ref: 'valor_desconto',
    bbox: [150, 65, 205, 71],
    font_size: 8,
    align: 'right',
    format: 'currency_ptbr',
    display_order: 51,
    page: 1,
  },
  {
    key: 'outras_deducoes',
    label: '(-) Outras deduções',
    source_ref: 'outras_deducoes',
    bbox: [150, 72, 205, 78],
    font_size: 8,
    align: 'right',
    display_order: 52,
    page: 1,
  },
  {
    key: 'mora_multa',
    label: '(+) Mora/Multa',
    source_ref: 'mora_multa',
    bbox: [150, 79, 205, 85],
    font_size: 8,
    align: 'right',
    display_order: 53,
    page: 1,
  },
  {
    key: 'outros_acrescimos',
    label: '(+) Outros acréscimos',
    source_ref: 'outros_acrescimos',
    bbox: [150, 86, 205, 92],
    font_size: 8,
    align: 'right',
    display_order: 54,
    page: 1,
  },
  {
    key: 'valor_cobrado',
    label: '(=) Valor Cobrado',
    source_ref: 'valor_cobrado',
    bbox: [150, 93, 205, 99],
    font_size: 10,
    bold: true,
    align: 'right',
    format: 'currency_ptbr',
    display_order: 55,
    page: 1,
  },

  // === Pagador ===
  {
    key: 'pagador_nome',
    label: 'Pagador',
    source_ref: 'pagador_nome',
    bbox: [5, 100, 155, 106],
    font_size: 8,
    align: 'left',
    display_order: 70,
    page: 1,
  },
  {
    key: 'pagador_cnpj',
    label: 'CPF/CNPJ do Pagador',
    source_ref: 'pagador_cnpj',
    bbox: [157, 100, 205, 106],
    font_size: 8,
    align: 'right',
    format: 'mask_cnpj',
    display_order: 71,
    page: 1,
  },
  {
    key: 'pagador_endereco',
    label: 'Endereço Pagador',
    source_ref: 'pagador_endereco',
    bbox: [5, 107, 155, 112],
    font_size: 7,
    align: 'left',
    display_order: 72,
    page: 1,
  },
  {
    key: 'pagador_cidade_uf',
    label: 'Cidade/UF Pagador',
    source_ref: 'pagador_cidade_uf',
    bbox: [5, 113, 155, 118],
    font_size: 7,
    align: 'left',
    display_order: 73,
    page: 1,
  },

  // === Código de Barras ===
  {
    key: 'codigo_barras',
    label: 'Código de Barras',
    source_ref: 'codigo_barras',
    bbox: [5, 120, 195, 136],
    font_size: 10,
    align: 'center',
    is_barcode: true,
    display_order: 90,
    page: 1,
  },
];

// Gera os campos da segunda via (mesmos campos com offset Y)
function gerarCamposVia2Santander(): DefaultFieldDef[] {
  return camposVia1Santander.map(campo => ({
    ...campo,
    key: `via2_${campo.key}`,
    bbox: [
      campo.bbox[0],
      campo.bbox[1] + VIA2_OFFSET_Y,
      campo.bbox[2],
      campo.bbox[3] + VIA2_OFFSET_Y,
    ] as [number, number, number, number],
    display_order: campo.display_order + 100,
  }));
}

/**
 * Retorna todos os campos do template Santander (via 1 + via 2)
 */
export function getSantanderTemplateFields(): DefaultFieldDef[] {
  return [...camposVia1Santander, ...gerarCamposVia2Santander()];
}
