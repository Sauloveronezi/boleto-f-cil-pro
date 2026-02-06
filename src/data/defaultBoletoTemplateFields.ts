/**
 * Campos padrão do template de boleto Bradesco (modelo_padrao_bradesco.pdf)
 * Coordenadas em mm, baseadas em página A4 (210x297mm)
 * Cada campo tem bbox: [x_mm, y_mm, x2_mm, y2_mm]
 * 
 * O PDF tem duas vias idênticas. Estes são os campos da primeira via (Ficha de Caixa).
 * A segunda via é gerada com offset_y para duplicar os campos.
 * 
 * IMPORTANTE: As coordenadas foram calibradas a partir do modelo_padrao_bradesco.pdf.
 * Cada campo deve ficar DENTRO da célula de dados (abaixo do label impresso no PDF base).
 */

export interface DefaultFieldDef {
  key: string;
  label: string;
  source_ref: string;     // campo do DadosBoleto ou literal:texto
  bbox: [number, number, number, number]; // [x, y, x2, y2] em mm
  font_family?: string;
  font_size?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  format?: string;
  is_barcode?: boolean;
  is_digitable_line?: boolean;
  display_order: number;
  page: number;
}

// Offset vertical entre a primeira e segunda via do boleto (em mm)
const VIA2_OFFSET_Y = 148;

// Campos da primeira via (Ficha de Caixa)
// Coordenadas calibradas com o PDF real: cada label ocupa ~3mm,
// e o dado é escrito na área logo abaixo do label.
const camposVia1: DefaultFieldDef[] = [
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
    label: 'Agência/Código Beneficiário',
    source_ref: 'agencia_codigo',
    bbox: [147, 31, 205, 37],
    font_size: 9,
    align: 'right',
    display_order: 21,
    page: 1,
  },

  // === Linha 3: Data Doc | Nº Doc | Espécie | Aceite | Data Proc | Nosso Número ===
  {
    key: 'data_documento',
    label: 'Data do Documento',
    source_ref: 'data_emissao',
    bbox: [5, 43, 35, 49],
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
    bbox: [37, 43, 82, 49],
    font_size: 8,
    align: 'left',
    display_order: 31,
    page: 1,
  },
  {
    key: 'especie_documento',
    label: 'Espécie Doc.',
    source_ref: 'especie_documento',
    bbox: [84, 43, 100, 49],
    font_size: 8,
    align: 'center',
    display_order: 32,
    page: 1,
  },
  {
    key: 'aceite',
    label: 'Aceite',
    source_ref: 'aceite',
    bbox: [102, 43, 115, 49],
    font_size: 8,
    align: 'center',
    display_order: 33,
    page: 1,
  },
  {
    key: 'data_processamento',
    label: 'Data Processamento',
    source_ref: 'data_processamento',
    bbox: [117, 43, 145, 49],
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
    bbox: [147, 43, 205, 49],
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
    bbox: [5, 53, 35, 59],
    font_size: 8,
    align: 'center',
    display_order: 40,
    page: 1,
  },
  {
    key: 'carteira',
    label: 'Carteira',
    source_ref: 'carteira',
    bbox: [37, 53, 55, 59],
    font_size: 8,
    align: 'center',
    display_order: 41,
    page: 1,
  },
  {
    key: 'especie_moeda',
    label: 'Espécie',
    source_ref: 'especie_moeda',
    bbox: [57, 53, 75, 59],
    font_size: 8,
    align: 'center',
    display_order: 42,
    page: 1,
  },
  {
    key: 'quantidade',
    label: 'Quantidade',
    source_ref: 'quantidade',
    bbox: [77, 53, 105, 59],
    font_size: 8,
    align: 'right',
    display_order: 43,
    page: 1,
  },
  {
    key: 'valor_moeda',
    label: 'Valor',
    source_ref: 'valor_moeda',
    bbox: [107, 53, 145, 59],
    font_size: 8,
    align: 'right',
    display_order: 44,
    page: 1,
  },
  {
    key: 'valor_documento',
    label: '(=) Valor do Documento',
    source_ref: 'valor_documento',
    bbox: [147, 53, 205, 59],
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
    bbox: [5, 62, 145, 89],
    font_size: 7,
    align: 'left',
    display_order: 50,
    page: 1,
  },
  {
    key: 'desconto',
    label: '(-) Desconto/Abatimento',
    source_ref: 'valor_desconto',
    bbox: [147, 63, 205, 69],
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
    bbox: [147, 70, 205, 76],
    font_size: 8,
    align: 'right',
    display_order: 52,
    page: 1,
  },
  {
    key: 'mora_multa',
    label: '(+) Mora/Multa',
    source_ref: 'mora_multa',
    bbox: [147, 77, 205, 83],
    font_size: 8,
    align: 'right',
    display_order: 53,
    page: 1,
  },
  {
    key: 'outros_acrescimos',
    label: '(+) Outros acréscimos',
    source_ref: 'outros_acrescimos',
    bbox: [147, 84, 205, 90],
    font_size: 8,
    align: 'right',
    display_order: 54,
    page: 1,
  },
  {
    key: 'valor_cobrado',
    label: '(=) Valor Cobrado',
    source_ref: 'valor_cobrado',
    bbox: [147, 91, 205, 97],
    font_size: 10,
    bold: true,
    align: 'right',
    format: 'currency_ptbr',
    display_order: 55,
    page: 1,
  },

  // === Endereço Beneficiário ===
  {
    key: 'beneficiario_endereco',
    label: 'Endereço do Beneficiário',
    source_ref: 'beneficiario_endereco',
    bbox: [5, 91, 145, 97],
    font_size: 7,
    align: 'left',
    display_order: 60,
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
function gerarCamposVia2(): DefaultFieldDef[] {
  return camposVia1.map(campo => ({
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
 * Retorna todos os campos padrão (via 1 + via 2)
 */
export function getDefaultTemplateFields(): DefaultFieldDef[] {
  return [...camposVia1, ...gerarCamposVia2()];
}

/**
 * Retorna apenas os campos da via 1
 */
export function getDefaultTemplateFieldsVia1(): DefaultFieldDef[] {
  return camposVia1;
}
