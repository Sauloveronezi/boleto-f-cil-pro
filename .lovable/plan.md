

# Plano: Separacao Remessa/Retorno, Novos Segmentos e Validacao de Leitura

## Problema Identificado

O importador de layout CNAB atualmente:
- Nao reconhece segmentos de **retorno** (T, U, Y-04) como tipos distintos - mapeia tudo para "detalhe" generico
- Nao separa visualmente campos de **remessa** e **retorno** em abas/secoes diferentes  
- Falta suporte para segmentos Y03, Y53, S como tipos de registro proprios no TypeScript
- Campos de retorno (ex: #282 "Agencia doBeneficiario (Retorno)") aparecem misturados com campos de remessa na mesma aba
- Nao existe validacao de leitura para verificar integridade dos campos importados

## Estrutura do Manual Santander (referencia)

O manual define claramente:

**REMESSA:** Header Arquivo, Header Lote, Segmento P, Q, R, S, Y03, Y53, Trailer Lote, Trailer Arquivo

**RETORNO:** Header Arquivo, Header Lote, Segmento T, U, Y03, Y04, Trailer Lote, Trailer Arquivo

## Alteracoes Planejadas

### 1. Expandir tipos de registro (`src/types/boleto.ts`)

Adicionar novos valores ao tipo `TipoRegistroCNAB`:
- `detalhe_segmento_t` (retorno)
- `detalhe_segmento_u` (retorno)
- `detalhe_segmento_s` (remessa)
- `detalhe_segmento_y03` (remessa/retorno)
- `detalhe_segmento_y53` (remessa)
- `detalhe_segmento_y04` (retorno)
- `detalhe_segmento_y` (generico)

### 2. Corrigir mapeamento de nomes de registro (`src/lib/cnabLayoutExtractor.ts`)

- Atualizar `detectRecordType` para reconhecer segmentos T e U (retorno)
- Atualizar `mapRecordNameToTipoLinha` para mapear corretamente:
  - `DETALHE_T` -> `detalhe_segmento_t`
  - `DETALHE_U` -> `detalhe_segmento_u`
  - `DETALHE_S` -> `detalhe_segmento_s`
  - `DETALHE_Y03` -> `detalhe_segmento_y03`
  - `DETALHE_Y53` -> `detalhe_segmento_y53`
  - `DETALHE_Y04` -> `detalhe_segmento_y04`
- Atualizar `blockToLayoutRecord` para configurar match_keys dos novos segmentos

### 3. Separar remessa e retorno na interface (`src/pages/ImportarLayout.tsx`)

- Reformular `camposPorSegmento` para agrupar por fluxo (remessa/retorno) e segmento
- Adicionar nivel superior de tabs: **REMESSA** | **RETORNO**
- Dentro de cada tab, mostrar os segmentos correspondentes:
  - Remessa: Header Arquivo, Header Lote, P, Q, R, S, Y03, Y53, Trailer Lote, Trailer Arquivo
  - Retorno: Header Arquivo, Header Lote, T, U, Y03, Y04, Trailer Lote, Trailer Arquivo
- Usar sufixo `_REMESSA`/`_RETORNO` dos nomes de registro para classificar

### 4. Validacao de leitura (`src/lib/cnabLayoutExtractor.ts` e `src/pages/ImportarLayout.tsx`)

Adicionar funcao `validateImportedLayout` que verifica:
- Campos com posicao final > tamanho do registro (240/400)
- Sobreposicao de campos dentro do mesmo segmento
- Gaps nao preenchidos (campos faltantes)
- Campos duplicados (mesma posicao inicio/fim no mesmo segmento)
- Segmentos obrigatorios ausentes (Header, P, Q para remessa; T, U para retorno)
- Total de bytes cobertos vs tamanho do registro

Exibir painel de validacao na UI com:
- Indicadores verde/amarelo/vermelho por segmento
- Lista de avisos e erros encontrados
- Contagem de campos por segmento

### 5. Salvar informacao de fluxo (`src/pages/ImportarLayout.tsx`)

Ao salvar o padrao CNAB, incluir metadado `fluxo: 'remessa' | 'retorno' | 'ambos'` no campo de cada registro para que ao gerar/ler arquivos futuramente o sistema saiba quais campos usar.

## Detalhes Tecnicos

### Arquivos modificados:
1. **`src/types/boleto.ts`** - Expandir `TipoRegistroCNAB` com novos segmentos
2. **`src/lib/cnabLayoutExtractor.ts`** - Corrigir `detectRecordType`, `mapRecordNameToTipoLinha`, `blockToLayoutRecord`, adicionar `validateImportedLayout`
3. **`src/pages/ImportarLayout.tsx`** - Reestruturar tabs com nivel remessa/retorno, adicionar painel de validacao
4. **`src/components/cnab/CnabTextEditor.tsx`** - Verificar compatibilidade com novos TipoLinha (TipoLinha = TipoRegistroCNAB, entao herda automaticamente)

### Compatibilidade:
- `TipoLinha` eh alias de `TipoRegistroCNAB`, entao expandir o tipo base atualiza automaticamente todas as referencias
- Campos existentes salvos com tipos antigos continuam funcionando (retrocompativel)
- A funcao `mapTipoRegistroParaTipoLinha` em ImportarLayout precisa ser atualizada para os novos tipos

