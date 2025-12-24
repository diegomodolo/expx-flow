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

// AJUSTADO: Thresholds mais baixos e pesos focados nos dados disponíveis do ListaCNAE
const DEFAULT_WEIGHTS: Omit<QualificationWeights, 'id' | 'company_id'> = {
  weight_company_fit: 0.50,        // Aumentado: temos mais dados de empresa
  weight_authority: 0.05,          // Reduzido: não temos dados de cargo/decisor
  weight_contact_quality: 0.20,    // Mantido: email/telefone são importantes
  weight_purchase_intent: 0.05,    // Reduzido: não temos dados de intenção
  weight_digital_maturity: 0.20,   // Aumentado: podemos inferir por capital/porte
  threshold_gold: 45,              // Era 70, muito alto para dados do ListaCNAE
  threshold_silver: 25,            // Era 40
};

// AJUSTADO: Regras baseadas nos dados realmente disponíveis do ListaCNAE
const DEFAULT_RULES: Array<Omit<QualificationRule, 'id' | 'company_id' | 'created_at' | 'updated_at'>> = [
  // Company Fit - baseado nos dados do ListaCNAE
  { dimension: 'company_fit', field: 'company_name', operator: 'not_null', value: null, score_contribution: 10, is_active: true, rule_order: 1 },
  { dimension: 'company_fit', field: 'cnpj', operator: 'not_null', value: null, score_contribution: 15, is_active: true, rule_order: 2 },
  // Porte da empresa (ListaCNAE usa: MICRO EMPRESA, EMPRESA DE PEQUENO PORTE, DEMAIS)
  { dimension: 'company_fit', field: 'company_size', operator: '=', value: 'MICRO EMPRESA', score_contribution: 10, is_active: true, rule_order: 3 },
  { dimension: 'company_fit', field: 'company_size', operator: '=', value: 'EMPRESA DE PEQUENO PORTE', score_contribution: 20, is_active: true, rule_order: 4 },
  { dimension: 'company_fit', field: 'company_size', operator: '=', value: 'DEMAIS', score_contribution: 25, is_active: true, rule_order: 5 },
  // Capital social (indicador de porte)
  { dimension: 'company_fit', field: 'share_capital', operator: '>=', value: '10000', score_contribution: 10, is_active: true, rule_order: 6 },
  { dimension: 'company_fit', field: 'share_capital', operator: '>=', value: '50000', score_contribution: 15, is_active: true, rule_order: 7 },
  { dimension: 'company_fit', field: 'share_capital', operator: '>=', value: '100000', score_contribution: 20, is_active: true, rule_order: 8 },
  // Não é MEI = empresa mais estruturada
  { dimension: 'company_fit', field: 'mei_option', operator: '=', value: 'false', score_contribution: 10, is_active: true, rule_order: 9 },
  // Optante pelo Simples = PME ativa
  { dimension: 'company_fit', field: 'simples_option', operator: '=', value: 'true', score_contribution: 5, is_active: true, rule_order: 10 },

  // Authority - desativado pois não temos esses dados do ListaCNAE
  { dimension: 'authority', field: 'is_decision_maker', operator: '=', value: 'true', score_contribution: 30, is_active: false, rule_order: 1 },
  { dimension: 'authority', field: 'job_level', operator: '=', value: 'C-Level', score_contribution: 25, is_active: false, rule_order: 2 },
  { dimension: 'authority', field: 'job_level', operator: '=', value: 'Diretoria', score_contribution: 20, is_active: false, rule_order: 3 },
  { dimension: 'authority', field: 'job_level', operator: '=', value: 'Gestão', score_contribution: 15, is_active: false, rule_order: 4 },
  { dimension: 'authority', field: 'job_title', operator: 'not_null', value: null, score_contribution: 5, is_active: false, rule_order: 5 },

  // Contact Quality - pontua contatos existentes (mesmo genéricos)
  { dimension: 'contact_quality', field: 'email', operator: 'not_null', value: null, score_contribution: 30, is_active: true, rule_order: 1 },
  { dimension: 'contact_quality', field: 'phone', operator: 'not_null', value: null, score_contribution: 25, is_active: true, rule_order: 2 },
  { dimension: 'contact_quality', field: 'whatsapp', operator: 'not_null', value: null, score_contribution: 20, is_active: true, rule_order: 3 },
  { dimension: 'contact_quality', field: 'email_type', operator: '=', value: 'corporativo', score_contribution: 15, is_active: true, rule_order: 4 },
  { dimension: 'contact_quality', field: 'linkedin_profile', operator: 'not_null', value: null, score_contribution: 10, is_active: true, rule_order: 5 },

  // Purchase Intent - desativado pois não temos esses dados
  { dimension: 'purchase_intent', field: 'requested_demo', operator: '=', value: 'true', score_contribution: 30, is_active: false, rule_order: 1 },
  { dimension: 'purchase_intent', field: 'visited_pricing', operator: '=', value: 'true', score_contribution: 25, is_active: false, rule_order: 2 },
  { dimension: 'purchase_intent', field: 'urgency_level', operator: '=', value: 'alta', score_contribution: 25, is_active: false, rule_order: 3 },

  // Digital Maturity - baseado em indicadores indiretos
  { dimension: 'digital_maturity', field: 'company_website', operator: 'not_null', value: null, score_contribution: 25, is_active: true, rule_order: 1 },
  { dimension: 'digital_maturity', field: 'company_linkedin', operator: 'not_null', value: null, score_contribution: 20, is_active: true, rule_order: 2 },
  // Empresa não-MEI com capital > 50k = mais madura digitalmente
  { dimension: 'digital_maturity', field: 'share_capital', operator: '>=', value: '50000', score_contribution: 20, is_active: true, rule_order: 3 },
  { dimension: 'digital_maturity', field: 'mei_option', operator: '=', value: 'false', score_contribution: 15, is_active: true, rule_order: 4 },
  { dimension: 'digital_maturity', field: 'email', operator: 'not_null', value: null, score_contribution: 10, is_active: true, rule_order: 5 },
];

export function useLeadQualificationRules() {
  const { activeCompany } = useCompany();
  const [rules, setRules] = useState<QualificationRule[]>([]);
  const [weights, setWeights] = useState<QualificationWeights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    if (!activeCompany?.company_id) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_qualification_rules')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('dimension')
        .order('rule_order');

      if (fetchError) throw fetchError;
      setRules((data || []) as QualificationRule[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.company_id]);

  const fetchWeights = useCallback(async () => {
    if (!activeCompany?.company_id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('lead_qualification_weights')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      setWeights(data || null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [activeCompany?.company_id]);

  const initializeDefaultRules = useCallback(async () => {
    if (!activeCompany?.company_id) return;

    try {
      // Check if rules exist
      const { count } = await supabase
        .from('lead_qualification_rules')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.company_id);

      if (count === 0) {
        // Insert default rules
        const rulesToInsert = DEFAULT_RULES.map(rule => ({
          ...rule,
          company_id: activeCompany.company_id,
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
        .eq('company_id', activeCompany.company_id)
        .single();

      if (!existingWeights) {
        const { error: insertError } = await supabase
          .from('lead_qualification_weights')
          .insert({
            company_id: activeCompany.company_id,
            ...DEFAULT_WEIGHTS,
          });

        if (insertError) throw insertError;
      }

      await fetchRules();
      await fetchWeights();
    } catch (err: any) {
      setError(err.message);
    }
  }, [activeCompany?.company_id, fetchRules, fetchWeights]);

  const updateWeights = useCallback(async (newWeights: Partial<QualificationWeights>) => {
    if (!activeCompany?.company_id || !weights?.id) return;

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
  }, [activeCompany?.company_id, weights?.id, fetchWeights]);

  const createRule = useCallback(async (rule: Omit<QualificationRule, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!activeCompany?.company_id) return;

    try {
      const { error: insertError } = await supabase
        .from('lead_qualification_rules')
        .insert({
          ...rule,
          company_id: activeCompany.company_id,
        });

      if (insertError) throw insertError;
      await fetchRules();
    } catch (err: any) {
      setError(err.message);
    }
  }, [activeCompany?.company_id, fetchRules]);

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
    if (activeCompany?.company_id) {
      initializeDefaultRules();
    }
  }, [activeCompany?.company_id, initializeDefaultRules]);

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
