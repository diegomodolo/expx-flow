
-- Fix: Use employees.team_id for squad membership (actual data model).
-- The team_members table is secondary; employees.team_id is the primary linkage.

CREATE OR REPLACE FUNCTION public.is_squad_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = _user_id
      AND e.team_id = _team_id
      AND e.status = 'active'
  )
$$;


CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT e.team_id
  FROM public.employees e
  WHERE e.user_id = _user_id
    AND e.team_id IS NOT NULL
    AND e.status = 'active'
$$;