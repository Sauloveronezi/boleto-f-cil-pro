
# Plano: Corrigir Mapeamento de Valores do Título para Impressão de Boletos

## Problema Identificado

Ao imprimir boletos na tela "Boletos API", os valores do título selecionado não estão sendo preenchidos no PDF. Isso ocorre porque:

1. **Código de barras não está sendo gerado** - A função `gerarCodigoBarras` existe mas **não está sendo chamada** antes de mapear os dados do boleto
2. **Variáveis não resolvidas aparecem como texto** - Quando um valor não é encontrado, a variável `{{nome_variavel}}` aparece literalmente no PDF em vez de ficar vazia
3. **Dados do boleto API não estão mapeados corretamente** - Alguns campos retornados pela API (como `numero_nota`, `valor`, `data_vencimento`) não estão sendo extraídos corretamente

## Arquivos Envolvidos

- `src/pages/BoletosApi.tsx` - Tela principal de impressão
- `src/lib/boletoMapping.ts` - Função de mapeamento de dados
- `src/lib/pdfModelRenderer.ts` - Renderizador de PDF

## Solução Proposta

### Etapa 1: Gerar código de barras para cada boleto

Modificar a função `handleImprimirSelecionados` em `BoletosApi.tsx` para:
- Converter os dados do boleto API para o formato `NotaFiscal` esperado
- Chamar `gerarCodigoBarras()` antes de mapear os dados
- Passar os dados de código de barras para `mapearBoletoApiParaModelo()`

### Etapa 2: Melhorar a resolução de variáveis

Atualizar `pdfModelRenderer.ts` para:
- Não exibir variáveis que não foram resolvidas (retornar string vazia em vez de `{{variavel}}`)
- Tratar valores zerados e datas inválidas

### Etapa 3: Validar mapeamento de campos dinâmicos

Os dados da API SAP incluem campos como:
- `valor` → `valor_documento`, `valor_titulo`
- `numero_nota` → `numero_documento`
- `data_vencimento` → data formatada dd/MM/yyyy
- `dyn_nome_do_cliente` → `pagador_nome`

## Detalhes Técnicos

### Mudança em BoletosApi.tsx (linhas 325-328)

```text
// ANTES:
const dadosBoletos = boletosSelecionados.map((boleto) => {
  return mapearBoletoApiParaModelo(boleto, undefined, empresa, banco, configuracao);
});

// DEPOIS:
const dadosBoletos = boletosSelecionados.map((boleto) => {
  // Converter boleto API para formato NotaFiscal para calcular código de barras
  const notaFiscal: NotaFiscal = {
    id: boleto.id,
    numero_nota: boleto.numero_nota || boleto.documento || '',
    serie: boleto.dados_extras?.serie || '1',
    data_emissao: boleto.data_emissao || new Date().toISOString().split('T')[0],
    data_vencimento: boleto.data_vencimento || new Date().toISOString().split('T')[0],
    valor_titulo: boleto.valor || 0,
    moeda: 'BRL',
    codigo_cliente: boleto.cliente_id || '',
    status: 'aberta',
    referencia_interna: boleto.numero_cobranca || ''
  };
  
  // Gerar código de barras
  const dadosCodigoBarras = gerarCodigoBarras(banco, notaFiscal, configuracao);
  
  // Mapear incluindo código de barras
  return mapearBoletoApiParaModelo(boleto, undefined, empresa, banco, configuracao, dadosCodigoBarras);
});
```

### Mudança em pdfModelRenderer.ts (função substituirVariaveis)

```text
// ANTES:
function substituirVariaveis(texto: string | undefined, dados: DadosBoleto): string {
  if (!texto) return '';
  return texto.replace(/\{\{(\w+)\}\}/g, (match, variavel) => {
    return dados[variavel] || match;
  });
}

// DEPOIS:
function substituirVariaveis(texto: string | undefined, dados: DadosBoleto): string {
  if (!texto) return '';
  return texto.replace(/\{\{(\w+)\}\}/g, (match, variavel) => {
    const valor = dados[variavel];
    // Se não encontrou o valor, retorna vazio em vez da variável
    if (valor === undefined || valor === null || valor === '') return '';
    return valor;
  });
}
```

### Adicionar import em BoletosApi.tsx

O import `gerarCodigoBarras` já existe na linha 37, apenas não está sendo utilizado.

## Resultado Esperado

Após as alterações:
- Valores do título (valor, vencimento, número da nota) serão preenchidos corretamente
- Código de barras e linha digitável serão calculados conforme padrão FEBRABAN
- Variáveis sem dados não aparecerão no PDF (ficarão vazias)
- O nosso número será formatado conforme padrão do banco selecionado

