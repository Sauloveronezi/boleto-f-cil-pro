export interface DadosEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
  site: string;
  logoUrl?: string;
}

export const EMPRESA_PADRAO: DadosEmpresa = {
  razaoSocial: 'EMPRESA DEMONSTRAÇÃO LTDA',
  nomeFantasia: 'EMPRESA DEMO',
  cnpj: '00.000.000/0001-00',
  inscricaoEstadual: '',
  inscricaoMunicipal: '',
  endereco: 'Rua Exemplo',
  numero: '123',
  complemento: 'Sala 1',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '00000-000',
  telefone: '(11) 0000-0000',
  email: 'contato@empresa.com.br',
  site: 'www.empresa.com.br',
};

// Chave para localStorage
export const EMPRESA_STORAGE_KEY = 'boletos_empresa_config';

// Funções para persistir dados da empresa
export function salvarDadosEmpresa(dados: DadosEmpresa): void {
  localStorage.setItem(EMPRESA_STORAGE_KEY, JSON.stringify(dados));
}

export function carregarDadosEmpresa(): DadosEmpresa {
  const dados = localStorage.getItem(EMPRESA_STORAGE_KEY);
  if (dados) {
    try {
      return JSON.parse(dados);
    } catch {
      return EMPRESA_PADRAO;
    }
  }
  return EMPRESA_PADRAO;
}
