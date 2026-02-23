-- Allow tasks to be created without a team
ALTER TABLE public.tasks ALTER COLUMN team_id DROP NOT NULL;