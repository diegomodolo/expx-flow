-- Sync existing client health configs with latest WhatsApp message timestamps
UPDATE public.client_health_config chc
SET 
  last_cs_contact_at = latest.last_message_at,
  updated_at = NOW()
FROM (
  SELECT 
    wc.client_id,
    MAX(wm.sent_at) as last_message_at
  FROM whatsapp_conversations wc
  JOIN whatsapp_messages wm ON wm.conversation_id = wc.id
  WHERE wc.client_id IS NOT NULL
  GROUP BY wc.client_id
) latest
WHERE chc.client_id = latest.client_id
  AND (chc.last_cs_contact_at IS NULL OR chc.last_cs_contact_at < latest.last_message_at);