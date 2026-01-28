-- Add audio_transcription column to store transcription text
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS audio_transcription TEXT;

-- Add transcription_status to track processing state
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS transcription_status TEXT DEFAULT NULL;

-- Add index for faster queries on messages with transcriptions
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_transcription_status 
ON public.whatsapp_messages(transcription_status) 
WHERE transcription_status IS NOT NULL;