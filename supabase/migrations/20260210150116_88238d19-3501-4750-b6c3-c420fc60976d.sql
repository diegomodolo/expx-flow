
-- Fix: Add missing columns from failed migration
ALTER TABLE public.groupops_campaigns 
  ADD COLUMN IF NOT EXISTS template_mode text NOT NULL DEFAULT 'random',
  ADD COLUMN IF NOT EXISTS selected_template_ids uuid[] DEFAULT '{}';

-- Drop restrictive check constraints and replace with flexible ones
ALTER TABLE public.groupops_campaigns DROP CONSTRAINT IF EXISTS groupops_campaigns_status_check;
ALTER TABLE public.groupops_campaigns DROP CONSTRAINT IF EXISTS groupops_campaigns_type_check;
ALTER TABLE public.groupops_campaigns DROP CONSTRAINT IF EXISTS groupops_campaigns_delivery_mode_check;

-- Add flexible constraints
ALTER TABLE public.groupops_campaigns ADD CONSTRAINT groupops_campaigns_status_check 
  CHECK (status IN ('draft', 'active', 'paused', 'completed', 'enabled'));

ALTER TABLE public.groupops_campaigns ADD CONSTRAINT groupops_campaigns_type_check 
  CHECK (type IN ('DAILY_PROMPT', 'CHECKIN', 'CHALLENGE', 'CASE_STUDY', 'RANKING', 'WELCOME', 'REACTIVATION', 'CUSTOM', 'WEEKLY_RANKING', 'CASE_OF_DAY', 'DIGEST'));

ALTER TABLE public.groupops_campaigns ADD CONSTRAINT groupops_campaigns_delivery_mode_check 
  CHECK (delivery_mode IN ('group', 'dm', 'both', 'group_post', 'group_post_dm'));

ALTER TABLE public.groupops_campaigns ADD CONSTRAINT groupops_campaigns_template_mode_check 
  CHECK (template_mode IN ('random', 'selected'));
