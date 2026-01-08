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
      const field = extractFieldFromLine(line.text, currentSegment);
      if (field) {
        idCounter++;
        campos.push({
          ...field,
          id: String(idCounter),
          tipoLinha: currentSegment,
          cor: CORES_CAMPOS[idCounter % CORES_CAMPOS.length],
          confianca: field.nome.length > 50 ? 70 : 90,
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
  let start = 0;
  let end = 0;
  let name = '';
  let picture = '';

  // Padrões para extração de tabelas de layout CNAB
  const patterns = [
    // Padrão Bradesco/Itaú: "01.0 Campo Nome | 1 | 3 | 3 | Num | Descrição"
    // Campos separados por espaços ou pipes, com número do campo no início
    /^(\d{1,2}\.\d)\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(Num|Alfa|X\(\d+\)|9\(\d+\))/i,
    
    // Padrão tabela com posições: "Campo | Posição Início-Fim | Tamanho"
    // Ex: "Banco 1 3 3 Num"
    /^([A-Za-záàâãéèêíïóôõúç\s\/]+?)\s+(\d{1,3})\s+(\d{1,3})\s+\d+\s+(Num|Alfa|[X9]\(\d+\))/i,
    
    // Padrão FEBRABAN com código do campo: "G001 | Código do Banco | 001 | 003"
    /^[A-Z]\d{3}\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})/i,
    
    // Padrão com Picture completo: "NOME 001 003 9(03)"
    /(.+?)\s+(\d{1,3})\s+(\d{1,3})\s+([X9]\(\d+\)(?:V9\(\d+\))?)/i,
    
    // Padrão genérico: Dois números seguidos no texto (posição início-fim)
    // "001 003 Nome do Campo" ou "Nome 001 003"
    /^(\d{1,3})\s*(?:-|a|à|\s)\s*(\d{1,3})\s+(.+)$/i,
    /^(.+)\s+(\d{1,3})\s*(?:-|a|à|\s)\s*(\d{1,3})$/i,
    
    // Padrão com tamanho: "001 003 3 Nome"
    /^(\d{1,3})\s+(\d{1,3})\s+\d+\s+(.+)$/i,
  ];

  // Tentar cada padrão
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      // Determinar qual grupo é start, end, nome baseado no padrão
      if (regex.source.startsWith('^(\\d{1,2}\\.\\d)')) {
        // Padrão Bradesco: grupo 2 = nome, 3 = start, 4 = end
        name = match[2].trim();
        start = parseInt(match[3]);
        end = parseInt(match[4]);
        picture = match[6] || '';
      } else if (regex.source.includes('A-Z]\\d{3}')) {
        // Padrão FEBRABAN: grupo 1 = nome, 2 = start, 3 = end
        name = match[1].trim();
        start = parseInt(match[2]);
        end = parseInt(match[3]);
      } else if (regex.source.startsWith('^([A-Za-z')) {
        // Padrão simples: grupo 1 = nome, 2 = start, 3 = end
        name = match[1].trim();
        start = parseInt(match[2]);
        end = parseInt(match[3]);
        picture = match[4] || '';
      } else if (regex.source.includes('X9]\\(\\d+\\)\\(')) {
        // Padrão com Picture: grupo 1 = nome, 2 = start, 3 = end, 4 = picture
        name = match[1].trim();
        start = parseInt(match[2]);
        end = parseInt(match[3]);
        picture = match[4];
      } else if (regex.source.startsWith('^(\\d{1,3})\\s*')) {
        // Padrão início com números: grupo 1 = start, 2 = end, 3 = nome
        start = parseInt(match[1]);
        end = parseInt(match[2]);
        name = match[3].trim();
      } else if (regex.source.startsWith('^(.+)\\s+')) {
        // Padrão nome primeiro: grupo 1 = nome, 2 = start, 3 = end
        name = match[1].trim();
        start = parseInt(match[2]);
        end = parseInt(match[3]);
      }
      
      break;
    }
  }

  // Fallback: busca profunda por dois números que pareçam posições
  if (!start || !end || !name) {
    const regexDeep = /(\d{1,3})\s*(?:-|a|à)\s*(\d{1,3})/;
    const deepMatch = text.match(regexDeep);
    if (deepMatch) {
      start = parseInt(deepMatch[1]);
      end = parseInt(deepMatch[2]);
      const parts = text.split(deepMatch[0]);
      name = parts[0].trim();
      if (!name && parts[1]) name = parts[1].trim();
    }
  }
  
  if (start > 0 && end > 0 && name) {
    name = name.trim();
    
    // Limpezas comuns no nome
    name = name.replace(/^[-–—]\s*/, '');
    name = name.replace(/\s*[-–—]$/, '');
    name = name.replace(/^\d{1,2}\.\d\s*/, ''); // Remove "01.0 " do início
    name = name.replace(/\s+/g, ' '); // Normaliza espaços
    
    // Validações básicas
    if (start > end) return null;
    if (end > 444) return null; // CNAB 400 + margem ou 240 + margem
    if (name.length < 2) return null;
    
    // Ignorar linhas que parecem cabeçalhos de tabela
    const lowerName = name.toLowerCase();
    const headerWords = ['de', 'até', 'pos', 'posição', 'nome do campo', 'conteúdo', 'picture', 
                         'formato', 'default', 'descrição', 'nº', 'campo', 'tamanho'];
    if (headerWords.includes(lowerName)) {
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
    const picLower = picture.toLowerCase();
    if (picLower.includes('v') || picLower.includes('9v')) {
      tipo = 'valor';
    } else if (picture.startsWith('9') || picLower === 'num') {
      tipo = 'numerico';
    } else if (picture.startsWith('X') || picLower === 'alfa') {
      tipo = 'alfanumerico';
    }
  }

  // Refinar pelo nome (tem precedência para Data e Valor)
  if (lower.includes('valor') || lower.includes('mora') || lower.includes('multa') || lower.includes('desconto')) {
    tipo = 'valor';
    destino = 'valor';
  } else if (lower.includes('data') || lower.includes('vencimento') || lower.includes('emissão') || lower.includes('geração')) {
    tipo = 'data';
    if (lower.includes('vencimento')) destino = 'data_vencimento';
    else if (lower.includes('emissão')) destino = 'data_emissao';
    else if (lower.includes('geração')) destino = 'data_geracao';
  } else if (lower.includes('cnpj') || lower.includes('cpf') || lower.includes('inscrição')) {
    if (!picture || picture.toLowerCase().includes('num') || picture.startsWith('9')) tipo = 'numerico';
    destino = 'sacado_cpf_cnpj'; 
  } else if (lower.includes('nosso número') || lower.includes('nosso numero')) {
    if (!picture || picture.toLowerCase().includes('num') || picture.startsWith('9')) tipo = 'numerico';
    destino = 'nosso_numero';
  } else if (lower.includes('banco') && (lower.includes('código') || lower.includes('codigo'))) {
    tipo = 'numerico';
    destino = 'codigo_banco';
  } else if (lower.includes('agência') || lower.includes('agencia')) {
    tipo = 'numerico';
    destino = 'agencia';
  } else if (lower.includes('conta') && !lower.includes('conta-corrente')) {
    tipo = 'numerico';
    destino = 'conta';
  } else if (lower.includes('nome') && (lower.includes('empresa') || lower.includes('beneficiário') || lower.includes('cedente'))) {
    destino = 'razao_social';
  } else if (lower.includes('nome') && (lower.includes('pagador') || lower.includes('sacado'))) {
    destino = 'nome_sacado';
  } else if (lower.includes('convênio') || lower.includes('convenio')) {
    destino = 'convenio';
  } else if (lower.includes('carteira')) {
    destino = 'carteira';
  } else if (lower.includes('sequência') || lower.includes('sequencial') || lower.includes('nsa')) {
    tipo = 'numerico';
    destino = 'sequencial';
  }

  return { tipo, destino };
}
