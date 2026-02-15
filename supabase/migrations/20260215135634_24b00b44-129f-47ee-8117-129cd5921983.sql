-- Add data access skills
INSERT INTO public.ia_agent_skills (id, name, description, category, edge_function, requires_client, tool_parameters) VALUES
-- Dados de Clientes
('data_clients', 'Consultar Clientes', 'Busca e lista clientes da empresa com nome, setor, status, budget e métricas. Use para encontrar informações sobre clientes.', 'dados', '_builtin_query', false, '{"type":"object","properties":{"search":{"type":"string","description":"Nome ou parte do nome do cliente para filtrar (opcional)"},"status":{"type":"string","description":"Filtrar por status: ativo, pausado, cancelado (opcional)"},"limit":{"type":"number","description":"Quantidade máxima de resultados (padrão 10)"}}}'::jsonb),

('data_client_details', 'Detalhes do Cliente', 'Retorna informações completas de um cliente: briefing, público-alvo, tom de voz, objetivos, campanhas ativas e métricas de performance.', 'dados', '_builtin_query', true, '{"type":"object","properties":{"client_id":{"type":"string","description":"ID do cliente (use Consultar Clientes para encontrar o ID)"},"client_name":{"type":"string","description":"Nome do cliente para buscar (alternativa ao ID)"}}}'::jsonb),

-- Dados de Campanhas
('data_campaigns', 'Consultar Campanhas', 'Lista campanhas de um cliente com métricas de performance: gasto, CPC, CTR, conversões, CPA.', 'dados', '_builtin_query', true, '{"type":"object","properties":{"status":{"type":"string","description":"Filtrar por status: active, paused, archived (opcional)"},"limit":{"type":"number","description":"Quantidade máxima (padrão 10)"}}}'::jsonb),

('data_ads', 'Consultar Anúncios', 'Lista anúncios de um cliente com métricas detalhadas: impressões, cliques, CTR, conversões, copy, headline e imagem.', 'dados', '_builtin_query', true, '{"type":"object","properties":{"campaign_id":{"type":"string","description":"Filtrar por campanha específica (opcional)"},"limit":{"type":"number","description":"Quantidade máxima (padrão 10)"}}}'::jsonb),

-- Dados de CS / Saúde
('data_client_health', 'Saúde do Cliente (CS)', 'Retorna indicadores de saúde do cliente: score financeiro, operacional, relacional, NPS, risco de churn e último contato CS.', 'dados', '_builtin_query', true, '{"type":"object","properties":{}}'::jsonb),

('data_client_milestones', 'Milestones do Cliente', 'Lista marcos e conquistas do cliente: onboarding, metas atingidas, celebrações.', 'dados', '_builtin_query', true, '{"type":"object","properties":{}}'::jsonb),

-- Dados de Leads
('data_leads', 'Consultar Leads', 'Busca leads na base com filtros por segmento, score e status de conversão.', 'dados', '_builtin_query', false, '{"type":"object","properties":{"segment_id":{"type":"string","description":"Filtrar por segmento (opcional)"},"min_score":{"type":"number","description":"Score mínimo (0-100, opcional)"},"limit":{"type":"number","description":"Quantidade máxima (padrão 20)"}}}'::jsonb),

('data_lead_segments', 'Segmentos de Leads', 'Lista segmentos de leads cadastrados com contagem de leads por segmento.', 'dados', '_builtin_query', false, '{"type":"object","properties":{}}'::jsonb),

-- Dados de Automações
('data_automation_rules', 'Regras de Automação', 'Lista regras de automação de campanhas: condições, ações, status e últimas execuções.', 'dados', '_builtin_query', false, '{"type":"object","properties":{"client_id":{"type":"string","description":"Filtrar por cliente (opcional)"},"is_active":{"type":"boolean","description":"Filtrar apenas ativas (opcional)"}}}'::jsonb),

('data_automation_logs', 'Logs de Automação', 'Consulta histórico de execuções de automação com resultados e erros.', 'dados', '_builtin_query', false, '{"type":"object","properties":{"client_id":{"type":"string","description":"Filtrar por cliente (opcional)"},"limit":{"type":"number","description":"Quantidade máxima (padrão 20)"}}}'::jsonb),

-- Dados de Concorrentes
('data_competitors', 'Consultar Concorrentes', 'Lista concorrentes monitorados de um cliente com insights de anúncios.', 'dados', '_builtin_query', true, '{"type":"object","properties":{}}'::jsonb),

-- Dados de Postagens
('data_scheduled_posts', 'Postagens Agendadas', 'Lista postagens agendadas e publicadas de um cliente com status e plataforma.', 'dados', '_builtin_query', true, '{"type":"object","properties":{"status":{"type":"string","description":"Filtrar por status: scheduled, published, failed (opcional)"},"limit":{"type":"number","description":"Quantidade máxima (padrão 10)"}}}'::jsonb),

-- Dados do Feed de Atividades
('data_activity_feed', 'Feed de Atividades', 'Consulta atividades recentes da empresa: alterações, sincronizações, automações executadas.', 'dados', '_builtin_query', false, '{"type":"object","properties":{"limit":{"type":"number","description":"Quantidade máxima (padrão 20)"}}}' ::jsonb),

-- Dados de Benchmarks
('data_benchmarks', 'Benchmarks do Cliente', 'Retorna metas e benchmarks configurados para o cliente: CPA alvo, ROAS alvo, CTR alvo por plataforma.', 'dados', '_builtin_query', true, '{"type":"object","properties":{}}'::jsonb)

ON CONFLICT (id) DO NOTHING;