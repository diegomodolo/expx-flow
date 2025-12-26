-- Função para buscar CNAEs agrupados com contagem correta
CREATE OR REPLACE FUNCTION get_cnae_summary(p_company_id UUID)
RETURNS TABLE (
  cnae_code TEXT,
  cnae_description TEXT,
  lead_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    clp.cnae_code,
    MAX(clp.cnae_description) as cnae_description,
    COUNT(*)::BIGINT as lead_count
  FROM cnae_lead_pool clp
  WHERE clp.company_id = p_company_id
  GROUP BY clp.cnae_code
  ORDER BY lead_count DESC;
END;
$$;