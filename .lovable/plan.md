

# Duplicar Template Bradesco como Modelo Universal

## Objetivo
Criar um novo template de boleto "Modelo Universal" baseado no PDF enviado (boletos_341_20260223.pdf), com coordenadas ajustadas, sem textos fixos de banco especifico, e com correcao do codigo de barras na segunda via.

## Etapas

### 1. Copiar o PDF enviado para o projeto
- Copiar `user-uploads://boletos_341_20260223.pdf` para `public/templates/boleto_universal_referencia.pdf`
- Este PDF sera o fundo base do novo template

### 2. Criar arquivo de campos do template universal
- Novo arquivo: `src/data/defaultUniversalTemplateFields.ts`
- Baseado no `defaultBoletoTemplateFields.ts` (Bradesco), com os seguintes ajustes:
  - **local_pagamento**: source_ref sera `local_pagamento` (sem texto fixo hardcoded - o texto generico "PAGAVEL EM QUALQUER BANCO ATE O VENCIMENTO" sera aplicado pelo mapper)
  - Coordenadas recalibradas conforme o PDF enviado (posicoes dos campos no boleto Itau)
  - Via 2 gerada automaticamente com offset Y de 148mm (mesmo padrao)
  - **Codigo de barras da via 2**: o campo `via2_codigo_barras` tera o mesmo `source_ref: 'codigo_barras'` que a via 1, garantindo que o barcode seja renderizado corretamente em ambas as vias sem duplicacao indevida

### 3. Adicionar seed function no hook
- Arquivo: `src/hooks/useBoletoTemplates.ts`
- Novo ID: `b0000000-0000-0000-0000-000000000099` (Universal)
- Nova funcao `useSeedUniversalTemplate()` que:
  - Cria o template com `bank_code: null` (compativel com qualquer banco)
  - `is_default: false`
  - `background_pdf_url: '/templates/boleto_universal_referencia.pdf'`
  - Insere todos os campos do novo arquivo de definicoes

### 4. Atualizar local_pagamento no mapper
- Arquivo: `src/lib/boletoDataMapper.ts`
- Alterar o fallback de `local_pagamento` para usar texto generico quando o banco nao for identificado:
  - Manter mapa por banco para quando o codigo do banco for identificado
  - Default: "PAGAVEL EM QUALQUER BANCO ATE O VENCIMENTO."

### 5. Adicionar botao na tela de Templates
- Arquivo: `src/pages/TemplatesBoleto.tsx`
- Novo botao "Template Universal" ao lado dos existentes (Bradesco e Santander)
- Ao clicar, executa `seedUniversal.mutate()` para criar/atualizar o template

## Detalhes Tecnicos

### Coordenadas ajustadas (Via 1, em mm)
As coordenadas serao calibradas com base no PDF enviado. Os campos principais e suas posicoes estimadas:

| Campo | bbox [x, y, x2, y2] |
|-------|---------------------|
| linha_digitavel | [70, 12, 205, 16] |
| local_pagamento | [5, 21, 145, 27] |
| data_vencimento | [147, 21, 205, 27] |
| beneficiario_nome | [5, 31, 145, 37] |
| agencia_codigo | [147, 31, 205, 37] |
| data_documento | [5, 43, 35, 49] |
| numero_documento | [37, 43, 82, 49] |
| nosso_numero | [147, 43, 205, 49] |
| valor_documento | [147, 53, 205, 59] |
| instrucoes | [5, 62, 145, 89] |
| pagador_nome | [5, 100, 155, 106] |
| codigo_barras | [5, 120, 195, 136] |

### Arquivos alterados
1. **Novo**: `src/data/defaultUniversalTemplateFields.ts` - definicoes de campos
2. **Editado**: `src/hooks/useBoletoTemplates.ts` - nova seed function
3. **Editado**: `src/pages/TemplatesBoleto.tsx` - botao na interface
4. **Editado**: `src/lib/boletoDataMapper.ts` - local_pagamento generico
5. **Copiado**: PDF para `public/templates/boleto_universal_referencia.pdf`

