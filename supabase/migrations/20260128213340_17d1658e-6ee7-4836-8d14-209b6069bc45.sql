-- Insert missing contacts from WhatsApp conversations that are already linked to clients
INSERT INTO whatsapp_client_contacts (company_id, client_id, contact_name, phone, is_active)
SELECT DISTINCT c.company_id, wc.client_id, wc.contact_name, wc.phone, true
FROM whatsapp_conversations wc 
JOIN clients c ON c.id = wc.client_id 
WHERE wc.client_id IS NOT NULL 
AND wc.contact_name IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM whatsapp_client_contacts wcc 
  WHERE wcc.client_id = wc.client_id AND wcc.phone = wc.phone
);