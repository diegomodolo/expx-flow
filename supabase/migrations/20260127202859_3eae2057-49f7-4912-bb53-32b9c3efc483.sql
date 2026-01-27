-- Add columns for content analysis
ALTER TABLE public.client_urls ADD COLUMN IF NOT EXISTS content_match_score numeric;
ALTER TABLE public.client_urls ADD COLUMN IF NOT EXISTS content_analysis_summary text;
ALTER TABLE public.client_urls ADD COLUMN IF NOT EXISTS content_analyzed_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.client_urls.content_match_score IS 'Score de 0-100 de compatibilidade do conteúdo da página com o briefing do cliente';
COMMENT ON COLUMN public.client_urls.content_analysis_summary IS 'Resumo da análise de compatibilidade gerado pela IA';
COMMENT ON COLUMN public.client_urls.content_analyzed_at IS 'Data/hora da última análise de conteúdo';