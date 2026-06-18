-- Self-host: torna policies condicionais à existência da tabela.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='cs_tv_realtime_alert_events'
  ) THEN
    CREATE POLICY "Authenticated users can insert realtime events for their company"
      ON public.cs_tv_realtime_alert_events
      FOR INSERT TO authenticated
      WITH CHECK (
        company_id IN (
          SELECT company_id FROM company_members WHERE user_id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN duplicate_object OR duplicate_table OR undefined_table THEN null;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='cs_tv_realtime_alert_events'
  ) THEN
    CREATE POLICY "Authenticated users can read their company realtime events"
      ON public.cs_tv_realtime_alert_events
      FOR SELECT TO authenticated
      USING (
        company_id IN (
          SELECT company_id FROM company_members WHERE user_id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN duplicate_object OR duplicate_table OR undefined_table THEN null;
END $$;
