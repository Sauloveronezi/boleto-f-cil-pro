CREATE OR REPLACE FUNCTION vv_b_get_table_columns(p_table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public' 
    AND c.table_name = p_table_name
  ORDER BY 
    c.ordinal_position;
END;
$$;
