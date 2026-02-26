
Objetivo: garantir que a sincronização salve corretamente o retorno da API, elimine duplicação na tabela principal e deixe claro para você por que os 5 itens aparecem como duplicados.

Diagnóstico validado no ambiente atual:
1) A função `sync-api-boletos` está retornando sucesso com `registros_processados=105`, `registros_atualizados=100` e `registros_duplicados=5`.
2) A tabela `public.vv_b_boletos_api` está com 100 registros ativos e sem duplicidade na chave composta atual `(numero_nota, numero_cobranca, documento, paymentrundate)`.
3) A constraint única no banco está correta: `uq_boletos_nota_cobranca_doc_prd`.
4) Os 5 “duplicados” vêm da resposta da API de origem (mesma chave completa), não de duplicação gerada no banco.
5) A UI está desatualizada na mensagem: ainda fala “Nota + Cobrança”, embora o backend já deduplique por 4 campos. Isso passa a impressão de erro.

Plano de correção (implementação):
1) Fortalecer a deduplicação no Edge Function (`supabase/functions/sync-api-boletos/index.ts`)
- Criar helper para leitura case-insensitive de chaves (ex.: `PaymentRunDate`, `paymentrundate`, `PAYMENTRUNDATE`).
- Extrair `documento` e `paymentrundate` com fallback robusto (mapeado + raw item).
- Normalizar valores antes da chave:
  - `trim()` em strings
  - normalização de data para formato único (`YYYY-MM-DD`) quando possível
- Manter chave única final: `numero_nota|numero_cobranca|documento|paymentrundate`.

2) Garantir rastreabilidade do retorno completo da API sem duplicar tabela principal
- Continuar deduplicando antes do `upsert` (evita conflito no mesmo batch).
- Para cada duplicado detectado na origem, registrar em `vv_b_boletos_api_erros` com:
  - `tipo_erro = 'duplicado_api'`
  - `mensagem_erro` descritiva com a chave
  - `json_original` completo do registro descartado
- Resultado: nada “se perde”; tudo fica auditável, enquanto a tabela principal permanece sem duplicidade.

3) Evitar falha de lote por coluna dinâmica não existente
- Antes de montar payload final, validar se a coluna de destino existe.
- Se não existir, salvar o dado em `dados_extras` e registrar aviso no log da sync (sem abortar o batch inteiro).
- Isso evita cenário “não salva nada” por erro de schema em um único campo dinâmico.

4) Corrigir comunicação no frontend (`src/pages/BoletosApi.tsx`)
- Atualizar tipo de `duplicadosSync` para incluir `documento` e `paymentrundate`.
- Atualizar modal:
  - texto explicando chave de 4 campos
  - colunas visíveis: Nº Nota, Nº Cobrança, Documento, PaymentRunDate
- Ajustar toast de sucesso para refletir claramente:
  - total recebido da API
  - total gravado/upsertado
  - total duplicado na origem
- Isso elimina a percepção de “não salvou” quando, na prática, houve deduplicação correta.

5) Ajuste de consistência de filtro soft delete na leitura
- Padronizar consultas de leitura de API para aceitar ativos como `deleted IS NULL` ou `deleted = ''` quando aplicável (consistência com regra do projeto e dados legados).

Critérios de aceite:
1) Após sincronizar, mensagem deve mostrar algo como: “105 recebidos, 100 gravados, 5 duplicados na origem”.
2) Modal de duplicados deve exibir os 4 campos da chave.
3) Query de validação no banco não deve retornar duplicados na chave de 4 campos.
4) `vv_b_boletos_api_erros` deve registrar os duplicados como `duplicado_api` com `json_original`.
5) Em caso de campo dinâmico desconhecido, sincronização deve continuar e salvar os demais registros (sem erro geral de batch).

Ordem de execução recomendada:
1) Edge Function (dedupe + auditoria + robustez de colunas)
2) Frontend (mensagens/diálogo)
3) Validação SQL + teste de sincronização ponta a ponta na tela `/boletos-api`.
