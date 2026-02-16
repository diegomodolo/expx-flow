
-- Re-link sacfiscal instagram account to SacFiscal facebook page
-- The previous migration may not have persisted
UPDATE instagram_accounts 
SET facebook_page_id = '76af788a-74f5-44e5-92ec-7990578ad6fa'
WHERE id = 'fa580569-0e04-4891-bbbf-dc5193192f5d'
AND (facebook_page_id IS NULL OR facebook_page_id != '76af788a-74f5-44e5-92ec-7990578ad6fa');
