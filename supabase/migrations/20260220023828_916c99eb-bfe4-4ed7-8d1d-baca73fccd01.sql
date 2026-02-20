
-- Drop existing broken policies
DROP POLICY IF EXISTS "Users can view accessible channels" ON public.internal_channels;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.internal_messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.internal_messages;

-- Recreate SELECT policy for channels using CASE to avoid invalid UUID cast on DM reference_id
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
      AND position(auth.uid()::text IN reference_id) > 0
    )
  )
);

-- Recreate SELECT policy for messages using CASE to avoid invalid UUID cast on DM reference_id
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
        OR (
          ic.channel_type = 'squad'
          AND (
            is_company_owner(auth.uid(), ic.company_id)
            OR is_squad_member(auth.uid(), ic.reference_id::uuid)
            OR is_team_leader(auth.uid(), ic.reference_id::uuid)
          )
        )
        OR (
          ic.channel_type = 'dm'
          AND position(auth.uid()::text IN ic.reference_id) > 0
        )
      )
  )
);

-- Recreate INSERT policy for messages using CASE to avoid invalid UUID cast on DM reference_id
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
        OR (
          ic.channel_type = 'squad'
          AND (
            is_company_owner(auth.uid(), ic.company_id)
            OR is_squad_member(auth.uid(), ic.reference_id::uuid)
            OR is_team_leader(auth.uid(), ic.reference_id::uuid)
          )
        )
        OR (
          ic.channel_type = 'dm'
          AND position(auth.uid()::text IN ic.reference_id) > 0
        )
      )
  )
);
