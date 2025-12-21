-- Inserir dados iniciais (seed data)
-- Usando função security definer para bypass de RLS

-- 1. BANCOS
INSERT INTO vv_b_bancos (codigo_banco, nome_banco, tipo_layout_padrao, logo_url, ativo) VALUES
  ('001', 'Banco do Brasil', 'CNAB_240', '/placeholder.svg', true),
  ('237', 'Bradesco', 'CNAB_400', '/placeholder.svg', true),
  ('341', 'Itaú Unibanco', 'CNAB_240', '/placeholder.svg', true),
  ('033', 'Santander', 'CNAB_240', '/placeholder.svg', true),
  ('104', 'Caixa Econômica Federal', 'CNAB_240', '/placeholder.svg', true),
  ('748', 'Sicredi', 'CNAB_400', '/placeholder.svg', true);

-- 2. CONFIGURAÇÕES DE BANCO (usando subconsultas para pegar os IDs)
INSERT INTO vv_b_configuracoes_banco (banco_id, taxa_juros_mensal, multa_percentual, dias_carencia, texto_instrucao_padrao, carteira, agencia, conta, codigo_cedente)
SELECT id, 1.0, 2.0, 0, 'Não receber após 30 dias do vencimento. Cobrar juros de 1% ao mês e multa de 2% após o vencimento.', '17', '1234', '56789-0', '123456'
FROM vv_b_bancos WHERE codigo_banco = '001';

INSERT INTO vv_b_configuracoes_banco (banco_id, taxa_juros_mensal, multa_percentual, dias_carencia, texto_instrucao_padrao, carteira, agencia, conta, codigo_cedente)
SELECT id, 1.5, 2.0, 1, 'Após vencimento, cobrar multa de 2% e juros de 1,5% ao mês.', '09', '5678', '12345-6', '789012'
FROM vv_b_bancos WHERE codigo_banco = '237';

INSERT INTO vv_b_configuracoes_banco (banco_id, taxa_juros_mensal, multa_percentual, dias_carencia, texto_instrucao_padrao, carteira, agencia, conta, codigo_cedente)
SELECT id, 1.0, 2.0, 0, 'Sr. Caixa, não receber após 60 dias do vencimento.', '109', '9012', '34567-8', '345678'
FROM vv_b_bancos WHERE codigo_banco = '341';

-- 3. CLIENTES
INSERT INTO vv_b_clientes (business_partner, razao_social, cnpj, lzone, estado, cidade, parceiro_negocio, agente_frete, endereco, cep, email, telefone) VALUES
  ('BP001', 'Transportadora ABC Ltda', '12.345.678/0001-90', 'Sudeste', 'SP', 'São Paulo', 'Grupo Logístico Alpha', 'Agente SP-01', 'Av. Paulista, 1000 - Bela Vista', '01310-100', 'contato@transportadoraabc.com.br', '(11) 3456-7890'),
  ('BP002', 'Logística Express S/A', '23.456.789/0001-01', 'Sudeste', 'RJ', 'Rio de Janeiro', 'Rede Express', 'Agente RJ-01', 'Rua do Comércio, 500 - Centro', '20010-020', 'financeiro@logisticaexpress.com.br', '(21) 2345-6789'),
  ('BP003', 'Distribuidora Norte Sul Eireli', '34.567.890/0001-12', 'Sul', 'PR', 'Curitiba', 'Grupo Norte Sul', 'Agente PR-01', 'Av. das Indústrias, 2000 - CIC', '81170-000', 'contato@nortesul.com.br', '(41) 3456-7890'),
  ('BP004', 'Comércio e Transportes Beta ME', '45.678.901/0001-23', 'Nordeste', 'BA', 'Salvador', 'Rede Nordeste', 'Agente BA-01', 'Av. Tancredo Neves, 1500 - Caminho das Árvores', '41820-020', 'beta@transportesbeta.com.br', '(71) 3456-7890'),
  ('BP005', 'Fretes e Cargas Ltda', '56.789.012/0001-34', 'Centro-Oeste', 'GO', 'Goiânia', 'Grupo Centro Brasil', 'Agente GO-01', 'Av. T-63, 500 - Setor Bueno', '74230-100', 'fretescargas@email.com.br', '(62) 3456-7890'),
  ('BP006', 'Amazônia Logística S/A', '67.890.123/0001-45', 'Norte', 'AM', 'Manaus', 'Grupo Amazônia', 'Agente AM-01', 'Av. Djalma Batista, 1000 - Chapada', '69050-010', 'contato@amazonialog.com.br', '(92) 3456-7890'),
  ('BP007', 'MG Transportes e Logística Ltda', '78.901.234/0001-56', 'Sudeste', 'MG', 'Belo Horizonte', 'Grupo Logístico Alpha', 'Agente MG-01', 'Av. do Contorno, 3000 - Funcionários', '30110-017', 'mgtransportes@email.com.br', '(31) 3456-7890'),
  ('BP008', 'RS Cargas e Encomendas S/A', '89.012.345/0001-67', 'Sul', 'RS', 'Porto Alegre', 'Rede Sul', 'Agente RS-01', 'Av. Ipiranga, 5000 - Jardim Botânico', '90610-000', 'rscargas@email.com.br', '(51) 3456-7890');

-- 4. NOTAS FISCAIS (usando IDs dos clientes via subconsulta)
INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000123', '1', '2024-11-15', '2024-12-15', 15750.50, 'BRL', 'aberta', 'REF-2024-001' FROM vv_b_clientes WHERE business_partner = 'BP001';

INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000124', '1', '2024-11-18', '2024-12-18', 8320.00, 'BRL', 'aberta', 'REF-2024-002' FROM vv_b_clientes WHERE business_partner = 'BP001';

INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000125', '1', '2024-11-10', '2024-12-10', 22450.75, 'BRL', 'aberta', 'REF-2024-003' FROM vv_b_clientes WHERE business_partner = 'BP002';

INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000126', '1', '2024-10-20', '2024-11-20', 5680.00, 'BRL', 'vencida', 'REF-2024-004' FROM vv_b_clientes WHERE business_partner = 'BP002';

INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000127', '1', '2024-11-20', '2024-12-20', 31200.00, 'BRL', 'aberta', 'REF-2024-005' FROM vv_b_clientes WHERE business_partner = 'BP003';

INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000128', '1', '2024-11-22', '2024-12-22', 12890.25, 'BRL', 'aberta', 'REF-2024-006' FROM vv_b_clientes WHERE business_partner = 'BP004';

INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000129', '1', '2024-11-05', '2024-12-05', 7540.00, 'BRL', 'aberta', 'REF-2024-007' FROM vv_b_clientes WHERE business_partner = 'BP005';

INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000130', '1', '2024-10-15', '2024-11-15', 18900.00, 'BRL', 'liquidada', 'REF-2024-008' FROM vv_b_clientes WHERE business_partner = 'BP006';

INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000131', '1', '2024-11-25', '2024-12-25', 9870.50, 'BRL', 'aberta', 'REF-2024-009' FROM vv_b_clientes WHERE business_partner = 'BP007';

INSERT INTO vv_b_notas_fiscais (cliente_id, numero_nota, serie, data_emissao, data_vencimento, valor_titulo, moeda, status, referencia_interna)
SELECT id, '000132', '1', '2024-11-28', '2024-12-28', 45320.00, 'BRL', 'aberta', 'REF-2024-010' FROM vv_b_clientes WHERE business_partner = 'BP008';

-- 5. MODELOS DE BOLETO
INSERT INTO vv_b_modelos_boleto (nome_modelo, banco_id, tipo_layout, padrao, campos_mapeados, texto_instrucoes)
SELECT 
  'Modelo Padrão BB',
  id,
  'CNAB_240',
  true,
  '[{"id":"1","nome":"Razão Social","variavel":"{{cliente_razao_social}}","posicao_x":10,"posicao_y":50,"largura":200,"altura":20},{"id":"2","nome":"CNPJ","variavel":"{{cliente_cnpj}}","posicao_x":10,"posicao_y":70,"largura":150,"altura":20},{"id":"3","nome":"Valor","variavel":"{{valor_titulo}}","posicao_x":300,"posicao_y":100,"largura":100,"altura":20},{"id":"4","nome":"Vencimento","variavel":"{{data_vencimento}}","posicao_x":300,"posicao_y":120,"largura":100,"altura":20}]'::jsonb,
  'Não receber após 30 dias do vencimento. Cobrar juros de {{taxa_juros}}% ao mês e multa de {{multa}}% após o vencimento.'
FROM vv_b_bancos WHERE codigo_banco = '001';

INSERT INTO vv_b_modelos_boleto (nome_modelo, banco_id, tipo_layout, padrao, campos_mapeados, texto_instrucoes)
SELECT 
  'Modelo Padrão Bradesco',
  id,
  'CNAB_400',
  true,
  '[{"id":"1","nome":"Razão Social","variavel":"{{cliente_razao_social}}","posicao_x":10,"posicao_y":50,"largura":200,"altura":20},{"id":"2","nome":"CNPJ","variavel":"{{cliente_cnpj}}","posicao_x":10,"posicao_y":70,"largura":150,"altura":20},{"id":"3","nome":"Valor","variavel":"{{valor_titulo}}","posicao_x":300,"posicao_y":100,"largura":100,"altura":20}]'::jsonb,
  'Após vencimento, cobrar multa de {{multa}}% e juros de {{taxa_juros}}% ao mês.'
FROM vv_b_bancos WHERE codigo_banco = '237';

INSERT INTO vv_b_modelos_boleto (nome_modelo, banco_id, tipo_layout, padrao, campos_mapeados, texto_instrucoes)
SELECT 
  'Modelo Corporativo Itaú',
  id,
  'CNAB_240',
  true,
  '[{"id":"1","nome":"Razão Social","variavel":"{{cliente_razao_social}}","posicao_x":10,"posicao_y":50,"largura":200,"altura":20},{"id":"2","nome":"CNPJ","variavel":"{{cliente_cnpj}}","posicao_x":10,"posicao_y":70,"largura":150,"altura":20}]'::jsonb,
  'Sr. Caixa, não receber após 60 dias do vencimento.'
FROM vv_b_bancos WHERE codigo_banco = '341';