-- Add daily_report to trigger_type constraint
ALTER TABLE whatsapp_notification_triggers 
DROP CONSTRAINT IF EXISTS whatsapp_notification_triggers_trigger_type_check;

ALTER TABLE whatsapp_notification_triggers 
ADD CONSTRAINT whatsapp_notification_triggers_trigger_type_check 
CHECK (trigger_type IN ('high_cpa', 'low_balance', 'disabled_account', 'presentation_summary', 'post_published', 'post_failed', 'weekly_report', 'monthly_report', 'daily_report', 'custom'));