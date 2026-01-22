-- Function to get URLs with active campaign status
CREATE OR REPLACE FUNCTION get_urls_with_campaign_status(p_company_id UUID)
RETURNS TABLE (
  url_id UUID,
  has_active_campaign BOOLEAN,
  active_campaign_count INTEGER,
  total_campaign_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id as url_id,
    COALESCE(COUNT(DISTINCT CASE WHEN c.is_active = true THEN c.id END) > 0, false) as has_active_campaign,
    COALESCE(COUNT(DISTINCT CASE WHEN c.is_active = true THEN c.id END), 0)::INTEGER as active_campaign_count,
    COALESCE(COUNT(DISTINCT c.id), 0)::INTEGER as total_campaign_count
  FROM client_urls cu
  LEFT JOIN ads a ON SPLIT_PART(a.link_url, '?', 1) = cu.url AND a.client_id = cu.client_id
  LEFT JOIN campaigns c ON a.campaign_id = c.id
  WHERE cu.company_id = p_company_id
  GROUP BY cu.id;
END;
$$;