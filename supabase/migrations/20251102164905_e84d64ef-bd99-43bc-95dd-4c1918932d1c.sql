-- Adicionar novos tipos de blocos de containers
INSERT INTO funnel_block_types 
  (name, display_name, category, color, icon, default_description)
VALUES
  ('container-sequence', 'Sequência', 'containers', '#8B5CF6', 'package', 'Container para agrupar uma sequência de blocos'),
  ('container-campaign', 'Campanha', 'containers', '#7C3AED', 'megaphone', 'Container para agrupar blocos de uma campanha específica'),
  ('container-stage', 'Etapa do Funil', 'containers', '#6D28D9', 'layers', 'Container para agrupar blocos de uma etapa específica')
ON CONFLICT (name) DO NOTHING;