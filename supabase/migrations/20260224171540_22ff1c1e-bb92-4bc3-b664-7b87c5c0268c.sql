
-- Adicionar colunas para integração com Shotstack na tabela clip_jobs
ALTER TABLE public.clip_jobs
ADD COLUMN IF NOT EXISTS shotstack_source_id text,
ADD COLUMN IF NOT EXISTS shotstack_render_ids text[],
ADD COLUMN IF NOT EXISTS total_expected_clips integer;