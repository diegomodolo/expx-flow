-- Drop and recreate function with new return type
DROP FUNCTION IF EXISTS get_problematic_urls_for_tv(uuid);

CREATE OR REPLACE FUNCTION get_problematic_urls_for_tv(p_company_id UUID)
RETURNS TABLE (
  url_id UUID,
  url TEXT,
  client_id UUID,
  client_name TEXT,
  client_avatar TEXT,
  validation_status TEXT,
  validation_status_code INTEGER,
  active_campaign_count INTEGER,
  content_match_score NUMERIC
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
      cu.content_match_score,
      COUNT(DISTINCT CASE WHEN c.is_active = true THEN c.id END) as active_campaign_count
    FROM client_urls cu
    LEFT JOIN ads a ON SPLIT_PART(a.link_url, '?', 1) = cu.url AND a.client_id = cu.client_id
    LEFT JOIN campaigns c ON a.campaign_id = c.id
    WHERE cu.company_id = p_company_id
      AND cu.is_active = true
      AND (
        cu.validation_status IN ('error', 'timeout', 'suspicious', 'empty')
        OR (cu.content_match_score IS NOT NULL AND cu.content_match_score < 50)
      )
    GROUP BY cu.id, cu.url, cu.client_id, cu.validation_status, cu.validation_status_code, cu.content_match_score
  )
  SELECT 
    uc.url_id,
    uc.url,
    uc.client_id,
    cl.name as client_name,
    cl.avatar as client_avatar,
    uc.validation_status,
    uc.validation_status_code,
    uc.active_campaign_count::INTEGER,
    uc.content_match_score
  FROM url_campaigns uc
  JOIN clients cl ON uc.client_id = cl.id
  WHERE uc.active_campaign_count > 0
  ORDER BY 
    CASE uc.validation_status 
      WHEN 'error' THEN 1 
      WHEN 'suspicious' THEN 2 
      WHEN 'empty' THEN 3 
      WHEN 'timeout' THEN 4 
      ELSE 5 
    END,
    uc.active_campaign_count DESC;
END;
$$ LANGUAGE plpgsql;