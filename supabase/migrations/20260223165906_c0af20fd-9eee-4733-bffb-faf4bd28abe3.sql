CREATE TABLE IF NOT EXISTS public.vv_b_empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  site TEXT,
  logo_url TEXT,
  deleted TEXT,
  data_delete TIMESTAMPTZ,
  usuario_delete_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vv_b_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.vv_b_empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.vv_b_empresas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.vv_b_empresas FOR UPDATE TO authenticated USING (true);
