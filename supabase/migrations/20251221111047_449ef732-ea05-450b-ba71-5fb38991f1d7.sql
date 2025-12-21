-- ============================================
-- MIGRAÇÃO: Tabelas do Sistema de Boletos
-- Prefixo: vv_b_
-- Soft Delete: deleted, usuario_delete_id, data_delete
-- ============================================

-- 1. CRIAR ENUM DE PERFIS
CREATE TYPE vv_b_perfil_usuario AS ENUM ('admin', 'operador', 'visualizador');

-- 2. TABELA DE ROLES (padrão de segurança recomendado)
CREATE TABLE vv_b_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role vv_b_perfil_usuario NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL,
  UNIQUE (user_id, role)
);

-- 3. FUNÇÃO SECURITY DEFINER PARA VERIFICAR ROLES (evita recursão RLS)
CREATE OR REPLACE FUNCTION vv_b_has_role(_user_id UUID, _role vv_b_perfil_usuario)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vv_b_user_roles
    WHERE user_id = _user_id 
      AND role = _role 
      AND deleted IS NULL
  )
$$;

-- 4. TABELA DE EMPRESAS (Cedentes/Beneficiários)
CREATE TABLE vv_b_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL UNIQUE,
  inscricao_estadual TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado CHAR(2),
  cep TEXT,
  telefone TEXT,
  email TEXT,
  site TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL
);

-- 5. TABELA DE BANCOS
CREATE TABLE vv_b_bancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_banco CHAR(3) NOT NULL UNIQUE,
  nome_banco TEXT NOT NULL,
  tipo_layout_padrao TEXT DEFAULT 'CNAB_400' CHECK (tipo_layout_padrao IN ('CNAB_240', 'CNAB_400')),
  logo_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL
);

-- 6. TABELA DE CONFIGURAÇÕES POR BANCO
CREATE TABLE vv_b_configuracoes_banco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID REFERENCES vv_b_bancos(id) ON DELETE CASCADE NOT NULL,
  taxa_juros_mensal NUMERIC(5,4) DEFAULT 0,
  multa_percentual NUMERIC(5,2) DEFAULT 0,
  dias_carencia INTEGER DEFAULT 0,
  texto_instrucao_padrao TEXT,
  carteira TEXT,
  agencia TEXT,
  conta TEXT,
  codigo_cedente TEXT,
  convenio TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL
);

-- 7. TABELA DE CLIENTES (Sacados)
CREATE TABLE vv_b_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_partner TEXT,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  lzone TEXT,
  estado CHAR(2),
  cidade TEXT,
  parceiro_negocio TEXT,
  agente_frete TEXT,
  endereco TEXT,
  cep TEXT,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL
);

-- 8. TABELA DE NOTAS FISCAIS
CREATE TABLE vv_b_notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES vv_b_clientes(id) ON DELETE CASCADE NOT NULL,
  numero_nota TEXT NOT NULL,
  serie TEXT,
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  valor_titulo NUMERIC(15,2) NOT NULL,
  moeda TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'liquidada', 'cancelada', 'vencida')),
  referencia_interna TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL
);

-- 9. TABELA DE TEMPLATES PDF
CREATE TABLE vv_b_templates_pdf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  arquivo_base64 TEXT,
  preview_url TEXT,
  largura_pagina NUMERIC,
  altura_pagina NUMERIC,
  areas_texto JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL
);

-- 10. TABELA DE MODELOS DE BOLETO (com PDF de exemplo)
CREATE TABLE vv_b_modelos_boleto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_modelo TEXT NOT NULL,
  banco_id UUID REFERENCES vv_b_bancos(id),
  bancos_compativeis UUID[] DEFAULT '{}',
  tipo_layout TEXT DEFAULT 'CNAB_400' CHECK (tipo_layout IN ('CNAB_240', 'CNAB_400')),
  padrao BOOLEAN DEFAULT false,
  campos_mapeados JSONB DEFAULT '[]'::jsonb,
  texto_instrucoes TEXT,
  template_pdf_id UUID REFERENCES vv_b_templates_pdf(id),
  pdf_exemplo_base64 TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL
);

-- 11. TABELA DE CONFIGURAÇÕES CNAB
CREATE TABLE vv_b_configuracoes_cnab (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco_id UUID REFERENCES vv_b_bancos(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_cnab TEXT NOT NULL CHECK (tipo_cnab IN ('CNAB_240', 'CNAB_400')),
  linhas JSONB DEFAULT '[]'::jsonb,
  campos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL
);

-- 12. TABELA DE BOLETOS GERADOS
CREATE TABLE vv_b_boletos_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID REFERENCES vv_b_notas_fiscais(id),
  modelo_boleto_id UUID REFERENCES vv_b_modelos_boleto(id),
  banco_id UUID REFERENCES vv_b_bancos(id) NOT NULL,
  nosso_numero TEXT,
  linha_digitavel TEXT,
  codigo_barras TEXT,
  valor NUMERIC(15,2),
  data_vencimento DATE,
  data_geracao TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'gerado' CHECK (status IN ('gerado', 'registrado', 'pago', 'cancelado')),
  pdf_gerado_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted CHAR(1) NULL,
  usuario_delete_id UUID NULL,
  data_delete TIMESTAMPTZ NULL
);

-- ============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE vv_b_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vv_b_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vv_b_bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vv_b_configuracoes_banco ENABLE ROW LEVEL SECURITY;
ALTER TABLE vv_b_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vv_b_notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE vv_b_templates_pdf ENABLE ROW LEVEL SECURITY;
ALTER TABLE vv_b_modelos_boleto ENABLE ROW LEVEL SECURITY;
ALTER TABLE vv_b_configuracoes_cnab ENABLE ROW LEVEL SECURITY;
ALTER TABLE vv_b_boletos_gerados ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS POR PERFIL
-- ============================================

-- vv_b_user_roles: Admin pode gerenciar, outros podem ler seus próprios
CREATE POLICY "admin_manage_roles" ON vv_b_user_roles
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "users_read_own_role" ON vv_b_user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() AND deleted IS NULL);

-- POLÍTICAS PARA vv_b_empresas
CREATE POLICY "admin_full_empresas" ON vv_b_empresas
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_empresas" ON vv_b_empresas
FOR ALL TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "visualizador_read_empresas" ON vv_b_empresas
FOR SELECT TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'visualizador'));

-- POLÍTICAS PARA vv_b_bancos
CREATE POLICY "admin_full_bancos" ON vv_b_bancos
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_bancos" ON vv_b_bancos
FOR ALL TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "visualizador_read_bancos" ON vv_b_bancos
FOR SELECT TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'visualizador'));

-- POLÍTICAS PARA vv_b_configuracoes_banco
CREATE POLICY "admin_full_config_banco" ON vv_b_configuracoes_banco
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_config_banco" ON vv_b_configuracoes_banco
FOR ALL TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "visualizador_read_config_banco" ON vv_b_configuracoes_banco
FOR SELECT TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'visualizador'));

-- POLÍTICAS PARA vv_b_clientes
CREATE POLICY "admin_full_clientes" ON vv_b_clientes
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_clientes" ON vv_b_clientes
FOR ALL TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "visualizador_read_clientes" ON vv_b_clientes
FOR SELECT TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'visualizador'));

-- POLÍTICAS PARA vv_b_notas_fiscais
CREATE POLICY "admin_full_notas" ON vv_b_notas_fiscais
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_notas" ON vv_b_notas_fiscais
FOR ALL TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "visualizador_read_notas" ON vv_b_notas_fiscais
FOR SELECT TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'visualizador'));

-- POLÍTICAS PARA vv_b_templates_pdf
CREATE POLICY "admin_full_templates" ON vv_b_templates_pdf
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_templates" ON vv_b_templates_pdf
FOR ALL TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "visualizador_read_templates" ON vv_b_templates_pdf
FOR SELECT TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'visualizador'));

-- POLÍTICAS PARA vv_b_modelos_boleto
CREATE POLICY "admin_full_modelos" ON vv_b_modelos_boleto
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_modelos" ON vv_b_modelos_boleto
FOR ALL TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "visualizador_read_modelos" ON vv_b_modelos_boleto
FOR SELECT TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'visualizador'));

-- POLÍTICAS PARA vv_b_configuracoes_cnab
CREATE POLICY "admin_full_cnab" ON vv_b_configuracoes_cnab
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_cnab" ON vv_b_configuracoes_cnab
FOR ALL TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "visualizador_read_cnab" ON vv_b_configuracoes_cnab
FOR SELECT TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'visualizador'));

-- POLÍTICAS PARA vv_b_boletos_gerados
CREATE POLICY "admin_full_boletos" ON vv_b_boletos_gerados
FOR ALL TO authenticated
USING (vv_b_has_role(auth.uid(), 'admin'))
WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_boletos" ON vv_b_boletos_gerados
FOR ALL TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

CREATE POLICY "visualizador_read_boletos" ON vv_b_boletos_gerados
FOR SELECT TO authenticated
USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'visualizador'));

-- ============================================
-- TRIGGERS PARA ATUALIZAR updated_at
-- ============================================

CREATE TRIGGER update_vv_b_empresas_updated_at BEFORE UPDATE ON vv_b_empresas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vv_b_bancos_updated_at BEFORE UPDATE ON vv_b_bancos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vv_b_configuracoes_banco_updated_at BEFORE UPDATE ON vv_b_configuracoes_banco
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vv_b_clientes_updated_at BEFORE UPDATE ON vv_b_clientes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vv_b_notas_fiscais_updated_at BEFORE UPDATE ON vv_b_notas_fiscais
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vv_b_templates_pdf_updated_at BEFORE UPDATE ON vv_b_templates_pdf
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vv_b_modelos_boleto_updated_at BEFORE UPDATE ON vv_b_modelos_boleto
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vv_b_configuracoes_cnab_updated_at BEFORE UPDATE ON vv_b_configuracoes_cnab
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vv_b_boletos_gerados_updated_at BEFORE UPDATE ON vv_b_boletos_gerados
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_vv_b_user_roles_user_id ON vv_b_user_roles(user_id);
CREATE INDEX idx_vv_b_clientes_cnpj ON vv_b_clientes(cnpj);
CREATE INDEX idx_vv_b_notas_fiscais_cliente_id ON vv_b_notas_fiscais(cliente_id);
CREATE INDEX idx_vv_b_notas_fiscais_status ON vv_b_notas_fiscais(status) WHERE deleted IS NULL;
CREATE INDEX idx_vv_b_boletos_gerados_nota_id ON vv_b_boletos_gerados(nota_fiscal_id);
CREATE INDEX idx_vv_b_boletos_gerados_banco_id ON vv_b_boletos_gerados(banco_id);
CREATE INDEX idx_vv_b_configuracoes_cnab_banco_id ON vv_b_configuracoes_cnab(banco_id);