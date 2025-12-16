-- Add score dimension fields to lead_master_pool
ALTER TABLE lead_master_pool
ADD COLUMN IF NOT EXISTS score_company_fit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_authority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_contact_quality INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_purchase_intent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_digital_maturity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_classification TEXT CHECK (lead_classification IN ('ouro', 'prata', 'bronze')),
ADD COLUMN IF NOT EXISTS classification_reason TEXT,
ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMPTZ;

-- Create lead qualification rules table
CREATE TABLE IF NOT EXISTS lead_qualification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('company_fit', 'authority', 'contact_quality', 'purchase_intent', 'digital_maturity')),
  field TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('=', '!=', '>', '<', '>=', '<=', 'contains', 'not_null', 'is_null')),
  value TEXT,
  score_contribution INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  rule_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create lead qualification weights table
CREATE TABLE IF NOT EXISTS lead_qualification_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  weight_company_fit NUMERIC DEFAULT 0.25,
  weight_authority NUMERIC DEFAULT 0.25,
  weight_contact_quality NUMERIC DEFAULT 0.15,
  weight_purchase_intent NUMERIC DEFAULT 0.20,
  weight_digital_maturity NUMERIC DEFAULT 0.15,
  threshold_gold INTEGER DEFAULT 70,
  threshold_silver INTEGER DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_qualification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualification_weights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_qualification_rules
CREATE POLICY "Company members can view qualification rules"
ON lead_qualification_rules FOR SELECT
USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company admins can manage qualification rules"
ON lead_qualification_rules FOR ALL
USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- RLS Policies for lead_qualification_weights
CREATE POLICY "Company members can view qualification weights"
ON lead_qualification_weights FOR SELECT
USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company admins can manage qualification weights"
ON lead_qualification_weights FOR ALL
USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_qualification_rules_company ON lead_qualification_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_qualification_rules_dimension ON lead_qualification_rules(dimension);
CREATE INDEX IF NOT EXISTS idx_lead_classification ON lead_master_pool(lead_classification);
CREATE INDEX IF NOT EXISTS idx_lead_scores ON lead_master_pool(score_company_fit, score_authority, score_contact_quality, score_purchase_intent, score_digital_maturity);