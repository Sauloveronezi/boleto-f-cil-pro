-- Tabela para arquivos CNAB lidos/processados
CREATE TABLE public.vv_b_arquivos_cnab_lidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL CHECK (tipo_arquivo IN ('remessa', 'retorno')),
  tipo_cnab TEXT NOT NULL CHECK (tipo_cnab IN ('CNAB_240', 'CNAB_400')),
  banco_id UUID REFERENCES public.vv_b_bancos(id),
  configuracao_cnab_id UUID REFERENCES public.vv_b_configuracoes_cnab(id),
  conteudo_original TEXT NOT NULL,
  dados_parseados JSONB NOT NULL DEFAULT '{}',
  total_registros INTEGER DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  data_processamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'processado' CHECK (status IN ('processado', 'editado', 'exportado')),
  usuario_id UUID REFERENCES auth.users(id),
  deleted CHAR(1),
  usuario_delete_id UUID,
  data_delete TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para linhas editadas de arquivos CNAB
CREATE TABLE public.vv_b_linhas_cnab (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_cnab_id UUID REFERENCES public.vv_b_arquivos_cnab_lidos(id) ON DELETE CASCADE NOT NULL,
  numero_linha INTEGER NOT NULL,
  tipo_registro TEXT,
  conteudo_original TEXT NOT NULL,
  conteudo_editado TEXT,
  campos_extraidos JSONB DEFAULT '{}',
  campos_editados JSONB,
  status TEXT DEFAULT 'original' CHECK (status IN ('original', 'editado', 'removido', 'adicionado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_arquivos_cnab_banco ON public.vv_b_arquivos_cnab_lidos(banco_id);
CREATE INDEX idx_arquivos_cnab_config ON public.vv_b_arquivos_cnab_lidos(configuracao_cnab_id);
CREATE INDEX idx_arquivos_cnab_status ON public.vv_b_arquivos_cnab_lidos(status);
CREATE INDEX idx_arquivos_cnab_deleted ON public.vv_b_arquivos_cnab_lidos(deleted);
CREATE INDEX idx_linhas_cnab_arquivo ON public.vv_b_linhas_cnab(arquivo_cnab_id);
CREATE INDEX idx_linhas_cnab_tipo ON public.vv_b_linhas_cnab(tipo_registro);

-- Enable RLS
ALTER TABLE public.vv_b_arquivos_cnab_lidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vv_b_linhas_cnab ENABLE ROW LEVEL SECURITY;

-- Policies para vv_b_arquivos_cnab_lidos
CREATE POLICY "allow_read_arquivos_cnab"
ON public.vv_b_arquivos_cnab_lidos
FOR SELECT TO authenticated
USING (deleted IS NULL);

CREATE POLICY "allow_insert_arquivos_cnab"
ON public.vv_b_arquivos_cnab_lidos
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_update_arquivos_cnab"
ON public.vv_b_arquivos_cnab_lidos
FOR UPDATE TO authenticated
USING (deleted IS NULL)
WITH CHECK (true);

CREATE POLICY "allow_delete_arquivos_cnab"
ON public.vv_b_arquivos_cnab_lidos
FOR DELETE TO authenticated
USING (deleted IS NULL);

-- Policies para vv_b_linhas_cnab
CREATE POLICY "allow_read_linhas_cnab"
ON public.vv_b_linhas_cnab
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "allow_insert_linhas_cnab"
ON public.vv_b_linhas_cnab
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_update_linhas_cnab"
ON public.vv_b_linhas_cnab
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_delete_linhas_cnab"
ON public.vv_b_linhas_cnab
FOR DELETE TO authenticated
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_arquivos_cnab_updated_at
BEFORE UPDATE ON public.vv_b_arquivos_cnab_lidos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_linhas_cnab_updated_at
BEFORE UPDATE ON public.vv_b_linhas_cnab
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar tipo_arquivo à tabela de configurações CNAB existente
ALTER TABLE public.vv_b_configuracoes_cnab 
ADD COLUMN IF NOT EXISTS tipo_arquivo TEXT DEFAULT 'ambos' 
CHECK (tipo_arquivo IN ('remessa', 'retorno', 'ambos'));