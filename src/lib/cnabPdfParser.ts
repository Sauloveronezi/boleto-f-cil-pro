// Parser para extrair configuração CNAB de PDFs de layout do banco
import { 
  LinhaCNAB, 
  CampoCNABCompleto, 
  TipoRegistroCNAB,
  ConfiguracaoCNAB,
  CampoCNAB
} from '@/types/boleto';
import {
  CORES_CAMPOS,
  CORES_TIPO_LINHA,
  gerarLinhasCNAB240,
  gerarLinhasCNAB400,
  identificarTipoLinha,
} from '@/types/cnab';

// Detecta o tipo CNAB baseado no tamanho das linhas
export function detectarTipoCNAB(conteudo: string): 'CNAB_240' | 'CNAB_400' {
  const linhas = conteudo.split('\n').filter(l => l.trim().length > 0);
  if (linhas.length === 0) return 'CNAB_400';
  
  const tamanhoMedio = linhas.reduce((acc, l) => acc + l.length, 0) / linhas.length;
  return tamanhoMedio <= 250 ? 'CNAB_240' : 'CNAB_400';
}

// Analisa arquivo de remessa e retorna linhas organizadas por tipo
export function analisarArquivoRemessa(
  conteudo: string, 
  tipoCNAB: 'CNAB_240' | 'CNAB_400'
): { linhas: LinhaCNAB[]; linhasArquivo: { numero: number; conteudo: string; tipo: TipoRegistroCNAB }[] } {
  const linhasTexto = conteudo.split('\n').filter(l => l.trim().length > 0);
  
  // Identificar cada linha do arquivo
  const linhasArquivo = linhasTexto.map((conteudo, index) => ({
    numero: index + 1,
    conteudo,
    tipo: identificarTipoLinha(conteudo, tipoCNAB),
  }));
  
  // Obter estrutura padrão de linhas
  const linhasPadrao = tipoCNAB === 'CNAB_240' ? gerarLinhasCNAB240() : gerarLinhasCNAB400();
  
  // Extrair valores de exemplo para cada campo
  const linhasComValores = linhasPadrao.map(linhaPadrao => {
    // Encontrar primeira linha do arquivo que corresponde a este tipo
    const linhaExemplo = linhasArquivo.find(l => l.tipo === linhaPadrao.tipo);
    
    if (linhaExemplo) {
      const camposComValores = linhaPadrao.campos.map(campo => ({
        ...campo,
        valorExemplo: linhaExemplo.conteudo.substring(
          campo.posicaoInicio - 1, 
          campo.posicaoFim
        ).trim(),
      }));
      
      return { ...linhaPadrao, campos: camposComValores };
    }
    
    return linhaPadrao;
  });
  
  return { linhas: linhasComValores, linhasArquivo };
}

// Extrai valor formatado de um campo
export function extrairValorCampo(
  linha: string, 
  campo: CampoCNABCompleto
): string {
  if (campo.posicaoFim > linha.length) return '';
  
  let valor = linha.substring(campo.posicaoInicio - 1, campo.posicaoFim).trim();
  
  // Formatar baseado no formato
  if (campo.formato === 'valor_centavos' && valor) {
    const num = parseInt(valor) / 100;
    if (!isNaN(num)) {
      valor = num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
  } else if ((campo.formato === 'data_ddmmaa' || campo.formato === 'data_ddmmaaaa') && valor.length >= 6) {
    const dia = valor.substring(0, 2);
    const mes = valor.substring(2, 4);
    const ano = valor.substring(4);
    valor = `${dia}/${mes}/${ano.length === 2 ? '20' + ano : ano}`;
  }
  
  return valor;
}

// Converte estrutura de linhas para ConfiguracaoCNAB
export function converterLinhasParaConfig(
  linhas: LinhaCNAB[],
  bancoId: string,
  tipoCNAB: 'CNAB_240' | 'CNAB_400',
  nome: string,
  descricao?: string
): ConfiguracaoCNAB {
  // Converter para formato legado (campos simples)
  const camposLegado: CampoCNAB[] = [];
  
  linhas.forEach(linha => {
    linha.campos.forEach(campo => {
      camposLegado.push({
        id: campo.id,
        nome: campo.nome,
        campo_destino: campo.campoDestino || campo.nome.toLowerCase().replace(/\s+/g, '_'),
        posicao_inicio: campo.posicaoInicio,
        posicao_fim: campo.posicaoFim,
        tipo_registro: linha.identificador.valor + (linha.identificador.segmento || ''),
        formato: campo.formato,
        tipo_linha: mapTipoRegistroParaTipoLinha(linha.tipo),
        cor: campo.cor,
      });
    });
  });
  
  const now = new Date().toISOString();
  
  return {
    id: `config_${Date.now()}`,
    banco_id: bancoId,
    tipo_cnab: tipoCNAB,
    nome,
    descricao,
    linhas, // Nova estrutura
    campos: camposLegado, // Estrutura legada
    criado_em: now,
    atualizado_em: now,
  };
}

// Mapeia TipoRegistroCNAB para TipoLinhaCNAB (legado)
function mapTipoRegistroParaTipoLinha(tipo: TipoRegistroCNAB): 'header' | 'detalhe' | 'trailer' | 'header_lote' | 'trailer_lote' {
  switch (tipo) {
    case 'header_arquivo':
      return 'header';
    case 'header_lote':
      return 'header_lote';
    case 'trailer_lote':
      return 'trailer_lote';
    case 'trailer_arquivo':
      return 'trailer';
    default:
      return 'detalhe';
  }
}

// Gera ConfiguracaoCNAB completa a partir de arquivo de remessa
export function gerarConfiguracaoDeRemessa(
  conteudo: string,
  bancoId: string,
  nome: string,
  tipoCNABOverride?: 'CNAB_240' | 'CNAB_400'
): ConfiguracaoCNAB {
  const tipoCNAB = tipoCNABOverride || detectarTipoCNAB(conteudo);
  const { linhas } = analisarArquivoRemessa(conteudo, tipoCNAB);
  
  return converterLinhasParaConfig(
    linhas,
    bancoId,
    tipoCNAB,
    nome,
    `Padrão ${tipoCNAB} gerado automaticamente a partir de arquivo de remessa`
  );
}

// Filtra apenas campos utilizados no boleto
export function filtrarCamposUtilizados(linhas: LinhaCNAB[]): LinhaCNAB[] {
  return linhas.map(linha => ({
    ...linha,
    campos: linha.campos.filter(c => c.utilizadoNoBoleto),
  }));
}

// Retorna campos que serão usados para gerar o boleto
export function getCamposParaBoleto(config: ConfiguracaoCNAB): CampoCNABCompleto[] {
  if (config.linhas) {
    return config.linhas.flatMap(l => l.campos.filter(c => c.utilizadoNoBoleto));
  }
  
  // Fallback para estrutura legada
  return config.campos.map(c => ({
    id: c.id,
    nome: c.nome,
    posicaoInicio: c.posicao_inicio,
    posicaoFim: c.posicao_fim,
    tamanho: c.posicao_fim - c.posicao_inicio + 1,
    tipo: 'alfanumerico' as const,
    formato: c.formato,
    obrigatorio: false,
    utilizadoNoBoleto: true,
    campoDestino: c.campo_destino,
    cor: c.cor || CORES_CAMPOS[0],
  }));
}

// Extrai todos os valores de um arquivo de remessa usando a configuração
export function extrairDadosDeRemessa(
  conteudo: string,
  config: ConfiguracaoCNAB
): Record<string, string>[] {
  const linhasTexto = conteudo.split('\n').filter(l => l.trim().length > 0);
  const resultado: Record<string, string>[] = [];
  
  // Para cada linha de detalhe no arquivo
  linhasTexto.forEach(linhaTexto => {
    const tipo = identificarTipoLinha(linhaTexto, config.tipo_cnab);
    
    // Verificar se é linha de detalhe
    const ehDetalhe = tipo === 'detalhe' || 
                      tipo === 'detalhe_segmento_p' || 
                      tipo === 'detalhe_segmento_q';
    
    if (ehDetalhe) {
      const dados: Record<string, string> = {};
      
      if (config.linhas) {
        // Nova estrutura
        const linhaCfg = config.linhas.find(l => l.tipo === tipo);
        if (linhaCfg) {
          linhaCfg.campos.forEach(campo => {
            if (campo.utilizadoNoBoleto && campo.campoDestino) {
              dados[campo.campoDestino] = extrairValorCampo(linhaTexto, campo);
            }
          });
        }
      } else {
        // Estrutura legada
        config.campos.forEach(campo => {
          const valor = linhaTexto.substring(
            campo.posicao_inicio - 1, 
            campo.posicao_fim
          ).trim();
          dados[campo.campo_destino] = valor;
        });
      }
      
      if (Object.keys(dados).length > 0) {
        resultado.push(dados);
      }
    }
  });
  
  return resultado;
}
