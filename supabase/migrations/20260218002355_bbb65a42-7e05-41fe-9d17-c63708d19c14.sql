
-- 1. Add employee_id to team_members to link members to employees/users
ALTER TABLE public.team_members
ADD COLUMN employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_team_members_employee_id ON public.team_members(employee_id);

-- 2. Security definer function: check if user belongs to a specific team
CREATE OR REPLACE FUNCTION public.is_squad_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.employees e ON e.id = tm.employee_id
    WHERE tm.team_id = _team_id
      AND e.user_id = _user_id
  )
$$;

-- 3. Security definer function: check if user belongs to ANY team in a company
CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT tm.team_id
  FROM public.team_members tm
  JOIN public.employees e ON e.id = tm.employee_id
  WHERE e.user_id = _user_id
$$;

-- 4. Security definer function: check if user is owner of a company
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = 'owner'
  )
$$;

-- 5. Security definer: check if user is leader of a team
CREATE OR REPLACE FUNCTION public.is_team_leader(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.employees e ON e.id = t.leader_id
    WHERE t.id = _team_id
      AND e.user_id = _user_id
  )
$$;

-- ============================================================
-- 6. UPDATE RLS for internal_channels
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view channels of their company" ON public.internal_channels;
DROP POLICY IF EXISTS "Users can create channels in their company" ON public.internal_channels;

-- New SELECT policy: 
--   general channels → visible to all company members
--   squad channels → visible only to squad members, leaders, or company owners
--   client channels → visible to company members (existing behavior)
CREATE POLICY "Users can view accessible channels"
ON public.internal_channels
FOR SELECT
TO authenticated
USING (
  is_company_member(auth.uid(), company_id)
  AND (
    -- General channels: visible to everyone in the company
    channel_type = 'general'
    -- Client channels: visible to everyone in the company (existing behavior)
    OR channel_type = 'client'
    -- Squad channels: only visible to squad members, leaders, or owners
    OR (
      channel_type = 'squad'
      AND (
        is_company_owner(auth.uid(), company_id)
        OR is_squad_member(auth.uid(), reference_id)
        OR is_team_leader(auth.uid(), reference_id)
      )
    )
  )
);

-- INSERT policy: only owners and leaders can create squad channels
CREATE POLICY "Users can create channels in their company"
ON public.internal_channels
FOR INSERT
TO authenticated
WITH CHECK (
  is_company_member(auth.uid(), company_id)
);

-- ============================================================
-- 7. UPDATE RLS for internal_messages (restrict to accessible channels)
-- ============================================================

DROP POLICY IF EXISTS "Users can view messages in their company channels" ON public.internal_messages;
DROP POLICY IF EXISTS "Users can send messages in their company channels" ON public.internal_messages;

-- SELECT: user can only see messages in channels they can access
CREATE POLICY "Users can view messages in accessible channels"
ON public.internal_messages
FOR SELECT
TO authenticated
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
            OR is_squad_member(auth.uid(), ic.reference_id)
            OR is_team_leader(auth.uid(), ic.reference_id)
          )
        )
      )
  )
);

-- INSERT: user can only send messages in channels they can access
CREATE POLICY "Users can send messages in accessible channels"
ON public.internal_messages
FOR INSERT
TO authenticated
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
            OR is_squad_member(auth.uid(), ic.reference_id)
            OR is_team_leader(auth.uid(), ic.reference_id)
          )
        )
      )
  )
);

-- ============================================================
-- 8. UPDATE RLS for clients (squad-based filtering)
-- ============================================================

-- Drop existing company-wide SELECT policy
DROP POLICY IF EXISTS "Company members can view clients" ON public.clients;

-- New SELECT policy: 
--   Owners see all clients in the company
--   Squad members see only clients assigned to their squads (via team_id)
--   Clients without team_id are visible to all company members
CREATE POLICY "Users can view clients based on squad"
ON public.clients
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()
  )
  AND (
    -- Owners see everything
    is_company_owner(auth.uid(), company_id)
    -- Clients without a team assigned: visible to all
    OR team_id IS NULL
    -- Clients with team_id: only visible to squad members or leaders
    OR team_id IN (SELECT public.get_user_team_ids(auth.uid()))
    OR is_team_leader(auth.uid(), team_id)
  )
);

-- Keep the existing public dashboard_token policy
-- Keep existing INSERT/UPDATE/DELETE policies (company-wide)

-- ============================================================
-- 9. Enable RLS on team_members
-- ============================================================
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
      AND is_company_member(auth.uid(), t.company_id)
  )
);

CREATE POLICY "Company members can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
      AND is_company_member(auth.uid(), t.company_id)
  )
);
