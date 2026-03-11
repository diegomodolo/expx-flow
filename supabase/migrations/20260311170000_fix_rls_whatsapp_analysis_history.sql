-- Fix RLS policies for whatsapp_realtime_analysis and whatsapp_realtime_analysis_history
-- The original policies used subqueries on tables with RLS (whatsapp_conversations,
-- whatsapp_instances) which fail silently returning 0 rows, causing INSERT to be
-- blocked with "violates row-level security policy" error.
-- Fix: use get_user_company_ids() SECURITY DEFINER function instead.

-- =============================================
-- Fix whatsapp_realtime_analysis table
-- =============================================

-- Drop old broken policies
DROP POLICY IF EXISTS "Users can view analysis for their company conversations" ON public.whatsapp_realtime_analysis;
DROP POLICY IF EXISTS "Users can insert analysis for their company conversations" ON public.whatsapp_realtime_analysis;
DROP POLICY IF EXISTS "Users can update analysis for their company conversations" ON public.whatsapp_realtime_analysis;

-- Create corrected policies using get_user_company_ids (SECURITY DEFINER - bypasses nested RLS)
CREATE POLICY "Users can view analysis for their company"
ON public.whatsapp_realtime_analysis
FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert analysis for their company"
ON public.whatsapp_realtime_analysis
FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update analysis for their company"
ON public.whatsapp_realtime_analysis
FOR UPDATE
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Add GRANT (was missing from original migration)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_realtime_analysis TO authenticated;

-- =============================================
-- Fix whatsapp_realtime_analysis_history table
-- =============================================

-- Drop old broken policies
DROP POLICY IF EXISTS "Users can view analysis history for their company" ON public.whatsapp_realtime_analysis_history;
DROP POLICY IF EXISTS "Users can insert analysis history for their company" ON public.whatsapp_realtime_analysis_history;

-- Create corrected policies using get_user_company_ids (SECURITY DEFINER - bypasses nested RLS)
CREATE POLICY "Users can view analysis history for their company"
ON public.whatsapp_realtime_analysis_history
FOR SELECT
USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert analysis history for their company"
ON public.whatsapp_realtime_analysis_history
FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- Add GRANT (was missing from original migration)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_realtime_analysis_history TO authenticated;
