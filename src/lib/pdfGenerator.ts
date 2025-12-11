import jsPDF from 'jspdf';
import { NotaFiscal, Cliente, Banco, ConfiguracaoBanco, TipoImpressao, TIPOS_IMPRESSAO } from '@/types/boleto';

interface DadosBoleto {
  nota: NotaFiscal;
  cliente: Cliente;
  banco: Banco;
  configuracao?: ConfiguracaoBanco;
  tipoOrigem: TipoImpressao;
}

// Gera código de barras fictício para demonstração
function gerarCodigoBarras(banco: Banco, nota: NotaFiscal): string {
  const codigoBanco = banco.codigo_banco.padStart(3, '0');
  const valor = Math.floor(nota.valor_titulo * 100).toString().padStart(10, '0');
  const data = nota.data_vencimento.replace(/-/g, '');
  return `${codigoBanco}9${valor}${data}00000000000`;
}

// Gera linha digitável fictícia para demonstração
function gerarLinhaDigitavel(codigoBarras: string): string {
  const parte1 = codigoBarras.substring(0, 5) + '.' + codigoBarras.substring(5, 10);
  const parte2 = codigoBarras.substring(10, 15) + '.' + codigoBarras.substring(15, 21);
  const parte3 = codigoBarras.substring(21, 26) + '.' + codigoBarras.substring(26, 32);
  const parte4 = codigoBarras.substring(32, 33);
  const parte5 = codigoBarras.substring(33);
  return `${parte1} ${parte2} ${parte3} ${parte4} ${parte5}`;
}

// Gera nosso número fictício
function gerarNossoNumero(banco: Banco, nota: NotaFiscal): string {
  const baseNum = parseInt(nota.id) * 1000 + parseInt(banco.id);
  return baseNum.toString().padStart(11, '0');
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

// Desenha um boleto individual no PDF
function desenharBoleto(
  doc: jsPDF,
  dados: DadosBoleto,
  startY: number
): number {
  const { nota, cliente, banco, configuracao, tipoOrigem } = dados;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  const codigoBarras = gerarCodigoBarras(banco, nota);
  const linhaDigitavel = gerarLinhaDigitavel(codigoBarras);
  const nossoNumero = gerarNossoNumero(banco, nota);
  
  let y = startY;

  // Header com informações do banco
  doc.setFillColor(30, 64, 175); // primary color
  doc.rect(margin, y, contentWidth, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${banco.codigo_banco} - ${banco.nome_banco}`, margin + 5, y + 8);
  
  doc.setFontSize(8);
  doc.text(`Origem: ${TIPOS_IMPRESSAO[tipoOrigem].label}`, pageWidth - margin - 50, y + 8);
  
  y += 15;

  // Linha digitável
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setFontSize(11);
  doc.setFont('courier', 'bold');
  doc.text(linhaDigitavel, margin + 5, y + 7);
  
  y += 13;

  // Grid de informações
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  // Linha 1: Local de pagamento
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Local de Pagamento', margin + 2, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO', margin + 2, y + 10);
  
  y += 12;

  // Linha 2: Beneficiário e Agência/Código
  const col1Width = contentWidth * 0.7;
  const col2Width = contentWidth * 0.3;
  
  doc.rect(margin, y, col1Width, 12);
  doc.rect(margin + col1Width, y, col2Width, 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Beneficiário', margin + 2, y + 4);
  doc.text('Agência/Código do Beneficiário', margin + col1Width + 2, y + 4);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EMPRESA DEMONSTRAÇÃO LTDA', margin + 2, y + 10);
  doc.text(configuracao ? `${configuracao.agencia} / ${configuracao.codigo_cedente}` : '0000 / 000000', margin + col1Width + 2, y + 10);
  
  y += 12;

  // Linha 3: Data documento, Número documento, Espécie doc, Aceite, Data processamento
  const col3Width = contentWidth / 5;
  
  doc.rect(margin, y, col3Width, 12);
  doc.rect(margin + col3Width, y, col3Width, 12);
  doc.rect(margin + col3Width * 2, y, col3Width, 12);
  doc.rect(margin + col3Width * 3, y, col3Width, 12);
  doc.rect(margin + col3Width * 4, y, col3Width, 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Data do Documento', margin + 2, y + 4);
  doc.text('Nº do Documento', margin + col3Width + 2, y + 4);
  doc.text('Espécie Doc.', margin + col3Width * 2 + 2, y + 4);
  doc.text('Aceite', margin + col3Width * 3 + 2, y + 4);
  doc.text('Data Processamento', margin + col3Width * 4 + 2, y + 4);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(formatarData(nota.data_emissao), margin + 2, y + 10);
  doc.text(`${nota.numero_nota}-${nota.serie}`, margin + col3Width + 2, y + 10);
  doc.text('DM', margin + col3Width * 2 + 2, y + 10);
  doc.text('N', margin + col3Width * 3 + 2, y + 10);
  doc.text(formatarData(new Date().toISOString().split('T')[0]), margin + col3Width * 4 + 2, y + 10);
  
  y += 12;

  // Linha 4: Uso do banco, Carteira, Espécie, Quantidade, Valor
  doc.rect(margin, y, col3Width, 12);
  doc.rect(margin + col3Width, y, col3Width, 12);
  doc.rect(margin + col3Width * 2, y, col3Width, 12);
  doc.rect(margin + col3Width * 3, y, col3Width, 12);
  doc.rect(margin + col3Width * 4, y, col3Width, 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Uso do Banco', margin + 2, y + 4);
  doc.text('Carteira', margin + col3Width + 2, y + 4);
  doc.text('Moeda', margin + col3Width * 2 + 2, y + 4);
  doc.text('Quantidade', margin + col3Width * 3 + 2, y + 4);
  doc.text('(=) Valor Documento', margin + col3Width * 4 + 2, y + 4);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('', margin + 2, y + 10);
  doc.text(configuracao?.carteira || '17', margin + col3Width + 2, y + 10);
  doc.text('R$', margin + col3Width * 2 + 2, y + 10);
  doc.text('', margin + col3Width * 3 + 2, y + 10);
  doc.text(formatarMoeda(nota.valor_titulo), margin + col3Width * 4 + 2, y + 10);
  
  y += 12;

  // Linha 5: Nosso número e Vencimento
  doc.rect(margin, y, col1Width, 12);
  doc.rect(margin + col1Width, y, col2Width / 2, 12);
  doc.rect(margin + col1Width + col2Width / 2, y, col2Width / 2, 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Nosso Número', margin + 2, y + 4);
  doc.text('Vencimento', margin + col1Width + 2, y + 4);
  doc.text('Valor Cobrado', margin + col1Width + col2Width / 2 + 2, y + 4);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(nossoNumero, margin + 2, y + 10);
  doc.text(formatarData(nota.data_vencimento), margin + col1Width + 2, y + 10);
  doc.text('', margin + col1Width + col2Width / 2 + 2, y + 10);
  
  y += 12;

  // Sacado (Pagador)
  doc.rect(margin, y, contentWidth, 22);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Pagador', margin + 2, y + 4);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`${cliente.razao_social}`, margin + 2, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${cliente.cnpj}`, margin + 2, y + 15);
  doc.text(`${cliente.endereco} - ${cliente.cidade}/${cliente.estado} - CEP: ${cliente.cep}`, margin + 2, y + 20);
  
  y += 22;

  // Instruções
  const instrucaoTexto = configuracao?.texto_instrucao_padrao || 
    'Não receber após o vencimento. Cobrar juros de mora de 1% ao mês e multa de 2%.';
  
  doc.rect(margin, y, contentWidth, 18);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Instruções', margin + 2, y + 4);
  
  doc.setFontSize(8);
  const linhasInstrucao = doc.splitTextToSize(instrucaoTexto, contentWidth - 10);
  doc.text(linhasInstrucao, margin + 2, y + 10);
  
  y += 18;

  // Código de barras (simulado com retângulos)
  doc.setFillColor(0, 0, 0);
  const barWidth = 0.8;
  const barHeight = 25;
  for (let i = 0; i < 44; i++) {
    const barX = margin + (i * (barWidth + 0.5));
    const isBar = Math.random() > 0.3;
    if (isBar) {
      doc.rect(barX, y + 2, barWidth, barHeight, 'F');
    }
  }
  
  y += 30;

  // Linha de corte
  doc.setDrawColor(150, 150, 150);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineDashPattern([], 0);
  
  y += 5;

  return y;
}

export function gerarPDFBoletos(
  notas: NotaFiscal[],
  clientes: Cliente[],
  banco: Banco,
  configuracao: ConfiguracaoBanco | undefined,
  tipoOrigem: TipoImpressao,
  tipoSaida: 'arquivo_unico' | 'individual'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = 15;
  const pageHeight = doc.internal.pageSize.getHeight();
  const boletoHeight = 160; // Altura aproximada de um boleto

  notas.forEach((nota, index) => {
    const cliente = clientes.find(c => c.id === nota.codigo_cliente);
    if (!cliente) return;

    // Verifica se precisa de nova página
    if (currentY + boletoHeight > pageHeight - 15) {
      doc.addPage();
      currentY = 15;
    }

    const dados: DadosBoleto = {
      nota,
      cliente,
      banco,
      configuracao,
      tipoOrigem
    };

    currentY = desenharBoleto(doc, dados, currentY);
    currentY += 10;
  });

  // Adiciona rodapé com informações de geração
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} | Origem: ${TIPOS_IMPRESSAO[tipoOrigem].label} | Página ${i} de ${totalPages}`,
      15,
      doc.internal.pageSize.getHeight() - 5
    );
  }

  // Download do arquivo
  const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const nomeArquivo = `boletos_${banco.codigo_banco}_${dataAtual}.pdf`;
  doc.save(nomeArquivo);
}
