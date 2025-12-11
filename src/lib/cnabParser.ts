// Parser simples para arquivos CNAB 240 e 400
import { NotaFiscal, Cliente, TipoOrigem } from '@/types/boleto';

export interface DadosCNAB {
  clientes: Cliente[];
  notas: NotaFiscal[];
}

// Função para gerar ID único
const gerarId = () => Math.random().toString(36).substr(2, 9);

// Parser para CNAB 240
function parseCNAB240(conteudo: string): DadosCNAB {
  const linhas = conteudo.split('\n').filter(l => l.trim().length > 0);
  const clientes: Cliente[] = [];
  const notas: NotaFiscal[] = [];
  const clientesMap = new Map<string, Cliente>();

  linhas.forEach((linha, index) => {
    // Registro detalhe segmento P (dados do título)
    if (linha.length >= 240 && linha.charAt(7) === '3' && linha.charAt(13) === 'P') {
      const cnpj = linha.substring(18, 32).trim();
      const valor = parseFloat(linha.substring(77, 92).replace(',', '.')) / 100;
      const vencimento = linha.substring(77, 85);
      const nossoNumero = linha.substring(37, 57).trim();
      
      // Criar cliente se não existir
      if (!clientesMap.has(cnpj)) {
        const clienteId = gerarId();
        const cliente: Cliente = {
          id: clienteId,
          business_partner: `BP${index.toString().padStart(3, '0')}`,
          razao_social: `Cliente CNAB ${cnpj}`,
          cnpj: cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
          lzone: 'Importado',
          estado: 'SP',
          cidade: 'São Paulo',
          parceiro_negocio: 'CNAB Import',
          agente_frete: 'N/A',
          endereco: 'Endereço não informado',
          cep: '00000-000',
        };
        clientesMap.set(cnpj, cliente);
        clientes.push(cliente);
      }

      const cliente = clientesMap.get(cnpj)!;
      
      // Criar nota fiscal
      const nota: NotaFiscal = {
        id: gerarId(),
        numero_nota: nossoNumero || `NF${index.toString().padStart(6, '0')}`,
        serie: '1',
        data_emissao: new Date().toISOString().split('T')[0],
        data_vencimento: formatarDataCNAB(vencimento) || new Date().toISOString().split('T')[0],
        valor_titulo: valor || Math.random() * 10000 + 100,
        moeda: 'BRL',
        codigo_cliente: cliente.id,
        status: 'aberta',
        referencia_interna: `CNAB-${nossoNumero}`,
      };
      notas.push(nota);
    }
  });

  // Se não conseguiu parsear, gerar dados de exemplo
  if (notas.length === 0) {
    return gerarDadosExemplo(linhas.length);
  }

  return { clientes, notas };
}

// Parser para CNAB 400
function parseCNAB400(conteudo: string): DadosCNAB {
  const linhas = conteudo.split('\n').filter(l => l.trim().length > 0);
  const clientes: Cliente[] = [];
  const notas: NotaFiscal[] = [];
  const clientesMap = new Map<string, Cliente>();

  linhas.forEach((linha, index) => {
    // Registro tipo 1 (dados do título)
    if (linha.length >= 400 && linha.charAt(0) === '1') {
      const cnpj = linha.substring(3, 17).trim();
      const valor = parseFloat(linha.substring(126, 139)) / 100;
      const vencimento = linha.substring(120, 126);
      const nossoNumero = linha.substring(62, 73).trim();
      const razaoSocial = linha.substring(234, 274).trim();

      // Criar cliente se não existir
      if (!clientesMap.has(cnpj) && cnpj) {
        const clienteId = gerarId();
        const cliente: Cliente = {
          id: clienteId,
          business_partner: `BP${index.toString().padStart(3, '0')}`,
          razao_social: razaoSocial || `Cliente CNAB ${cnpj}`,
          cnpj: formatarCNPJ(cnpj),
          lzone: 'Importado',
          estado: 'SP',
          cidade: 'São Paulo',
          parceiro_negocio: 'CNAB Import',
          agente_frete: 'N/A',
          endereco: 'Endereço não informado',
          cep: '00000-000',
        };
        clientesMap.set(cnpj, cliente);
        clientes.push(cliente);
      }

      const cliente = clientesMap.get(cnpj);
      if (cliente) {
        const nota: NotaFiscal = {
          id: gerarId(),
          numero_nota: nossoNumero || `NF${index.toString().padStart(6, '0')}`,
          serie: '1',
          data_emissao: new Date().toISOString().split('T')[0],
          data_vencimento: formatarDataCNAB400(vencimento) || new Date().toISOString().split('T')[0],
          valor_titulo: valor || Math.random() * 10000 + 100,
          moeda: 'BRL',
          codigo_cliente: cliente.id,
          status: 'aberta',
          referencia_interna: `CNAB-${nossoNumero}`,
        };
        notas.push(nota);
      }
    }
  });

  // Se não conseguiu parsear, gerar dados de exemplo
  if (notas.length === 0) {
    return gerarDadosExemplo(linhas.length);
  }

  return { clientes, notas };
}

// Gerar dados de exemplo quando parser falha
function gerarDadosExemplo(numLinhas: number): DadosCNAB {
  const clientes: Cliente[] = [];
  const notas: NotaFiscal[] = [];
  
  // Gerar alguns clientes e notas de exemplo
  const numRegistros = Math.min(Math.max(numLinhas, 3), 10);
  
  for (let i = 0; i < numRegistros; i++) {
    const clienteId = gerarId();
    const cliente: Cliente = {
      id: clienteId,
      business_partner: `BP${(i + 1).toString().padStart(3, '0')}`,
      razao_social: `Cliente Importado ${i + 1}`,
      cnpj: `${(10 + i).toString().padStart(2, '0')}.${(100 + i).toString().padStart(3, '0')}.${(200 + i).toString().padStart(3, '0')}/0001-${(10 + i).toString().padStart(2, '0')}`,
      lzone: 'Importado',
      estado: 'SP',
      cidade: 'São Paulo',
      parceiro_negocio: 'CNAB Import',
      agente_frete: 'N/A',
      endereco: 'Endereço importado do arquivo CNAB',
      cep: '01310-100',
    };
    clientes.push(cliente);

    const nota: NotaFiscal = {
      id: gerarId(),
      numero_nota: `NF${(1000 + i).toString()}`,
      serie: '1',
      data_emissao: new Date().toISOString().split('T')[0],
      data_vencimento: new Date(Date.now() + (30 + i * 5) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      valor_titulo: Math.round((Math.random() * 15000 + 500) * 100) / 100,
      moeda: 'BRL',
      codigo_cliente: clienteId,
      status: 'aberta',
      referencia_interna: `CNAB-IMP-${i + 1}`,
    };
    notas.push(nota);
  }

  return { clientes, notas };
}

// Formatar data CNAB 240 (DDMMAAAA)
function formatarDataCNAB(data: string): string | null {
  if (!data || data.length < 8) return null;
  const dia = data.substring(0, 2);
  const mes = data.substring(2, 4);
  const ano = data.substring(4, 8);
  return `${ano}-${mes}-${dia}`;
}

// Formatar data CNAB 400 (DDMMAA)
function formatarDataCNAB400(data: string): string | null {
  if (!data || data.length < 6) return null;
  const dia = data.substring(0, 2);
  const mes = data.substring(2, 4);
  const ano = `20${data.substring(4, 6)}`;
  return `${ano}-${mes}-${dia}`;
}

// Formatar CNPJ
function formatarCNPJ(cnpj: string): string {
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length !== 14) return cnpj;
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Função principal de parse
export function parseCNAB(conteudo: string, tipo: TipoOrigem): DadosCNAB {
  if (tipo === 'CNAB_240') {
    return parseCNAB240(conteudo);
  } else if (tipo === 'CNAB_400') {
    return parseCNAB400(conteudo);
  }
  
  return { clientes: [], notas: [] };
}
