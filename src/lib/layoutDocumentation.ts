import { ModeloBoleto } from '@/types/boleto';
import { format } from 'date-fns';

/**
 * Gera uma documentação em formato Markdown para o modelo de layout.
 * @param modelo O modelo de boleto a ser documentado.
 * @returns String contendo o conteúdo Markdown.
 */
export function gerarDocumentacaoLayout(modelo: ModeloBoleto): string {
  const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

  let md = `# Documentação do Layout: ${modelo.nome_modelo}\n\n`;
  md += `**Data de Geração:** ${dataGeracao}\n`;
  md += `**ID do Modelo:** ${modelo.id}\n`;
  md += `**Tipo de Layout:** ${modelo.tipo_layout}\n`;
  md += `**Banco Principal:** ${modelo.banco_id}\n`;
  if (modelo.bancos_compativeis && modelo.bancos_compativeis.length > 0) {
    md += `**Bancos Compatíveis:** ${modelo.bancos_compativeis.join(', ')}\n`;
  }
  md += `**Padrão:** ${modelo.padrao ? 'Sim' : 'Não'}\n\n`;

  md += `## Instruções\n\n`;
  md += `${modelo.texto_instrucoes || 'Nenhuma instrução fornecida.'}\n\n`;

  md += `## Campos Mapeados\n\n`;
  md += `Total de campos: ${modelo.campos_mapeados.length}\n\n`;

  if (modelo.campos_mapeados.length > 0) {
    md += `| Nome do Campo | Variável | Posição (X, Y) | Dimensões (L x A) |\n`;
    md += `|---|---|---|---|\n`;

    // Ordenar campos por posição Y e depois X para leitura lógica
    const camposOrdenados = [...modelo.campos_mapeados].sort((a, b) => {
      if (Math.abs(a.posicao_y - b.posicao_y) > 5) {
        return a.posicao_y - b.posicao_y;
      }
      return a.posicao_x - b.posicao_x;
    });

    camposOrdenados.forEach(campo => {
      const x = campo.posicao_x.toFixed(2);
      const y = campo.posicao_y.toFixed(2);
      const w = campo.largura.toFixed(2);
      const h = campo.altura.toFixed(2);
      md += `| ${campo.nome} | \`${campo.variavel}\` | (${x}, ${y}) | ${w} x ${h} |\n`;
    });
  } else {
    md += `_Nenhum campo mapeado neste modelo._\n`;
  }

  md += `\n## Dicionário de Variáveis Comuns\n\n`;
  md += `Abaixo estão algumas das variáveis padrão disponíveis para uso neste layout:\n\n`;
  md += `- \`pagador_nome\`: Nome ou Razão Social do pagador\n`;
  md += `- \`pagador_cnpj\`: CPF ou CNPJ do pagador\n`;
  md += `- \`valor_documento\`: Valor do documento formatado\n`;
  md += `- \`data_vencimento\`: Data de vencimento formatada\n`;
  md += `- \`nosso_numero\`: Nosso Número calculado ou fornecido\n`;
  md += `- \`linha_digitavel\`: Linha digitável completa\n`;
  md += `- \`codigo_barras\`: Código de barras numérico\n`;
  
  return md;
}

/**
 * Inicia o download do arquivo de documentação.
 * @param modelo O modelo de boleto.
 */
export function downloadDocumentacao(modelo: ModeloBoleto) {
  const conteudo = gerarDocumentacaoLayout(modelo);
  const blob = new Blob([conteudo], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `layout_${modelo.nome_modelo.replace(/\s+/g, '_').toLowerCase()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
