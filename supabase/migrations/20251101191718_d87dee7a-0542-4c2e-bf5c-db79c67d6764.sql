-- Adicionar apenas blocos que ainda não existem na biblioteca

-- 🧭 DESCOBERTA / ATENÇÃO (Topo do funil)
INSERT INTO funnel_block_types (name, display_name, category, icon, color, default_description)
SELECT * FROM (VALUES
  ('tiktok_ads', 'TikTok Ads', 'descoberta', 'video', '#FF0050', 'Campanhas de tráfego pago em vídeo curto'),
  ('pinterest_ads', 'Pinterest Ads', 'descoberta', 'image', '#E60023', 'Anúncios de descoberta visual'),
  ('podcast_spotify', 'Podcast / Spotify', 'descoberta', 'podcast', '#1DB954', 'Conteúdo em áudio para branding e awareness'),
  ('press_release', 'Press Release / Notícia', 'descoberta', 'newspaper', '#4A5568', 'Divulgação em portais e mídia espontânea'),
  ('influencers', 'Influenciadores / Parcerias', 'descoberta', 'users', '#E91E63', 'Co-marketing e influenciadores digitais'),
  ('blog_landing', 'Landing Page de Blog', 'descoberta', 'file-text', '#3B82F6', 'Atração por artigos de blog otimizados em SEO')
) AS t(name, display_name, category, icon, color, default_description)
WHERE NOT EXISTS (
  SELECT 1 FROM funnel_block_types WHERE funnel_block_types.name = t.name
);

-- 📚 NUTRIÇÃO / EDUCAÇÃO (Meio do funil)
INSERT INTO funnel_block_types (name, display_name, category, icon, color, default_description)
SELECT * FROM (VALUES
  ('checklist_template', 'Checklist / Template', 'nutricao', 'list-checks', '#8B5CF6', 'Material prático de alto valor percebido'),
  ('interactive_quiz', 'Quiz Interativo', 'nutricao', 'brain', '#EC4899', 'Diagnóstico rápido com gamificação'),
  ('masterclass', 'Aula Gravada / Masterclass', 'nutricao', 'graduation-cap', '#F59E0B', 'Conteúdo pré-gravado e perene'),
  ('community', 'Comunidade / Grupo', 'nutricao', 'users-round', '#10B981', 'Relacionamento e pertencimento (Telegram/Discord)'),
  ('push_notification', 'Notificação Push', 'nutricao', 'bell', '#6366F1', 'Engajamento recorrente no navegador'),
  ('educational_podcast', 'Podcast Educativo', 'nutricao', 'mic', '#14B8A6', 'Conteúdo recorrente com storytelling técnico'),
  ('case_study', 'Artigo Técnico / Case', 'nutricao', 'file-badge', '#3B82F6', 'Conteúdo aprofundado para validar autoridade')
) AS t(name, display_name, category, icon, color, default_description)
WHERE NOT EXISTS (
  SELECT 1 FROM funnel_block_types WHERE funnel_block_types.name = t.name
);

-- 🧩 QUALIFICAÇÃO / DIAGNÓSTICO
INSERT INTO funnel_block_types (name, display_name, category, icon, color, default_description)
SELECT * FROM (VALUES
  ('advanced_form', 'Formulário Avançado', 'qualificacao', 'clipboard-list', '#6366F1', 'Captação com lógica condicional (Typeform, Tally)'),
  ('video_call', 'Google Meet / Zoom', 'qualificacao', 'video', '#0B57D0', 'Reuniões de diagnóstico e demonstração'),
  ('ai_chatbot', 'Chatbot de Qualificação', 'qualificacao', 'bot', '#8B5CF6', 'Atendimento automatizado via IA pré-venda'),
  ('whatsapp_bot', 'WhatsApp Bot', 'qualificacao', 'message-circle', '#25D366', 'Fluxo automatizado de qualificação (n8n/Twilio)'),
  ('maturity_test', 'Teste de Maturidade', 'qualificacao', 'chart-bar', '#F59E0B', 'Diagnóstico estratégico por pontuação'),
  ('calendar_integration', 'Agenda Integrada', 'qualificacao', 'calendar', '#3B82F6', 'Sincronização de agendamentos (Google Calendar)')
) AS t(name, display_name, category, icon, color, default_description)
WHERE NOT EXISTS (
  SELECT 1 FROM funnel_block_types WHERE funnel_block_types.name = t.name
);

-- 💰 PROPOSTA / AVANÇO
INSERT INTO funnel_block_types (name, display_name, category, icon, color, default_description)
SELECT * FROM (VALUES
  ('sales_presentation', 'Apresentação Comercial', 'proposta', 'presentation', '#DC2626', 'Material de venda personalizado (PDF ou Vídeo Pitch)'),
  ('product_demo', 'Demo Gravada', 'proposta', 'play-circle', '#7C3AED', 'Demonstração rápida sem agendar reunião'),
  ('interactive_proposal', 'Proposta Interativa', 'proposta', 'file-text', '#0891B2', 'Proposta dinâmica e rastreável (Notion/PandaDoc)'),
  ('digital_contract', 'Contrato Digital', 'proposta', 'file-check', '#059669', 'Integração com DocuSign, Clicksign ou ZapSign'),
  ('followup_automation', 'Follow-up SMS/WhatsApp', 'proposta', 'phone', '#EA580C', 'Automação de lembretes'),
  ('checkout', 'Pagamento / Checkout', 'proposta', 'credit-card', '#10B981', 'Link de pagamento integrado (Stripe, Mercado Pago)')
) AS t(name, display_name, category, icon, color, default_description)
WHERE NOT EXISTS (
  SELECT 1 FROM funnel_block_types WHERE funnel_block_types.name = t.name
);

-- 🔁 PÓS-VENDA / RETENÇÃO
INSERT INTO funnel_block_types (name, display_name, category, icon, color, default_description)
SELECT * FROM (VALUES
  ('onboarding', 'Onboarding Automatizado', 'pos-venda', 'rocket', '#8B5CF6', 'Primeiras etapas após a compra'),
  ('client_community', 'Comunidade de Clientes', 'pos-venda', 'users', '#EC4899', 'Grupo exclusivo de networking e suporte'),
  ('nps_survey', 'Pesquisa de Satisfação', 'pos-venda', 'star', '#F59E0B', 'Feedback de experiência (NPS)'),
  ('client_portal', 'Área do Cliente', 'pos-venda', 'layout-dashboard', '#3B82F6', 'Central de relacionamento e acesso'),
  ('referral_program', 'Programa de Indicação', 'pos-venda', 'gift', '#10B981', 'Recompensa por indicações'),
  ('renewal_upsell', 'Renovação / Upsell', 'pos-venda', 'repeat', '#6366F1', 'Reativação e venda recorrente')
) AS t(name, display_name, category, icon, color, default_description)
WHERE NOT EXISTS (
  SELECT 1 FROM funnel_block_types WHERE funnel_block_types.name = t.name
);

-- ⚙️ AUTOMAÇÃO / SUPORTE TÉCNICO
INSERT INTO funnel_block_types (name, display_name, category, icon, color, default_description)
SELECT * FROM (VALUES
  ('webhook', 'Webhook / API', 'automacao', 'plug', '#64748B', 'Envio de dados entre sistemas'),
  ('crm_integration', 'CRM Avançado', 'automacao', 'database', '#0891B2', 'Conexão com CRM externo (HubSpot, Pipedrive)'),
  ('lead_scoring', 'Lead Scoring', 'automacao', 'target', '#DC2626', 'Classificação automática de leads'),
  ('ai_assistant', 'AI Assistant / Copiloto', 'automacao', 'bot-message-square', '#8B5CF6', 'Agente de IA com contexto do funil'),
  ('analytics_dashboard', 'Relatórios e Dashboards', 'automacao', 'bar-chart-3', '#059669', 'Métricas de desempenho (Data Studio, Looker)')
) AS t(name, display_name, category, icon, color, default_description)
WHERE NOT EXISTS (
  SELECT 1 FROM funnel_block_types WHERE funnel_block_types.name = t.name
);

-- 🌐 SUPORTE A MÍDIAS E EVENTOS
INSERT INTO funnel_block_types (name, display_name, category, icon, color, default_description)
SELECT * FROM (VALUES
  ('live_event', 'Evento Presencial', 'eventos', 'calendar-days', '#DC2626', 'Bloco para capturar presença física'),
  ('live_streaming', 'Transmissão ao Vivo', 'eventos', 'cast', '#7C3AED', 'Lives e lançamentos (StreamYard/OBS)'),
  ('qr_code', 'QR Code / Folder Digital', 'eventos', 'qr-code', '#475569', 'Captação offline conectada ao funil')
) AS t(name, display_name, category, icon, color, default_description)
WHERE NOT EXISTS (
  SELECT 1 FROM funnel_block_types WHERE funnel_block_types.name = t.name
);