-- Fix RLS policies for whatsapp_conversation_assignments
-- Problema: policies usavam subquery em profiles (que tem RLS), causando falha silenciosa
-- Solucao: usar get_user_company_ids() SECURITY DEFINER

DROP POLICY IF EXISTS "Users can view assignments from their company" ON whatsapp_conversation_assignments;
DROP POLICY IF EXISTS "Users can create assignments in their company" ON whatsapp_conversation_assignments;
DROP POLICY IF EXISTS "Users can update assignments in their company" ON whatsapp_conversation_assignments;
DROP POLICY IF EXISTS "Users can delete assignments in their company" ON whatsapp_conversation_assignments;

CREATE POLICY "Users can view assignments from their company"
ON whatsapp_conversation_assignments FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can create assignments in their company"
ON whatsapp_conversation_assignments FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update assignments in their company"
ON whatsapp_conversation_assignments FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete assignments in their company"
ON whatsapp_conversation_assignments FOR DELETE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Fix tambem whatsapp_assignment_history que tem o mesmo problema
DROP POLICY IF EXISTS "Users can view assignment history from their company" ON whatsapp_assignment_history;
DROP POLICY IF EXISTS "Users can create assignment history in their company" ON whatsapp_assignment_history;

CREATE POLICY "Users can view assignment history from their company"
ON whatsapp_assignment_history FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can create assignment history in their company"
ON whatsapp_assignment_history FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));
