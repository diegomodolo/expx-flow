import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { QualificationRule, QualificationWeights, useLeadQualificationRules } from './useLeadQualificationRules';

export type LeadClassification = 'ouro' | 'prata' | 'bronze';

export interface LeadScoreResult {
  globalScore: number;
  dimensionScores: {
    company_fit: number;
    authority: number;
    contact_quality: number;
    purchase_intent: number;
    digital_maturity: number;
  };
  classification: LeadClassification;
  reason: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  company_fit: 'Perfil de Empresa',
  authority: 'Autoridade do Contato',
  contact_quality: 'Qualidade do Contato',
  purchase_intent: 'Intenção de Compra',
  digital_maturity: 'Maturidade Digital',
};

function evaluateRule(rule: QualificationRule, leadData: Record<string, any>): boolean {
  const fieldValue = leadData[rule.field];
  const ruleValue = rule.value;

  switch (rule.operator) {
    case 'not_null':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'is_null':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case '=':
      return String(fieldValue).toLowerCase() === String(ruleValue).toLowerCase();
    case '!=':
      return String(fieldValue).toLowerCase() !== String(ruleValue).toLowerCase();
    case '>':
      return Number(fieldValue) > Number(ruleValue);
    case '<':
      return Number(fieldValue) < Number(ruleValue);
    case '>=':
      return Number(fieldValue) >= Number(ruleValue);
    case '<=':
      return Number(fieldValue) <= Number(ruleValue);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());
    default:
      return false;
  }
}

function calculateDimensionScore(
  dimension: string,
  rules: QualificationRule[],
  leadData: Record<string, any>
): number {
  const dimensionRules = rules.filter(r => r.dimension === dimension && r.is_active);
  let score = 0;
  
  for (const rule of dimensionRules) {
    if (evaluateRule(rule, leadData)) {
      score += rule.score_contribution;
    }
  }

  // Normalize to 0-100 range
  return Math.max(0, Math.min(100, score));
}

// Generic email domains that should NOT qualify as business emails
const GENERIC_EMAIL_DOMAINS = [
  'gmail.com', 'gmail.com.br', 'googlemail.com',
  'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.com.br', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br', 'globo.com', 'globomail.com',
  'protonmail.com', 'zoho.com', 'mail.com', 'email.com',
  'oi.com.br', 'r7.com', 'zipmail.com.br'
];

// Test/fake email patterns to reject
const FAKE_EMAIL_PATTERNS = [
  /^teste?[0-9]*@/i,        // teste, test, teste1, test123
  /^temp[0-9]*@/i,          // temp, temp1
  /^fake[0-9]*@/i,          // fake, fake1
  /^exemplo[0-9]*@/i,       // exemplo
  /^sample[0-9]*@/i,        // sample
  /^admin[0-9]*@/i,         // admin (common fake)
  /^info[0-9]*@/i,          // info (generic)
  /^contato[0-9]*@/i,       // contato (generic)
  /^noreply@/i,             // noreply
  /^no-reply@/i,            // no-reply
];

// Keyboard sequence patterns (qwerty, asdf, etc)
const KEYBOARD_SEQUENCES = ['qwerty', 'asdfgh', 'zxcvbn', 'qazwsx', 'asdf', 'qwer', 'zxcv'];

function isValidBusinessEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailLower = email.toLowerCase().trim();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) return false;
  
  // Extract local part and domain
  const [localPart, domain] = emailLower.split('@');
  if (!domain || !localPart) return false;
  
  // Check if it's a generic domain
  if (GENERIC_EMAIL_DOMAINS.includes(domain)) return false;
  
  // Check for fake/test email patterns
  for (const pattern of FAKE_EMAIL_PATTERNS) {
    if (pattern.test(emailLower)) return false;
  }
  
  // Local part too short (a@, ab@)
  if (localPart.length < 3) return false;
  
  // Check for repeated characters (aaa@, bbb@, xxx@, 111@)
  if (/^(.)\1{2,}$/.test(localPart)) return false;
  
  // Check for mostly repeated characters (aaab@, xxxy@)
  if (/^(.)\1+.?$/.test(localPart) && localPart.length < 5) return false;
  
  // Check for keyboard sequences
  for (const seq of KEYBOARD_SEQUENCES) {
    if (localPart.includes(seq)) return false;
  }
  
  // Check for only numbers (123456@)
  if (/^\d+$/.test(localPart)) return false;
  
  // Check for random consonant clusters (no vowels = likely fake)
  // Needs at least one vowel if local part is longer than 4 chars
  if (localPart.length > 4 && !/[aeiou]/i.test(localPart)) return false;
  
  // Check for excessive numbers mixed with few letters (a1b2c3d4@)
  const letterCount = (localPart.match(/[a-z]/gi) || []).length;
  const numberCount = (localPart.match(/[0-9]/g) || []).length;
  if (numberCount > letterCount && localPart.length > 5) return false;
  
  return true;
}

// Valid Brazilian DDD codes
const VALID_DDDS = [
  11, 12, 13, 14, 15, 16, 17, 18, 19, // São Paulo
  21, 22, 24, // Rio de Janeiro
  27, 28, // Espírito Santo
  31, 32, 33, 34, 35, 37, 38, // Minas Gerais
  41, 42, 43, 44, 45, 46, // Paraná
  47, 48, 49, // Santa Catarina
  51, 53, 54, 55, // Rio Grande do Sul
  61, // Distrito Federal
  62, 64, // Goiás
  63, // Tocantins
  65, 66, // Mato Grosso
  67, // Mato Grosso do Sul
  68, // Acre
  69, // Rondônia
  71, 73, 74, 75, 77, // Bahia
  79, // Sergipe
  81, 87, // Pernambuco
  82, // Alagoas
  83, // Paraíba
  84, // Rio Grande do Norte
  85, 88, // Ceará
  86, 89, // Piauí
  91, 93, 94, // Pará
  92, 97, // Amazonas
  95, // Roraima
  96, // Amapá
  98, 99, // Maranhão
];

function isValidBrazilianPhone(phone: string | null | undefined): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Must be 10 (landline) or 11 (mobile) digits
  if (cleanPhone.length < 10 || cleanPhone.length > 11) return false;
  
  // Extract DDD
  const ddd = parseInt(cleanPhone.substring(0, 2), 10);
  if (!VALID_DDDS.includes(ddd)) return false;
  
  // Get the phone number without DDD
  const phoneNumber = cleanPhone.substring(2);
  
  // Mobile phones (11 digits total) must start with 9 after DDD
  if (cleanPhone.length === 11 && phoneNumber[0] !== '9') return false;
  
  // Check for obviously fake numbers (all same digit)
  if (/^(\d)\1+$/.test(phoneNumber)) return false;
  
  // Check for sequential numbers (12345678, 87654321)
  const sequentialUp = '123456789';
  const sequentialDown = '987654321';
  if (sequentialUp.includes(phoneNumber) || sequentialDown.includes(phoneNumber)) return false;
  
  // Check for common fake patterns
  const fakePatterns = ['00000000', '11111111', '22222222', '99999999', '12345678', '98765432'];
  for (const pattern of fakePatterns) {
    if (phoneNumber.includes(pattern)) return false;
  }
  
  return true;
}

function generateClassificationReason(
  classification: LeadClassification,
  dimensionScores: LeadScoreResult['dimensionScores'],
  globalScore: number,
  hasValidContact?: boolean
): string {
  const strongDimensions: string[] = [];
  const weakDimensions: string[] = [];

  Object.entries(dimensionScores).forEach(([dim, score]) => {
    if (score >= 60) {
      strongDimensions.push(DIMENSION_LABELS[dim]);
    } else if (score < 30) {
      weakDimensions.push(DIMENSION_LABELS[dim]);
    }
  });

  const contactNote = hasValidContact ? ' E-mail empresarial e telefone válidos.' : '';
  
  switch (classification) {
    case 'ouro':
      return `Lead OURO (${globalScore} pts): ${strongDimensions.length > 0 ? `Forte em ${strongDimensions.join(', ')}.` : ''} Alta probabilidade de conversão.${contactNote}`;
    case 'prata':
      return `Lead PRATA (${globalScore} pts): ${strongDimensions.length > 0 ? `Destaque em ${strongDimensions.join(', ')}.` : ''} ${weakDimensions.length > 0 ? `Pode melhorar em ${weakDimensions.join(', ')}.` : ''}${contactNote} Potencial com trabalho comercial.`;
    case 'bronze':
      return `Lead BRONZE (${globalScore} pts): ${weakDimensions.length > 0 ? `Pontos fracos em ${weakDimensions.join(', ')}.` : ''} Baixo valor comercial imediato.`;
  }
}

export function useLeadScoring() {
  const { activeCompany } = useCompany();
  const { rules, weights } = useLeadQualificationRules();

  const calculateScore = useCallback((leadData: Record<string, any>): LeadScoreResult => {
    // Calculate dimension scores
    const dimensionScores = {
      company_fit: calculateDimensionScore('company_fit', rules, leadData),
      authority: calculateDimensionScore('authority', rules, leadData),
      contact_quality: calculateDimensionScore('contact_quality', rules, leadData),
      purchase_intent: calculateDimensionScore('purchase_intent', rules, leadData),
      digital_maturity: calculateDimensionScore('digital_maturity', rules, leadData),
    };

    // Calculate weighted global score
    const globalScore = Math.round(
      dimensionScores.company_fit * weights.weight_company_fit +
      dimensionScores.authority * weights.weight_authority +
      dimensionScores.contact_quality * weights.weight_contact_quality +
      dimensionScores.purchase_intent * weights.weight_purchase_intent +
      dimensionScores.digital_maturity * weights.weight_digital_maturity
    );

    // Check if lead has valid business email AND valid phone
    const hasBusinessEmail = isValidBusinessEmail(leadData.email);
    const hasValidPhone = isValidBrazilianPhone(leadData.phone || leadData.whatsapp);
    const hasValidContact = hasBusinessEmail && hasValidPhone;

    // Determine classification with authority validation
    let classification: LeadClassification = 'bronze';
    
    if (globalScore >= weights.threshold_gold) {
      // Gold requires minimum authority score
      if (dimensionScores.authority >= 40) {
        classification = 'ouro';
      } else {
        classification = 'prata'; // Downgraded due to lack of authority
      }
    } else if (globalScore >= weights.threshold_silver) {
      classification = 'prata';
    }

    // Valid contact guarantee: valid business email + valid phone = minimum prata
    if (classification === 'bronze' && hasValidContact) {
      classification = 'prata';
    }

    const reason = generateClassificationReason(classification, dimensionScores, globalScore, hasValidContact);

    return {
      globalScore,
      dimensionScores,
      classification,
      reason,
    };
  }, [rules, weights]);

  const scoreAndSaveLead = useCallback(async (leadId: string, leadData: Record<string, any>) => {
    const result = calculateScore(leadData);

    const { error } = await supabase
      .from('lead_master_pool')
      .update({
        score_company_fit: result.dimensionScores.company_fit,
        score_authority: result.dimensionScores.authority,
        score_contact_quality: result.dimensionScores.contact_quality,
        score_purchase_intent: result.dimensionScores.purchase_intent,
        score_digital_maturity: result.dimensionScores.digital_maturity,
        global_score: result.globalScore,
        lead_classification: result.classification,
        classification_reason: result.reason,
        last_scored_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) throw error;
    return result;
  }, [calculateScore]);

  const scoreMultipleLeads = useCallback(async (leadIds: string[]): Promise<number> => {
    if (!activeCompany?.company_id) {
      console.warn("scoreMultipleLeads: No active company");
      return 0;
    }

    if (leadIds.length === 0) {
      console.log("scoreMultipleLeads: No leads to score");
      return 0;
    }

    console.log(`scoreMultipleLeads: Processing ${leadIds.length} leads`);

    // Process in batches of 100 to avoid Supabase limits
    const BATCH_SIZE = 100;
    let totalProcessed = 0;

    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      const batchIds = leadIds.slice(i, i + BATCH_SIZE);

      // Fetch leads data for this batch
      const { data: leads, error: fetchError } = await supabase
        .from('lead_master_pool')
        .select('*')
        .in('id', batchIds);

      if (fetchError) {
        console.error("Error fetching leads batch:", fetchError);
        throw fetchError;
      }

      if (!leads || leads.length === 0) {
        console.warn(`Batch ${i / BATCH_SIZE + 1}: No leads found`);
        continue;
      }

      console.log(`Batch ${i / BATCH_SIZE + 1}: Scoring ${leads.length} leads`);

      // Score and update each lead in the batch
      for (const lead of leads) {
        try {
          const result = calculateScore(lead);

          const { error: updateError } = await supabase
            .from('lead_master_pool')
            .update({
              score_company_fit: result.dimensionScores.company_fit,
              score_authority: result.dimensionScores.authority,
              score_contact_quality: result.dimensionScores.contact_quality,
              score_purchase_intent: result.dimensionScores.purchase_intent,
              score_digital_maturity: result.dimensionScores.digital_maturity,
              global_score: result.globalScore,
              lead_classification: result.classification,
              classification_reason: result.reason,
              last_scored_at: new Date().toISOString(),
            })
            .eq('id', lead.id);

          if (updateError) {
            console.error(`Error updating lead ${lead.id}:`, updateError);
            continue;
          }

          totalProcessed++;
        } catch (err) {
          console.error(`Error scoring lead ${lead.id}:`, err);
        }
      }
    }

    console.log(`scoreMultipleLeads: Completed. Processed ${totalProcessed} leads`);
    return totalProcessed;
  }, [activeCompany?.company_id, calculateScore]);

  const scoreAllCompanyLeads = useCallback(async (): Promise<number> => {
    const companyId = activeCompany?.company_id;
    if (!companyId) {
      console.warn("scoreAllCompanyLeads: No active company");
      return 0;
    }

    console.log(`scoreAllCompanyLeads: Fetching leads for company ${companyId}`);

    // Fetch all lead IDs for company (handle pagination for large datasets)
    let allLeadIds: string[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;

    while (true) {
      const { data: leads, error: fetchError } = await supabase
        .from('lead_master_pool')
        .select('id')
        .eq('company_id', companyId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (fetchError) {
        console.error("Error fetching lead IDs:", fetchError);
        throw fetchError;
      }

      if (!leads || leads.length === 0) break;

      allLeadIds = [...allLeadIds, ...leads.map(l => l.id)];

      if (leads.length < PAGE_SIZE) break;
      page++;
    }

    console.log(`scoreAllCompanyLeads: Found ${allLeadIds.length} leads to score`);

    if (allLeadIds.length === 0) return 0;

    return scoreMultipleLeads(allLeadIds);
  }, [activeCompany?.company_id, scoreMultipleLeads]);

  return {
    calculateScore,
    scoreAndSaveLead,
    scoreMultipleLeads,
    scoreAllCompanyLeads,
    rules,
    weights,
  };
}
