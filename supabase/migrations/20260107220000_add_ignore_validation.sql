-- Adicionar coluna para ignorar validação na tabela de integrações
ALTER TABLE public.vv_b_api_integracoes
ADD COLUMN IF NOT EXISTS ignorar_validacao BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.vv_b_api_integracoes.ignorar_validacao IS 'Se true, permite salvar registros mesmo com falha de validação (campos obrigatórios gerados)';
