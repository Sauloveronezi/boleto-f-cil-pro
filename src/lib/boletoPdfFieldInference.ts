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
};

// Escala do editor (1mm = 2px)
const ESCALA = 2;
// Pontos por milímetro (72 pontos/polegada / 25.4mm/polegada)
const POINTS_PER_MM = 72 / 25.4;

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

    const pageHeightPt = viewport.height;
    const pageWidthMm = viewport.width / POINTS_PER_MM;
    const pageHeightMm = viewport.height / POINTS_PER_MM;

    console.log('[FieldInference] Page dimensions:', { pageWidthMm, pageHeightMm });

    // Extrair todos os itens de texto com suas posições
    const textItems: TextItem[] = textContent.items
      .filter((item: any) => item.str && item.str.trim())
      .map((item: any) => ({
        str: item.str,
        transform: item.transform,
        width: item.width,
        height: item.height || 10,
      }));

    console.log('[FieldInference] Found text items:', textItems.length);

    const detectedFields: DetectedField[] = [];
    const usedVariables = new Set<string>();

    // Procurar por labels conhecidos
    for (let i = 0; i < textItems.length; i++) {
      const item = textItems[i];
      const textLower = item.str.toLowerCase().trim();
      
      // Verificar se é um label conhecido
      for (const [pattern, mapping] of Object.entries(FIELD_MAPPINGS)) {
        if (textLower.includes(pattern) && !usedVariables.has(mapping.variavel)) {
          // Converter coordenadas de PDF (origem bottom-left) para editor (origem top-left)
          const xPt = item.transform[4];
          const yPt = item.transform[5];
          
          // Converter de pontos para mm e depois para pixels do editor
          const xMm = xPt / POINTS_PER_MM;
          const yMm = (pageHeightPt - yPt) / POINTS_PER_MM; // Inverter Y
          
          const xPx = xMm * ESCALA;
          const yPx = yMm * ESCALA;

          // Procurar o valor próximo (geralmente abaixo ou à direita)
          const valueItem = findNearbyValue(textItems, i, xPt, yPt, pageHeightPt);
          
          let larguraPx = 120; // Default
          let alturaPx = 20;
          
          if (valueItem) {
            // Usar a largura do valor encontrado
            larguraPx = Math.max(80, (valueItem.width / POINTS_PER_MM) * ESCALA + 20);
          }

          // Posicionar o campo um pouco abaixo do label
          const fieldY = yPx + 12;

          detectedFields.push({
            label: mapping.nome,
            variavel: mapping.variavel,
            x: Math.round(xPx),
            y: Math.round(fieldY),
            largura: Math.round(larguraPx),
            altura: alturaPx,
          });
          
          usedVariables.add(mapping.variavel);
          console.log('[FieldInference] Detected:', mapping.nome, 'at', xMm.toFixed(1), yMm.toFixed(1), 'mm');
          break;
        }
      }
    }

    // Converter para ElementoLayout
    const elementos: ElementoLayout[] = detectedFields.map((field, index) => ({
      id: `field_${Date.now()}_${index}`,
      tipo: 'campo' as const,
      nome: field.label,
      variavel: field.variavel,
      x: field.x,
      y: field.y,
      largura: field.largura,
      altura: field.altura,
      tamanhoFonte: 10,
      alinhamento: 'left' as const,
      corTexto: '#000000',
      corFundo: 'transparent',
      visivel: true,
      ordem: index,
    }));

    console.log('[FieldInference] Total fields detected:', elementos.length);
    return elementos;

  } catch (error) {
    console.error('[FieldInference] Error analyzing PDF:', error);
    return [];
  }
}

/**
 * Procura um item de texto que possa ser o valor do campo (próximo ao label)
 */
function findNearbyValue(
  items: TextItem[],
  labelIndex: number,
  labelX: number,
  labelY: number,
  pageHeight: number
): TextItem | null {
  const searchRadius = 100; // pontos
  let bestCandidate: TextItem | null = null;
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
        bestCandidate = item;
      }
    }
  }

  return bestCandidate;
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
