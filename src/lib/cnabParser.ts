// Parser configurável para arquivos CNAB 240 e 400
import { NotaFiscal, Cliente, TipoOrigem, ConfiguracaoCNAB } from '@/types/boleto';
import { lerArquivoCNAB } from './cnabGenerator';
import { mapearCNABParaModelo } from './boletoMapping';
import { DadosBoleto } from './pdfModelRenderer';

export interface DadosCNAB {
  clientes: Cliente[];
  notas: NotaFiscal[];
}

// Função para gerar ID único
const gerarId = () => Math.random().toString(36).substr(2, 9);

// Formatar CNPJ
function formatarCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length === 14) {
    return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (numeros.length === 11) {
    return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return cnpj;
}

// Helper para converter data CNAB (ddmmaa ou ddmmaaaa) para ISO (yyyy-mm-dd)
function converterDataCNAB(data: string): string {
  if (!data) return new Date().toISOString().split('T')[0];
  const limpa = data.replace(/\D/g, '');
  
  if (limpa.length === 8) { // ddmmaaaa
    const dia = limpa.substring(0, 2);
    const mes = limpa.substring(2, 4);
    const ano = limpa.substring(4, 8);
    return `${ano}-${mes}-${dia}`;
  }
  
  if (limpa.length === 6) { // ddmmaa
    const dia = limpa.substring(0, 2);
    const mes = limpa.substring(2, 4);
    const ano = `20${limpa.substring(4, 6)}`;
    return `${ano}-${mes}-${dia}`;
  }
  
  return new Date().toISOString().split('T')[0];
}

// Helper para converter valor CNAB (centavos) para number
function converterValorCNAB(valor: string): number {
  if (!valor) return 0;
  const limpo = valor.replace(/\D/g, '');
  const num = parseInt(limpo, 10);
  return isNaN(num) ? 0 : num / 100;
}

// Parser configurável usando as definições do usuário
function parseCNABConfiguravel(conteudo: string, config: ConfiguracaoCNAB): DadosCNAB {
  const registros = lerArquivoCNAB(conteudo, config);
  const clientes: Cliente[] = [];
  const notas: NotaFiscal[] = [];
  const clientesMap = new Map<string, Cliente>();

  registros.forEach((reg, index) => {
    // 1. Mapear para o modelo de visualização (DadosBoleto)
    const dadosBoleto = mapearCNABParaModelo(reg);

    // 2. Extrair dados estruturados para Cliente e NotaFiscal
    
    // Identificação do cliente
    const cnpj = reg['cnpj_sacado'] || reg['cnpj'] || '';
    const razaoSocial = reg['nome_sacado'] || reg['razao_social'] || `Cliente ${formatarCNPJ(cnpj)}`;
    
    let cliente: Cliente | undefined;

    if (cnpj) {
      if (!clientesMap.has(cnpj)) {
        const clienteId = gerarId();
        cliente = {
          id: clienteId,
          business_partner: `BP${(index + 1).toString().padStart(3, '0')}`,
          razao_social: razaoSocial.toUpperCase(),
          cnpj: formatarCNPJ(cnpj),
          lzone: 'Importado',
          estado: reg['uf_sacado'] || reg['estado'] || 'SP',
          cidade: reg['cidade_sacado'] || reg['cidade'] || '',
          parceiro_negocio: 'CNAB Import',
          agente_frete: 'N/A',
          endereco: reg['endereco_sacado'] || reg['endereco'] || '',
          cep: reg['cep_sacado'] || reg['cep'] || '',
        };
        clientesMap.set(cnpj, cliente);
        clientes.push(cliente);
      } else {
        cliente = clientesMap.get(cnpj);
      }
    }

    // Identificação da Nota
    // Se tivermos valor ou nosso número, assumimos que é uma nota válida
    const valorStr = reg['valor'] || reg['valor_titulo'] || '';
    const numeroNota = reg['numero_nota'] || reg['numero_documento'] || reg['nosso_numero'] || '';
    
    if ((valorStr || numeroNota) && cliente) {
      const valor = converterValorCNAB(valorStr);
      
      const nota: NotaFiscal = {
        id: gerarId(),
        numero_nota: numeroNota || `NF${(index + 1).toString().padStart(6, '0')}`,
        serie: '1',
        data_emissao: converterDataCNAB(reg['data_emissao']),
        data_vencimento: converterDataCNAB(reg['data_vencimento'] || reg['vencimento'] || ''),
        valor_titulo: valor,
        moeda: 'BRL',
        codigo_cliente: cliente.id,
        status: 'aberta',
        referencia_interna: reg['nosso_numero'] || `CNAB-${index + 1}`,
        // Armazenamos o DadosBoleto completo aqui para usar na geração do PDF
        // @ts-ignore
        dados_api: dadosBoleto
      };
      
      // Evitar duplicatas exatas
      const duplicada = notas.some(n => 
        n.numero_nota === nota.numero_nota && 
        n.valor_titulo === nota.valor_titulo &&
        n.codigo_cliente === nota.codigo_cliente
      );
      
      if (!duplicada) {
        notas.push(nota);
      }
    }
  });

  // Se não conseguiu parsear, retornar vazio (ou podia ter fallback, mas lerArquivoCNAB já tenta extrair tudo)
  if (notas.length === 0 && registros.length > 0) {
    console.warn('CNAB Parser: Registros encontrados mas nenhuma nota válida extraída');
    // Poderíamos implementar um fallback aqui se necessário, similar ao anterior
  }

  return { clientes, notas };
}

// Função principal de parse
export function parseCNAB(conteudo: string, tipo: TipoOrigem, config?: ConfiguracaoCNAB | null): DadosCNAB {
  // Se temos configuração, usar o parser configurável
  if (config) {
    return parseCNABConfiguravel(conteudo, config);
  }
  
  console.warn('CNAB Parser: Nenhuma configuração fornecida');
  return { clientes: [], notas: [] };
}
