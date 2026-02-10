
-- Remove the restrictive tone check constraint to allow all tone values used by the app
ALTER TABLE public.groupops_templates DROP CONSTRAINT IF EXISTS groupops_templates_tone_check;
