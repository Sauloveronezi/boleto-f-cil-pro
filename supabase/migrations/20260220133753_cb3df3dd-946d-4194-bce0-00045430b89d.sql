
-- Tabela para configuração de colunas e filtros da tela Boletos API
CREATE TABLE public.vv_b_boletos_api_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('coluna', 'filtro')),
  chave text NOT NULL,
  label text NOT NULL,
  visivel boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  campo_boleto text, -- campo real na tabela vv_b_boletos_api ou dados_extras
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted character(1),
  data_delete timestamptz,
  usuario_delete_id uuid,
  UNIQUE(tipo, chave)
);

ALTER TABLE public.vv_b_boletos_api_config ENABLE ROW LEVEL SECURITY;

-- Todos podem ler configurações ativas
CREATE POLICY "read_boletos_api_config" ON public.vv_b_boletos_api_config
  FOR SELECT USING (deleted IS NULL);

-- Admin pode inserir
CREATE POLICY "insert_boletos_api_config" ON public.vv_b_boletos_api_config
  FOR INSERT WITH CHECK (
    vv_b_has_role(auth.uid(), 'admin'::vv_b_perfil_usuario)
  );

-- Admin pode atualizar
CREATE POLICY "update_boletos_api_config" ON public.vv_b_boletos_api_config
  FOR UPDATE USING (
    vv_b_has_role(auth.uid(), 'admin'::vv_b_perfil_usuario)
  ) WITH CHECK (
    vv_b_has_role(auth.uid(), 'admin'::vv_b_perfil_usuario)
  );

-- Admin pode deletar
CREATE POLICY "delete_boletos_api_config" ON public.vv_b_boletos_api_config
  FOR DELETE USING (
    vv_b_has_role(auth.uid(), 'admin'::vv_b_perfil_usuario)
  );

-- Inserir configuração padrão de colunas
INSERT INTO public.vv_b_boletos_api_config (tipo, chave, label, visivel, ordem, campo_boleto) VALUES
  ('coluna', 'numero_nota', 'Nº Nota', true, 1, 'numero_nota'),
  ('coluna', 'numero_cobranca', 'Nº Cobrança', true, 2, 'numero_cobranca'),
  ('coluna', 'cliente', 'Cliente', true, 3, 'dyn_nome_do_cliente'),
  ('coluna', 'cnpj', 'CNPJ', true, 4, 'taxnumber1'),
  ('coluna', 'transportadora', 'Transportadora', true, 5, 'dyn_zonatransporte'),
  ('coluna', 'banco', 'Banco', true, 6, 'banco'),
  ('coluna', 'data_emissao', 'Emissão', true, 7, 'data_emissao'),
  ('coluna', 'data_vencimento', 'Vencimento', true, 8, 'data_vencimento'),
  ('coluna', 'valor', 'Valor', true, 9, 'valor'),
  ('coluna', 'status', 'Status', true, 10, 'dados_extras.status_sap');

-- Inserir configuração padrão de filtros
INSERT INTO public.vv_b_boletos_api_config (tipo, chave, label, visivel, ordem, campo_boleto) VALUES
  ('filtro', 'dataEmissaoInicio', 'Data Emissão (De)', true, 1, 'data_emissao'),
  ('filtro', 'dataEmissaoFim', 'Data Emissão (Até)', true, 2, 'data_emissao'),
  ('filtro', 'clienteId', 'Cliente', true, 3, 'cliente_id'),
  ('filtro', 'cnpj', 'CNPJ', true, 4, 'taxnumber1'),
  ('filtro', 'estado', 'Estado', true, 5, 'uf'),
  ('filtro', 'cidade', 'Cidade', true, 6, 'dyn_cidade'),
  ('filtro', 'transportadora', 'Transportadora', true, 7, 'dyn_zonatransporte');
