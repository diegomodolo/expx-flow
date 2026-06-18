ALTER TABLE public.google_meet_meetings 
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS recording_drive_file_id text;


COMMENT ON COLUMN public.google_meet_meetings.recording_url IS 'URL to view the recording (Drive or direct)';

COMMENT ON COLUMN public.google_meet_meetings.recording_drive_file_id IS 'Google Drive file ID of the recording';