-- Sincronizar campaign_objectives das regras importadas com seus templates de origem
UPDATE campaign_automation_rules imported
SET campaign_objectives = template.campaign_objectives
FROM campaign_automation_rules template
WHERE imported.template_id = template.id
  AND imported.is_template = false
  AND template.is_template = true
  AND imported.campaign_objectives IS NULL
  AND template.campaign_objectives IS NOT NULL;