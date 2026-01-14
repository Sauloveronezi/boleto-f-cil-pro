CREATE TABLE IF NOT EXISTS vv_b_boleto_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_code text,
  layout_version text,
  background_pdf_url text NOT NULL,
  page_width numeric NOT NULL,
  page_height numeric NOT NULL,
  requires_calculation boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vv_b_boleto_template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES vv_b_boleto_templates(id) ON DELETE CASCADE,
  key text NOT NULL,
  source_ref text,
  page integer DEFAULT 1,
  bbox jsonb NOT NULL,
  font_family text DEFAULT 'helvetica',
  font_size numeric DEFAULT 10,
  align text DEFAULT 'left',
  format text,
  is_barcode boolean DEFAULT false,
  is_digitable_line boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boleto_template_fields_template ON vv_b_boleto_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_boleto_template_fields_page ON vv_b_boleto_template_fields(page);
