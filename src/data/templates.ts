// ============================================
// DADOS MIGRADOS PARA O SUPABASE
// ============================================
// Os modelos de boleto agora estão na tabela vv_b_modelos_boleto
// Use hooks/queries Supabase para acessar os dados
// ============================================

import { ModeloBoleto } from '@/types/boleto';

// Array vazio para compatibilidade - será substituído por query ao Supabase
// TODO: Criar hook useModelos() para buscar dados do Supabase
export const DEFAULT_MODELOS: ModeloBoleto[] = [];
