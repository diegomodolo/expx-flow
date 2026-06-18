
-- Add participants and calendar event tracking to google_meet_meetings
ALTER TABLE public.google_meet_meetings 
  ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text;


-- Add comment
COMMENT ON COLUMN public.google_meet_meetings.participants IS 'Array of {email, name, type} objects for meeting attendees';

COMMENT ON COLUMN public.google_meet_meetings.google_calendar_event_id IS 'Google Calendar event ID for the meeting';