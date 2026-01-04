-- Add public review fields to content_plans
ALTER TABLE content_plans 
ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS public_shared_at TIMESTAMPTZ;

-- Add review fields to content_plan_posts
ALTER TABLE content_plan_posts
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS review_feedback TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Create index for faster public token lookup
CREATE INDEX IF NOT EXISTS idx_content_plans_public_token ON content_plans(public_token) WHERE public_token IS NOT NULL;