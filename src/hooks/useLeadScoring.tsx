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

function generateClassificationReason(
  classification: LeadClassification,
  dimensionScores: LeadScoreResult['dimensionScores'],
  globalScore: number
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

  switch (classification) {
    case 'ouro':
      return `Lead OURO (${globalScore} pts): ${strongDimensions.length > 0 ? `Forte em ${strongDimensions.join(', ')}.` : ''} Alta probabilidade de conversão.`;
    case 'prata':
      return `Lead PRATA (${globalScore} pts): ${strongDimensions.length > 0 ? `Destaque em ${strongDimensions.join(', ')}.` : ''} ${weakDimensions.length > 0 ? `Pode melhorar em ${weakDimensions.join(', ')}.` : ''} Potencial com trabalho comercial.`;
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

    const reason = generateClassificationReason(classification, dimensionScores, globalScore);

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
