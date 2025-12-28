-- Create table for YouTube videos knowledge base
CREATE TABLE public.instagram_autopost_knowledge_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.instagram_auto_post_configs(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  transcription TEXT,
  duration_seconds INTEGER,
  published_at TIMESTAMPTZ,
  is_selected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(config_id, video_id)
);

-- Create table for PDF files knowledge base
CREATE TABLE public.instagram_autopost_knowledge_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.instagram_auto_post_configs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  content_text TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.instagram_autopost_knowledge_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_autopost_knowledge_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_videos
CREATE POLICY "Users can view their company's knowledge videos" 
ON public.instagram_autopost_knowledge_videos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert knowledge videos for their company" 
ON public.instagram_autopost_knowledge_videos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their company's knowledge videos" 
ON public.instagram_autopost_knowledge_videos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company's knowledge videos" 
ON public.instagram_autopost_knowledge_videos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

-- RLS policies for knowledge_files
CREATE POLICY "Users can view their company's knowledge files" 
ON public.instagram_autopost_knowledge_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert knowledge files for their company" 
ON public.instagram_autopost_knowledge_files 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their company's knowledge files" 
ON public.instagram_autopost_knowledge_files 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company's knowledge files" 
ON public.instagram_autopost_knowledge_files 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.instagram_auto_post_configs c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = config_id AND cm.user_id = auth.uid()
  )
);

-- Create storage bucket for knowledge PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('instagram-knowledge-files', 'instagram-knowledge-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for knowledge files bucket
CREATE POLICY "Users can view knowledge files from their company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'instagram-knowledge-files' 
  AND EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND (storage.foldername(name))[1] = cm.company_id::text
  )
);

CREATE POLICY "Users can upload knowledge files to their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'instagram-knowledge-files'
  AND EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND (storage.foldername(name))[1] = cm.company_id::text
  )
);

CREATE POLICY "Users can delete knowledge files from their company"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'instagram-knowledge-files'
  AND EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = auth.uid()
    AND (storage.foldername(name))[1] = cm.company_id::text
  )
);

-- Create indexes for performance
CREATE INDEX idx_knowledge_videos_config_id ON public.instagram_autopost_knowledge_videos(config_id);
CREATE INDEX idx_knowledge_files_config_id ON public.instagram_autopost_knowledge_files(config_id);