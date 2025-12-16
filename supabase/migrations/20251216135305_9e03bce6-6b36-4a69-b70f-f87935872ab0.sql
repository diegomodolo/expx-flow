-- Inserir segmentos únicos que existem nos leads mas não na tabela de segmentos
INSERT INTO lead_segments (company_id, name, segment_type, is_auto, color, icon)
SELECT DISTINCT 
  l.company_id,
  l.company_segment,
  'sector',
  true,
  '#3B82F6',
  'tag'
FROM lead_master_pool l
WHERE l.company_segment IS NOT NULL
  AND l.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lead_segments s 
    WHERE s.company_id = l.company_id 
      AND s.segment_type = 'sector'
      AND LOWER(s.name) = LOWER(l.company_segment)
  );

-- Vincular leads aos segmentos correspondentes (usando 'auto' que é um valor permitido)
INSERT INTO lead_segment_assignments (lead_id, segment_id, assigned_by, assigned_at)
SELECT 
  l.id,
  s.id,
  'auto',
  NOW()
FROM lead_master_pool l
JOIN lead_segments s ON s.company_id = l.company_id 
  AND s.segment_type = 'sector'
  AND LOWER(s.name) = LOWER(l.company_segment)
WHERE l.company_segment IS NOT NULL
ON CONFLICT (lead_id, segment_id) DO NOTHING;