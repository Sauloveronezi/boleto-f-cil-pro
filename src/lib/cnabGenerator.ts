/**
 * Gerador de Arquivos CNAB
 * Gera arquivos CNAB 240/400 a partir de linhas editadas
 */

import { LinhaCNAB } from '@/hooks/useArquivosCNAB';
import { ConfiguracaoCNAB, CampoCNAB, CampoCNABCompleto, LinhaCNAB as LinhaCNABConfig } from '@/types/boleto';
import type { Json } from '@/integrations/supabase/types';

/**
 * Formatar valor de acordo com o tipo do campo
 */
function formatarValorCampo(
  valor: string | number | null | undefined,
  tamanho: number,
  tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor' = 'alfanumerico'
): string {
  const valorStr = String(valor ?? '');
  
  if (tipo === 'numerico' || tipo === 'valor') {
    // Numérico: preencher com zeros à esquerda
    const numeros = valorStr.replace(/\D/g, '');
    return numeros.padStart(tamanho, '0').substring(0, tamanho);
  } else if (tipo === 'data') {
    // Data: formatar como DDMMAAAA ou DDMMAA
    const dataLimpa = valorStr.replace(/\D/g, '');
    return dataLimpa.padStart(tamanho, '0').substring(0, tamanho);
  } else {
    // Alfanumérico: preencher com espaços à direita
    return valorStr.padEnd(tamanho, ' ').substring(0, tamanho).toUpperCase();
  }
}

/**
 * Gerar uma linha CNAB a partir de campos
 */
export function gerarLinhaCNAB(
  campos: Record<string, { valor: string | number | null; posicaoInicio: number; posicaoFim: number; tipo?: string }>,
  tamanhoLinha: number = 240
): string {
  // Inicializar linha com espaços
  let linha = ' '.repeat(tamanhoLinha);
  
  // Preencher cada campo na posição correta
  for (const [nome, campo] of Object.entries(campos)) {
    const tamanho = campo.posicaoFim - campo.posicaoInicio + 1;
    const valorFormatado = formatarValorCampo(
      campo.valor,
      tamanho,
      campo.tipo as 'numerico' | 'alfanumerico' | 'data' | 'valor'
    );
    
    // Substituir na linha (posições são base 1)
    const inicio = campo.posicaoInicio - 1;
    linha = linha.substring(0, inicio) + valorFormatado + linha.substring(inicio + tamanho);
  }
  
  return linha;
}

/**
 * Aplicar edições a uma linha CNAB existente
 */
export function aplicarEdicoes(
  linhaOriginal: string,
  camposEditados: Json | Record<string, unknown> | null,
  tamanhoLinha: number = 240
): string {
  if (!camposEditados || typeof camposEditados !== 'object' || camposEditados === null) {
    return linhaOriginal;
  }
  
  const camposObj = camposEditados as Record<string, unknown>;
  if (Object.keys(camposObj).length === 0) {
    return linhaOriginal;
  }
  
  let linha = linhaOriginal.padEnd(tamanhoLinha, ' ');
  
  for (const [key, valor] of Object.entries(camposObj)) {
    // Espera formato: { posicaoInicio, posicaoFim, valor, tipo }
    if (typeof valor === 'object' && valor !== null) {
      const campo = valor as { posicaoInicio?: number; posicaoFim?: number; valor?: string | number; tipo?: string };
      
      if (campo.posicaoInicio && campo.posicaoFim) {
        const tamanho = campo.posicaoFim - campo.posicaoInicio + 1;
        const valorFormatado = formatarValorCampo(
          campo.valor,
          tamanho,
          campo.tipo as 'numerico' | 'alfanumerico' | 'data' | 'valor'
        );
        
        const inicio = campo.posicaoInicio - 1;
        linha = linha.substring(0, inicio) + valorFormatado + linha.substring(inicio + tamanho);
      }
    }
  }
  
  return linha;
}

/**
 * Gerar arquivo CNAB completo a partir de linhas
 */
export function gerarArquivoCNAB(
  linhas: LinhaCNAB[],
  tipoArquivo: 'remessa' | 'retorno',
  tipoCNAB: 'CNAB_240' | 'CNAB_400'
): string {
  const tamanhoLinha = tipoCNAB === 'CNAB_240' ? 240 : 400;
  
  // Ordenar linhas por número
  const linhasOrdenadas = [...linhas]
    .filter(l => l.status !== 'removido')
    .sort((a, b) => a.numero_linha - b.numero_linha);
  
  // Gerar cada linha
  const linhasGeradas = linhasOrdenadas.map(linha => {
    // Usar conteúdo editado se existir, senão original
    const conteudoBase = linha.conteudo_editado || linha.conteudo_original;
    
    // Aplicar edições de campos se existirem
    return aplicarEdicoes(conteudoBase, linha.campos_editados, tamanhoLinha);
  });
  
  // Juntar com quebra de linha
  return linhasGeradas.join('\n');
}

/**
 * Gerar arquivo CNAB a partir de configuração e dados
 */
export function gerarArquivoCNABFromConfig(
  config: ConfiguracaoCNAB,
  dados: Record<string, string>[],
  tipoArquivo: 'remessa' | 'retorno'
): string {
  const tamanhoLinha = config.tipo_cnab === 'CNAB_240' ? 240 : 400;
  const linhas: string[] = [];
  
  // Agrupar campos por tipo de linha (suporta ambos CampoCNAB e CampoCNABCompleto)
  const camposPorTipo = new Map<string, Array<CampoCNAB | CampoCNABCompleto>>();
  
  if (config.linhas && config.linhas.length > 0) {
    for (const linhaConfig of config.linhas) {
      camposPorTipo.set(linhaConfig.tipo, linhaConfig.campos);
    }
  } else if (config.campos) {
    // Fallback para formato legado
    const detalheCampos = config.campos.filter(c => 
      !c.tipo_linha || c.tipo_linha === 'detalhe'
    );
    camposPorTipo.set('detalhe', detalheCampos);
  }
  
  // Gerar header (se existir configuração)
  const headerCampos = camposPorTipo.get('header_arquivo') || camposPorTipo.get('header');
  if (headerCampos && headerCampos.length > 0) {
    linhas.push(gerarLinhaFromCamposUniversal(headerCampos, {}, tamanhoLinha));
  }
  
  // Gerar detalhes
  const detalheCampos = camposPorTipo.get('detalhe') || 
                        camposPorTipo.get('detalhe_segmento_p') || 
                        [];
  
  for (const registro of dados) {
    linhas.push(gerarLinhaFromCamposUniversal(detalheCampos, registro, tamanhoLinha));
  }
  
  // Gerar trailer (se existir configuração)
  const trailerCampos = camposPorTipo.get('trailer_arquivo') || camposPorTipo.get('trailer');
  if (trailerCampos && trailerCampos.length > 0) {
    const dadosTrailer: Record<string, string> = {
      qtd_registros: String(linhas.length + 1),
      total_registros: String(linhas.length + 1),
    };
    linhas.push(gerarLinhaFromCamposUniversal(trailerCampos, dadosTrailer, tamanhoLinha));
  }
  
  return linhas.join('\n');
}

/**
 * Gerar uma linha a partir de campos de configuração e dados
 * Suporta tanto CampoCNAB quanto CampoCNABCompleto
 */
function gerarLinhaFromCamposUniversal(
  campos: Array<CampoCNAB | CampoCNABCompleto>,
  dados: Record<string, string>,
  tamanhoLinha: number
): string {
  let linha = ' '.repeat(tamanhoLinha);
  
  for (const campo of campos) {
    // Detectar tipo de campo e extrair propriedades
    const isCampoCompleto = 'posicaoInicio' in campo;
    
    const posicaoInicio = isCampoCompleto ? (campo as CampoCNABCompleto).posicaoInicio : (campo as CampoCNAB).posicao_inicio;
    const posicaoFim = isCampoCompleto ? (campo as CampoCNABCompleto).posicaoFim : (campo as CampoCNAB).posicao_fim;
    const campoDestino = isCampoCompleto ? (campo as CampoCNABCompleto).campoDestino : (campo as CampoCNAB).campo_destino;
    const formato = isCampoCompleto ? (campo as CampoCNABCompleto).formato : (campo as CampoCNAB).formato;
    
    // Buscar valor nos dados ou usar padrão
    const valor = (campoDestino ? dados[campoDestino] : undefined) || 
                  dados[campo.nome.toLowerCase().replace(/\s/g, '_')] || 
                  '';
    
    const tamanho = posicaoFim - posicaoInicio + 1;
    const tipo = formato?.includes('valor') || formato?.includes('numerico') 
      ? 'numerico' 
      : formato?.includes('data') 
        ? 'data' 
        : 'alfanumerico';
    
    const valorFormatado = formatarValorCampo(valor, tamanho, tipo);
    
    const inicio = posicaoInicio - 1;
    linha = linha.substring(0, inicio) + valorFormatado + linha.substring(inicio + tamanho);
  }
  
  return linha;
}

/**
 * Gerar uma linha a partir de campos de configuração e dados (legado)
 */
function gerarLinhaFromCampos(
  campos: CampoCNAB[],
  dados: Record<string, string>,
  tamanhoLinha: number
): string {
  return gerarLinhaFromCamposUniversal(campos, dados, tamanhoLinha);
}

/**
 * Validar arquivo CNAB gerado
 */
export function validarArquivoCNAB(
  conteudo: string,
  tipoCNAB: 'CNAB_240' | 'CNAB_400'
): { valido: boolean; erros: string[] } {
  const tamanhoEsperado = tipoCNAB === 'CNAB_240' ? 240 : 400;
  const linhas = conteudo.split('\n').filter(l => l.trim());
  const erros: string[] = [];
  
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    
    // Verificar tamanho
    if (linha.length !== tamanhoEsperado) {
      erros.push(`Linha ${i + 1}: tamanho ${linha.length}, esperado ${tamanhoEsperado}`);
    }
    
    // Verificar tipo de registro
    if (tipoCNAB === 'CNAB_240') {
      const tipoRegistro = linha.charAt(7);
      if (!['0', '1', '3', '5', '9'].includes(tipoRegistro)) {
        erros.push(`Linha ${i + 1}: tipo de registro inválido '${tipoRegistro}'`);
      }
    } else {
      const tipoRegistro = linha.charAt(0);
      if (!['0', '1', '9'].includes(tipoRegistro)) {
        erros.push(`Linha ${i + 1}: tipo de registro inválido '${tipoRegistro}'`);
      }
    }
  }
  
  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * Criar download do arquivo CNAB
 */
export function downloadArquivoCNAB(
  conteudo: string,
  nomeArquivo: string,
  tipoArquivo: 'remessa' | 'retorno'
): void {
  const extensao = tipoArquivo === 'remessa' ? '.rem' : '.ret';
  const nomeCompleto = nomeArquivo.endsWith(extensao) ? nomeArquivo : `${nomeArquivo}${extensao}`;
  
  const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeCompleto;
  link.click();
  
  URL.revokeObjectURL(url);
}
