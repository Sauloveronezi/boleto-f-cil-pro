import { ModeloBoleto } from '@/types/boleto';

export const DEFAULT_MODELOS: ModeloBoleto[] = [
  {
    id: '1',
    nome_modelo: 'Modelo Padrão BB',
    banco_id: '1',
    tipo_layout: 'CNAB_240',
    padrao: true,
    campos_mapeados: [
      { id: '1', nome: 'Razão Social', variavel: '{{cliente_razao_social}}', posicao_x: 10, posicao_y: 50, largura: 200, altura: 20 },
      { id: '2', nome: 'CNPJ', variavel: '{{cliente_cnpj}}', posicao_x: 10, posicao_y: 70, largura: 150, altura: 20 },
      { id: '3', nome: 'Valor', variavel: '{{valor_titulo}}', posicao_x: 300, posicao_y: 100, largura: 100, altura: 20 },
      { id: '4', nome: 'Vencimento', variavel: '{{data_vencimento}}', posicao_x: 300, posicao_y: 120, largura: 100, altura: 20 }
    ],
    texto_instrucoes: 'Não receber após 30 dias do vencimento. Cobrar juros de {{taxa_juros}}% ao mês e multa de {{multa}}% após o vencimento.',
    criado_em: '2024-01-15',
    atualizado_em: '2024-11-01'
  },
  {
    id: '2',
    nome_modelo: 'Modelo Padrão Bradesco',
    banco_id: '2',
    tipo_layout: 'CNAB_400',
    padrao: true,
    campos_mapeados: [
      { id: '1', nome: 'Razão Social', variavel: '{{cliente_razao_social}}', posicao_x: 10, posicao_y: 50, largura: 200, altura: 20 },
      { id: '2', nome: 'CNPJ', variavel: '{{cliente_cnpj}}', posicao_x: 10, posicao_y: 70, largura: 150, altura: 20 },
      { id: '3', nome: 'Valor', variavel: '{{valor_titulo}}', posicao_x: 300, posicao_y: 100, largura: 100, altura: 20 }
    ],
    texto_instrucoes: 'Após vencimento, cobrar multa de {{multa}}% e juros de {{taxa_juros}}% ao mês.',
    criado_em: '2024-02-10',
    atualizado_em: '2024-10-15'
  },
  {
    id: '3',
    nome_modelo: 'Modelo Corporativo Itaú',
    banco_id: '3',
    tipo_layout: 'CNAB_240',
    padrao: true,
    campos_mapeados: [
      { id: '1', nome: 'Razão Social', variavel: '{{cliente_razao_social}}', posicao_x: 10, posicao_y: 50, largura: 200, altura: 20 },
      { id: '2', nome: 'CNPJ', variavel: '{{cliente_cnpj}}', posicao_x: 10, posicao_y: 70, largura: 150, altura: 20 }
    ],
    texto_instrucoes: 'Sr. Caixa, não receber após 60 dias do vencimento.',
    criado_em: '2024-03-05',
    atualizado_em: '2024-09-20'
  }
];
