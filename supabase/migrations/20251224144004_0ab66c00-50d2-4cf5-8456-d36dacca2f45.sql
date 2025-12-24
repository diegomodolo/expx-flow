-- Atualizar os pesos e thresholds para valores adequados ao ListaCNAE
UPDATE lead_qualification_weights 
SET 
  threshold_gold = 45,
  threshold_silver = 25,
  weight_company_fit = 0.50,
  weight_authority = 0.05,
  weight_contact_quality = 0.20,
  weight_purchase_intent = 0.05,
  weight_digital_maturity = 0.20,
  updated_at = NOW();

-- Deletar todas as regras antigas (serão recriadas com valores corretos)
DELETE FROM lead_qualification_rules;

-- Inserir novas regras de Company Fit (dimensão principal para ListaCNAE)
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'company_fit',
  'company_name',
  'not_null',
  NULL,
  15,
  true
FROM lead_qualification_weights;

INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'company_fit',
  'cnpj',
  'not_null',
  NULL,
  15,
  true
FROM lead_qualification_weights;

-- Porte da empresa - DEMAIS (empresas maiores)
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'company_fit',
  'company_size',
  '=',
  'DEMAIS',
  30,
  true
FROM lead_qualification_weights;

-- Porte da empresa - EPP
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'company_fit',
  'company_size',
  '=',
  'EMPRESA DE PEQUENO PORTE',
  20,
  true
FROM lead_qualification_weights;

-- Porte da empresa - ME
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'company_fit',
  'company_size',
  '=',
  'MICRO EMPRESA',
  10,
  true
FROM lead_qualification_weights;

-- Capital Social alto (>= 100000)
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'company_fit',
  'share_capital',
  '>=',
  '100000',
  25,
  true
FROM lead_qualification_weights;

-- Capital Social médio (>= 50000)
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'company_fit',
  'share_capital',
  '>=',
  '50000',
  15,
  true
FROM lead_qualification_weights;

-- Capital Social baixo (>= 10000)
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'company_fit',
  'share_capital',
  '>=',
  '10000',
  10,
  true
FROM lead_qualification_weights;

-- Não é MEI (empresa mais estruturada)
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'digital_maturity',
  'mei_option',
  '=',
  'NAO',
  25,
  true
FROM lead_qualification_weights;

-- Regras de Contact Quality - email existe (qualquer email)
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'contact_quality',
  'email',
  'not_null',
  NULL,
  50,
  true
FROM lead_qualification_weights;

-- Regras de Contact Quality - telefone existe
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'contact_quality',
  'phone',
  'not_null',
  NULL,
  50,
  true
FROM lead_qualification_weights;

-- Regras de Digital Maturity - Capital alto indica estrutura
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'digital_maturity',
  'share_capital',
  '>=',
  '50000',
  30,
  true
FROM lead_qualification_weights;

-- Regras de Digital Maturity - Porte maior indica estrutura
INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'digital_maturity',
  'company_size',
  '=',
  'DEMAIS',
  30,
  true
FROM lead_qualification_weights;

INSERT INTO lead_qualification_rules (company_id, dimension, field, operator, value, score_contribution, is_active)
SELECT 
  company_id,
  'digital_maturity',
  'company_size',
  '=',
  'EMPRESA DE PEQUENO PORTE',
  15,
  true
FROM lead_qualification_weights;