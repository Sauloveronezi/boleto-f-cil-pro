
-- =============================================
-- Tabela de Templates de Boleto (normalizada)
-- =============================================
CREATE TABLE IF NOT EXISTS public.vv_b_boleto_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_code text,
  layout_version text DEFAULT 'v1',
  background_pdf_url text NOT NULL,
  page_width numeric NOT NULL DEFAULT 210,
  page_height numeric NOT NULL DEFAULT 297,
  requires_calculation boolean DEFAULT true,
  is_default boolean DEFAULT false,
  deleted character(1) DEFAULT NULL,
  usuario_delete_id uuid DEFAULT NULL,
  data_delete timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- Tabela de Campos do Template (normalizada)
-- =============================================
CREATE TABLE IF NOT EXISTS public.vv_b_boleto_template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.vv_b_boleto_templates(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text,
  source_ref text,
  page integer DEFAULT 1,
  bbox jsonb NOT NULL,  -- [x_mm, y_mm, x2_mm, y2_mm]
  font_family text DEFAULT 'helvetica',
  font_size numeric DEFAULT 10,
  bold boolean DEFAULT false,
  align text DEFAULT 'left',
  format text,
  color text DEFAULT '#000000',
  bg_color text,
  is_barcode boolean DEFAULT false,
  is_digitable_line boolean DEFAULT false,
  visible boolean DEFAULT true,
  display_order integer DEFAULT 0,
  deleted character(1) DEFAULT NULL,
  usuario_delete_id uuid DEFAULT NULL,
  data_delete timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boleto_tpl_fields_template ON public.vv_b_boleto_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_boleto_tpl_fields_page ON public.vv_b_boleto_template_fields(page);

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.vv_b_boleto_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vv_b_boleto_template_fields ENABLE ROW LEVEL SECURITY;

-- Templates: leitura para autenticados com deleted IS NULL
CREATE POLICY "read_boleto_templates" ON public.vv_b_boleto_templates
  FOR SELECT USING (deleted IS NULL);

CREATE POLICY "insert_boleto_templates" ON public.vv_b_boleto_templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_boleto_templates" ON public.vv_b_boleto_templates
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "delete_boleto_templates" ON public.vv_b_boleto_templates
  FOR DELETE USING (true);

-- Fields: mesmas regras
CREATE POLICY "read_boleto_template_fields" ON public.vv_b_boleto_template_fields
  FOR SELECT USING (deleted IS NULL);

CREATE POLICY "insert_boleto_template_fields" ON public.vv_b_boleto_template_fields
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_boleto_template_fields" ON public.vv_b_boleto_template_fields
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "delete_boleto_template_fields" ON public.vv_b_boleto_template_fields
  FOR DELETE USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_boleto_templates_updated_at
  BEFORE UPDATE ON public.vv_b_boleto_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boleto_template_fields_updated_at
  BEFORE UPDATE ON public.vv_b_boleto_template_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
