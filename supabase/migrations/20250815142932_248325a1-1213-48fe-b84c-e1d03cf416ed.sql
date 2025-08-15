-- Adicionar coluna client_name à tabela visual_creatives
ALTER TABLE public.visual_creatives 
ADD COLUMN client_name TEXT;