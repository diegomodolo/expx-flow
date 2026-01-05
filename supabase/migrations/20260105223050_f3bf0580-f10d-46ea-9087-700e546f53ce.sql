-- Update social_tv_performance_aggregates to include ALL campaigns (not just active)
-- This matches the logic used in the clients page for consolidated_conversions

CREATE OR REPLACE FUNCTION public.social_tv_performance_aggregates(p_company_id uuid)
RETURNS TABLE (
  total_spend numeric,
  total_conversions bigint,
  avg_ctr numeric
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(c.spend), 0)::numeric AS total_spend,
    COALESCE(SUM(c.conversions), 0)::bigint AS total_conversions,
    COALESCE(AVG(c.ctr), 0)::numeric AS avg_ctr
  FROM public.campaigns c
  WHERE c.company_id = p_company_id;
  -- Removed: AND c.is_active = true
  -- Now sums ALL campaigns to match clients page logic
END;
$$;