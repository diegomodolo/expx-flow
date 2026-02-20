-- Fix RLS policies that fail casting reference_id to UUID for dm channels
-- The issue: (ic.reference_id)::uuid cast fails for dm channels where reference_id = 'uuid1:uuid2'

-- Fix internal_messages SELECT policy
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.internal_messages;
CREATE POLICY "Users can view messages in accessible channels"
ON public.internal_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM internal_channels ic
    WHERE ic.id = internal_messages.channel_id
      AND is_company_member(auth.uid(), ic.company_id)
      AND (
        ic.channel_type = 'general'
        OR ic.channel_type = 'client'
        OR (
          ic.channel_type = 'squad'
          AND (
            is_company_owner(auth.uid(), ic.company_id)
            OR is_squad_member(auth.uid(), (ic.reference_id)::uuid)
            OR is_team_leader(auth.uid(), (ic.reference_id)::uuid)
          )
        )
        OR (
          ic.channel_type = 'dm'
          AND POSITION((auth.uid())::text IN ic.reference_id) > 0
        )
      )
  )
);

-- Fix internal_messages INSERT policy
DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.internal_messages;
CREATE POLICY "Users can send messages in accessible channels"
ON public.internal_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM internal_channels ic
    WHERE ic.id = internal_messages.channel_id
      AND is_company_member(auth.uid(), ic.company_id)
      AND (
        ic.channel_type = 'general'
        OR ic.channel_type = 'client'
        OR (
          ic.channel_type = 'squad'
          AND (
            is_company_owner(auth.uid(), ic.company_id)
            OR is_squad_member(auth.uid(), (ic.reference_id)::uuid)
            OR is_team_leader(auth.uid(), (ic.reference_id)::uuid)
          )
        )
        OR (
          ic.channel_type = 'dm'
          AND POSITION((auth.uid())::text IN ic.reference_id) > 0
        )
      )
  )
);

-- Fix internal_channels SELECT policy as well (same issue)
DROP POLICY IF EXISTS "Users can view accessible channels" ON public.internal_channels;
CREATE POLICY "Users can view accessible channels"
ON public.internal_channels FOR SELECT
USING (
  is_company_member(auth.uid(), company_id)
  AND (
    channel_type = 'general'
    OR channel_type = 'client'
    OR (
      channel_type = 'squad'
      AND (
        is_company_owner(auth.uid(), company_id)
        OR is_squad_member(auth.uid(), (reference_id)::uuid)
        OR is_team_leader(auth.uid(), (reference_id)::uuid)
      )
    )
    OR (
      channel_type = 'dm'
      AND POSITION((auth.uid())::text IN reference_id) > 0
    )
  )
);

-- Also allow the dm-agent-responder (service role) to insert messages
-- Service role bypasses RLS by default, so no extra policy needed there.
-- But we need to allow SELECT on internal_channels for dm channels without user context
-- The trigger function runs as SECURITY DEFINER so it bypasses RLS - no change needed.