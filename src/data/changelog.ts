export interface VersionChange {
  type: 'feat' | 'fix' | 'chore' | 'refactor' | 'docs' | 'style';
  description: string;
  /** Se true, só será exibido para usuários Master (detalhes técnicos de infra/DB/RLS) */
  technical?: boolean;
}

export interface VersionEntry {
  version: string;
  date: string;
  changes: VersionChange[];
}

export const changelogData: VersionEntry[] = [
  {
    version: '0.4.3',
    date: '2026-03-13',
    changes: [
      { type: 'feat', description: 'PDF único multi-banco: boletos de bancos diferentes são mesclados em um único arquivo, cada um com o layout correto do seu banco' },
      { type: 'fix', description: 'Operadores agora conseguem visualizar dados do beneficiário e configurações de API para gerar boletos', technical: false },
      { type: 'fix', description: 'RLS corrigido: política universal de leitura adicionada às tabelas vv_b_empresas e vv_b_api_integracoes para usuários autenticados ativos', technical: true },
      { type: 'fix', description: 'Roles faltantes inseridas para usuários operadores e admins sem entrada na tabela vv_b_user_roles', technical: true },
    ]
  },
  {
    version: '0.4.2',
    date: '2026-03-13',
    changes: [
      { type: 'fix', description: 'Geração de boletos multi-banco agora agrupa por banco e aplica layout correto para cada grupo' },
      { type: 'feat', description: 'PDFs separados por banco ao imprimir boletos de bancos diferentes simultaneamente' },
      { type: 'refactor', description: 'Refatoração do fluxo de impressão: mapeamento de dados usa banco/configuração individual por boleto', technical: true },
    ]
  },
  {
    version: '0.4.1',
    date: '2026-03-13',
    changes: [
      { type: 'feat', description: 'Filtros numéricos com intervalo De → Até para campos como Nº Nota, Nº Cobrança, Nosso Número e valores monetários' },
      { type: 'feat', description: 'Normalização numérica inteligente: busca por "2429" encontra registros formatados como "000002429-1"' },
      { type: 'feat', description: 'Detecção automática de campos numéricos para aplicar filtros de intervalo' },
      { type: 'fix', description: 'Correção de filtro CNPJ para ignorar formatação (pontos, barras, traços) na comparação' },
      { type: 'refactor', description: 'Refatoração do motor de filtros para tratamento genérico de intervalos numéricos e datas', technical: true },
    ]
  },
  {
    version: '0.4.0',
    date: '2026-02-24',
    changes: [
      { type: 'feat', description: 'Filtros dinâmicos com dois níveis: Primário (sempre visível) e Secundário (menu suspenso colapsável)' },
      { type: 'feat', description: 'Filtros de intervalo (De → Até) para campos numéricos e datas' },
      { type: 'feat', description: 'Filtro cascata Estado/Cidade: selecionar UF filtra automaticamente as cidades disponíveis' },
      { type: 'feat', description: 'Configuração de colunas e filtros por nível (primário/secundário) no diálogo de administração' },
      { type: 'feat', description: 'Validação estrita de código de barras: exige exatamente 44 dígitos numéricos para emissão' },
      { type: 'feat', description: 'Bloqueio de emissão para boletos com código de barras inválido, com diálogo de erro detalhado' },
      { type: 'feat', description: 'Destaque visual (vermelho) na tabela para boletos com erro na geração do código de barras' },
      { type: 'feat', description: 'Filtro "Apenas com erros" para visualizar somente títulos com falha na emissão' },
      { type: 'feat', description: 'Legenda de cores na tabela: Já emitido (verde), Erro na emissão (vermelho), Selecionado (azul)' },
      { type: 'fix', description: 'Campos removidos da visualização agora voltam à área de seleção sem exclusão de dados' },
      { type: 'refactor', description: 'Separação de boletos válidos/inválidos antes da geração do PDF, com relatório por registro', technical: true },
    ]
  },
  {
    version: '0.3.0',
    date: '2026-01-13',
    changes: [
      { type: 'feat', description: 'Templates de Boleto: cadastro, upload de PDF e mapeamento visual' },
      { type: 'feat', description: 'Pré-visualização com PDF de fundo e edição inline (mover/redimensionar/alinhamento)' },
      { type: 'feat', description: 'Importar mapeamento por coordenadas (CSV/JSON) com conversão em mm' },
      { type: 'feat', description: 'Botão "Baixar CSV Modelo" para acelerar criação de layouts' },
      { type: 'feat', description: 'Página "Gerar Boletos (PDF)" com modos individual, merge e zip' },
      { type: 'fix', description: 'Boletos via API: exibição correta do CNPJ a partir de múltiplos campos' },
      { type: 'feat', description: 'Editor de Layout: opção para mostrar/ocultar fundo importado' },
      { type: 'refactor', description: 'Renderização com pdf-lib: shrink‑to‑fit, alinhamento real por largura do texto', technical: true },
      { type: 'docs', description: 'Documentação do layout gerada automaticamente com variáveis e coordenadas', technical: true }
    ]
  },
  {
    version: '0.2.0',
    date: '2026-01-13',
    changes: [
      { type: 'feat', description: 'Parser de tabela em grade para Bradesco e priorização por banco' },
      { type: 'feat', description: 'Parser dedicado para Santander com detecção de campos posicionais' },
      { type: 'fix', description: 'Detecção de blocos sem cabeçalho textual corrigida' },
      { type: 'feat', description: 'Fallback FEBRABAN básico para CNAB 240 garantindo notas mínimas' },
      { type: 'refactor', description: 'Estratégia adaptativa com histórico de sucesso por banco e reordenação dinâmica', technical: true },
      { type: 'feat', description: 'Mapeamento completo do Segmento R (descontos, multa, info ao pagador)', technical: true }
    ]
  },
  {
    version: '0.1.0',
    date: '2026-01-13',
    changes: [
      { type: 'feat', description: 'Migração do gerenciamento de configurações CNAB para a nuvem' },
      { type: 'feat', description: 'Adição de fallback para armazenamento local no seletor de bancos' },
      { type: 'fix', description: 'Correção de typo na configuração CNAB', technical: true },
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
