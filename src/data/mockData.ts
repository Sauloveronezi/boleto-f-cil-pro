// ============================================
// DADOS MIGRADOS PARA O SUPABASE
// ============================================
// Este arquivo foi esvaziado pois os dados agora estão no banco de dados.
// Use os hooks do Supabase para acessar:
// - vv_b_bancos
// - vv_b_configuracoes_banco
// - vv_b_clientes
// - vv_b_notas_fiscais
// - vv_b_modelos_boleto
// - vv_b_configuracoes_cnab
// - vv_b_templates_pdf
// - vv_b_boletos_gerados
// ============================================

import { Cliente } from '@/types/boleto';

// Funções auxiliares para filtros (usadas enquanto não há integração completa)
// Estas funções retornam arrays vazios - devem ser substituídas por queries ao Supabase
export const getEstadosUnicos = (): string[] => [];
export const getCidadesUnicas = (): string[] => [];
export const getLzonesUnicos = (): string[] => [];
export const getParceirosUnicos = (): string[] => [];
export const getAgentesUnicos = (): string[] => [];

// Arrays vazios exportados para compatibilidade temporária
// TODO: Remover após integração completa com Supabase
export const bancosMock: never[] = [];
export const configuracoesBancoMock: never[] = [];
export const clientesMock: Cliente[] = [];
export const notasFiscaisMock: never[] = [];
export const modelosBoletoMock: never[] = [];
