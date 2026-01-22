-- Add validation tracking fields to client_urls table
ALTER TABLE public.client_urls 
ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_status_code INTEGER,
ADD COLUMN IF NOT EXISTS validation_load_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS validation_error TEXT,
ADD COLUMN IF NOT EXISTS validation_final_url TEXT;

-- Add index for faster queries on validation status
CREATE INDEX IF NOT EXISTS idx_client_urls_validation_status ON public.client_urls(validation_status);

-- Add comment for documentation
COMMENT ON COLUMN public.client_urls.validation_status IS 'ok, error, timeout, redirect, pending';