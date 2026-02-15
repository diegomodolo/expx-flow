
-- Skills catalog table
CREATE TABLE public.ia_agent_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  edge_function TEXT NOT NULL,
  required_params JSONB DEFAULT '{}',
  optional_params JSONB DEFAULT '{}',
  requires_client BOOLEAN DEFAULT false,
  tool_parameters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ia_agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skills catalog readable by authenticated users"
  ON public.ia_agent_skills FOR SELECT
  USING (auth.role() = 'authenticated');

-- Enabled skills per agent
CREATE TABLE public.ia_agent_enabled_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ia_agents(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES public.ia_agent_skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, skill_id)
);

ALTER TABLE public.ia_agent_enabled_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view enabled skills for their agents"
  ON public.ia_agent_enabled_skills FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ia_agents WHERE id = agent_id AND user_id = auth.uid()));

CREATE POLICY "Users can enable skills for their agents"
  ON public.ia_agent_enabled_skills FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.ia_agents WHERE id = agent_id AND user_id = auth.uid()));

CREATE POLICY "Users can disable skills for their agents"
  ON public.ia_agent_enabled_skills FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.ia_agents WHERE id = agent_id AND user_id = auth.uid()));

-- Seed skills catalog
INSERT INTO public.ia_agent_skills (id, name, description, category, edge_function, requires_client, tool_parameters) VALUES
-- Conteudo
('generate_creative_texts', 'Gerar Textos Criativos', 'Gera headlines, copys e CTAs para anúncios', 'conteudo', 'generate-creative-texts', true, '{"type":"object","properties":{"quantity":{"type":"number","description":"Quantidade de variações"},"format":{"type":"string","description":"Formato: headline, copy, cta"}}}'::jsonb),
('generate_content_ai', 'Gerar Conteúdo AI', 'Gera conteúdo por tipo (post, story, reels, etc)', 'conteudo', 'generate-content-ai', true, '{"type":"object","properties":{"content_type":{"type":"string","description":"Tipo: post, story, reels, artigo"},"topic":{"type":"string","description":"Tema do conteúdo"}}}'::jsonb),
('generate_creative_variations', 'Gerar Variações de Criativo', 'Cria variações visuais de um criativo existente', 'conteudo', 'generate-creative-variations', true, '{"type":"object","properties":{"ad_id":{"type":"string","description":"ID do anúncio base"},"quantity":{"type":"number","description":"Quantidade de variações"}}}'::jsonb),
('generate_carousel', 'Gerar Carrossel', 'Gera carrosseis para Instagram', 'conteudo', 'daily-carousel-generator', true, '{"type":"object","properties":{"theme":{"type":"string","description":"Tema do carrossel"},"slides_count":{"type":"number","description":"Número de slides"}}}'::jsonb),
('generate_instagram_post', 'Gerar Post Instagram', 'Gera post automático para Instagram', 'conteudo', 'generate-instagram-auto-post', true, '{"type":"object","properties":{"topic":{"type":"string","description":"Tema do post"}}}'::jsonb),
('generate_wordpress_post', 'Gerar Post WordPress', 'Gera post para WordPress', 'conteudo', 'generate-wordpress-auto-post', true, '{"type":"object","properties":{"topic":{"type":"string","description":"Tema do artigo"},"keywords":{"type":"string","description":"Palavras-chave"}}}'::jsonb),
('generate_rss_post', 'Gerar Post RSS', 'Gera post baseado em feed RSS', 'conteudo', 'generate-rss-post', true, '{"type":"object","properties":{"feed_url":{"type":"string","description":"URL do feed RSS"}}}'::jsonb),
('generate_creative_suggestions', 'Gerar Sugestões Criativas', 'Sugere ideias de criativos', 'conteudo', 'generate-creative-suggestions', true, '{"type":"object","properties":{"context":{"type":"string","description":"Contexto para as sugestões"}}}'::jsonb),

-- YouTube
('generate_video_script', 'Gerar Roteiro de Vídeo', 'Cria roteiro completo para YouTube', 'youtube', 'generate-video-script', true, '{"type":"object","properties":{"topic":{"type":"string","description":"Tema do vídeo"},"duration_minutes":{"type":"number","description":"Duração estimada"}}}'::jsonb),
('generate_youtube_titles', 'Gerar Títulos YouTube', 'Sugere títulos otimizados para YouTube', 'youtube', 'generate-youtube-titles', true, '{"type":"object","properties":{"topic":{"type":"string","description":"Tema do vídeo"},"quantity":{"type":"number","description":"Quantidade de sugestões"}}}'::jsonb),
('generate_youtube_thumbnail', 'Gerar Thumbnail YouTube', 'Cria thumbnail com IA', 'youtube', 'generate-youtube-thumbnail', true, '{"type":"object","properties":{"title":{"type":"string","description":"Título do vídeo"},"style":{"type":"string","description":"Estilo visual"}}}'::jsonb),
('generate_video_suggestions', 'Gerar Sugestões de Vídeo', 'Sugere ideias de vídeos baseado no nicho', 'youtube', 'generate-video-suggestions', true, '{"type":"object","properties":{"niche":{"type":"string","description":"Nicho/segmento"}}}'::jsonb),
('analyze_youtube_channel', 'Analisar Canal YouTube', 'Analisa métricas e performance do canal', 'youtube', 'analyze-youtube-channel', true, '{"type":"object","properties":{}}'::jsonb),
('transcribe_youtube_video', 'Transcrever Vídeo', 'Transcreve áudio de vídeo do YouTube', 'youtube', 'transcribe-youtube-video', false, '{"type":"object","properties":{"video_url":{"type":"string","description":"URL do vídeo"}}}'::jsonb),

-- Campanhas Meta
('analyze_campaign', 'Analisar Campanha', 'Análise detalhada de performance de campanha', 'campanhas', 'generate-campaign-analysis', true, '{"type":"object","properties":{"campaign_id":{"type":"string","description":"ID da campanha (opcional, analisa todas se vazio)"}}}'::jsonb),
('campaign_recommendation', 'Recomendação de Campanha', 'Sugere otimizações para campanhas', 'campanhas', 'generate-campaign-recommendation', true, '{"type":"object","properties":{}}'::jsonb),
('campaign_strategy', 'Estratégia de Campanha', 'Cria estratégia completa de campanha', 'campanhas', 'generate-campaign-strategy', true, '{"type":"object","properties":{"objective":{"type":"string","description":"Objetivo da campanha"}}}'::jsonb),
('manage_campaign', 'Gerenciar Campanha', 'Pausar, ativar, renomear ou ajustar budget', 'campanhas', 'manage-facebook-campaign', true, '{"type":"object","properties":{"campaign_id":{"type":"string","description":"ID da campanha"},"action":{"type":"string","description":"Ação: pause, activate, rename, adjust_budget"},"value":{"type":"string","description":"Novo valor (nome ou budget)"}}}'::jsonb),
('create_campaign', 'Criar Campanha Completa', 'Cria campanha + adset + anúncio no Meta', 'campanhas', 'create-meta-campaign-full', true, '{"type":"object","properties":{"campaign_name":{"type":"string","description":"Nome da campanha"},"objective":{"type":"string","description":"Objetivo"},"daily_budget":{"type":"number","description":"Budget diário em centavos"}}}'::jsonb),
('analyze_ad_winners', 'Analisar Vencedores', 'Identifica anúncios com melhor performance', 'campanhas', 'analyze-ad-winners', true, '{"type":"object","properties":{}}'::jsonb),
('score_ad', 'Pontuar Anúncio', 'Dá nota de qualidade para um criativo gerado', 'campanhas', 'score-generated-ad', true, '{"type":"object","properties":{"ad_content":{"type":"string","description":"Conteúdo do anúncio para avaliar"}}}'::jsonb),
('sync_campaigns', 'Sincronizar Campanhas', 'Sincroniza dados do Meta Ads', 'campanhas', 'sync-facebook-campaigns', true, '{"type":"object","properties":{}}'::jsonb),

-- Prospecção
('prospect_google', 'Prospectar Google', 'Busca leads no Google Maps por palavra-chave e região', 'prospeccao', 'prospect-google-leads', false, '{"type":"object","properties":{"keyword":{"type":"string","description":"Palavra-chave de busca"},"location":{"type":"string","description":"Cidade ou região"}}}'::jsonb),
('prospect_instagram', 'Prospectar Instagram', 'Busca seguidores de concorrentes no Instagram', 'prospeccao', 'prospect-instagram-followers', false, '{"type":"object","properties":{"username":{"type":"string","description":"Username do perfil alvo"}}}'::jsonb),
('google_trends', 'Google Trends', 'Consulta tendências de busca', 'prospeccao', 'google-trends', false, '{"type":"object","properties":{"keyword":{"type":"string","description":"Palavra-chave para pesquisar"},"geo":{"type":"string","description":"País (ex: BR)"}}}'::jsonb),
('research_themes', 'Pesquisa de Mercado', 'Gera temas de pesquisa para o nicho', 'prospeccao', 'generate-research-themes', true, '{"type":"object","properties":{"niche":{"type":"string","description":"Nicho de mercado"}}}'::jsonb),

-- Utilidades
('translate_text', 'Traduzir Texto', 'Traduz textos entre idiomas', 'utilidades', 'translate-text', false, '{"type":"object","properties":{"text":{"type":"string","description":"Texto para traduzir"},"target_language":{"type":"string","description":"Idioma destino"}}}'::jsonb),
('validate_grammar', 'Corrigir Gramática', 'Corrige erros gramaticais em textos', 'utilidades', 'validate-text-grammar', false, '{"type":"object","properties":{"text":{"type":"string","description":"Texto para corrigir"}}}'::jsonb),
('transcribe_audio', 'Transcrever Áudio', 'Transcreve áudio para texto', 'utilidades', 'transcribe-audio', false, '{"type":"object","properties":{"audio_url":{"type":"string","description":"URL do áudio"}}}'::jsonb),
('generate_client_briefing', 'Gerar Briefing do Cliente', 'Gera briefing automático baseado nos dados', 'utilidades', 'generate-client-briefing', true, '{"type":"object","properties":{}}'::jsonb),
('analyze_url', 'Analisar URL', 'Extrai e analisa conteúdo de uma URL', 'utilidades', 'analyze-url-content', false, '{"type":"object","properties":{"url":{"type":"string","description":"URL para analisar"}}}'::jsonb),
('analyze_competitors', 'Analisar Concorrentes', 'Analisa anúncios e estratégias de concorrentes', 'utilidades', 'analyze-competitor-insights', true, '{"type":"object","properties":{"competitor_id":{"type":"string","description":"ID do concorrente"}}}'::jsonb),

-- WhatsApp
('send_whatsapp', 'Enviar WhatsApp', 'Envia mensagem via WhatsApp', 'whatsapp', 'send-whatsapp-notification', true, '{"type":"object","properties":{"phone":{"type":"string","description":"Número de telefone"},"message":{"type":"string","description":"Mensagem a enviar"}}}'::jsonb),

-- Publicação
('publish_scheduled_post', 'Publicar Post Agendado', 'Publica post no horário agendado', 'publicacao', 'publish-scheduled-post', true, '{"type":"object","properties":{"post_id":{"type":"string","description":"ID do post"}}}'::jsonb),
('schedule_post', 'Agendar Postagem', 'Agenda uma publicação futura', 'publicacao', 'scheduled-post-publisher', true, '{"type":"object","properties":{"content":{"type":"string","description":"Conteúdo do post"},"scheduled_for":{"type":"string","description":"Data/hora ISO para publicar"}}}'::jsonb);
