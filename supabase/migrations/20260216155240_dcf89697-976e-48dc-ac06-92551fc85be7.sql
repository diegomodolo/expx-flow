-- Add bot_token column to discord_config for per-company token storage
ALTER TABLE public.discord_config ADD COLUMN bot_token TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.discord_config.bot_token IS 'Discord Bot Token per company - stored encrypted at application level';