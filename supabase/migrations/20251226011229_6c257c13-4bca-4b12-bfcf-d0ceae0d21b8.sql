-- Add scalar function to return total distinct CNAEs for a company (avoids PostgREST max_rows limit)
CREATE OR REPLACE FUNCTION public.get_cnae_total(p_company_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT clp.cnae_code)
  FROM public.cnae_lead_pool clp
  WHERE clp.company_id = p_company_id
    AND clp.cnae_code IS NOT NULL;
$$;