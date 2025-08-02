-- Adicionar campos para rastreamento de organização por IA na tabela tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS organized_by_ai BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_estimated_minutes INTEGER,
ADD COLUMN IF NOT EXISTS ai_organization_date TIMESTAMP WITH TIME ZONE;