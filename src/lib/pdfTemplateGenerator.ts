import jsPDF from 'jspdf';
import { NotaFiscal, Cliente, Banco, ConfiguracaoBanco, TipoImpressao, TIPOS_IMPRESSAO } from '@/types/boleto';
import { TemplateBoletoCompleto, CampoTemplateBoleto } from '@/types/templateBoleto';
import { gerarCodigoBarras as calcularCodigoBarras, gerarBarrasVisuais, DadosCodigoBarras } from './barcodeCalculator';
import { carregarDadosEmpresa, DadosEmpresa } from '@/types/empresa';

interface DadosBoletoTemplate {
  nota: NotaFiscal;
  cliente: Cliente;
  banco: Banco;
  configuracao?: ConfiguracaoBanco;
  tipoOrigem: TipoImpressao;
  dadosCodigoBarras: DadosCodigoBarras;
  empresa: DadosEmpresa;
}

// Formata valor em moeda brasileira
function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

// Formata data
function formatarData(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR');
}

// Formata CPF/CNPJ
function formatarCpfCnpj(documento: string): string {
  const numeros = documento.replace(/\D/g, '');
  if (numeros.length === 11) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (numeros.length === 14) {
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return documento;
}

// Obtém o valor de um campo baseado no tipo
function obterValorCampo(
  campo: CampoTemplateBoleto,
  dados: DadosBoletoTemplate
): string {
  const { nota, cliente, banco, configuracao, dadosCodigoBarras, empresa } = dados;

  // Se tem valor fixo, retorna ele
  if (campo.valor_fixo) {
    return campo.valor_fixo;
  }

  let valor = '';

  switch (campo.tipo) {
    // Banco
    case 'banco_codigo':
      valor = banco.codigo_banco;
      break;
    case 'banco_nome':
      valor = banco.nome_banco;
      break;
    
    // Beneficiário
    case 'beneficiario_nome':
      valor = empresa.razaoSocial;
      break;
    case 'beneficiario_cnpj':
      valor = empresa.cnpj;
      break;
    case 'beneficiario_endereco':
      valor = `${empresa.endereco}, ${empresa.numero}${empresa.complemento ? ` - ${empresa.complemento}` : ''} - ${empresa.bairro}`;
      break;
    case 'beneficiario_cidade_uf':
      valor = `${empresa.cidade}/${empresa.estado}`;
      break;
    case 'beneficiario_cep':
      valor = empresa.cep;
      break;
    
    // Pagador
    case 'pagador_nome':
      valor = cliente.razao_social;
      break;
    case 'pagador_cnpj':
      valor = cliente.cnpj;
      break;
    case 'pagador_endereco':
      valor = cliente.endereco;
      break;
    case 'pagador_cidade_uf':
      valor = `${cliente.cidade}/${cliente.estado}`;
      break;
    case 'pagador_cep':
      valor = cliente.cep;
      break;
    
    // Título
    case 'nosso_numero':
      valor = dadosCodigoBarras.nossoNumeroFormatado || dadosCodigoBarras.nossoNumero;
      break;
    case 'numero_documento':
      valor = `${nota.numero_nota}-${nota.serie}`;
      break;
    case 'especie_documento':
      valor = 'DM';
      break;
    case 'aceite':
      valor = 'N';
      break;
    case 'data_documento':
      valor = nota.data_emissao;
      break;
    case 'data_processamento':
      valor = new Date().toISOString().split('T')[0];
      break;
    case 'data_vencimento':
      valor = nota.data_vencimento;
      break;
    case 'valor_documento':
      valor = String(nota.valor_titulo);
      break;
    case 'valor_cobrado':
      valor = '';
      break;
    case 'desconto_abatimento':
      valor = '';
      break;
    case 'outras_deducoes':
      valor = '';
      break;
    case 'mora_multa':
      valor = '';
      break;
    case 'outros_acrescimos':
      valor = '';
      break;
    
    // Dados Bancários
    case 'agencia_codigo':
      valor = configuracao ? `${configuracao.agencia} / ${configuracao.codigo_cedente}` : '0000 / 000000';
      break;
    case 'carteira':
      valor = configuracao?.carteira || '17';
      break;
    case 'especie_moeda':
      valor = 'R$';
      break;
    case 'quantidade':
      valor = '';
      break;
    case 'valor_moeda':
      valor = '';
      break;
    case 'local_pagamento':
      valor = 'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO';
      break;
    
    // Código de Barras
    case 'linha_digitavel':
      valor = dadosCodigoBarras.linhaDigitavel;
      break;
    case 'codigo_barras':
      valor = dadosCodigoBarras.codigoBarras;
      break;
    
    // Instruções
    case 'instrucoes':
      valor = configuracao?.texto_instrucao_padrao || 
        'Não receber após o vencimento. Cobrar juros de mora de 1% ao mês e multa de 2%.';
      break;
    
    default:
      valor = '';
  }

  // Aplica formatação
  if (campo.formato && valor) {
    switch (campo.formato) {
      case 'moeda':
        valor = formatarMoeda(parseFloat(valor) || 0);
        break;
      case 'data':
        valor = formatarData(valor);
        break;
      case 'cpf_cnpj':
        valor = formatarCpfCnpj(valor);
        break;
    }
  }

  return valor;
}

// Desenha um campo no PDF
function desenharCampo(
  doc: jsPDF,
  campo: CampoTemplateBoleto,
  valor: string,
  dados: DadosBoletoTemplate,
  offsetY: number = 0
): void {
  const x = campo.x;
  const y = campo.y + offsetY;

  // Desenha fundo se houver
  if (campo.cor_fundo) {
    const rgb = hexToRgb(campo.cor_fundo);
    if (rgb) {
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(x, y, campo.largura, campo.altura, 'F');
    }
  }

  // Desenha borda se houver
  if (campo.borda) {
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, campo.largura, campo.altura);
  }

  // Caso especial: código de barras
  if (campo.tipo === 'codigo_barras') {
    desenharCodigoBarras(doc, dados.dadosCodigoBarras.codigoBarras, x, y, campo.largura, campo.altura);
    return;
  }

  // Configura fonte
  const fonte = campo.fonte || 'helvetica';
  const estilo = campo.negrito ? 'bold' : campo.italico ? 'italic' : 'normal';
  doc.setFont(fonte, estilo);
  doc.setFontSize(campo.tamanho_fonte || 9);

  // Configura cor do texto
  if (campo.cor) {
    const rgb = hexToRgb(campo.cor);
    if (rgb) {
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
    }
  } else {
    doc.setTextColor(0, 0, 0);
  }

  // Desenha label (pequeno, acima do valor)
  if (campo.label && campo.borda) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(campo.label, x + 2, y + 4);
    
    // Restaura configuração para o valor
    doc.setFont(fonte, estilo);
    doc.setFontSize(campo.tamanho_fonte || 9);
    doc.setTextColor(0, 0, 0);
  }

  // Posição do texto
  let textY = y + (campo.borda ? campo.altura - 3 : campo.altura / 2 + 3);
  let textX = x + 2;

  // Alinhamento
  if (campo.alinhamento === 'center') {
    textX = x + campo.largura / 2;
    doc.text(valor, textX, textY, { align: 'center' });
  } else if (campo.alinhamento === 'right') {
    textX = x + campo.largura - 2;
    doc.text(valor, textX, textY, { align: 'right' });
  } else {
    // Quebra texto se necessário
    const linhas = doc.splitTextToSize(valor, campo.largura - 4);
    doc.text(linhas, textX, textY);
  }
}

// Desenha código de barras ITF
function desenharCodigoBarras(
  doc: jsPDF,
  codigoBarras: string,
  x: number,
  y: number,
  largura: number,
  altura: number
): void {
  const barras = gerarBarrasVisuais(codigoBarras);
  const barHeight = altura - 10;
  const narrowWidth = 0.35;
  
  // Calcula largura total
  let totalWidth = 0;
  for (const barra of barras) {
    totalWidth += barra.largura * narrowWidth;
  }
  
  // Centraliza
  let barX = x + (largura - totalWidth) / 2;
  
  // Desenha barras
  for (const barra of barras) {
    const barWidth = barra.largura * narrowWidth;
    if (barra.tipo === 'barra') {
      doc.setFillColor(0, 0, 0);
      doc.rect(barX, y + 2, barWidth, barHeight, 'F');
    }
    barX += barWidth;
  }
  
  // Adiciona números abaixo
  doc.setFontSize(9);
  doc.setFont('courier', 'bold');
  doc.setTextColor(0, 0, 0);
  const textWidth = doc.getTextWidth(codigoBarras);
  doc.text(codigoBarras, x + (largura - textWidth) / 2, y + altura - 2);
}

// Converte hex para RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Desenha um boleto usando o template
function desenharBoletoComTemplate(
  doc: jsPDF,
  template: TemplateBoletoCompleto,
  dados: DadosBoletoTemplate,
  startY: number
): number {
  const alturaTotal = calcularAlturaBoleto(template);
  
  // Desenha cada campo do template
  for (const campo of template.campos) {
    const valor = obterValorCampo(campo, dados);
    desenharCampo(doc, campo, valor, dados, startY);
  }
  
  // Linha de corte
  const pageWidth = doc.internal.pageSize.getWidth();
  const cutY = startY + alturaTotal;
  doc.setDrawColor(150, 150, 150);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(template.margem_esquerda, cutY, pageWidth - template.margem_direita, cutY);
  doc.setLineDashPattern([], 0);
  
  return cutY + 5;
}

// Calcula altura total do boleto baseado no template
function calcularAlturaBoleto(template: TemplateBoletoCompleto): number {
  let maxY = 0;
  for (const campo of template.campos) {
    const campoFim = campo.y + campo.altura;
    if (campoFim > maxY) {
      maxY = campoFim;
    }
  }
  return maxY + 10; // Adiciona margem
}

// Gera PDF usando template
export function gerarPDFBoletosComTemplate(
  notas: NotaFiscal[],
  clientes: Cliente[],
  banco: Banco,
  configuracao: ConfiguracaoBanco | undefined,
  tipoOrigem: TipoImpressao,
  template: TemplateBoletoCompleto,
  tipoSaida: 'arquivo_unico' | 'individual'
): void {
  const doc = new jsPDF({
    orientation: template.orientacao,
    unit: 'mm',
    format: [template.largura_pagina, template.altura_pagina]
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const boletoHeight = calcularAlturaBoleto(template);
  let currentY = template.margem_superior;
  
  const empresa = carregarDadosEmpresa();

  notas.forEach((nota, index) => {
    const cliente = clientes.find(c => c.id === nota.codigo_cliente);
    if (!cliente) return;

    // Verifica se precisa de nova página
    if (currentY + boletoHeight > pageHeight - template.margem_inferior) {
      doc.addPage();
      currentY = template.margem_superior;
    }
    
    const dadosCodigoBarras = calcularCodigoBarras(banco, nota, configuracao);

    const dados: DadosBoletoTemplate = {
      nota,
      cliente,
      banco,
      configuracao,
      tipoOrigem,
      dadosCodigoBarras,
      empresa
    };

    currentY = desenharBoletoComTemplate(doc, template, dados, currentY);
    currentY += 5;
  });

  // Rodapé
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} | Template: ${template.nome} | Página ${i} de ${totalPages}`,
      template.margem_esquerda,
      pageHeight - 5
    );
  }

  // Download
  const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const nomeArquivo = `boletos_${banco.codigo_banco}_${dataAtual}.pdf`;
  doc.save(nomeArquivo);
}

// Carrega template do localStorage
export function carregarTemplate(templateId: string): TemplateBoletoCompleto | null {
  const templates = JSON.parse(localStorage.getItem('templates_boleto') || '[]');
  return templates.find((t: TemplateBoletoCompleto) => t.id === templateId) || null;
}

// Salva template no localStorage
export function salvarTemplate(template: TemplateBoletoCompleto): void {
  const templates = JSON.parse(localStorage.getItem('templates_boleto') || '[]');
  const index = templates.findIndex((t: TemplateBoletoCompleto) => t.id === template.id);
  
  if (index >= 0) {
    templates[index] = template;
  } else {
    templates.push(template);
  }
  
  localStorage.setItem('templates_boleto', JSON.stringify(templates));
}

// Lista todos os templates
export function listarTemplates(): TemplateBoletoCompleto[] {
  return JSON.parse(localStorage.getItem('templates_boleto') || '[]');
}
