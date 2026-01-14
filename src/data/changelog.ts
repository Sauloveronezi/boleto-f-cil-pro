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
    version: '0.3.0',
    date: '2026-01-13',
    changes: [
      { type: 'feat', description: 'Templates de Boleto: cadastro, upload de PDF e mapeamento visual' },
      { type: 'feat', description: 'Pré-visualização com PDF de fundo e edição inline (mover/redimensionar/alinhamento)' },
      { type: 'feat', description: 'Importar mapeamento por coordenadas (CSV/JSON) com conversão em mm (top-left)' },
      { type: 'feat', description: 'Botão “Baixar CSV Modelo” para acelerar criação de layouts' },
      { type: 'feat', description: 'Página “Gerar Boletos (PDF)” com modos individual, merge e zip' },
      { type: 'fix', description: 'Boletos via API: exibição correta do CNPJ a partir de múltiplos campos' },
      { type: 'feat', description: 'Editor de Layout: opção para mostrar/ocultar fundo importado' },
      { type: 'refactor', description: 'Renderização com pdf-lib: shrink‑to‑fit, alinhamento real por largura do texto' },
      { type: 'docs', description: 'Documentação do layout gerada automaticamente com variáveis e coordenadas' }
    ]
  },
  {
    version: '0.2.0',
    date: '2026-01-13',
    changes: [
      { type: 'feat', description: 'Parser de tabela em grade para Bradesco e priorização por banco (237)' },
      { type: 'feat', description: 'Parser dedicado para Santander (POS INI/FINAL, A/N, TAM, DEC) e prioridade (033)' },
      { type: 'fix', description: 'Detecção de blocos sem cabeçalho textual (início automático e Header fallback)' },
      { type: 'feat', description: 'Fallback FEBRABAN básico para CNAB 240 (Segmentos P/Q) garantindo notas mínimas' },
      { type: 'refactor', description: 'Estratégia adaptativa com histórico de sucesso por banco e reordenação dinâmica' },
      { type: 'feat', description: 'Mapeamento completo do Segmento R (descontos 2/3, multa, info ao pagador, ocorrências)' }
    ]
  },
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
