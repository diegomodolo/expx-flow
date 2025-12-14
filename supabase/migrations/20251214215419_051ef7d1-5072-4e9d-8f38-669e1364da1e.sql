-- Add current_slide column to track session progress
ALTER TABLE presentation_meetings ADD COLUMN IF NOT EXISTS current_slide integer DEFAULT 2;