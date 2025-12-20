import { Banco } from '@/types/boleto';

export const BANCOS_SUPORTADOS: Banco[] = [
  {
    id: '1',
    nome_banco: 'Banco do Brasil',
    codigo_banco: '001',
    tipo_layout_padrao: 'CNAB_240',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '2',
    nome_banco: 'Bradesco',
    codigo_banco: '237',
    tipo_layout_padrao: 'CNAB_400',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '3',
    nome_banco: 'Itaú Unibanco',
    codigo_banco: '341',
    tipo_layout_padrao: 'CNAB_240',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '4',
    nome_banco: 'Santander',
    codigo_banco: '033',
    tipo_layout_padrao: 'CNAB_240',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '5',
    nome_banco: 'Caixa Econômica Federal',
    codigo_banco: '104',
    tipo_layout_padrao: 'CNAB_240',
    logo_url: '/placeholder.svg',
    ativo: true
  },
  {
    id: '6',
    nome_banco: 'Sicredi',
    codigo_banco: '748',
    tipo_layout_padrao: 'CNAB_400',
    logo_url: '/placeholder.svg',
    ativo: true
  }
];
