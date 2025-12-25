-- Remove duplicates from google_campaigns where same google_id has different period formats
-- Keep the one with normalized period (numeric like '30', '7', etc.) and delete the text-based ones

-- First, delete records with text-based period formats where a numeric version exists
DELETE FROM google_campaigns gc1
WHERE gc1.period LIKE 'last_%'
AND EXISTS (
  SELECT 1 FROM google_campaigns gc2 
  WHERE gc2.google_id = gc1.google_id 
  AND gc2.company_id = gc1.company_id
  AND gc2.period ~ '^[0-9]+$'
);

-- Update remaining text-based periods to numeric format
UPDATE google_campaigns
SET period = CASE period
  WHEN 'last_7_days' THEN '7'
  WHEN 'last_14_days' THEN '14'
  WHEN 'last_30_days' THEN '30'
  WHEN 'last_90_days' THEN '90'
  ELSE period
END
WHERE period LIKE 'last_%';