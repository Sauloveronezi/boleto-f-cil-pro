-- 1) Storage bucket for PDF templates
insert into storage.buckets (id, name, public)
values ('boleto_templates', 'boleto_templates', false)
on conflict (id) do nothing;

-- 2) Storage policies (authenticated users)
-- NOTE: policies are idempotent via DO blocks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_read_boleto_templates'
  ) THEN
    CREATE POLICY authenticated_read_boleto_templates
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'boleto_templates' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_insert_boleto_templates'
  ) THEN
    CREATE POLICY authenticated_insert_boleto_templates
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'boleto_templates' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_update_boleto_templates'
  ) THEN
    CREATE POLICY authenticated_update_boleto_templates
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'boleto_templates' AND auth.role() = 'authenticated')
    WITH CHECK (bucket_id = 'boleto_templates' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'authenticated_delete_boleto_templates'
  ) THEN
    CREATE POLICY authenticated_delete_boleto_templates
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'boleto_templates' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 3) Add columns to store PDF reference (never store base64)
ALTER TABLE public.vv_b_modelos_boleto
  ADD COLUMN IF NOT EXISTS pdf_storage_bucket text NULL DEFAULT 'boleto_templates',
  ADD COLUMN IF NOT EXISTS pdf_storage_path text NULL;