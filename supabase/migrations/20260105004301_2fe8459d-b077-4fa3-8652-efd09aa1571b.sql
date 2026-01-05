-- Aggregates for Social TV dashboard (avoids PostgREST aggregate restriction)

CREATE OR REPLACE FUNCTION public.social_tv_performance_aggregates(p_company_id uuid)
RETURNS TABLE(
  total_spend numeric,
  total_conversions bigint,
  avg_ctr numeric
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(SUM(c.spend), 0)::numeric AS total_spend,
    COALESCE(SUM(c.conversions), 0)::bigint AS total_conversions,
    COALESCE(AVG(c.ctr), 0)::numeric AS avg_ctr
  FROM public.campaigns c
  WHERE c.company_id = p_company_id
    AND c.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.social_tv_featured_client_aggregates(p_company_id uuid)
RETURNS TABLE(
  client_id uuid,
  total_spend numeric,
  avg_ctr numeric,
  campaigns_count bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    c.client_id,
    COALESCE(SUM(c.spend), 0)::numeric AS total_spend,
    COALESCE(AVG(c.ctr), 0)::numeric AS avg_ctr,
    COUNT(*)::bigint AS campaigns_count
  FROM public.campaigns c
  WHERE c.company_id = p_company_id
    AND c.is_active = true
    AND c.client_id IS NOT NULL
  GROUP BY c.client_id
  ORDER BY total_spend DESC
  LIMIT 1;
$$;
