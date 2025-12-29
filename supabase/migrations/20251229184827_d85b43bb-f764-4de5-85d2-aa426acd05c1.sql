-- Adicionar colunas de dimensões de página na tabela vv_b_modelos_boleto
ALTER TABLE public.vv_b_modelos_boleto
ADD COLUMN IF NOT EXISTS largura_pagina numeric DEFAULT 210,
ADD COLUMN IF NOT EXISTS altura_pagina numeric DEFAULT 297,
ADD COLUMN IF NOT EXISTS formato_pagina text DEFAULT 'A4';

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.vv_b_modelos_boleto.largura_pagina IS 'Largura da página em milímetros';
COMMENT ON COLUMN public.vv_b_modelos_boleto.altura_pagina IS 'Altura da página em milímetros';
COMMENT ON COLUMN public.vv_b_modelos_boleto.formato_pagina IS 'Formato da página: A4, BOLETO, CARTA, CUSTOM, ou PDF (detectado)';