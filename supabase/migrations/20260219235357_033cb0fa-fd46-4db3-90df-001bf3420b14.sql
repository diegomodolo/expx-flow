-- Close the 2 stuck AI agent time tracking sessions
UPDATE public.task_time_tracking 
SET ended_at = NOW()
WHERE id IN ('908b26a4-a0af-409b-8743-f584d21c527e', 'eb8fb2b5-6a3a-4236-b0d9-f444181288ef')
AND ended_at IS NULL;