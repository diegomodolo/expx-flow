-- Add public sharing token to acquisition_funnels table
ALTER TABLE acquisition_funnels 
ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS public_shared_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_acquisition_funnels_public_token 
ON acquisition_funnels(public_token) 
WHERE public_token IS NOT NULL;

-- Create function to generate unique token
CREATE OR REPLACE FUNCTION generate_funnel_public_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token (12 characters)
    new_token := encode(gen_random_bytes(9), 'hex');
    
    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM acquisition_funnels WHERE public_token = new_token
    ) INTO token_exists;
    
    -- If token doesn't exist, return it
    IF NOT token_exists THEN
      RETURN new_token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policy for public access to shared funnels
CREATE POLICY "Public funnels are viewable by anyone"
ON acquisition_funnels
FOR SELECT
USING (is_public = true AND public_token IS NOT NULL);