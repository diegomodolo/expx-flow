-- Fix: add WITH CHECK to the client_copywriters RLS policy for consistency with project standards
DROP POLICY IF EXISTS "company members can manage client_copywriters" ON public.client_copywriters;

CREATE POLICY "company members can manage client_copywriters"
  ON public.client_copywriters
  FOR ALL
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())))
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));
