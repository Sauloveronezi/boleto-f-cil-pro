-- Tabela para configurações de integração API
CREATE TABLE public.vv_b_api_integracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'SAP', -- SAP, REST, etc
  endpoint_base TEXT,
  modo_demo BOOLEAN DEFAULT true,
  campos_chave TEXT[] DEFAULT ARRAY['numero_nota', 'cliente_id', 'numero_cobranca']::TEXT[],
  headers_autenticacao JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT true,
  ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted CHARACTER(1),
  usuario_delete_id UUID,
  data_delete TIMESTAMP WITH TIME ZONE
);

-- Tabela para dados vindos da API de boletos (colunas dinâmicas via JSONB)
CREATE TABLE public.vv_b_boletos_api (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integracao_id UUID REFERENCES public.vv_b_api_integracoes(id),
  -- Campos chave para evitar duplicatas
  numero_nota TEXT NOT NULL,
  cliente_id UUID REFERENCES public.vv_b_clientes(id),
  numero_cobranca TEXT NOT NULL,
  -- Campos estruturados
  data_emissao DATE,
  data_vencimento DATE,
  valor NUMERIC(15,2),
  -- Dados extras da API (flexível para novas colunas)
  dados_extras JSONB DEFAULT '{}'::jsonb,
  -- Metadados
  sincronizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted CHARACTER(1),
  usuario_delete_id UUID,
  data_delete TIMESTAMP WITH TIME ZONE,
  -- Constraint para chave única
  CONSTRAINT vv_b_boletos_api_unique_key UNIQUE(numero_nota, cliente_id, numero_cobranca)
);

-- Tabela para log de sincronizações
CREATE TABLE public.vv_b_api_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integracao_id UUID REFERENCES public.vv_b_api_integracoes(id),
  status TEXT NOT NULL, -- 'sucesso', 'erro', 'parcial'
  registros_processados INTEGER DEFAULT 0,
  registros_novos INTEGER DEFAULT 0,
  registros_atualizados INTEGER DEFAULT 0,
  erros JSONB DEFAULT '[]'::jsonb,
  duracao_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vv_b_api_integracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vv_b_boletos_api ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vv_b_api_sync_log ENABLE ROW LEVEL SECURITY;

-- Policies para leitura pública
CREATE POLICY "public_read_api_integracoes" ON public.vv_b_api_integracoes
FOR SELECT USING (deleted IS NULL);

CREATE POLICY "public_read_boletos_api" ON public.vv_b_boletos_api
FOR SELECT USING (deleted IS NULL);

CREATE POLICY "public_read_sync_log" ON public.vv_b_api_sync_log
FOR SELECT USING (true);

-- Policies para admin/operador
CREATE POLICY "admin_full_api_integracoes" ON public.vv_b_api_integracoes
FOR ALL USING (vv_b_has_role(auth.uid(), 'admin')) WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_api_integracoes" ON public.vv_b_api_integracoes
FOR ALL USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador')) 
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "admin_full_boletos_api" ON public.vv_b_boletos_api
FOR ALL USING (vv_b_has_role(auth.uid(), 'admin')) WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_boletos_api" ON public.vv_b_boletos_api
FOR ALL USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador')) 
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "admin_full_sync_log" ON public.vv_b_api_sync_log
FOR ALL USING (vv_b_has_role(auth.uid(), 'admin')) WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_insert_sync_log" ON public.vv_b_api_sync_log
FOR INSERT WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

-- Trigger para updated_at
CREATE TRIGGER update_vv_b_api_integracoes_updated_at
BEFORE UPDATE ON public.vv_b_api_integracoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vv_b_boletos_api_updated_at
BEFORE UPDATE ON public.vv_b_boletos_api
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão de integração SAP
INSERT INTO public.vv_b_api_integracoes (nome, tipo, modo_demo, campos_chave)
VALUES ('Integração SAP', 'SAP', true, ARRAY['numero_nota', 'cliente_id', 'numero_cobranca']);