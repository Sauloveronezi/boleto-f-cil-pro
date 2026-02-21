
-- Table to store configurable boleto field mappings (source field -> boleto variable)
CREATE TABLE IF NOT EXISTS public.vv_b_boleto_campo_mapeamento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campo_boleto text NOT NULL, -- target variable name in boleto template (e.g. pagador_nome)
  label text NOT NULL, -- human-readable label (e.g. "Nome do Pagador")
  fonte_campo text NOT NULL, -- source field path (e.g. dyn_nome_do_cliente, dados_extras.BankInternalID)
  tipo_transformacao text DEFAULT 'direto', -- direto, ultimos_N, soma, concatenar
  parametros jsonb DEFAULT '{}', -- extra params for transformation (e.g. {"caracteres": 4})
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted character(1) DEFAULT NULL,
  data_delete timestamptz DEFAULT NULL,
  usuario_delete_id uuid DEFAULT NULL
);

ALTER TABLE public.vv_b_boleto_campo_mapeamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_boleto_campo_map" ON public.vv_b_boleto_campo_mapeamento
  FOR SELECT USING (deleted IS NULL);

CREATE POLICY "insert_boleto_campo_map" ON public.vv_b_boleto_campo_mapeamento
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_boleto_campo_map" ON public.vv_b_boleto_campo_mapeamento
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "delete_boleto_campo_map" ON public.vv_b_boleto_campo_mapeamento
  FOR DELETE USING (true);

-- Seed default mappings
INSERT INTO public.vv_b_boleto_campo_mapeamento (campo_boleto, label, fonte_campo, tipo_transformacao, parametros, ordem) VALUES
  ('pagador_nome', 'Nome do Pagador', 'dyn_nome_do_cliente', 'direto', '{}', 1),
  ('pagador_cnpj', 'CNPJ/CPF Pagador', 'taxnumber1', 'direto', '{}', 2),
  ('pagador_endereco', 'Endereço Pagador', 'endereco', 'direto', '{}', 3),
  ('pagador_cidade_uf', 'Cidade/UF Pagador', 'dyn_cidade', 'concatenar', '{"separador": "/", "campos": ["dyn_cidade", "uf"]}', 4),
  ('pagador_cep', 'CEP Pagador', 'cep', 'direto', '{}', 5),
  ('numero_documento', 'Nº Documento', 'numero_nota', 'direto', '{}', 6),
  ('nosso_numero', 'Nosso Número', 'numero_cobranca', 'direto', '{}', 7),
  ('data_vencimento', 'Data Vencimento', 'data_vencimento', 'direto', '{}', 8),
  ('data_emissao', 'Data Emissão', 'data_emissao', 'direto', '{}', 9),
  ('valor_documento', 'Valor Documento', 'valor', 'soma', '{"campos": ["valor", "valor_desconto"]}', 10),
  ('valor_cobrado', 'Valor Cobrado', 'valor', 'direto', '{}', 11),
  ('valor_desconto', 'Valor Desconto', 'valor_desconto', 'direto', '{}', 12),
  ('agencia_codigo', 'Agência/Código Beneficiário', 'banco', 'concatenar', '{"formato": "{banco_last4} / {BankAccountLongID}-{bankcontrolkey}"}', 13),
  ('banco_codigo', 'Código Banco', 'banco', 'ultimos_N', '{"caracteres": 3, "posicao": "inicio"}', 14),
  ('carteira', 'Carteira', 'carteira', 'direto', '{"padrao": "109"}', 15);
