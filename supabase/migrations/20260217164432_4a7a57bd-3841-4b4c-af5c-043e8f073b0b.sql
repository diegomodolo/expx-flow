
-- Add notification type settings to discord_config
ALTER TABLE public.discord_config
  ADD COLUMN IF NOT EXISTS notify_task_created boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_task_completed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_task_assigned boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_task_overdue boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_task_comment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_daily_summary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_squad_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_client_alerts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_campaign_status boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_employee_mentions boolean NOT NULL DEFAULT true;
