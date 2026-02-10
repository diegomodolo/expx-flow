
-- =============================================
-- GroupOps Module - Complete Database Schema
-- =============================================

-- 1. Scoring Profiles
CREATE TABLE public.groupops_scoring_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules_json JSONB NOT NULL DEFAULT '{"message":0,"checkin":2,"challenge_done":6,"case_submit":5,"useful_reply":3,"streak_bonus":4,"spam":-5}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_scoring_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage scoring profiles for their company" ON public.groupops_scoring_profiles FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 2. Groups
CREATE TABLE public.groupops_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'uazapi',
  provider_group_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled','paused','archived')),
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  language TEXT DEFAULT 'pt-BR',
  rules_text TEXT,
  config_json JSONB NOT NULL DEFAULT '{
    "quiet_hours":{"start":"22:00","end":"08:00"},
    "rate_limit":{"max_msgs_per_hour":10,"max_mentions_per_post":3},
    "auto_reply_mode":"safe",
    "approval_required":false,
    "default_scoring_profile_id":null
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage groups for their company" ON public.groupops_groups FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 3. Members
CREATE TABLE public.groupops_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groupops_groups(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wa_user_id TEXT,
  phone_e164 TEXT,
  display_name TEXT,
  company_name TEXT,
  role TEXT,
  segment TEXT,
  size_bucket TEXT,
  primary_pain TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','muted','banned','left')),
  last_message_at TIMESTAMPTZ,
  last_participation_at TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0,
  silent_days INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low','mid','high')),
  privacy_flags JSONB DEFAULT '{"opt_in_dm":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage members for their company" ON public.groupops_members FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 4. Messages
CREATE TABLE public.groupops_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groupops_groups(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_message_id TEXT,
  author_member_id UUID REFERENCES public.groupops_members(id) ON DELETE SET NULL,
  text TEXT,
  media_type TEXT DEFAULT 'none' CHECK (media_type IN ('none','image','audio','video','doc')),
  media_url TEXT,
  mentions TEXT[] DEFAULT '{}',
  reply_to_message_id UUID REFERENCES public.groupops_messages(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage messages for their company" ON public.groupops_messages FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 5. Events
CREATE TABLE public.groupops_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groupops_groups(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.groupops_members(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('MESSAGE','CHECKIN_REPLY','CHALLENGE_JOIN','CHALLENGE_DONE','CASE_SUBMIT','POLL_VOTE','KEYWORD_TRIGGER','HELP_REQUEST','MODERATION_FLAG')),
  payload_json JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage events for their company" ON public.groupops_events FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 6. Score Ledger
CREATE TABLE public.groupops_score_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groupops_groups(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.groupops_members(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  event_id UUID REFERENCES public.groupops_events(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_score_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage scores for their company" ON public.groupops_score_ledger FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 7. Badges
CREATE TABLE public.groupops_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏅',
  rule_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage badges for their company" ON public.groupops_badges FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 8. Member Badges
CREATE TABLE public.groupops_member_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.groupops_members(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.groupops_badges(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, badge_id)
);
ALTER TABLE public.groupops_member_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage member badges for their company" ON public.groupops_member_badges FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 9. Campaigns
CREATE TABLE public.groupops_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groupops_groups(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DAILY_PROMPT','CHECKIN','CHALLENGE','WEEKLY_RANKING','CASE_OF_DAY','DIGEST')),
  status TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled','paused')),
  schedule_rule TEXT,
  template_id UUID,
  targeting_rule_json JSONB DEFAULT '{}'::jsonb,
  scoring_profile_id UUID REFERENCES public.groupops_scoring_profiles(id) ON DELETE SET NULL,
  cooldown_rule_json JSONB DEFAULT '{}'::jsonb,
  delivery_mode TEXT DEFAULT 'group_post' CHECK (delivery_mode IN ('group_post','dm','group_post_dm')),
  approval_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage campaigns for their company" ON public.groupops_campaigns FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 10. Templates
CREATE TABLE public.groupops_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  placeholders TEXT[] DEFAULT '{}',
  variants JSONB DEFAULT '[]'::jsonb,
  tone TEXT DEFAULT 'direto' CHECK (tone IN ('direto','provocativo','tecnico','casual')),
  constraints_json JSONB DEFAULT '{"max_mentions":3,"max_chars":4096}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage templates for their company" ON public.groupops_templates FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 11. Moderation Rules
CREATE TABLE public.groupops_moderation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groupops_groups(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flood','link_spam','banned_words','aggression','custom')),
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL DEFAULT 'flag' CHECK (action_type IN ('flag','warn','mute','report','cooldown')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_moderation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage moderation rules for their company" ON public.groupops_moderation_rules FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- 12. Moderation Actions
CREATE TABLE public.groupops_moderation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groupops_groups(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.groupops_members(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.groupops_moderation_rules(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.groupops_messages(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('warn','mute','ban','flag','cooldown')),
  reason TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groupops_moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage moderation actions for their company" ON public.groupops_moderation_actions FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

-- Indexes for performance
CREATE INDEX idx_groupops_groups_company ON public.groupops_groups(company_id);
CREATE INDEX idx_groupops_members_group ON public.groupops_members(group_id);
CREATE INDEX idx_groupops_members_company ON public.groupops_members(company_id);
CREATE INDEX idx_groupops_members_status ON public.groupops_members(status);
CREATE INDEX idx_groupops_members_risk ON public.groupops_members(risk_level);
CREATE INDEX idx_groupops_messages_group ON public.groupops_messages(group_id);
CREATE INDEX idx_groupops_messages_timestamp ON public.groupops_messages(timestamp);
CREATE INDEX idx_groupops_events_group ON public.groupops_events(group_id);
CREATE INDEX idx_groupops_events_type ON public.groupops_events(type);
CREATE INDEX idx_groupops_events_timestamp ON public.groupops_events(timestamp);
CREATE INDEX idx_groupops_score_ledger_member ON public.groupops_score_ledger(member_id);
CREATE INDEX idx_groupops_score_ledger_group ON public.groupops_score_ledger(group_id);
CREATE INDEX idx_groupops_campaigns_group ON public.groupops_campaigns(group_id);
CREATE INDEX idx_groupops_moderation_actions_group ON public.groupops_moderation_actions(group_id);
CREATE INDEX idx_groupops_moderation_actions_resolved ON public.groupops_moderation_actions(resolved);

-- Add FK for campaigns.template_id after templates table exists
ALTER TABLE public.groupops_campaigns ADD CONSTRAINT groupops_campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.groupops_templates(id) ON DELETE SET NULL;
