-- Update the social_tv_performance_aggregates function to include Google Campaigns
CREATE OR REPLACE FUNCTION public.social_tv_performance_aggregates(p_company_id uuid)
RETURNS TABLE(total_spend numeric, total_conversions bigint, avg_ctr numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (COALESCE((SELECT SUM(spend) FROM public.campaigns WHERE company_id = p_company_id), 0) +
     COALESCE((SELECT SUM(spend) FROM public.google_campaigns WHERE company_id = p_company_id), 0))::numeric AS total_spend,
    (COALESCE((SELECT SUM(conversions) FROM public.campaigns WHERE company_id = p_company_id), 0) +
     COALESCE((SELECT SUM(conversions) FROM public.google_campaigns WHERE company_id = p_company_id), 0))::bigint AS total_conversions,
    COALESCE((
      SELECT AVG(ctr) FROM (
        SELECT ctr FROM public.campaigns WHERE company_id = p_company_id AND ctr > 0
        UNION ALL
        SELECT ctr FROM public.google_campaigns WHERE company_id = p_company_id AND ctr > 0
      ) combined
    ), 0)::numeric AS avg_ctr;
END;
$$;