// ============================================
// DADOS MIGRADOS PARA O SUPABASE
// ============================================
// Os bancos agora estão na tabela vv_b_bancos
// Use hooks/queries Supabase para acessar os dados
// ============================================

import { Banco } from '@/types/boleto';

// Array vazio para compatibilidade - será substituído por query ao Supabase
// TODO: Criar hook useBancos() para buscar dados do Supabase
export const BANCOS_SUPORTADOS: Banco[] = [];
