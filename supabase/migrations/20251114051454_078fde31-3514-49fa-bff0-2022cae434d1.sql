-- Add dashboard_token field to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS dashboard_token TEXT UNIQUE;

-- Create function to generate unique dashboard token (using gen_random_uuid)
CREATE OR REPLACE FUNCTION generate_client_dashboard_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate token using gen_random_uuid and remove hyphens
    new_token := replace(gen_random_uuid()::text, '-', '');
    -- Take first 24 characters for a shorter token
    new_token := substring(new_token, 1, 24);
    
    SELECT EXISTS(
      SELECT 1 FROM public.clients WHERE dashboard_token = new_token
    ) INTO token_exists;
    
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger function to set dashboard token on insert
CREATE OR REPLACE FUNCTION set_client_dashboard_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.dashboard_token IS NULL THEN
    NEW.dashboard_token := generate_client_dashboard_token();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS client_dashboard_token_trigger ON public.clients;
CREATE TRIGGER client_dashboard_token_trigger
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION set_client_dashboard_token();

-- Generate tokens for existing clients
UPDATE public.clients 
SET dashboard_token = generate_client_dashboard_token()
WHERE dashboard_token IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_dashboard_token ON public.clients(dashboard_token);

-- RLS Policy for public access via dashboard token
DROP POLICY IF EXISTS "Allow public read via dashboard_token" ON public.clients;
CREATE POLICY "Allow public read via dashboard_token"
ON public.clients
FOR SELECT
TO anon
USING (dashboard_token IS NOT NULL);

-- Allow public read of campaigns for clients with dashboard_token
DROP POLICY IF EXISTS "Allow public read campaigns via client dashboard_token" ON public.campaigns;
CREATE POLICY "Allow public read campaigns via client dashboard_token"
ON public.campaigns
FOR SELECT
TO anon
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE dashboard_token IS NOT NULL
  )
);

-- Allow public read of ad_sets for clients with dashboard_token
DROP POLICY IF EXISTS "Allow public read ad_sets via client dashboard_token" ON public.ad_sets;
CREATE POLICY "Allow public read ad_sets via client dashboard_token"
ON public.ad_sets
FOR SELECT
TO anon
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE dashboard_token IS NOT NULL
  )
);

-- Allow public read of ads for clients with dashboard_token
DROP POLICY IF EXISTS "Allow public read ads via client dashboard_token" ON public.ads;
CREATE POLICY "Allow public read ads via client dashboard_token"
ON public.ads
FOR SELECT
TO anon
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE dashboard_token IS NOT NULL
  )
);