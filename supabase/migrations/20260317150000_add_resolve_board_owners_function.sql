-- Function to resolve board column user_ids to employee names
-- Needed because employee.user_id may differ from auth.uid() used to create columns
-- This SECURITY DEFINER function can access auth.users to match by email
CREATE OR REPLACE FUNCTION public.resolve_board_owner_names(
  _company_id UUID
)
RETURNS TABLE(auth_uid UUID, employee_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    tbc.user_id AS auth_uid,
    COALESCE(
      -- First try: direct employee match by user_id
      (SELECT e.name FROM employees e
       WHERE e.user_id = tbc.user_id AND e.company_id = _company_id AND e.status = 'active'
       LIMIT 1),
      -- Second try: match via auth.users email → employee email
      (SELECT e.name FROM auth.users au
       JOIN employees e ON lower(e.email) = lower(au.email)
         AND e.company_id = _company_id AND e.status = 'active'
       WHERE au.id = tbc.user_id
       LIMIT 1),
      -- Third try: profile full_name
      (SELECT p.full_name FROM profiles p WHERE p.user_id = tbc.user_id),
      'Desconhecido'
    ) AS employee_name
  FROM task_board_columns tbc
  WHERE tbc.company_id = _company_id;
$$;
