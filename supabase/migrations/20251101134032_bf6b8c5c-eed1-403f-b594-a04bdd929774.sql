-- Create acquisition_funnels table
CREATE TABLE acquisition_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_acquisition_funnels_company ON acquisition_funnels(company_id);
CREATE INDEX idx_acquisition_funnels_client ON acquisition_funnels(client_id);

-- Enable RLS
ALTER TABLE acquisition_funnels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company members can view funnels"
  ON acquisition_funnels FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can create funnels"
  ON acquisition_funnels FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can update funnels"
  ON acquisition_funnels FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Company members can delete funnels"
  ON acquisition_funnels FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_acquisition_funnels_updated_at
  BEFORE UPDATE ON acquisition_funnels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create funnel_block_types table
CREATE TABLE funnel_block_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  default_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Populate with pre-configured blocks
INSERT INTO funnel_block_types (name, display_name, category, color, default_description) VALUES
  ('instagram', 'Instagram', 'descoberta', '#E1306C', 'Anúncios pagos no Instagram'),
  ('facebook', 'Facebook', 'descoberta', '#1877F2', 'Anúncios pagos no Facebook'),
  ('linkedin', 'LinkedIn', 'descoberta', '#0A66C2', 'Anúncios pagos no LinkedIn'),
  ('organic-content', 'Conteúdo Orgânico', 'descoberta', '#10B981', 'Postagens orgânicas'),
  ('google-ads', 'Google Ads', 'descoberta', '#4285F4', 'Campanhas do Google Ads'),
  ('seo', 'SEO', 'descoberta', '#059669', 'Tráfego orgânico via SEO'),
  ('youtube', 'YouTube', 'descoberta', '#FF0000', 'Vídeos no YouTube'),
  ('ebook', 'E-book', 'nutricao', '#8B5CF6', 'Material educativo'),
  ('diagnostico', 'Diagnóstico', 'nutricao', '#EC4899', 'Ferramenta de diagnóstico'),
  ('whatsapp', 'WhatsApp', 'nutricao', '#25D366', 'Comunicação via WhatsApp'),
  ('email-sequence', 'Sequência de E-mails', 'nutricao', '#F59E0B', 'Automação de e-mails'),
  ('webinar', 'Webinar', 'nutricao', '#6366F1', 'Evento online ao vivo'),
  ('video-curto', 'Vídeo Curto', 'nutricao', '#EF4444', 'Conteúdo em vídeo'),
  ('landing-page', 'Landing Page', 'qualificacao', '#14B8A6', 'Página de captura'),
  ('crm', 'CRM/Formulário', 'qualificacao', '#0EA5E9', 'Sistema de CRM'),
  ('sdr', 'SDR/Comercial', 'qualificacao', '#F97316', 'Equipe de vendas'),
  ('calendly', 'Calendly/Reunião', 'qualificacao', '#006BFF', 'Agendamento de reuniões'),
  ('proposta', 'Proposta Comercial', 'proposta', '#22C55E', 'Envio de proposta'),
  ('automacao', 'Automação/Follow-up', 'proposta', '#A855F7', 'Follow-up automatizado'),
  ('fechamento', 'Fechamento', 'proposta', '#16A34A', 'Conversão final');

-- Enable RLS for block types (read-only for all)
ALTER TABLE funnel_block_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view block types"
  ON funnel_block_types FOR SELECT
  USING (true);