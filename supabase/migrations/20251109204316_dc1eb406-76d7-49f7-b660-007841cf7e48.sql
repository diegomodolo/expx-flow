-- Corrigir security warnings das funções CRM
ALTER FUNCTION generate_crm_access_token() SECURITY DEFINER SET search_path = 'public';
ALTER FUNCTION update_crm_lead_updated_at() SECURITY DEFINER SET search_path = 'public';