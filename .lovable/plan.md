

# Correção de Código de Barras e Formatação de Datas

## Problema 1: Código de Barras com Nosso Número Errado

### Diagnóstico

O campo `nosso_numero` no banco de dados contém `10000009-7` (8 dígitos + DV separado por hífen). O fluxo atual:

1. Remove caracteres não-numéricos: `100000097` (9 dígitos)
2. Aplica `slice(-8)`: `00000097` (pega os ULTIMOS 8 dígitos)
3. Resultado errado no campo livre do Itau

O correto seria extrair os PRIMEIROS 8 dígitos (`10000009`), pois o nono dígito (`7`) é o digito verificador (DV) que nao faz parte do nosso numero para calculo do campo livre.

**Comparacao:**

```text
Correto (banco):  34191.09107 00000.971465 39954.050009 2 13910000002228
Gerado (errado):  34191.09008 00009.731464 39954.050009 5 13910000002228

Campo livre correto: 109 10000009 7 1463 99540 5 000
Campo livre errado:  109 00000097 3 1463 99540 5 000
                         ^^^^^^^^ -- nosso numero invertido
```

### Solucao

No arquivo `src/lib/boletoDataMapper.ts`, na funcao `gerarCampoLivreFromData`, caso Itau (341):
- Trocar `nossoNumero.slice(-8)` por logica que pega os primeiros 8 digitos quando o nosso numero tem mais de 8 digitos (o excedente e o DV).
- Mesma logica para o DAC do nosso numero.

Tambem aplicar no `barcodeCalculator.ts` (funcao `gerarCampoLivre` caso 341) para manter consistencia.

---

## Problema 2: Datas no formato errado na impressao

### Diagnóstico

As datas estao armazenadas no banco como `yyyy-mm-dd` (ex: `2026-02-20`). Na tabela de visualizacao ja sao formatadas para `dd/mm/yyyy`, mas no mapeamento de dados para o PDF, as datas sao passadas no formato bruto.

### Solucao

No `boletoDataMapper.ts`, apos o calculo do codigo de barras (que precisa da data em formato yyyy-mm-dd), formatar todos os campos de data para `dd/mm/yyyy`:
- `data_vencimento`
- `data_emissao`
- `data_documento`
- `data_processamento`

Isso garante que independente do template ter ou nao o formato `date_ddmmyyyy` configurado, as datas sempre sairao corretas.

---

## Arquivos a Alterar

### 1. `src/lib/boletoDataMapper.ts`
- **Funcao `gerarCampoLivreFromData` (caso 341/Itau):** Trocar `nossoNumero.slice(-8)` por `nossoNumero.slice(0, 8)` quando o nosso numero tiver mais de 8 digitos
- **Apos calculo do codigo de barras:** Adicionar formatacao de campos de data para dd/mm/yyyy

### 2. `src/lib/barcodeCalculator.ts`
- **Funcao `gerarCampoLivre` (caso 341/Itau):** Aplicar mesma correcao no `nossoNumero` - usar primeiros 8 digitos em vez dos ultimos 8
- **Funcao `gerarNossoNumero` (caso 341/Itau):** Garantir que o sequencial use os primeiros 8 digitos

