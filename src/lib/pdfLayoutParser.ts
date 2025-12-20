import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { TipoLinha } from '@/components/cnab/CnabTextEditor';
import { CORES_CAMPOS } from '@/types/cnab';

// Configurar worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface CampoDetectado {
  id: string;
  nome: string;
  posicaoInicio: number;
  posicaoFim: number;
  tamanho: number;
  tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor';
  destino: string;
  valor: string;
  confianca: number;
  tipoLinha: TipoLinha;
  cor: string;
}

interface TextLine {
  text: string;
  y: number;
  x: number;
}

export async function parseCnabPdf(file: File): Promise<CampoDetectado[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let campos: CampoDetectado[] = [];
  let currentSegment: TipoLinha = 'header_arquivo';
  let idCounter = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Agrupar itens por linha (y aproximado)
    const items = textContent.items as TextItem[];
    const lines: TextLine[] = [];
    
    // Ordenar por Y (decrescente) e X (crescente)
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 5) return yDiff; // Margem de erro para mesma linha
      return a.transform[4] - b.transform[4];
    });

    let currentLine: TextLine | null = null;
    
    items.forEach(item => {
      const y = item.transform[5];
      const x = item.transform[4];
      const text = item.str;
      
      if (!text.trim()) return;

      if (!currentLine || Math.abs(currentLine.y - y) > 5) {
        if (currentLine) lines.push(currentLine);
        currentLine = { text, y, x };
      } else {
        currentLine.text += ' ' + text;
      }
    });
    if (currentLine) lines.push(currentLine);

    // Analisar linhas
    for (const line of lines) {
      const text = line.text.toUpperCase();
      
      // Detectar mudança de segmento
      if ((text.includes('HEADER') && text.includes('ARQUIVO')) || text.includes('REGISTRO 0')) {
        currentSegment = 'header_arquivo';
      } else if ((text.includes('HEADER') && text.includes('LOTE')) || text.includes('REGISTRO 1')) {
        currentSegment = 'header_lote';
      } else if ((text.includes('TRAILER') && text.includes('LOTE')) || text.includes('REGISTRO 5')) {
        currentSegment = 'trailer_lote';
      } else if ((text.includes('TRAILER') && text.includes('ARQUIVO')) || text.includes('REGISTRO 9')) {
        currentSegment = 'trailer_arquivo';
      } else if (text.includes('SEGMENTO P') || (text.includes('DETALHE') && text.includes(' P '))) {
        currentSegment = 'detalhe_segmento_p';
      } else if (text.includes('SEGMENTO Q') || (text.includes('DETALHE') && text.includes(' Q '))) {
        currentSegment = 'detalhe_segmento_q';
      } else if (text.includes('SEGMENTO R') || (text.includes('DETALHE') && text.includes(' R '))) {
        currentSegment = 'detalhe_segmento_r';
      } else if (text.includes('DETALHE') && !text.includes('SEGMENTO')) {
        // Fallback para CNAB 400 ou detalhe genérico
        currentSegment = 'detalhe';
      }

      // Tentar extrair campos
      // Padrões comuns: 
      // "001 003 Código" (Posição Inicial, Posição Final, Nome)
      // "1 3 Banco"
      // "1 a 3 Banco"
      // "Nome ... 001 003 ... 9(03)" (Com Picture)
      const field = extractFieldFromLine(line.text, currentSegment);
      if (field) {
        idCounter++;
        campos.push({
          ...field,
          id: String(idCounter),
          tipoLinha: currentSegment,
          cor: CORES_CAMPOS[idCounter % CORES_CAMPOS.length],
          confianca: field.nome.length > 50 ? 70 : 90, // Menor confiança se pegou muito texto
          valor: '(do PDF)'
        });
      }
    }
  }

  // Filtrar duplicatas ou campos inválidos
  campos = campos.filter((c, index, self) => 
    index === self.findIndex((t) => (
      t.posicaoInicio === c.posicaoInicio && 
      t.tipoLinha === c.tipoLinha
    ))
  );

  return campos.sort((a, b) => {
    // Primeiro ordenar por tipo de linha
    if (a.tipoLinha !== b.tipoLinha) {
       const ordem: Record<string, number> = {
         'header_arquivo': 1,
         'header_lote': 2,
         'detalhe': 3,
         'detalhe_segmento_p': 4,
         'detalhe_segmento_q': 5,
         'detalhe_segmento_r': 6,
         'trailer_lote': 98,
         'trailer_arquivo': 99
       };
       return (ordem[a.tipoLinha] || 50) - (ordem[b.tipoLinha] || 50);
    }
    return a.posicaoInicio - b.posicaoInicio;
  });
}

function extractFieldFromLine(text: string, segment: TipoLinha): Omit<CampoDetectado, 'id' | 'tipoLinha' | 'cor' | 'confianca' | 'valor'> | null {
  // Regex para encontrar posições: "001 003", "1 a 3", "001 - 003", "001 a 003"
  // E o resto do texto como nome
  
  // Estratégia: Encontrar dois números próximos que pareçam ser start/end
  
  let start = 0;
  let end = 0;
  let name = '';
  let picture = '';

  // 0. Padrão Tabela Completa (Com Picture)
  // Ex: "NOME DO CAMPO SIGNIFICADO 001 003 9(03) 341"
  // Procura por: (Texto) (Num) (Num) (Picture)
  // Picture regex: X(01), 9(03), 9(10)V9(2)
  const regexTable = /(.+?)\s+(\d{1,3})\s+(\d{1,3})\s+([X9]\(\d+\)(?:V9\(\d+\))?)/i;
  
  const matchTable = text.match(regexTable);
  if (matchTable) {
      name = matchTable[1].trim();
      start = parseInt(matchTable[2]);
      end = parseInt(matchTable[3]);
      picture = matchTable[4];
  } else {
      // Fallback para padrões sem Picture
      
      // 1. Padrão "Start Separator End Name" ou "Start Separator End"
      // Ex: "001 003 Código", "1-3 Código", "1 a 3 Código"
      const regexStart = /^(\d{1,3})\s*(?:-|a|à|\s)\s*(\d{1,3})\s+(.+)$/i;
      
      // 2. Padrão "Name Start Separator End"
      // Ex: "Código 001 003", "Código 1-3"
      const regexEnd = /^(.+)\s+(\d{1,3})\s*(?:-|a|à|\s)\s*(\d{1,3})$/i;

      // 3. Padrão "Start End Len Name" (comum em manuais)
      // Ex: "001 003 3 Código"
      const regexWithLen = /^(\d{1,3})\s+(\d{1,3})\s+\d+\s+(.+)$/i;
      
      // 4. Padrão busca profunda (dois números no meio do texto)
      // Ex: "Posição 001 a 003 do registro"
      const regexDeep = /(\d{1,3})\s*(?:-|a|à)\s*(\d{1,3})/;
    
      let match = text.match(regexStart);
      if (match) {
        start = parseInt(match[1]);
        end = parseInt(match[2]);
        name = match[3];
      } else {
        match = text.match(regexWithLen);
        if (match) {
          start = parseInt(match[1]);
          end = parseInt(match[2]);
          name = match[3];
        } else {
          match = text.match(regexEnd);
          if (match) {
            start = parseInt(match[2]);
            end = parseInt(match[3]);
            name = match[1];
          } else {
            // Tentar busca profunda como fallback
            // Cuidado com falsos positivos (ex: datas, valores)
            const deepMatch = text.match(regexDeep);
            if (deepMatch) {
                start = parseInt(deepMatch[1]);
                end = parseInt(deepMatch[2]);
                // Remover os números do nome e o que vier depois (geralmente lixo ou picture não detectada)
                const parts = text.split(deepMatch[0]);
                name = parts[0].trim();
                // Se o nome ficou vazio, tenta pegar o que vem depois (caso invertido)
                if (!name && parts[1]) name = parts[1].trim();
            }
          }
        }
      }
  }
  
  if (start > 0 && end > 0 && name) {
    name = name.trim();
    
    // Limpezas comuns no nome
    name = name.replace(/^[-–—]\s*/, ''); // Remover traços no início
    name = name.replace(/\s*[-–—]$/, ''); // Remover traços no fim
    
    // Tentar limpar "Significado" se vier grudado no nome (heurística simples)
    // Se o nome for muito longo e tiver palavras em caixa alta no meio, pode ser o "Significado"
    // Ex: "CÓDIGO DO BANCO CÓDIGO DO BCO NA COMPENSAÇÃO" -> "CÓDIGO DO BANCO"
    // Difícil fazer isso genericamente sem quebrar nomes compostos válidos.
    // Vamos deixar o usuário editar.

    // Validações básicas
    if (start > end) return null;
    if (end > 444) return null; // CNAB 400 + margem ou 240 + margem
    if (name.length < 2) return null;
    
    // Ignorar linhas que parecem cabeçalhos de tabela
    const lowerName = name.toLowerCase();
    if (lowerName === 'de' || lowerName === 'até' || lowerName === 'pos' || lowerName === 'posição' || lowerName === 'nome do campo' || lowerName === 'conteúdo' || lowerName === 'picture') {
        return null;
    }

    // Detectar tipo e destino
    const { tipo, destino } = inferTypeAndDestiny(name, picture);

    return {
      nome: name,
      posicaoInicio: start,
      posicaoFim: end,
      tamanho: end - start + 1,
      tipo,
      destino
    };
  }
  
  return null;
}

function inferTypeAndDestiny(name: string, picture: string = ''): { tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor', destino: string } {
  const lower = name.toLowerCase();
  let tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor' = 'alfanumerico';
  let destino = '';

  // Inferir pelo Picture se disponível
  if (picture) {
      if (picture.includes('V') || picture.includes('v')) {
          tipo = 'valor';
      } else if (picture.startsWith('9')) {
          tipo = 'numerico';
      } else if (picture.startsWith('X')) {
          tipo = 'alfanumerico';
      }
  }

  // Refinar pelo nome (tem precedência para Data e Valor sem picture explícita)
  if (lower.includes('valor') || lower.includes('mora') || lower.includes('multa') || lower.includes('desconto')) {
    tipo = 'valor';
    destino = 'valor';
  } else if (lower.includes('data') || lower.includes('vencimento') || lower.includes('emissão')) {
    tipo = 'data';
    if (lower.includes('vencimento')) destino = 'data_vencimento';
    else if (lower.includes('emissão')) destino = 'data_emissao';
  } else if (lower.includes('cnpj') || lower.includes('cpf')) {
    if (!picture || picture.startsWith('9')) tipo = 'numerico';
    destino = 'sacado_cpf_cnpj'; 
  } else if (lower.includes('nosso número') || lower.includes('nosso numero')) {
    if (!picture || picture.startsWith('9')) tipo = 'numerico';
    destino = 'nosso_numero';
  }

  return { tipo, destino };
}
