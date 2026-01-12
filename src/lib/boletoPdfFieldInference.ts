import * as pdfjsLib from 'pdfjs-dist';
import { ElementoLayout } from '@/components/modelos/EditorLayoutBoleto';

// Configurar worker do pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface DetectedField {
  label: string;
  variavel: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  ocorrencia: number;
}

// Mapeamento de labels do PDF para variáveis do sistema
const FIELD_MAPPINGS: Record<string, { variavel: string; nome: string }> = {
  'vencimento': { variavel: '{{data_vencimento}}', nome: 'Data Vencimento' },
  'data de vencimento': { variavel: '{{data_vencimento}}', nome: 'Data Vencimento' },
  'nosso número': { variavel: '{{nosso_numero}}', nome: 'Nosso Número' },
  'nosso numero': { variavel: '{{nosso_numero}}', nome: 'Nosso Número' },
  'n° documento': { variavel: '{{numero_documento}}', nome: 'Nº Documento' },
  'nº documento': { variavel: '{{numero_documento}}', nome: 'Nº Documento' },
  'numero documento': { variavel: '{{numero_documento}}', nome: 'Nº Documento' },
  'número documento': { variavel: '{{numero_documento}}', nome: 'Nº Documento' },
  'data documento': { variavel: '{{data_documento}}', nome: 'Data Documento' },
  'data do documento': { variavel: '{{data_documento}}', nome: 'Data Documento' },
  'valor documento': { variavel: '{{valor_documento}}', nome: 'Valor Documento' },
  'valor do documento': { variavel: '{{valor_documento}}', nome: 'Valor Documento' },
  '(=) valor documento': { variavel: '{{valor_documento}}', nome: 'Valor Documento' },
  '(=) valor do documento': { variavel: '{{valor_documento}}', nome: 'Valor Documento' },
  'valor cobrado': { variavel: '{{valor_cobrado}}', nome: 'Valor Cobrado' },
  '(=) valor cobrado': { variavel: '{{valor_cobrado}}', nome: 'Valor Cobrado' },
  'agência/código cedente': { variavel: '{{agencia}}', nome: 'Agência/Código' },
  'agência / código cedente': { variavel: '{{agencia}}', nome: 'Agência/Código' },
  'agencia/codigo cedente': { variavel: '{{agencia}}', nome: 'Agência/Código' },
  'agência/cód. beneficiário': { variavel: '{{agencia}}', nome: 'Agência/Código' },
  'agência / cód. beneficiário': { variavel: '{{agencia}}', nome: 'Agência/Código' },
  'cedente': { variavel: '{{beneficiario_nome}}', nome: 'Beneficiário' },
  'beneficiário': { variavel: '{{beneficiario_nome}}', nome: 'Beneficiário' },
  'beneficiario': { variavel: '{{beneficiario_nome}}', nome: 'Beneficiário' },
  'sacado': { variavel: '{{pagador_nome}}', nome: 'Pagador' },
  'pagador': { variavel: '{{pagador_nome}}', nome: 'Pagador' },
  'sacador/avalista': { variavel: '{{sacador_avalista}}', nome: 'Sacador/Avalista' },
  'local de pagamento': { variavel: '{{local_pagamento}}', nome: 'Local de Pagamento' },
  'local pagamento': { variavel: '{{local_pagamento}}', nome: 'Local de Pagamento' },
  'carteira': { variavel: '{{carteira}}', nome: 'Carteira' },
  'espécie doc': { variavel: '{{especie_documento}}', nome: 'Espécie Doc' },
  'espécie doc.': { variavel: '{{especie_documento}}', nome: 'Espécie Doc' },
  'especie doc': { variavel: '{{especie_documento}}', nome: 'Espécie Doc' },
  'aceite': { variavel: '{{aceite}}', nome: 'Aceite' },
  'data processamento': { variavel: '{{data_processamento}}', nome: 'Data Processamento' },
  'espécie': { variavel: '{{especie_moeda}}', nome: 'Espécie' },
  'quantidade': { variavel: '{{quantidade}}', nome: 'Quantidade' },
  'valor': { variavel: '{{valor_moeda}}', nome: 'Valor' },
  'instruções': { variavel: '{{instrucoes}}', nome: 'Instruções' },
  'instrucoes': { variavel: '{{instrucoes}}', nome: 'Instruções' },
  'cpf/cnpj': { variavel: '{{pagador_cnpj}}', nome: 'CPF/CNPJ Pagador' },
  'uso do banco': { variavel: '{{uso_banco}}', nome: 'Uso do Banco' },
  // Campos adicionais mapeados da tabela vv_b_boletos_api e padrão CNAB
  'data emissão': { variavel: '{{data_emissao}}', nome: 'Data Emissão' },
  'data de emissão': { variavel: '{{data_emissao}}', nome: 'Data Emissão' },
  'data emissao': { variavel: '{{data_emissao}}', nome: 'Data Emissão' },
  'número nota': { variavel: '{{numero_nota}}', nome: 'Número Nota' },
  'numero nota': { variavel: '{{numero_nota}}', nome: 'Número Nota' },
  'nº nota': { variavel: '{{numero_nota}}', nome: 'Número Nota' },
  'número cobrança': { variavel: '{{numero_cobranca}}', nome: 'Número Cobrança' },
  'numero cobranca': { variavel: '{{numero_cobranca}}', nome: 'Número Cobrança' },
  'desconto': { variavel: '{{valor_desconto}}', nome: 'Valor Desconto' },
  'data desconto': { variavel: '{{data_desconto}}', nome: 'Data Desconto' },
  'banco': { variavel: '{{banco_nome}}', nome: 'Nome do Banco' },
  'empresa': { variavel: '{{beneficiario_nome}}', nome: 'Empresa/Beneficiário' },
  'cliente': { variavel: '{{pagador_nome}}', nome: 'Cliente/Pagador' },
  'nome do cliente': { variavel: '{{pagador_nome}}', nome: 'Cliente/Pagador' },
  'cnpj cliente': { variavel: '{{pagador_cnpj}}', nome: 'CNPJ Cliente' },
  'cpf cliente': { variavel: '{{pagador_cnpj}}', nome: 'CPF Cliente' },
};

// Escala do editor (1mm = 2px)
const ESCALA = 2;
// Pontos por milímetro (72 pontos/polegada / 25.4mm/polegada)
const POINTS_PER_MM = 72 / 25.4;

/**
 * Gera documentação automática do layout processado
 */
export function generateLayoutDocumentation(elementos: ElementoLayout[], nomeModelo: string): string {
  const campos = elementos.filter(e => e.tipo === 'campo');
  const textos = elementos.filter(e => e.tipo === 'texto');
  const graficos = elementos.filter(e => e.tipo === 'linha' || e.tipo === 'retangulo');
  
  const variaveisUnicas = Array.from(new Set(campos.map(c => c.variavel).filter(Boolean)));
  
  let doc = `# Documentação do Layout: ${nomeModelo}\n\n`;
  doc += `**Data de geração:** ${new Date().toLocaleDateString()}\n`;
  doc += `**Total de elementos:** ${elementos.length}\n\n`;
  
  doc += `## Resumo Estrutural\n`;
  doc += `- **Campos Mapeados:** ${campos.length}\n`;
  doc += `- **Textos Fixos:** ${textos.length}\n`;
  doc += `- **Elementos Gráficos:** ${graficos.length}\n\n`;
  
  doc += `## Campos e Variáveis\n`;
  doc += `Lista de campos identificados e suas variáveis correspondentes para integração.\n\n`;
  doc += `| Nome do Campo | Variável de Integração | Tipo |\n`;
  doc += `|---|---|---|\n`;
  
  // Agrupar por variável para mostrar ocorrências
  const camposPorVariavel: Record<string, ElementoLayout[]> = {};
  campos.forEach(c => {
    if (c.variavel) {
      if (!camposPorVariavel[c.variavel]) camposPorVariavel[c.variavel] = [];
      camposPorVariavel[c.variavel].push(c);
    }
  });
  
  Object.entries(camposPorVariavel).forEach(([variavel, lista]) => {
    const nome = lista[0].nome.split(' (')[0]; // Remove contador se houver
    const repeticoes = lista.length > 1 ? ` (Repete ${lista.length}x)` : '';
    doc += `| ${nome}${repeticoes} | \`${variavel}\` | Dinâmico |\n`;
  });
  
  doc += `\n## Detalhes Técnicos\n`;
  doc += `As coordenadas abaixo estão em pixels (escala 1mm = ${ESCALA}px).\n\n`;
  
  doc += `### Mapeamento Detalhado\n`;
  campos.forEach(c => {
    doc += `- **${c.nome}**: x=${c.x}, y=${c.y}, w=${c.largura}, h=${c.altura} (Variável: \`${c.variavel}\`)\n`;
  });
  
  return doc;
}

/**
 * Analisa um PDF de boleto e infere as posições dos campos baseado no conteúdo textual
 */
export async function inferirCamposDoBoletoPDF(
  source: File | ArrayBuffer | string
): Promise<ElementoLayout[]> {
  try {
    let data: ArrayBuffer;
    
    if (source instanceof File) {
      data = await source.arrayBuffer();
    } else if (source instanceof ArrayBuffer) {
      data = source;
    } else if (typeof source === 'string') {
      // URL
      const response = await fetch(source);
      data = await response.arrayBuffer();
    } else {
      throw new Error('Fonte de PDF inválida');
    }

    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const opList = await page.getOperatorList();

    const pageHeightPt = viewport.height;
    const pageWidthMm = viewport.width / POINTS_PER_MM;
    const pageHeightMm = viewport.height / POINTS_PER_MM;

    console.log('[FieldInference] Page dimensions:', { pageWidthMm, pageHeightMm });

    // 1. Extrair Gráficos (Linhas e Retângulos)
    const graphicElements = extractGraphics(opList, pageHeightPt);
    console.log('[FieldInference] Graphics found:', graphicElements.length);

    // 2. Extrair Textos e Identificar Campos
    const textItems: TextItem[] = textContent.items
      .filter((item: any) => item.str && item.str.trim())
      .map((item: any) => ({
        str: item.str,
        transform: item.transform,
        width: item.width,
        height: item.height || 10,
      }));

    console.log('[FieldInference] Found text items:', textItems.length);

    // 3. Identificar repetições e criar vínculos
    const detectedFields: DetectedField[] = [];
    const usedTextIndices = new Set<number>(); // Para rastrear quais textos viraram campos ou labels
    
    // Mapa para contar ocorrências de cada variável
    const variableCounts: Record<string, number> = {};

    // Procurar por labels conhecidos e valores associados
    for (let i = 0; i < textItems.length; i++) {
      const item = textItems[i];
      const textLower = item.str.toLowerCase().trim();
      
      // Verificar se é um label conhecido
      for (const [pattern, mapping] of Object.entries(FIELD_MAPPINGS)) {
        if (textLower.includes(pattern)) {
          // Converter coordenadas de PDF (origem bottom-left) para editor (origem top-left)
          const xPt = item.transform[4];
          const yPt = item.transform[5];
          
          const xMm = xPt / POINTS_PER_MM;
          const yMm = (pageHeightPt - yPt) / POINTS_PER_MM; // Inverter Y
          
          const xPx = xMm * ESCALA;
          const yPx = yMm * ESCALA;

          // Procurar o valor próximo (geralmente abaixo ou à direita)
          const valueItemIndex = findNearbyValueIndex(textItems, i, xPt, yPt, pageHeightPt);
          
          let larguraPx = 120; // Default
          let alturaPx = 20;
          
          if (valueItemIndex !== -1) {
             const valueItem = textItems[valueItemIndex];
             larguraPx = Math.max(80, (valueItem.width / POINTS_PER_MM) * ESCALA + 20);
             usedTextIndices.add(valueItemIndex);
          }

          // Posicionar o campo um pouco abaixo do label
          const fieldY = yPx + 12;

          // Incrementar contador de ocorrências
          const count = (variableCounts[mapping.variavel] || 0) + 1;
          variableCounts[mapping.variavel] = count;
          
          // Adicionar sufixo se for repetição
          // A primeira ocorrência não tem sufixo na variavel (mantém compatibilidade), 
          // mas o ID deve ser único.
          // O "vínculo" é feito pelo nome da variável. Se tiverem o mesmo nome de variável, 
          // o sistema de preenchimento vai usar o mesmo valor.
          
          detectedFields.push({
            label: mapping.nome, // O nome de exibição pode ser igual
            variavel: mapping.variavel, // A variável deve ser a mesma para vincular os dados
            x: Math.round(xPx),
            y: Math.round(fieldY),
            largura: Math.round(larguraPx),
            altura: alturaPx,
            ocorrencia: count
          });
          
          // Marcar este item de texto como usado (é um label)
          usedTextIndices.add(i);
          
          console.log('[FieldInference] Detected:', mapping.nome, 'at', xMm.toFixed(1), yMm.toFixed(1), 'mm', `(occurrence ${count})`);
          break; // Match encontrado para este item
        }
      }
    }

    // 4. Catalogar seções do boleto (topo, meio, fundo)
    // Agrupar campos por Y aproximado
    const fieldsByY = detectedFields.sort((a, b) => a.y - b.y);
    const sections: { startY: number, endY: number, count: number }[] = [];
    
    // Lógica simples de clusterização por Y
    if (fieldsByY.length > 0) {
        let currentSection = { startY: fieldsByY[0].y, endY: fieldsByY[0].y, count: 1 };
        
        for (let i = 1; i < fieldsByY.length; i++) {
            const field = fieldsByY[i];
            if (field.y - currentSection.endY > 200) { // Gap grande (> 100mm/200px) indica nova seção
                sections.push(currentSection);
                currentSection = { startY: field.y, endY: field.y, count: 1 };
            } else {
                currentSection.endY = field.y;
                currentSection.count++;
            }
        }
        sections.push(currentSection);
    }
    
    console.log('[FieldInference] Document sections detected:', sections.length);

    // 5. Converter campos detectados para ElementoLayout
    const elementosCampos: ElementoLayout[] = detectedFields.map((field, index) => ({
      id: `field_${Date.now()}_${index}`,
      tipo: 'campo' as const,
      nome: field.ocorrencia > 1 ? `${field.label} (${field.ocorrencia})` : field.label,
      variavel: field.variavel, // Mantém a mesma variável para link automático
      x: field.x,
      y: field.y,
      largura: field.largura,
      altura: field.altura,
      tamanhoFonte: 10,
      alinhamento: 'left' as const,
      corTexto: '#000000',
      corFundo: 'transparent',
      visivel: true,
      ordem: graphicElements.length + index,
    }));

    // 4. Converter textos estáticos (não usados como label/valor) para ElementoLayout
    const staticTextElements: ElementoLayout[] = textItems
      .map((item, index) => {
        if (usedTextIndices.has(index)) return null;

        const xPt = item.transform[4];
        const yPt = item.transform[5];
        const xMm = xPt / POINTS_PER_MM;
        const yMm = (pageHeightPt - yPt) / POINTS_PER_MM;
        
        return {
          id: `text_${Date.now()}_${index}`,
          tipo: 'texto' as const,
          nome: 'Texto Fixo',
          textoFixo: item.str,
          x: xMm * ESCALA,
          y: yMm * ESCALA,
          largura: (item.width / POINTS_PER_MM) * ESCALA,
          altura: (item.height / POINTS_PER_MM) * ESCALA, // Aproximação
          tamanhoFonte: 10, // Difícil extrair tamanho exato sem font matrix parsing
          corTexto: '#000000',
          visivel: true,
          ordem: graphicElements.length + elementosCampos.length + index,
        };
      })
      .filter((el): el is ElementoLayout => el !== null);

    // Se não encontrou gráficos, usar linhas padrão (fallback)
    const finalGraphics = graphicElements.length > 0 ? graphicElements : gerarLinhasPadraoBoleto(pageWidthMm, pageHeightMm);

    const todosElementos = [...finalGraphics, ...staticTextElements, ...elementosCampos];

    console.log('[FieldInference] Total fields:', elementosCampos.length);
    console.log('[FieldInference] Total static texts:', staticTextElements.length);
    console.log('[FieldInference] Total graphics:', finalGraphics.length);
    
    return todosElementos;

  } catch (error) {
    console.error('[FieldInference] Error analyzing PDF:', error);
    return [];
  }
}

/**
 * Extrai elementos gráficos (linhas e retângulos) do OperatorList do PDF
 */
function extractGraphics(opList: any, pageHeightPt: number): ElementoLayout[] {
  const elements: ElementoLayout[] = [];
  const fnArray = opList.fnArray;
  const argsArray = opList.argsArray;
  
  // Mapeamento de operadores (pode variar por versão, mas geralmente estável)
  // pdfjsLib.OPS.constructPath = 13 (exemplo)
  // Usar strings para identificar se possível, ou constantes do pdfjsLib
  const OPS = pdfjsLib.OPS;

  let currentPath: { x: number, y: number }[] = [];
  let currentPoint = { x: 0, y: 0 };

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];

    if (fn === OPS.rectangle) {
      const [x, y, w, h] = args;
      // Converter
      const xMm = x / POINTS_PER_MM;
      const yMm = (pageHeightPt - (y + h)) / POINTS_PER_MM; // Y top-left
      
      elements.push({
        id: `rect_${Date.now()}_${i}`,
        tipo: 'retangulo',
        nome: 'Retângulo',
        x: xMm * ESCALA,
        y: yMm * ESCALA,
        largura: (w / POINTS_PER_MM) * ESCALA,
        altura: (h / POINTS_PER_MM) * ESCALA,
        corBorda: '#000000',
        espessuraBorda: 1,
        visivel: true,
        ordem: i
      });
    } else if (fn === OPS.moveTo) {
      currentPoint = { x: args[0], y: args[1] };
    } else if (fn === OPS.lineTo) {
      const p = { x: args[0], y: args[1] };
      // Criar linha do ponto anterior para este
      const x1Mm = currentPoint.x / POINTS_PER_MM;
      const y1Mm = (pageHeightPt - currentPoint.y) / POINTS_PER_MM;
      const x2Mm = p.x / POINTS_PER_MM;
      const y2Mm = (pageHeightPt - p.y) / POINTS_PER_MM;

      // Simplificação: apenas linhas horizontais ou verticais para o editor
      // Mas armazenamos como 'linha' genérica se suportado, ou retangulo fino
      const width = Math.abs(x2Mm - x1Mm) * ESCALA;
      const height = Math.abs(y2Mm - y1Mm) * ESCALA;
      
      if (width > 0.5 || height > 0.5) { // Ignorar pontos muito pequenos
        elements.push({
          id: `line_${Date.now()}_${i}`,
          tipo: 'linha',
          nome: 'Linha',
          x: Math.min(x1Mm, x2Mm) * ESCALA,
          y: Math.min(y1Mm, y2Mm) * ESCALA,
          largura: Math.max(width, 1), // Min 1px
          altura: Math.max(height, 1), // Min 1px
          corFundo: '#000000',
          visivel: true,
          ordem: i
        });
      }
      currentPoint = p;
    }
  }

  return elements;
}

/**
 * Gera linhas e caixas padrão de boleto (estrutura FEBRABAN)
 */
function gerarLinhasPadraoBoleto(pageWidthMm: number, pageHeightMm: number): ElementoLayout[] {
  const ESCALA = 2;
  const linhas: ElementoLayout[] = [];
  const marginX = 10 * ESCALA; // 10mm de margem
  const larguraUtil = (pageWidthMm - 20) * ESCALA; // largura - margens
  const timestamp = Date.now();
  
  // Estrutura típica de boleto bancário (alturas em mm convertidas para px)
  const estrutura = [
    // Cabeçalho do banco (logo + código + linha digitável)
    { y: 15, altura: 2, nome: 'Linha Cabeçalho' },
    // Dados do cedente
    { y: 30, altura: 1, nome: 'Linha Cedente' },
    // Vencimento / Agência / Nosso Número
    { y: 45, altura: 1, nome: 'Linha Dados Título 1' },
    // Valor / Documento / Espécie
    { y: 60, altura: 1, nome: 'Linha Dados Título 2' },
    // Instruções
    { y: 75, altura: 1, nome: 'Linha Instruções' },
    // Sacado
    { y: 100, altura: 1, nome: 'Linha Sacado' },
    // Autenticação mecânica
    { y: 115, altura: 2, nome: 'Linha Autenticação' },
    // Linha de corte (mais espessa)
    { y: 125, altura: 3, nome: 'Linha de Corte (destacar)' },
    // Recibo do sacado (parte inferior do boleto)
    { y: 140, altura: 2, nome: 'Linha Recibo Cabeçalho' },
    { y: 155, altura: 1, nome: 'Linha Recibo Dados' },
    { y: 170, altura: 1, nome: 'Linha Recibo Valor' },
  ];
  
  estrutura.forEach((item, index) => {
    linhas.push({
      id: `line_${timestamp}_${index}`,
      tipo: 'linha',
      nome: item.nome,
      x: marginX,
      y: item.y * ESCALA,
      largura: larguraUtil,
      altura: item.altura,
      corFundo: '#000000',
      visivel: true,
      ordem: index,
    });
  });
  
  // Adicionar caixas/retângulos para as áreas principais
  const caixas = [
    // Caixa do logo do banco
    { x: 10, y: 5, largura: 40, altura: 10, nome: 'Caixa Logo Banco' },
    // Caixa código do banco
    { x: 52, y: 5, largura: 20, altura: 10, nome: 'Caixa Código Banco' },
    // Caixa linha digitável
    { x: 74, y: 5, largura: 116, altura: 10, nome: 'Caixa Linha Digitável' },
    // Caixa código de barras
    { x: 10, y: 105, largura: 180, altura: 15, nome: 'Caixa Código de Barras' },
  ];
  
  caixas.forEach((item, index) => {
    linhas.push({
      id: `box_${timestamp}_${index}`,
      tipo: 'retangulo',
      nome: item.nome,
      x: item.x * ESCALA,
      y: item.y * ESCALA,
      largura: item.largura * ESCALA,
      altura: item.altura * ESCALA,
      corFundo: 'transparent',
      bordaSuperior: true,
      bordaInferior: true,
      bordaEsquerda: true,
      bordaDireita: true,
      espessuraBorda: 1,
      corBorda: '#000000',
      visivel: true,
      ordem: estrutura.length + index,
    });
  });
  
  return linhas;
}

/**
 * Procura um item de texto que possa ser o valor do campo (próximo ao label)
 * Retorna o indice do item ou -1
 */
function findNearbyValueIndex(
  items: TextItem[],
  labelIndex: number,
  labelX: number,
  labelY: number,
  pageHeight: number
): number {
  const searchRadius = 100; // pontos
  let bestCandidateIndex = -1;
  let bestDistance = Infinity;

  for (let i = 0; i < items.length; i++) {
    if (i === labelIndex) continue;
    
    const item = items[i];
    const itemX = item.transform[4];
    const itemY = item.transform[5];
    
    // Verificar se está à direita ou abaixo do label
    const dx = itemX - labelX;
    const dy = labelY - itemY; // Invertido porque Y cresce para baixo
    
    // Preferir itens à direita (mesmo Y) ou abaixo
    if (dx >= -10 && dy >= -5 && dx < searchRadius && dy < searchRadius) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Verificar se parece um valor (não é outro label)
      const str = item.str.toLowerCase().trim();
      const looksLikeLabel = Object.keys(FIELD_MAPPINGS).some(pattern => 
        str.includes(pattern)
      );
      
      if (!looksLikeLabel && distance < bestDistance) {
        bestDistance = distance;
        bestCandidateIndex = i;
      }
    }
  }

  return bestCandidateIndex;
}

/**
 * Detecta margens do documento baseado nos elementos
 */
function detectMargins(
  graphics: ElementoLayout[],
  textItems: TextItem[],
  pageWidthMm: number,
  pageHeightMm: number
): { top: number; bottom: number; left: number; right: number } {
  let minX = pageWidthMm;
  let maxX = 0;
  let minY = pageHeightMm;
  let maxY = 0;

  // Analisar gráficos
  graphics.forEach(g => {
    const gx = g.x / ESCALA;
    const gy = g.y / ESCALA;
    const gw = g.largura / ESCALA;
    const gh = g.altura / ESCALA;

    if (gx < minX) minX = gx;
    if (gx + gw > maxX) maxX = gx + gw;
    if (gy < minY) minY = gy;
    if (gy + gh > maxY) maxY = gy + gh;
  });

  // Analisar textos (amostragem)
  textItems.forEach(t => {
     const tx = t.transform[4] / POINTS_PER_MM;
     const ty = (t.transform[5] / POINTS_PER_MM); // Bottom-left origin in PDF, need conversion logic if mixed
     // Simplificação: apenas usar gráficos para margens estruturais é mais seguro
  });

  return {
    top: minY,
    bottom: pageHeightMm - maxY,
    left: minX,
    right: pageWidthMm - maxX
  };
}

/**
 * Mescla campos detectados com campos existentes (prioriza detectados)
 */
export function mesclarCampos(
  detectados: ElementoLayout[],
  existentes: ElementoLayout[]
): ElementoLayout[] {
  const variaveisDetectadas = new Set(detectados.map(e => e.variavel));
  
  // Adicionar campos existentes que não foram detectados
  const camposNaoDetectados = existentes.filter(e => !variaveisDetectadas.has(e.variavel));
  
  return [...detectados, ...camposNaoDetectados];
}
