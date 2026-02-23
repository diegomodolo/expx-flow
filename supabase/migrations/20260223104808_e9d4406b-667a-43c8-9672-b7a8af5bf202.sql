-- Disable the trigger that creates ad_pending_approval notifications
DROP TRIGGER IF EXISTS notify_pending_ad_trigger ON public.ad_generation_queue;

-- Mark all existing ad_pending_approval notifications as read
UPDATE public.user_notifications 
SET is_read = true 
WHERE type = 'ad_pending_approval' AND is_read = false;