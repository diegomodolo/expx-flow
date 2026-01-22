CREATE OR REPLACE FUNCTION get_problematic_urls_for_tv(p_company_id UUID)
RETURNS TABLE (
  url_id UUID,
  url TEXT,
  client_id UUID,
  client_name TEXT,
  client_avatar TEXT,
  validation_status TEXT,
  validation_status_code INTEGER,
  active_campaign_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH url_campaigns AS (
    SELECT 
      cu.id as url_id,
      cu.url,
      cu.client_id,
      cu.validation_status,
      cu.validation_status_code,
      COUNT(DISTINCT CASE WHEN c.is_active = true THEN c.id END) as active_campaign_count
    FROM client_urls cu
    LEFT JOIN ads a ON SPLIT_PART(a.link_url, '?', 1) = cu.url AND a.client_id = cu.client_id
    LEFT JOIN campaigns c ON a.campaign_id = c.id
    WHERE cu.company_id = p_company_id
      AND cu.is_active = true
      AND cu.validation_status IN ('error', 'timeout')
    GROUP BY cu.id, cu.url, cu.client_id, cu.validation_status, cu.validation_status_code
  )
  SELECT 
    uc.url_id,
    uc.url,
    uc.client_id,
    cl.name as client_name,
    cl.avatar as client_avatar,
    uc.validation_status,
    uc.validation_status_code,
    uc.active_campaign_count::INTEGER
  FROM url_campaigns uc
  JOIN clients cl ON uc.client_id = cl.id
  WHERE uc.active_campaign_count > 0
  ORDER BY uc.active_campaign_count DESC, uc.validation_status;
END;
$$ LANGUAGE plpgsql;