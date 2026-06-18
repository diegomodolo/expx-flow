
-- Drop ALL policies that depend on internal_channels.reference_id (direct or indirect)
DROP POLICY IF EXISTS "Users can view accessible channels" ON public.internal_channels;

DROP POLICY IF EXISTS "Users can create channels in their company" ON public.internal_channels;

DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.internal_messages;

DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.internal_messages;

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.internal_messages;


-- Change reference_id from UUID to TEXT to support DM pair format (e.g. "uuid1:uuid2")
ALTER TABLE public.internal_channels 
ALTER COLUMN reference_id TYPE TEXT USING reference_id::text;
DO $$ BEGIN
  CREATE POLICY "Users can view accessible channels"
ON public.internal_channels
FOR SELECT
USING (
  is_company_member(auth.uid(), company_id)
  AND (
    channel_type = 'general'
    OR channel_type = 'client'
    OR (
      channel_type = 'squad'
      AND (
        is_company_owner(auth.uid(), company_id)
        OR is_squad_member(auth.uid(), reference_id::uuid)
        OR is_team_leader(auth.uid(), reference_id::uuid)
      )
    )
    OR (
      channel_type = 'dm'
      AND strpos(reference_id, auth.uid()::text) > 0
    )
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create channels in their company"
ON public.internal_channels
FOR INSERT
WITH CHECK (is_company_member(auth.uid(), company_id));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view messages in accessible channels"
ON public.internal_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.internal_channels ic
    WHERE ic.id = internal_messages.channel_id
      AND is_company_member(auth.uid(), ic.company_id)
      AND (
        ic.channel_type = 'general'
        OR ic.channel_type = 'client'
        OR (ic.channel_type = 'squad' AND (
          is_company_owner(auth.uid(), ic.company_id)
          OR is_squad_member(auth.uid(), ic.reference_id::uuid)
          OR is_team_leader(auth.uid(), ic.reference_id::uuid)
        ))
        OR (ic.channel_type = 'dm' AND strpos(ic.reference_id, auth.uid()::text) > 0)
      )
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can send messages in accessible channels"
ON public.internal_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.internal_channels ic
    WHERE ic.id = internal_messages.channel_id
      AND is_company_member(auth.uid(), ic.company_id)
      AND (
        ic.channel_type = 'general'
        OR ic.channel_type = 'client'
        OR (ic.channel_type = 'squad' AND (
          is_company_owner(auth.uid(), ic.company_id)
          OR is_squad_member(auth.uid(), ic.reference_id::uuid)
          OR is_team_leader(auth.uid(), ic.reference_id::uuid)
        ))
        OR (ic.channel_type = 'dm' AND strpos(ic.reference_id, auth.uid()::text) > 0)
      )
  )
);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own messages"
ON public.internal_messages
FOR DELETE
USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
