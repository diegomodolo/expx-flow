-- =====================================================
-- EXPANSÃO DA TABELA lead_master_pool PARA QUALIFICAÇÃO COMPLETA
-- =====================================================

-- 2. Dados da Empresa
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS company_trade_name TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS company_segment TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS company_subsegment TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS cnae TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS monthly_revenue TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS annual_revenue TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS years_in_market INTEGER;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS client_type TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS company_website TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS company_linkedin TEXT;

-- 3. Dados do Contato (Pessoa) - campos adicionais
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS job_level TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS email_type TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS linkedin_profile TEXT;

-- 4. Estrutura Organizacional / Decisão
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS buying_role TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS is_decision_maker BOOLEAN DEFAULT false;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS influence_level TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS decision_makers_count INTEGER;

-- 5. Stack Atual / Contexto de Software
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS uses_software BOOLEAN;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS software_type TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS current_software TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS current_vendor TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS software_usage_time TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS software_satisfaction TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS main_pain_point TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS switch_reason TEXT;

-- 6. Potencial de Compra
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS estimated_users INTEGER;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS license_type TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS purchase_timeline TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS urgency_level TEXT;

-- 7. Comportamento e Engajamento
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS first_interaction_at TIMESTAMPTZ;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS content_consumed JSONB DEFAULT '[]';
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS pages_visited JSONB DEFAULT '[]';
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS visited_pricing BOOLEAN DEFAULT false;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS attended_webinar BOOLEAN DEFAULT false;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS requested_demo BOOLEAN DEFAULT false;

-- 8. Origem de Marketing e Aquisição
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS acquisition_channel TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS specific_source TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS campaign TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS ad_set TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS creative TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS keyword TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS lead_cost DECIMAL(10,2);
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS capture_url TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS capture_type TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS secondary_source TEXT;

-- 9. Qualidade e Enriquecimento
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS lead_validated BOOLEAN DEFAULT false;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS company_validated BOOLEAN DEFAULT false;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS data_enriched BOOLEAN DEFAULT false;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS enrichment_source TEXT;

-- 10. Consentimento e Compliance (LGPD)
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS lgpd_consent BOOLEAN DEFAULT false;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS consent_source TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS data_purpose TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS partner_sharing_consent BOOLEAN DEFAULT false;

-- 11. Campos Técnicos / Operacionais
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'novo';
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS internal_classification TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE lead_master_pool ADD COLUMN IF NOT EXISTS assigned_to UUID;

-- Índices para campos frequentemente consultados
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_lead_status ON lead_master_pool(lead_status);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_company_name ON lead_master_pool(company_name);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_cnpj ON lead_master_pool(cnpj);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_acquisition_channel ON lead_master_pool(acquisition_channel);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_lgpd_consent ON lead_master_pool(lgpd_consent);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_urgency_level ON lead_master_pool(urgency_level);
CREATE INDEX IF NOT EXISTS idx_lead_master_pool_buying_role ON lead_master_pool(buying_role);