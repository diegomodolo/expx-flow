-- Fix RLS policies for whatsapp_realtime_analysis tables
-- Problem: policies used nested subqueries on tables with RLS (whatsapp_conversations, whatsapp_instances)
-- which fail silently returning 0 rows, causing INSERT/UPDATE to be denied (error 42501).
-- Solution: use get_user_company_ids() SECURITY DEFINER function + add missing GRANTs.

-- ============================================================
-- Fix whatsapp_realtime_analysis policies
-- ============================================================

DROP POLICY IF EXISTS "Users can view analysis for their company conversations" ON public.whatsapp_realtime_analysis;

DROP POLICY IF EXISTS "Users can insert analysis for their company conversations" ON public.whatsapp_realtime_analysis;

DROP POLICY IF EXISTS "Users can update analysis for their company conversations" ON public.whatsapp_realtime_analysis;
DO $$ BEGIN
  CREATE POLICY "Users can view analysis for their company"
  ON public.whatsapp_realtime_analysis FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert analysis for their company"
  ON public.whatsapp_realtime_analysis FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update analysis for their company"
  ON public.whatsapp_realtime_analysis FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete analysis for their company"
  ON public.whatsapp_realtime_analysis FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Add missing GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_realtime_analysis TO authenticated;


-- ============================================================
-- Fix whatsapp_realtime_analysis_history policies
-- ============================================================

DROP POLICY IF EXISTS "Users can view analysis history for their company" ON public.whatsapp_realtime_analysis_history;

DROP POLICY IF EXISTS "Users can insert analysis history for their company" ON public.whatsapp_realtime_analysis_history;
DO $$ BEGIN
  CREATE POLICY "Users can view analysis history for their company"
  ON public.whatsapp_realtime_analysis_history FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert analysis history for their company"
  ON public.whatsapp_realtime_analysis_history FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update analysis history for their company"
  ON public.whatsapp_realtime_analysis_history FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete analysis history for their company"
  ON public.whatsapp_realtime_analysis_history FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Add missing GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_realtime_analysis_history TO authenticated;