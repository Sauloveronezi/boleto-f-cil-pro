-- Adicionar coluna para armazenar a documentação automática do layout
ALTER TABLE public.vv_b_modelos_boleto
ADD COLUMN IF NOT EXISTS documentacao_layout TEXT;

COMMENT ON COLUMN public.vv_b_modelos_boleto.documentacao_layout IS 'Documentação gerada automaticamente em Markdown descrevendo o layout processado';
