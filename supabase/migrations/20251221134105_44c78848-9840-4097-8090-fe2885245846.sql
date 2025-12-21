-- Tabela para mapeamento de campos entre API e tabela de destino
CREATE TABLE public.vv_b_api_mapeamento_campos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integracao_id uuid REFERENCES public.vv_b_api_integracoes(id) ON DELETE CASCADE,
  campo_api text NOT NULL,
  campo_destino text NOT NULL,
  tipo_dado text DEFAULT 'string',
  obrigatorio boolean DEFAULT false,
  valor_padrao text,
  transformacao text,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted character(1),
  data_delete timestamp with time zone,
  usuario_delete_id uuid,
  UNIQUE(integracao_id, campo_api)
);

-- Enable RLS
ALTER TABLE public.vv_b_api_mapeamento_campos ENABLE ROW LEVEL SECURITY;

-- Policies for mapeamento
CREATE POLICY "public_read_mapeamento" ON public.vv_b_api_mapeamento_campos
  FOR SELECT USING (deleted IS NULL);

CREATE POLICY "admin_full_mapeamento" ON public.vv_b_api_mapeamento_campos
  FOR ALL USING (vv_b_has_role(auth.uid(), 'admin'))
  WITH CHECK (vv_b_has_role(auth.uid(), 'admin'));

CREATE POLICY "operador_crud_mapeamento" ON public.vv_b_api_mapeamento_campos
  FOR ALL USING (deleted IS NULL AND vv_b_has_role(auth.uid(), 'operador'))
  WITH CHECK (vv_b_has_role(auth.uid(), 'operador'));

-- Trigger para updated_at
CREATE TRIGGER update_mapeamento_updated_at
  BEFORE UPDATE ON public.vv_b_api_mapeamento_campos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campo para path do JSON na resposta da API
ALTER TABLE public.vv_b_api_integracoes ADD COLUMN IF NOT EXISTS json_path text DEFAULT 'd.results';

-- Adicionar campo para vincular modelo de boleto à integração
ALTER TABLE public.vv_b_api_integracoes ADD COLUMN IF NOT EXISTS modelo_boleto_id uuid REFERENCES public.vv_b_modelos_boleto(id);

-- Inserir mapeamentos padrão para a integração SAP existente
INSERT INTO public.vv_b_api_mapeamento_campos (integracao_id, campo_api, campo_destino, tipo_dado, obrigatorio, ordem) 
SELECT 
  i.id,
  campos.campo_api,
  campos.campo_destino,
  campos.tipo_dado,
  campos.obrigatorio,
  campos.ordem
FROM public.vv_b_api_integracoes i
CROSS JOIN (
  VALUES 
    ('PaymentDocument', 'numero_cobranca', 'string', true, 1),
    ('Customer', 'cliente_cnpj', 'string', true, 2),
    ('PaymentDueDate', 'data_vencimento', 'date', false, 3),
    ('PaymentAmountInPaytCurrency', 'valor', 'number', false, 4)
) AS campos(campo_api, campo_destino, tipo_dado, obrigatorio, ordem)
WHERE i.nome = 'SAP Boletos'
ON CONFLICT (integracao_id, campo_api) DO NOTHING;