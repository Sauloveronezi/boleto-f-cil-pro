-- Adicionar coluna json_original na tabela de boletos
ALTER TABLE public.vv_b_boletos_api 
ADD COLUMN IF NOT EXISTS json_original jsonb DEFAULT NULL;

-- Criar tabela para registros não importados/com erro
CREATE TABLE IF NOT EXISTS public.vv_b_boletos_api_erros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integracao_id uuid REFERENCES public.vv_b_api_integracoes(id),
  json_original jsonb NOT NULL,
  tipo_erro text NOT NULL,
  mensagem_erro text NOT NULL,
  campo_erro text,
  valor_erro text,
  tentativas integer DEFAULT 1,
  resolvido boolean DEFAULT false,
  resolvido_em timestamp with time zone,
  resolvido_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted character(1),
  data_delete timestamp with time zone,
  usuario_delete_id uuid
);

-- Habilitar RLS
ALTER TABLE public.vv_b_boletos_api_erros ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "allow_read_boletos_erros" ON public.vv_b_boletos_api_erros
  FOR SELECT USING (deleted IS NULL);

CREATE POLICY "allow_insert_boletos_erros" ON public.vv_b_boletos_api_erros
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_update_boletos_erros" ON public.vv_b_boletos_api_erros
  FOR UPDATE USING (deleted IS NULL) WITH CHECK (true);

CREATE POLICY "allow_delete_boletos_erros" ON public.vv_b_boletos_api_erros
  FOR DELETE USING (deleted IS NULL);

-- Trigger para updated_at
CREATE TRIGGER update_vv_b_boletos_api_erros_updated_at
  BEFORE UPDATE ON public.vv_b_boletos_api_erros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_boletos_api_erros_integracao ON public.vv_b_boletos_api_erros(integracao_id);
CREATE INDEX IF NOT EXISTS idx_boletos_api_erros_tipo ON public.vv_b_boletos_api_erros(tipo_erro);
CREATE INDEX IF NOT EXISTS idx_boletos_api_erros_resolvido ON public.vv_b_boletos_api_erros(resolvido) WHERE resolvido = false;

COMMENT ON TABLE public.vv_b_boletos_api_erros IS 'Registros da API que falharam na importação';
COMMENT ON COLUMN public.vv_b_boletos_api_erros.tipo_erro IS 'Tipo do erro: validacao, duplicado, cliente_nao_encontrado, etc';
COMMENT ON COLUMN public.vv_b_boletos_api_erros.campo_erro IS 'Campo específico que causou o erro, se aplicável';