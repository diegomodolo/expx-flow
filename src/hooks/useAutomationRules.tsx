import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "./use-toast";

export interface AutomationRule {
  id: string;
  company_id: string;
  client_id: string | null;
  is_template: boolean;
  template_id: string | null;
  imported_at: string | null;
  rule_name: string;
  rule_description: string | null;
  rule_order: number;
  campaign_objectives: string[] | null;
  time_window_days: number;
  conditions: {
    logic: "AND" | "OR";
    conditions: Array<{
      field: string;
      operator: "<" | ">" | "=" | "!=" | ">=" | "<=";
      value: number | boolean;
      type: "number" | "boolean";
    }>;
  };
  action_type: string;
  action_config: any;
  budget_safety_limits: any;
  execution_limits: any;
  scope_filters: any;
  is_active: boolean;
  last_execution_at: string | null;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

export const useAutomationRules = (clientId?: string | null) => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const fetchTemplates = async () => {
    if (!user || !activeCompany?.company_id) return;
    
    const { data, error } = await supabase
      .from("campaign_automation_rules")
      .select("*")
      .eq("company_id", activeCompany.company_id)
      .eq("is_template", true)
      .order("rule_order", { ascending: true });

    if (error) {
      console.error("Error fetching templates:", error);
      return;
    }
    
    setTemplates((data as any) || []);
  };

  const fetchRules = async () => {
    if (!user || !activeCompany?.company_id) return;
    
    setLoading(true);
    
    let query = supabase
      .from("campaign_automation_rules")
      .select("*")
      .eq("company_id", activeCompany.company_id)
      .eq("is_template", false);

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query.order("rule_order", { ascending: true });

    if (error) {
      console.error("Error fetching rules:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar regras de automação.",
        variant: "destructive",
      });
    } else {
      setRules((data as any) || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
    fetchRules();
  }, [user?.id, activeCompany?.company_id, clientId]);

  const createTemplate = async (templateData: Omit<AutomationRule, "id" | "created_at" | "updated_at" | "company_id" | "is_template" | "client_id" | "template_id" | "imported_at" | "execution_count" | "last_execution_at">) => {
    if (!activeCompany?.company_id) return null;

    const { data, error } = await supabase
      .from("campaign_automation_rules")
      .insert({
        ...templateData,
        company_id: activeCompany.company_id,
        is_template: true,
        client_id: null,
        template_id: null,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar template.",
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Template criado",
      description: "Template de automação criado com sucesso.",
    });

    await fetchTemplates();
    return data;
  };

  const importTemplateToClient = async (templateId: string, targetClientId: string) => {
    if (!activeCompany?.company_id) return null;

    const { data: template, error: fetchError } = await supabase
      .from("campaign_automation_rules")
      .select("*")
      .eq("id", templateId)
      .single();

    if (fetchError || !template) {
      toast({
        title: "Erro",
        description: "Template não encontrado.",
        variant: "destructive",
      });
      return null;
    }

    return template;
  };

  const importConfiguredTemplate = async (
    templateId: string,
    targetClientId: string,
    configuredConditions: any
  ) => {
    if (!activeCompany?.company_id) return null;

    const { data: template, error: fetchError } = await supabase
      .from("campaign_automation_rules")
      .select("*")
      .eq("id", templateId)
      .single();

    if (fetchError || !template) {
      toast({
        title: "Erro",
        description: "Template não encontrado.",
        variant: "destructive",
      });
      return null;
    }

    // Validate that all conditions have operator and value
    const allConfigured = configuredConditions.conditions.every(
      (c: any) => c.operator !== null && c.value !== null
    );

    if (!allConfigured) {
      toast({
        title: "Erro de validação",
        description: "Todas as condições devem ser configuradas",
        variant: "destructive",
      });
      return null;
    }

    const { data: newRule, error: insertError } = await supabase
      .from("campaign_automation_rules")
      .insert({
        company_id: activeCompany.company_id,
        client_id: targetClientId,
        is_template: false,
        template_id: templateId,
        imported_at: new Date().toISOString(),
        rule_name: template.rule_name,
        rule_description: template.rule_description,
        rule_order: template.rule_order,
        campaign_objectives: template.campaign_objectives,
        time_window_days: template.time_window_days,
        conditions: configuredConditions,
        action_type: template.action_type,
        action_config: template.action_config,
        budget_safety_limits: template.budget_safety_limits,
        execution_limits: template.execution_limits,
        scope_filters: template.scope_filters,
        is_active: true,
        execution_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      toast({
        title: "Erro",
        description: "Erro ao importar template.",
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Template importado",
      description: `Regra "${template.rule_name}" aplicada ao cliente.`,
    });

    await fetchRules();
    return newRule;
  };

  const updateRule = async (id: string, updates: Partial<AutomationRule>) => {
    const { error } = await supabase
      .from("campaign_automation_rules")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar regra.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Regra atualizada",
      description: "Regra atualizada com sucesso.",
    });

    await fetchTemplates();
    await fetchRules();
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase
      .from("campaign_automation_rules")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao deletar regra.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Regra deletada",
      description: "Regra removida com sucesso.",
    });

    await fetchTemplates();
    await fetchRules();
  };

  const simulateRule = async (ruleId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'execute-campaign-automations',
        {
          body: {},
          method: 'GET',
          // Pass query params via URL
        }
      );

      if (error) throw error;

      return data;
    } catch (error: any) {
      toast({
        title: "Erro na simulação",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    rules,
    templates,
    loading,
    fetchRules,
    fetchTemplates,
    createTemplate,
    importTemplateToClient,
    importConfiguredTemplate,
    updateRule,
    deleteRule,
    simulateRule,
  };
};
