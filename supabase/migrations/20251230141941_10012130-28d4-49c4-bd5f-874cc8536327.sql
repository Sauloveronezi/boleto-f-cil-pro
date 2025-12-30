-- ============================================
-- PARTE 1: ADICIONAR NOVO VALOR AO ENUM
-- ============================================
ALTER TYPE public.vv_b_perfil_usuario ADD VALUE IF NOT EXISTS 'master' BEFORE 'admin';