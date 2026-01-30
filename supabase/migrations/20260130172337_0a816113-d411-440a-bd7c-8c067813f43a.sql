-- Allow authenticated users to insert alert events for their company
CREATE POLICY "Authenticated users can insert realtime events for their company"
ON public.cs_tv_realtime_alert_events
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
);

-- Also allow authenticated users to read their company's alert events
CREATE POLICY "Authenticated users can read their company realtime events"
ON public.cs_tv_realtime_alert_events
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  )
);