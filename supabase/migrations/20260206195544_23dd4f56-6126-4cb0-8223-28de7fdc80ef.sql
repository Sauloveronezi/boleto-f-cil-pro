
-- Recalibrar TODOS os campos do template padrão Bradesco
-- Problema principal: campos da direita deslocados ~4mm para baixo

DELETE FROM vv_b_boleto_template_fields
WHERE template_id = 'b0000000-0000-0000-0000-000000000001';

INSERT INTO vv_b_boleto_template_fields
  (template_id, key, label, source_ref, bbox, font_family, font_size, bold, align, format, is_barcode, is_digitable_line, display_order, page, visible, color)
VALUES
  -- === VIA 1 ===
  -- Linha digitável
  ('b0000000-0000-0000-0000-000000000001', 'linha_digitavel', 'Linha Digitável', 'linha_digitavel', '[70, 12, 205, 16]', 'courier', 9, true, 'right', null, false, true, 1, 1, true, '#000000'),

  -- Local de Pagamento | Vencimento
  ('b0000000-0000-0000-0000-000000000001', 'local_pagamento', 'Local de Pagamento', 'local_pagamento', '[5, 22, 145, 28]', 'helvetica', 7, false, 'left', null, false, false, 10, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'data_vencimento', 'Vencimento', 'data_vencimento', '[147, 22, 205, 28]', 'helvetica', 10, true, 'right', null, false, false, 11, 1, true, '#000000'),

  -- Beneficiário | Agência/Código
  ('b0000000-0000-0000-0000-000000000001', 'beneficiario_nome', 'Beneficiário', 'beneficiario_nome', '[5, 32, 145, 38]', 'helvetica', 8, false, 'left', null, false, false, 20, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'agencia_codigo', 'Agência/Código Beneficiário', 'agencia_codigo', '[147, 32, 205, 38]', 'helvetica', 9, false, 'right', null, false, false, 21, 1, true, '#000000'),

  -- Linha 3: Data Doc | Nº Doc | Espécie | Aceite | Data Proc | Nosso Número
  ('b0000000-0000-0000-0000-000000000001', 'data_documento', 'Data do Documento', 'data_emissao', '[5, 44, 35, 49]', 'helvetica', 8, false, 'center', 'date_ddmmyyyy', false, false, 30, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'numero_documento', 'Nº do Documento', 'numero_documento', '[37, 44, 82, 49]', 'helvetica', 8, false, 'left', null, false, false, 31, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'especie_documento', 'Espécie Doc.', 'especie_documento', '[84, 44, 100, 49]', 'helvetica', 8, false, 'center', null, false, false, 32, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'aceite', 'Aceite', 'aceite', '[102, 44, 115, 49]', 'helvetica', 8, false, 'center', null, false, false, 33, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'data_processamento', 'Data Processamento', 'data_processamento', '[117, 44, 145, 49]', 'helvetica', 8, false, 'center', 'date_ddmmyyyy', false, false, 34, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'nosso_numero', 'Nosso Número', 'nosso_numero', '[147, 44, 205, 49]', 'helvetica', 9, true, 'right', null, false, false, 35, 1, true, '#000000'),

  -- Linha 4: Uso Banco | Carteira | Espécie | Qtde | Valor | Valor Doc
  ('b0000000-0000-0000-0000-000000000001', 'uso_banco', 'Uso do Banco', 'uso_banco', '[5, 54, 35, 59]', 'helvetica', 8, false, 'center', null, false, false, 40, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'carteira', 'Carteira', 'carteira', '[37, 54, 55, 59]', 'helvetica', 8, false, 'center', null, false, false, 41, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'especie_moeda', 'Espécie', 'especie_moeda', '[57, 54, 75, 59]', 'helvetica', 8, false, 'center', null, false, false, 42, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'quantidade', 'Quantidade', 'quantidade', '[77, 54, 105, 59]', 'helvetica', 8, false, 'right', null, false, false, 43, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'valor_moeda', 'Valor', 'valor_moeda', '[107, 54, 145, 59]', 'helvetica', 8, false, 'right', null, false, false, 44, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'valor_documento', '(=) Valor do Documento', 'valor_documento', '[147, 54, 205, 59]', 'helvetica', 10, true, 'right', 'currency_ptbr', false, false, 45, 1, true, '#000000'),

  -- Instruções (lado esquerdo)
  ('b0000000-0000-0000-0000-000000000001', 'instrucoes', 'Instruções', 'instrucoes', '[5, 62, 145, 86]', 'helvetica', 7, false, 'left', null, false, false, 50, 1, true, '#000000'),

  -- Campos direita: Desconto, Deduções, Mora, Acréscimos, Valor Cobrado
  -- Cada célula ~7mm, labels pré-impressos no PDF, dados 2mm abaixo do label
  ('b0000000-0000-0000-0000-000000000001', 'desconto', '(-) Desconto/Abatimento', 'valor_desconto', '[147, 60, 205, 65]', 'helvetica', 8, false, 'right', 'currency_ptbr', false, false, 51, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'outras_deducoes', '(-) Outras deduções', 'outras_deducoes', '[147, 67, 205, 72]', 'helvetica', 8, false, 'right', null, false, false, 52, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'mora_multa', '(+) Mora/Multa', 'mora_multa', '[147, 74, 205, 79]', 'helvetica', 8, false, 'right', null, false, false, 53, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'outros_acrescimos', '(+) Outros acréscimos', 'outros_acrescimos', '[147, 81, 205, 86]', 'helvetica', 8, false, 'right', null, false, false, 54, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'valor_cobrado', '(=) Valor Cobrado', 'valor_cobrado', '[147, 88, 205, 94]', 'helvetica', 10, true, 'right', 'currency_ptbr', false, false, 55, 1, true, '#000000'),

  -- Endereço Beneficiário
  ('b0000000-0000-0000-0000-000000000001', 'beneficiario_endereco', 'Endereço do Beneficiário', 'beneficiario_endereco', '[5, 89, 145, 94]', 'helvetica', 7, false, 'left', null, false, false, 60, 1, true, '#000000'),

  -- Pagador
  ('b0000000-0000-0000-0000-000000000001', 'pagador_nome', 'Pagador', 'pagador_nome', '[5, 100, 155, 106]', 'helvetica', 8, false, 'left', null, false, false, 70, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'pagador_cnpj', 'CPF/CNPJ do Pagador', 'pagador_cnpj', '[157, 100, 205, 106]', 'helvetica', 8, false, 'right', 'mask_cnpj', false, false, 71, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'pagador_endereco', 'Endereço Pagador', 'pagador_endereco', '[5, 107, 155, 112]', 'helvetica', 7, false, 'left', null, false, false, 72, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'pagador_cidade_uf', 'Cidade/UF Pagador', 'pagador_cidade_uf', '[5, 113, 155, 118]', 'helvetica', 7, false, 'left', null, false, false, 73, 1, true, '#000000'),

  -- Código de Barras
  ('b0000000-0000-0000-0000-000000000001', 'codigo_barras', 'Código de Barras', 'codigo_barras', '[5, 120, 195, 136]', 'helvetica', 10, false, 'center', null, true, false, 90, 1, true, '#000000'),

  -- === VIA 2 (offset +148mm) ===
  ('b0000000-0000-0000-0000-000000000001', 'via2_linha_digitavel', 'Linha Digitável', 'linha_digitavel', '[70, 160, 205, 164]', 'courier', 9, true, 'right', null, false, true, 101, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_local_pagamento', 'Local de Pagamento', 'local_pagamento', '[5, 170, 145, 176]', 'helvetica', 7, false, 'left', null, false, false, 110, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_data_vencimento', 'Vencimento', 'data_vencimento', '[147, 170, 205, 176]', 'helvetica', 10, true, 'right', null, false, false, 111, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_beneficiario_nome', 'Beneficiário', 'beneficiario_nome', '[5, 180, 145, 186]', 'helvetica', 8, false, 'left', null, false, false, 120, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_agencia_codigo', 'Agência/Código Beneficiário', 'agencia_codigo', '[147, 180, 205, 186]', 'helvetica', 9, false, 'right', null, false, false, 121, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_data_documento', 'Data do Documento', 'data_emissao', '[5, 192, 35, 197]', 'helvetica', 8, false, 'center', 'date_ddmmyyyy', false, false, 130, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_numero_documento', 'Nº do Documento', 'numero_documento', '[37, 192, 82, 197]', 'helvetica', 8, false, 'left', null, false, false, 131, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_especie_documento', 'Espécie Doc.', 'especie_documento', '[84, 192, 100, 197]', 'helvetica', 8, false, 'center', null, false, false, 132, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_aceite', 'Aceite', 'aceite', '[102, 192, 115, 197]', 'helvetica', 8, false, 'center', null, false, false, 133, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_data_processamento', 'Data Processamento', 'data_processamento', '[117, 192, 145, 197]', 'helvetica', 8, false, 'center', 'date_ddmmyyyy', false, false, 134, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_nosso_numero', 'Nosso Número', 'nosso_numero', '[147, 192, 205, 197]', 'helvetica', 9, true, 'right', null, false, false, 135, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_uso_banco', 'Uso do Banco', 'uso_banco', '[5, 202, 35, 207]', 'helvetica', 8, false, 'center', null, false, false, 140, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_carteira', 'Carteira', 'carteira', '[37, 202, 55, 207]', 'helvetica', 8, false, 'center', null, false, false, 141, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_especie_moeda', 'Espécie', 'especie_moeda', '[57, 202, 75, 207]', 'helvetica', 8, false, 'center', null, false, false, 142, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_quantidade', 'Quantidade', 'quantidade', '[77, 202, 105, 207]', 'helvetica', 8, false, 'right', null, false, false, 143, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_valor_moeda', 'Valor', 'valor_moeda', '[107, 202, 145, 207]', 'helvetica', 8, false, 'right', null, false, false, 144, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_valor_documento', '(=) Valor do Documento', 'valor_documento', '[147, 202, 205, 207]', 'helvetica', 10, true, 'right', 'currency_ptbr', false, false, 145, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_instrucoes', 'Instruções', 'instrucoes', '[5, 210, 145, 234]', 'helvetica', 7, false, 'left', null, false, false, 150, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_desconto', '(-) Desconto/Abatimento', 'valor_desconto', '[147, 208, 205, 213]', 'helvetica', 8, false, 'right', 'currency_ptbr', false, false, 151, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_outras_deducoes', '(-) Outras deduções', 'outras_deducoes', '[147, 215, 205, 220]', 'helvetica', 8, false, 'right', null, false, false, 152, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_mora_multa', '(+) Mora/Multa', 'mora_multa', '[147, 222, 205, 227]', 'helvetica', 8, false, 'right', null, false, false, 153, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_outros_acrescimos', '(+) Outros acréscimos', 'outros_acrescimos', '[147, 229, 205, 234]', 'helvetica', 8, false, 'right', null, false, false, 154, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_valor_cobrado', '(=) Valor Cobrado', 'valor_cobrado', '[147, 236, 205, 242]', 'helvetica', 10, true, 'right', 'currency_ptbr', false, false, 155, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_beneficiario_endereco', 'Endereço do Beneficiário', 'beneficiario_endereco', '[5, 237, 145, 242]', 'helvetica', 7, false, 'left', null, false, false, 160, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_pagador_nome', 'Pagador', 'pagador_nome', '[5, 248, 155, 254]', 'helvetica', 8, false, 'left', null, false, false, 170, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_pagador_cnpj', 'CPF/CNPJ do Pagador', 'pagador_cnpj', '[157, 248, 205, 254]', 'helvetica', 8, false, 'right', 'mask_cnpj', false, false, 171, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_pagador_endereco', 'Endereço Pagador', 'pagador_endereco', '[5, 255, 155, 260]', 'helvetica', 7, false, 'left', null, false, false, 172, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_pagador_cidade_uf', 'Cidade/UF Pagador', 'pagador_cidade_uf', '[5, 261, 155, 266]', 'helvetica', 7, false, 'left', null, false, false, 173, 1, true, '#000000'),
  ('b0000000-0000-0000-0000-000000000001', 'via2_codigo_barras', 'Código de Barras', 'codigo_barras', '[5, 268, 195, 284]', 'helvetica', 10, false, 'center', null, true, false, 190, 1, true, '#000000');
