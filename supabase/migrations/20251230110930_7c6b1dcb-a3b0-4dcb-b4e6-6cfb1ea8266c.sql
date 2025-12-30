-- Função para adicionar coluna dinâmica à tabela vv_b_boletos_api
-- Esta função é executada com SECURITY DEFINER para ter permissão de ALTER TABLE
CREATE OR REPLACE FUNCTION public.vv_b_add_dynamic_column(
  p_column_name TEXT,
  p_column_type TEXT DEFAULT 'TEXT'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_safe_column_name TEXT;
  v_safe_type TEXT;
  v_column_exists BOOLEAN;
BEGIN
  -- Sanitizar nome da coluna (apenas letras, números e underscore)
  v_safe_column_name := regexp_replace(lower(p_column_name), '[^a-z0-9_]', '_', 'g');
  
  -- Limitar tamanho do nome da coluna
  IF length(v_safe_column_name) > 63 THEN
    v_safe_column_name := substring(v_safe_column_name, 1, 63);
  END IF;
  
  -- Validar tipo de dado
  v_safe_type := CASE upper(p_column_type)
    WHEN 'TEXT' THEN 'TEXT'
    WHEN 'INTEGER' THEN 'INTEGER'
    WHEN 'NUMERIC' THEN 'NUMERIC'
    WHEN 'DATE' THEN 'DATE'
    WHEN 'TIMESTAMP' THEN 'TIMESTAMP WITH TIME ZONE'
    WHEN 'BOOLEAN' THEN 'BOOLEAN'
    ELSE 'TEXT'
  END;
  
  -- Verificar se a coluna já existe
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vv_b_boletos_api' 
    AND column_name = v_safe_column_name
  ) INTO v_column_exists;
  
  -- Se já existe, retorna true sem erro
  IF v_column_exists THEN
    RETURN TRUE;
  END IF;
  
  -- Adicionar a coluna
  EXECUTE format(
    'ALTER TABLE public.vv_b_boletos_api ADD COLUMN %I %s',
    v_safe_column_name,
    v_safe_type
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar coluna %: %', v_safe_column_name, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Função para listar colunas dinâmicas (não-padrão) da tabela vv_b_boletos_api
CREATE OR REPLACE FUNCTION public.vv_b_list_dynamic_columns()
RETURNS TABLE(column_name TEXT, data_type TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = 'vv_b_boletos_api'
    AND c.column_name NOT IN (
      'id', 'integracao_id', 'cliente_id', 'numero_nota', 'numero_cobranca',
      'data_emissao', 'data_vencimento', 'valor', 'banco', 'cliente', 'empresa',
      'data_desconto', 'valor_desconto', 'dados_extras', 'json_original',
      'sincronizado_em', 'created_at', 'updated_at', 'deleted', 
      'usuario_delete_id', 'data_delete'
    )
  ORDER BY c.ordinal_position;
$$;