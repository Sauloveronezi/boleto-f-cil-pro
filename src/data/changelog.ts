export interface VersionChange {
  type: 'feat' | 'fix' | 'chore' | 'refactor' | 'docs' | 'style';
  description: string;
}

export interface VersionEntry {
  version: string;
  date: string;
  changes: VersionChange[];
}

export const changelogData: VersionEntry[] = [
  {
    version: '0.1.0',
    date: '2026-01-13',
    changes: [
      { type: 'feat', description: 'Migração do gerenciamento de configurações CNAB para Supabase (BancoSelector, ImportarLayout)' },
      { type: 'feat', description: 'Adição de fallback para localStorage em BancoSelector' },
      { type: 'fix', description: 'Correção de typo na tabela vv_b_configuracoes_cnab' },
      { type: 'refactor', description: 'Melhorias na integração de Boletos via API (seleção de fonte de dados)' },
      { type: 'refactor', description: 'Aprimoramentos no Editor de Modelos PDF e inferência de campos' },
      { type: 'docs', description: 'Criação da página de Referência de Versões' }
    ]
  },
  {
    version: '0.0.1',
    date: '2026-01-01',
    changes: [
      { type: 'feat', description: 'Inicialização do projeto BoletoERP' },
      { type: 'feat', description: 'Estrutura base com autenticação e dashboard' }
    ]
  }
];

export const APP_VERSION = changelogData[0].version;
