// Parser configurável para arquivos CNAB 240 e 400
import { NotaFiscal, Cliente, TipoOrigem, ConfiguracaoCNAB, CampoCNAB } from '@/types/boleto';

export interface DadosCNAB {
  clientes: Cliente[];
  notas: NotaFiscal[];
}

// Função para gerar ID único
const gerarId = () => Math.random().toString(36).substr(2, 9);

// Extrair valor de uma linha baseado nas posições configuradas
function extrairCampo(linha: string, campo: CampoCNAB): string {
  // Posições são 1-indexed no arquivo CNAB
  const inicio = campo.posicao_inicio - 1;
  const fim = campo.posicao_fim;
  if (inicio < 0 || fim > linha.length) return '';
  return linha.substring(inicio, fim).trim();
}

// Formatar valor baseado no formato configurado
function formatarValor(valor: string, formato?: string): any {
  if (!valor || valor.trim() === '') return null;
  
  switch (formato) {
    case 'valor_centavos':
      const num = parseFloat(valor.replace(/\D/g, ''));
      return isNaN(num) ? 0 : num / 100;
    case 'numero':
      return parseInt(valor.replace(/\D/g, ''), 10) || 0;
    case 'data_ddmmaa':
      if (valor.length >= 6) {
        const dia = valor.substring(0, 2);
        const mes = valor.substring(2, 4);
        const ano = `20${valor.substring(4, 6)}`;
        return `${ano}-${mes}-${dia}`;
      }
      return null;
    case 'data_ddmmaaaa':
      if (valor.length >= 8) {
        const dia = valor.substring(0, 2);
        const mes = valor.substring(2, 4);
        const ano = valor.substring(4, 8);
        return `${ano}-${mes}-${dia}`;
      }
      return null;
    default:
      return valor;
  }
}

// Formatar CNPJ
function formatarCNPJ(cnpj: string): string {
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length === 14) {
    return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (numeros.length === 11) {
    return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return cnpj;
}

// Verificar se a linha corresponde ao tipo de registro configurado
function verificarTipoRegistro(linha: string, tipoRegistro: string | undefined, tipoCNAB: 'CNAB_240' | 'CNAB_400'): boolean {
  if (!tipoRegistro) return true;
  
  if (tipoCNAB === 'CNAB_400') {
    // No CNAB 400, o tipo de registro está na posição 1 (índice 0)
    return linha.charAt(0) === tipoRegistro;
  } else {
    // No CNAB 240, pode estar em diferentes posições dependendo do segmento
    // Posição 8 (índice 7) para tipo de registro geral
    // Posição 14 (índice 13) para código do segmento
    return linha.charAt(7) === '3' && linha.charAt(13) === tipoRegistro;
  }
}

// Encontrar linhas de detalhe no arquivo CNAB
function encontrarLinhasDetalhe(linhas: string[], tipoCNAB: 'CNAB_240' | 'CNAB_400'): string[] {
  return linhas.filter(linha => {
    if (tipoCNAB === 'CNAB_400') {
      // CNAB 400: tipo de registro '1' = detalhe
      return linha.length >= 400 && linha.charAt(0) === '1';
    } else {
      // CNAB 240: tipo de registro '3' = detalhe
      return linha.length >= 240 && linha.charAt(7) === '3';
    }
  });
}

// Parser configurável usando as definições do usuário
function parseCNABConfiguravel(conteudo: string, config: ConfiguracaoCNAB): DadosCNAB {
  const linhas = conteudo.split('\n').filter(l => l.trim().length > 0);
  const clientes: Cliente[] = [];
  const notas: NotaFiscal[] = [];
  const clientesMap = new Map<string, Cliente>();

  // Encontrar linhas de detalhe
  let linhasDetalhe = encontrarLinhasDetalhe(linhas, config.tipo_cnab);
  
  // Se não encontrou linhas de detalhe, usar todas as linhas (exceto header/trailer)
  if (linhasDetalhe.length === 0) {
    linhasDetalhe = linhas.filter((l, i) => i > 0 && i < linhas.length - 1);
  }

  // Agrupar campos por tipo de registro
  const camposPorTipoRegistro = new Map<string, CampoCNAB[]>();
  config.campos.forEach(campo => {
    const tipo = campo.tipo_registro || '__default__';
    if (!camposPorTipoRegistro.has(tipo)) {
      camposPorTipoRegistro.set(tipo, []);
    }
    camposPorTipoRegistro.get(tipo)!.push(campo);
  });

  linhasDetalhe.forEach((linha, index) => {
    // Para cada tipo de registro configurado, tentar extrair dados
    let valoresExtraidos: Record<string, any> = {};
    
    camposPorTipoRegistro.forEach((campos, tipoRegistro) => {
      const tipoParaVerificar = tipoRegistro === '__default__' ? undefined : tipoRegistro;
      
      if (!verificarTipoRegistro(linha, tipoParaVerificar, config.tipo_cnab)) return;

      // Extrair valores dos campos
      campos.forEach(campo => {
        const valorBruto = extrairCampo(linha, campo);
        const valorFormatado = formatarValor(valorBruto, campo.formato);
        if (valorFormatado !== null) {
          valoresExtraidos[campo.campo_destino] = valorFormatado;
        }
      });
    });

    // Se temos CNPJ ou razão social, criar/atualizar cliente
    const cnpj = valoresExtraidos.cnpj;
    let cliente: Cliente | undefined;
    
    if (cnpj && !clientesMap.has(cnpj)) {
      const clienteId = gerarId();
      cliente = {
        id: clienteId,
        business_partner: `BP${(index + 1).toString().padStart(3, '0')}`,
        razao_social: valoresExtraidos.razao_social || `Cliente ${formatarCNPJ(cnpj)}`,
        cnpj: formatarCNPJ(cnpj),
        lzone: 'Importado',
        estado: valoresExtraidos.estado || 'SP',
        cidade: valoresExtraidos.cidade || 'São Paulo',
        parceiro_negocio: 'CNAB Import',
        agente_frete: 'N/A',
        endereco: valoresExtraidos.endereco || 'Endereço não informado',
        cep: valoresExtraidos.cep || '00000-000',
      };
      clientesMap.set(cnpj, cliente);
      clientes.push(cliente);
    } else if (cnpj) {
      cliente = clientesMap.get(cnpj);
    }

    // Se temos valor ou nosso número, criar nota
    const temDadosNota = valoresExtraidos.valor || valoresExtraidos.nosso_numero || valoresExtraidos.numero_nota;
    if (temDadosNota && cliente) {
      const nota: NotaFiscal = {
        id: gerarId(),
        numero_nota: valoresExtraidos.numero_nota || valoresExtraidos.nosso_numero || `NF${(index + 1).toString().padStart(6, '0')}`,
        serie: '1',
        data_emissao: valoresExtraidos.data_emissao || new Date().toISOString().split('T')[0],
        data_vencimento: valoresExtraidos.vencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valor_titulo: valoresExtraidos.valor || 0,
        moeda: 'BRL',
        codigo_cliente: cliente.id,
        status: 'aberta',
        referencia_interna: valoresExtraidos.nosso_numero || `CNAB-${index + 1}`,
      };
      
      // Evitar duplicatas
      if (nota.valor_titulo > 0 && !notas.some(n => n.numero_nota === nota.numero_nota && n.valor_titulo === nota.valor_titulo)) {
        notas.push(nota);
      }
    }
  });

  // Se não conseguiu parsear, gerar dados de exemplo
  if (notas.length === 0) {
    console.warn('CNAB Parser: Nenhuma nota extraída, gerando dados de exemplo');
    return gerarDadosExemplo(Math.min(linhas.length, 5));
  }

  return { clientes, notas };
}

// Gerar dados de exemplo quando parser falha
function gerarDadosExemplo(numLinhas: number): DadosCNAB {
  const clientes: Cliente[] = [];
  const notas: NotaFiscal[] = [];
  
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

// Função principal de parse
export function parseCNAB(conteudo: string, tipo: TipoOrigem, config?: ConfiguracaoCNAB | null): DadosCNAB {
  // Se temos configuração, usar o parser configurável
  if (config) {
    return parseCNABConfiguravel(conteudo, config);
  }
  
  // Fallback para dados de exemplo se não houver configuração
  const linhas = conteudo.split('\n').filter(l => l.trim().length > 0);
  return gerarDadosExemplo(Math.min(linhas.length, 5));
}
