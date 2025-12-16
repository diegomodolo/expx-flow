import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface QualificationRule {
  id: string;
  company_id: string;
  dimension: 'company_fit' | 'authority' | 'contact_quality' | 'purchase_intent' | 'digital_maturity';
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_null' | 'is_null';
  value: string | null;
  score_contribution: number;
  is_active: boolean;
  rule_order: number;
  created_at: string;
  updated_at: string;
}

export interface QualificationWeights {
  id: string;
  company_id: string;
  weight_company_fit: number;
  weight_authority: number;
  weight_contact_quality: number;
  weight_purchase_intent: number;
  weight_digital_maturity: number;
  threshold_gold: number;
  threshold_silver: number;
}

const DEFAULT_WEIGHTS: Omit<QualificationWeights, 'id' | 'company_id'> = {
  weight_company_fit: 0.25,
  weight_authority: 0.25,
  weight_contact_quality: 0.15,
  weight_purchase_intent: 0.20,
  weight_digital_maturity: 0.15,
  threshold_gold: 70,
  threshold_silver: 40,
};

// Default rules for each dimension
const DEFAULT_RULES: Array<Omit<QualificationRule, 'id' | 'company_id' | 'created_at' | 'updated_at'>> = [
  // Company Fit
  { dimension: 'company_fit', field: 'company_name', operator: 'not_null', value: null, score_contribution: 10, is_active: true, rule_order: 1 },
  { dimension: 'company_fit', field: 'cnpj', operator: 'not_null', value: null, score_contribution: 15, is_active: true, rule_order: 2 },
  { dimension: 'company_fit', field: 'company_size', operator: '=', value: 'media', score_contribution: 15, is_active: true, rule_order: 3 },
  { dimension: 'company_fit', field: 'company_size', operator: '=', value: 'grande', score_contribution: 20, is_active: true, rule_order: 4 },
  { dimension: 'company_fit', field: 'employee_count', operator: '>=', value: '11', score_contribution: 10, is_active: true, rule_order: 5 },
  { dimension: 'company_fit', field: 'employee_count', operator: '>=', value: '51', score_contribution: 15, is_active: true, rule_order: 6 },
  { dimension: 'company_fit', field: 'years_in_market', operator: '>=', value: '3', score_contribution: 10, is_active: true, rule_order: 7 },
  { dimension: 'company_fit', field: 'company_website', operator: 'not_null', value: null, score_contribution: 10, is_active: true, rule_order: 8 },
  { dimension: 'company_fit', field: 'client_type', operator: '=', value: 'B2B', score_contribution: 15, is_active: true, rule_order: 9 },
  { dimension: 'company_fit', field: 'company_validated', operator: '=', value: 'true', score_contribution: 10, is_active: true, rule_order: 10 },

  // Authority
  { dimension: 'authority', field: 'is_decision_maker', operator: '=', value: 'true', score_contribution: 30, is_active: true, rule_order: 1 },
  { dimension: 'authority', field: 'job_level', operator: '=', value: 'C-Level', score_contribution: 25, is_active: true, rule_order: 2 },
  { dimension: 'authority', field: 'job_level', operator: '=', value: 'Diretoria', score_contribution: 20, is_active: true, rule_order: 3 },
  { dimension: 'authority', field: 'job_level', operator: '=', value: 'Gestão', score_contribution: 15, is_active: true, rule_order: 4 },
  { dimension: 'authority', field: 'job_level', operator: '=', value: 'Operacional', score_contribution: 5, is_active: true, rule_order: 5 },
  { dimension: 'authority', field: 'buying_role', operator: '=', value: 'Decisor', score_contribution: 25, is_active: true, rule_order: 6 },
  { dimension: 'authority', field: 'buying_role', operator: '=', value: 'Influenciador', score_contribution: 15, is_active: true, rule_order: 7 },
  { dimension: 'authority', field: 'influence_level', operator: '=', value: 'alto', score_contribution: 15, is_active: true, rule_order: 8 },
  { dimension: 'authority', field: 'job_title', operator: 'not_null', value: null, score_contribution: 5, is_active: true, rule_order: 9 },

  // Contact Quality
  { dimension: 'contact_quality', field: 'email_type', operator: '=', value: 'corporativo', score_contribution: 25, is_active: true, rule_order: 1 },
  { dimension: 'contact_quality', field: 'email_type', operator: '=', value: 'generico', score_contribution: -10, is_active: true, rule_order: 2 },
  { dimension: 'contact_quality', field: 'email_verified', operator: '=', value: 'true', score_contribution: 15, is_active: true, rule_order: 3 },
  { dimension: 'contact_quality', field: 'phone_verified', operator: '=', value: 'true', score_contribution: 15, is_active: true, rule_order: 4 },
  { dimension: 'contact_quality', field: 'linkedin_profile', operator: 'not_null', value: null, score_contribution: 20, is_active: true, rule_order: 5 },
  { dimension: 'contact_quality', field: 'lead_validated', operator: '=', value: 'true', score_contribution: 15, is_active: true, rule_order: 6 },
  { dimension: 'contact_quality', field: 'data_enriched', operator: '=', value: 'true', score_contribution: 10, is_active: true, rule_order: 7 },

  // Purchase Intent
  { dimension: 'purchase_intent', field: 'requested_demo', operator: '=', value: 'true', score_contribution: 30, is_active: true, rule_order: 1 },
  { dimension: 'purchase_intent', field: 'visited_pricing', operator: '=', value: 'true', score_contribution: 25, is_active: true, rule_order: 2 },
  { dimension: 'purchase_intent', field: 'attended_webinar', operator: '=', value: 'true', score_contribution: 20, is_active: true, rule_order: 3 },
  { dimension: 'purchase_intent', field: 'urgency_level', operator: '=', value: 'alta', score_contribution: 25, is_active: true, rule_order: 4 },
  { dimension: 'purchase_intent', field: 'urgency_level', operator: '=', value: 'media', score_contribution: 15, is_active: true, rule_order: 5 },
  { dimension: 'purchase_intent', field: 'purchase_timeline', operator: '=', value: 'imediato', score_contribution: 25, is_active: true, rule_order: 6 },
  { dimension: 'purchase_intent', field: 'purchase_timeline', operator: '=', value: '1-3 meses', score_contribution: 20, is_active: true, rule_order: 7 },
  { dimension: 'purchase_intent', field: 'purchase_timeline', operator: '=', value: '3-6 meses', score_contribution: 10, is_active: true, rule_order: 8 },
  { dimension: 'purchase_intent', field: 'budget_range', operator: 'not_null', value: null, score_contribution: 10, is_active: true, rule_order: 9 },
  { dimension: 'purchase_intent', field: 'total_interactions', operator: '>=', value: '3', score_contribution: 15, is_active: true, rule_order: 10 },

  // Digital Maturity
  { dimension: 'digital_maturity', field: 'uses_software', operator: '=', value: 'true', score_contribution: 20, is_active: true, rule_order: 1 },
  { dimension: 'digital_maturity', field: 'current_software', operator: 'not_null', value: null, score_contribution: 15, is_active: true, rule_order: 2 },
  { dimension: 'digital_maturity', field: 'software_satisfaction', operator: '=', value: 'insatisfeito', score_contribution: 15, is_active: true, rule_order: 3 },
  { dimension: 'digital_maturity', field: 'company_website', operator: 'not_null', value: null, score_contribution: 15, is_active: true, rule_order: 4 },
  { dimension: 'digital_maturity', field: 'company_linkedin', operator: 'not_null', value: null, score_contribution: 15, is_active: true, rule_order: 5 },
  { dimension: 'digital_maturity', field: 'switch_reason', operator: 'not_null', value: null, score_contribution: 10, is_active: true, rule_order: 6 },
  { dimension: 'digital_maturity', field: 'main_pain_point', operator: 'not_null', value: null, score_contribution: 10, is_active: true, rule_order: 7 },
];

export function useLeadQualificationRules() {
  const { activeCompany } = useCompany();
  const [rules, setRules] = useState<QualificationRule[]>([]);
  const [weights, setWeights] = useState<QualificationWeights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    if (!activeCompany?.id) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_qualification_rules')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('dimension')
        .order('rule_order');

      if (fetchError) throw fetchError;
      setRules((data || []) as QualificationRule[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.id]);

  const fetchWeights = useCallback(async () => {
    if (!activeCompany?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('lead_qualification_weights')
        .select('*')
        .eq('company_id', activeCompany.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      setWeights(data || null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [activeCompany?.id]);

  const initializeDefaultRules = useCallback(async () => {
    if (!activeCompany?.id) return;

    try {
      // Check if rules exist
      const { count } = await supabase
        .from('lead_qualification_rules')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id);

      if (count === 0) {
        // Insert default rules
        const rulesToInsert = DEFAULT_RULES.map(rule => ({
          ...rule,
          company_id: activeCompany.id,
        }));

        const { error: insertError } = await supabase
          .from('lead_qualification_rules')
          .insert(rulesToInsert);

        if (insertError) throw insertError;
      }

      // Check if weights exist
      const { data: existingWeights } = await supabase
        .from('lead_qualification_weights')
        .select('id')
        .eq('company_id', activeCompany.id)
        .single();

      if (!existingWeights) {
        const { error: insertError } = await supabase
          .from('lead_qualification_weights')
          .insert({
            company_id: activeCompany.id,
            ...DEFAULT_WEIGHTS,
          });

        if (insertError) throw insertError;
      }

      await fetchRules();
      await fetchWeights();
    } catch (err: any) {
      setError(err.message);
    }
  }, [activeCompany?.id, fetchRules, fetchWeights]);

  const updateWeights = useCallback(async (newWeights: Partial<QualificationWeights>) => {
    if (!activeCompany?.id || !weights?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('lead_qualification_weights')
        .update(newWeights)
        .eq('id', weights.id);

      if (updateError) throw updateError;
      await fetchWeights();
    } catch (err: any) {
      setError(err.message);
    }
  }, [activeCompany?.id, weights?.id, fetchWeights]);

  const createRule = useCallback(async (rule: Omit<QualificationRule, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!activeCompany?.id) return;

    try {
      const { error: insertError } = await supabase
        .from('lead_qualification_rules')
        .insert({
          ...rule,
          company_id: activeCompany.id,
        });

      if (insertError) throw insertError;
      await fetchRules();
    } catch (err: any) {
      setError(err.message);
    }
  }, [activeCompany?.id, fetchRules]);

  const updateRule = useCallback(async (id: string, updates: Partial<QualificationRule>) => {
    try {
      const { error: updateError } = await supabase
        .from('lead_qualification_rules')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchRules();
    } catch (err: any) {
      setError(err.message);
    }
  }, [fetchRules]);

  const deleteRule = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('lead_qualification_rules')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchRules();
    } catch (err: any) {
      setError(err.message);
    }
  }, [fetchRules]);

  useEffect(() => {
    if (activeCompany?.id) {
      initializeDefaultRules();
    }
  }, [activeCompany?.id, initializeDefaultRules]);

  return {
    rules,
    weights: weights || { ...DEFAULT_WEIGHTS, id: '', company_id: '' } as QualificationWeights,
    loading,
    error,
    fetchRules,
    fetchWeights,
    updateWeights,
    createRule,
    updateRule,
    deleteRule,
    initializeDefaultRules,
  };
}
