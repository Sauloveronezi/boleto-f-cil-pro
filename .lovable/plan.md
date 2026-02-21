
# Plan: Fix Barcode Calculation, API Config UI, Search in Mapping, and Preserve Existing Mappings

## Summary of Issues

1. **Wrong barcode for document 1727** - The system uses static bank config (agencia=9012, conta=34567-8) instead of the actual data from the API (agencia=1463, conta=99540). Also, the Itau campo livre DAC values are hardcoded to `0` instead of being calculated.
2. **API config dialog overflow** - The BoletosApiConfigDialog has items rendering outside the grid, buttons not clickable.
3. **Missing search in API field mapping** - The "Campos Disponiveis da API" section has 92 fields but no search filter.
4. **Existing mappings being overwritten** - Opening the API config screen may trigger re-detection of fields that resets mappings.

---

## Technical Details

### 1. Fix Barcode Calculation (barcodeCalculator.ts + boletoDataMapper.ts + BoletosApi.tsx)

**Root cause analysis** using real data from the boleto reference:
- Correct line: `34191.09107 00000.971465 39954.050009 2 13910000002228`
- Decoding reveals: agencia=1463, conta=99540, carteira=109, nosso_numero=10000009, valor=22.28
- The API record has: `BankInternalID=34171463` (bank 341 + agencia 1463), `BankAccountLongID=99540`
- The system's static config has agencia=9012, conta=34567-8 which is incorrect for this boleto

**Changes:**

**a) `src/lib/boletoDataMapper.ts`** - Fix DAC calculation for Itau campo livre:
- Replace hardcoded `0` DACs with actual `calcularModulo10` calculations
- Import `calcularModulo10` from barcodeCalculator
- For case '341': Calculate DAC1 = modulo10(ag+ct+carteira+nossoNumero) and DAC2 = modulo10(ag+ct)

**b) `src/pages/BoletosApi.tsx`** - Extract agencia/conta from API data:
- Before calling `gerarCodigoBarras`, check `boleto.dados_extras.BankInternalID` for agencia (last 4 digits) and `boleto.dados_extras.BankAccountLongID` for conta
- Build an overridden config merging API data over static config
- Also use `boleto.dados_extras.bankcontrolkey` as account check digit

**c) `src/lib/barcodeCalculator.ts`** - No changes needed (the calculator is correct; the issue is in the data mapper and in BoletosApi passing wrong config)

### 2. Fix API Config Dialog UI (BoletosApiConfigDialog.tsx)

**Changes:**
- Increase `max-w-lg` to `max-w-2xl` for more space
- Add `overflow-hidden` to item rows to prevent overflow
- Make the "Adicionar" button more accessible by ensuring the form grid doesn't push it off-screen
- Add `truncate` to long chave/label texts
- Ensure ScrollArea is used for long lists

### 3. Add Search in API Field Mapping (MapeamentoCamposCard.tsx)

**Changes:**
- Add a search `Input` above the "Campos Disponiveis da API" badges section
- Filter `camposDisponiveis` by the search term (case-insensitive)
- Show count of filtered vs total results

### 4. Preserve Existing Mappings (MapeamentoCamposCard.tsx)

**Root cause:** When the API config section is opened, clicking "Atualizar Campos" calls `test-api-connection` which updates `campos_api_detectados` on the integration record. This doesn't overwrite mappings. However, the "Campo da API" selector in "Adicionar Novo Mapeamento" filters out already-mapped fields (line 767-768: `.filter(c => !c.jaMapeado)`), which is correct behavior.

The actual issue may be that when re-detecting fields, the `campos_api_detectados` array gets reset, which changes the badge display but doesn't affect saved mappings. The fix:
- In `handleAtualizarCampos` in ApiConfigCard.tsx, merge newly detected fields with existing `campos_api_detectados` instead of replacing them
- Ensure the field detection preserves the existing list and only adds new fields

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/boletoDataMapper.ts` | Fix Itau DAC calculation using calcularModulo10 |
| `src/pages/BoletosApi.tsx` | Extract agencia/conta from API dados_extras |
| `src/components/boleto/BoletosApiConfigDialog.tsx` | Fix dialog layout/overflow |
| `src/components/api/MapeamentoCamposCard.tsx` | Add search filter for API fields |
| `src/components/api/ApiConfigCard.tsx` | Merge detected fields instead of replacing |
