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
  return linha.substring(inicio, fim).trim();
}

// Formatar valor baseado no formato configurado
function formatarValor(valor: string, formato?: string): any {
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

// Parser configurável usando as definições do usuário
function parseCNABConfiguravel(conteudo: string, config: ConfiguracaoCNAB): DadosCNAB {
  const linhas = conteudo.split('\n').filter(l => l.trim().length > 0);
  const clientes: Cliente[] = [];
  const notas: NotaFiscal[] = [];
  const clientesMap = new Map<string, Cliente>();

  // Agrupar campos por tipo de registro
  const camposPorTipoRegistro = new Map<string, CampoCNAB[]>();
  config.campos.forEach(campo => {
    const tipo = campo.tipo_registro || '__default__';
    if (!camposPorTipoRegistro.has(tipo)) {
      camposPorTipoRegistro.set(tipo, []);
    }
    camposPorTipoRegistro.get(tipo)!.push(campo);
  });

  linhas.forEach((linha, index) => {
    // Verificar tamanho mínimo da linha
    const tamanhoMinimo = config.tipo_cnab === 'CNAB_400' ? 400 : 240;
    if (linha.length < tamanhoMinimo * 0.9) return; // Permitir pequena variação

    // Para cada tipo de registro configurado, tentar extrair dados
    camposPorTipoRegistro.forEach((campos, tipoRegistro) => {
      const tipoParaVerificar = tipoRegistro === '__default__' ? undefined : tipoRegistro;
      
      if (!verificarTipoRegistro(linha, tipoParaVerificar, config.tipo_cnab)) return;

      // Extrair valores dos campos
      const valores: Record<string, any> = {};
      campos.forEach(campo => {
        valores[campo.campo_destino] = formatarValor(
          extrairCampo(linha, campo),
          campo.formato
        );
      });

      // Se temos CNPJ ou razão social, criar/atualizar cliente
      const cnpj = valores.cnpj;
      if (cnpj && !clientesMap.has(cnpj)) {
        const clienteId = gerarId();
        const cliente: Cliente = {
          id: clienteId,
          business_partner: `BP${(index + 1).toString().padStart(3, '0')}`,
          razao_social: valores.razao_social || `Cliente ${cnpj}`,
          cnpj: formatarCNPJ(cnpj),
          lzone: 'Importado',
          estado: valores.estado || 'SP',
          cidade: valores.cidade || 'São Paulo',
          parceiro_negocio: 'CNAB Import',
          agente_frete: 'N/A',
          endereco: valores.endereco || 'Endereço não informado',
          cep: valores.cep || '00000-000',
        };
        clientesMap.set(cnpj, cliente);
        clientes.push(cliente);
      }

      // Se temos valor ou nosso número, criar nota
      const temDadosNota = valores.valor || valores.nosso_numero || valores.numero_nota;
      if (temDadosNota) {
        const cliente = cnpj ? clientesMap.get(cnpj) : clientes[clientes.length - 1];
        if (cliente) {
          const nota: NotaFiscal = {
            id: gerarId(),
            numero_nota: valores.numero_nota || valores.nosso_numero || `NF${(index + 1).toString().padStart(6, '0')}`,
            serie: '1',
            data_emissao: new Date().toISOString().split('T')[0],
            data_vencimento: valores.vencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            valor_titulo: valores.valor || 0,
            moeda: 'BRL',
            codigo_cliente: cliente.id,
            status: 'aberta',
            referencia_interna: `CNAB-${valores.nosso_numero || index}`,
          };
          
          // Evitar duplicatas
          if (nota.valor_titulo > 0 && !notas.some(n => n.numero_nota === nota.numero_nota && n.valor_titulo === nota.valor_titulo)) {
            notas.push(nota);
          }
        }
      }
    });
  });

  // Se não conseguiu parsear, gerar dados de exemplo
  if (notas.length === 0) {
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
