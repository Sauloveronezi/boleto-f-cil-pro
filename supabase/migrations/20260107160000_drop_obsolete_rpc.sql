-- Drop obsolete RPC that had incorrect parameter types and is no longer used
DROP FUNCTION IF EXISTS public.vv_b_soft_delete_mapeamento_campo(uuid);
