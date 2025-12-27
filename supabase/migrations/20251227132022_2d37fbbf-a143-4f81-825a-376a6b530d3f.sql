-- Add avatar_url column to crm_users table
ALTER TABLE public.crm_users 
ADD COLUMN avatar_url TEXT;