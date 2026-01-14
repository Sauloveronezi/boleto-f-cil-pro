## Visão Geral
- Implementar “Templates de Boleto”: usar um PDF modelo como fundo e sobrepor textos/códigos nas posições mapeadas.
- Fluxo: importar PDF → mapear campos → salvar template → selecionar boletos → gerar PDFs iguais ao modelo, com campos dinâmicos.

## Modelagem de Dados (Supabase/Lovable)
- Tabela: boleto_templates
  - id (uuid)
  - name (text)
  - bank_code (text)
  - layout_version (text)
  - background_pdf_url (text)
  - page_width (numeric, mm)
  - page_height (numeric, mm)
  - requires_calculation (bool)
  - created_at, updated_at (timestamptz)
- Tabela: boleto_template_fields
  - id (uuid)
  - template_id (uuid → boleto_templates.id)
  - key (text) ex.: beneficiario_nome, pagador_nome, vencimento, valor_documento, nosso_numero, linha_digitavel, codigo_barras
  - source_ref (text) ex.: boletos.pagador_nome, titulos.cliente.razao_social
  - page (int)
  - bbox (jsonb: [x0, y0, x1, y1] em mm, origem top-left)
  - font_family (text)
  - font_size (numeric)
  - align (text: left|center|right)
  - format (text: currency_ptbr|date_ddmmyyyy|mask_cnpj|upper|numeric_only)
  - is_barcode (bool)
  - is_digitable_line (bool)
  - created_at, updated_at
- Índices/Constraints:
  - FK template_id
  - idx por template_id + page
  - unique opcional template_id+key+page

## Tipos (TypeScript)
- Criar tipos Template e TemplateField equivalentes às tabelas, e utilitários de conversão mm ↔ PDF points.

## Backend — Motor de Renderização (Node/TS + pdf-lib)
- Endpoints (Supabase Edge Functions ou API Next/Vite server):
  - POST /api/render-boleto
    - body: { template_id, boleto_id }
    - retorna: stream PDF + log
  - POST /api/render-boletos-batch
    - body: { template_id, boleto_ids[], mode: single|merge|zip }
    - retorna: arquivo final (PDF ou ZIP) + log por ID
- Lógica:
  - Carregar template (fundo PDF) e campos
  - Buscar dados do boleto (via source_ref → mapeamento em consultas Supabase)
  - Normalizar/formatar valores por field.format
  - Converter bbox mm → pontos; desenhar texto com fonte/tamanho/alinhamento
  - Truncamento inteligente (medir largura com font, reduzir fonte ou cortar com ellipsis)
  - Linha digitável: usar do banco (Modo A) ou calcular (Modo B) conforme requires_calculation
  - Código de barras: gerar imagem (Interleaved 2 of 5 para bancos) e desenhar em bbox; fallback Code128 para outros
  - Exportar PDF: single ou merged; para ZIP, gerar PDFs individuais e zipar
  - Log: lista de sucessos/erros, tempo de processamento, campos faltantes

## Cálculo de Linha Digitável e Código de Barras
- Feature flag: template.requires_calculation
- Implementar calculadoras por banco (plugin):
  - Base FEBRABAN (campo 1–5, DV, fator vencimento, valor, carteira, nosso número)
  - Reuso das funções já existentes de código de barras/linha digitável quando disponíveis
- Modo A: usa linha_digitavel/codigo_barras_value do banco
- Modo B: calcula a partir dos campos do boleto (bank_code, moeda, vencimento, valor, carteira, convênio, nosso número, etc.)

## UI — Templates de Boleto
- Página “Templates de Boleto”
  - Upload do PDF modelo (salvar em Storage, background_pdf_url)
  - Preview do PDF como fundo
  - Mapeamento visual:
    - Botão “Adicionar campo”: escolher key (lista padrão) e source_ref (campos Lovable)
    - Desenhar bbox com mouse (drag para retângulo; mover/redimensionar)
    - Ajustar fonte/tamanho/alinhamento/formatação
    - Marcar is_barcode/is_digitable_line quando aplicável
    - Botões: Salvar template; Testar com boleto real (seleciono ID → preview PDF gerado)
  - Lista padrão de keys:
    - Beneficiário: beneficiario_nome, beneficiario_cnpj, beneficiario_endereco
    - Pagador: pagador_nome, pagador_cpf_cnpj, pagador_endereco
    - Título: vencimento, valor_documento, nosso_numero, seu_numero, numero_documento
    - Bancários: agencia_conta_beneficiario, carteira, convenio
    - linha_digitavel (texto), codigo_barras (imagem)

## UI — Geração de Boletos (PDF)
- Página “Gerar Boletos (PDF)”
  - Filtros (cliente, data, status, banco)
  - Seleção do Template
  - Opções de saída: 1 por boleto, arquivo único (merge), ZIP
  - Botão: Gerar → mostra progresso e log por ID
  - Retorno: botão de download; log com erros

## Formatação e Normalização
- Funções helpers para:
  - currency_ptbr (Intl.NumberFormat)
  - date_ddmmyyyy (format date-fns)
  - mask_cnpj/cpf (máscaras)
  - upper, numeric_only
- Medida de texto para truncamento/auto-redução (pdf-lib + heurística)

## Segurança e Permissões
- Restringir criação/edição de templates a perfis admin/operador
- Logs de geração armazenados em tabela separada (boleto_render_logs)

## Performance
- Batch render com fila interna (chunk de 100) e limite de memória
- Cache de fontes e do background PDF

## Entregáveis
- Código UI (cadastro + mapeamento + geração)
- Estrutura SQL das tabelas (Supabase)
- Endpoints e motor de renderização (TS + pdf-lib)
- JSON de exemplo de template
- Exemplo de geração com 3 boletos
- Tratamento de erros e logs

## JSON Exemplo (template)
```json
{
  "id": "tpl_237_bradesco_v1",
  "name": "Bradesco Ficha de Caixa",
  "bank_code": "237",
  "layout_version": "v1",
  "background_pdf_url": "https://storage/.../bradesco_ficha.pdf",
  "page_width": 210,
  "page_height": 297,
  "requires_calculation": true,
  "fields": [
    {"key":"beneficiario_nome","source_ref":"boletos.beneficiario_nome","page":1,"bbox":[12, 30, 110, 36],"font_family":"helvetica","font_size":10,"align":"left","format":"upper"},
    {"key":"pagador_nome","source_ref":"boletos.pagador_nome","page":1,"bbox":[12, 110, 190, 117],"font_family":"helvetica","font_size":10,"align":"left","format":"upper"},
    {"key":"vencimento","source_ref":"boletos.vencimento","page":1,"bbox":[170, 22, 200, 28],"font_family":"helvetica","font_size":10,"align":"right","format":"date_ddmmyyyy"},
    {"key":"valor_documento","source_ref":"boletos.valor","page":1,"bbox":[170, 78, 200, 84],"font_family":"helvetica","font_size":10,"align":"right","format":"currency_ptbr"},
    {"key":"nosso_numero","source_ref":"boletos.nosso_numero","page":1,"bbox":[150, 50, 200, 56],"font_family":"helvetica","font_size":10,"align":"right"},
    {"key":"linha_digitavel","source_ref":"boletos.linha_digitavel","page":1,"bbox":[74, 5, 190, 10],"font_family":"helvetica","font_size":11,"align":"right","is_digitable_line":true},
    {"key":"codigo_barras","source_ref":"boletos.codigo_barras_value","page":1,"bbox":[10, 105, 190, 120],"is_barcode":true}
  ]
}
```

## Exemplo Geração (3 boletos)
- POST /api/render-boletos-batch
  - body: { "template_id": "tpl_237_bradesco_v1", "boleto_ids": ["b1","b2","b3"], "mode": "zip" }
  - retorno: URL de download do ZIP + log: { b1: ok, b2: ok, b3: erro (campo pagador_cnpj faltando) }

## Tratamento de Erros e Logs
- Validação de campos obrigatórios antes da renderização; se faltar, registrar aviso e pular boleto
- Logs guardam: boleto_id, status, mensagens, duração
- UI mostra o resumo e permite baixar o log em CSV

Confirma seguir com esta implementação? Posso começar criando as tabelas, componentes de UI e os endpoints de renderização conforme descrito.