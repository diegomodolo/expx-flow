import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "./use-toast";

export interface RuleCondition {
  field: string;
  operator: "<" | ">" | "=" | "!=" | ">=" | "<=";
  value: number | boolean | string;
  type: "number" | "boolean" | "string";
}

export interface RuleConditions {
  logic: "AND" | "OR";
  conditions: RuleCondition[];
}

export interface ClientStatusRule {
  id: string;
  company_id: string;
  rule_name: string;
  rule_order: number;
  status_output: "excelente" | "atencao" | "emergencial" | "inativo" | "sem_fundos";
  conditions: RuleConditions;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useClientStatusRules = () => {
  const [rules, setRules] = useState<ClientStatusRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const fetchRules = async () => {
    if (!user || !activeCompany?.company_id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from("client_status_rules")
        .select("*")
        .eq("company_id", activeCompany.company_id)
        .order("rule_order", { ascending: true });

      if (fetchError) throw fetchError;
      
      setRules((data || []) as unknown as ClientStatusRule[]);
    } catch (err: any) {
      console.error("Error fetching rules:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [user?.id, activeCompany?.company_id]);

  const createRule = async (ruleData: Omit<ClientStatusRule, "id" | "created_at" | "updated_at" | "company_id">) => {
    if (!activeCompany?.company_id) return null;

    try {
      const { data, error: createError } = await supabase
        .from("client_status_rules")
        .insert({
          ...ruleData,
          company_id: activeCompany.company_id,
          conditions: ruleData.conditions as any,
        })
        .select()
        .single();

      if (createError) throw createError;

      toast({
        title: "Regra criada",
        description: "A regra foi criada com sucesso.",
      });

      await fetchRules();
      return data;
    } catch (err: any) {
      console.error("Error creating rule:", err);
      toast({
        title: "Erro ao criar regra",
        description: err.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateRule = async (id: string, updates: Partial<ClientStatusRule>) => {
    try {
      const updateData = {
        ...updates,
        conditions: updates.conditions ? (updates.conditions as any) : undefined,
      };
      
      const { error: updateError } = await supabase
        .from("client_status_rules")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;

      toast({
        title: "Regra atualizada",
        description: "A regra foi atualizada com sucesso.",
      });

      await fetchRules();
    } catch (err: any) {
      console.error("Error updating rule:", err);
      toast({
        title: "Erro ao atualizar regra",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("client_status_rules")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      toast({
        title: "Regra excluída",
        description: "A regra foi excluída com sucesso.",
      });

      await fetchRules();
    } catch (err: any) {
      console.error("Error deleting rule:", err);
      toast({
        title: "Erro ao excluir regra",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const reorderRules = async (newOrder: { id: string; rule_order: number }[]) => {
    try {
      // Update all rules with new order
      const updates = newOrder.map(({ id, rule_order }) =>
        supabase
          .from("client_status_rules")
          .update({ rule_order })
          .eq("id", id)
      );

      await Promise.all(updates);

      toast({
        title: "Ordem atualizada",
        description: "A ordem das regras foi atualizada com sucesso.",
      });

      await fetchRules();
    } catch (err: any) {
      console.error("Error reordering rules:", err);
      toast({
        title: "Erro ao reordenar regras",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const restoreDefaults = async () => {
    if (!activeCompany?.company_id) return;

    try {
      // Delete all non-default rules
      const { error: deleteError } = await supabase
        .from("client_status_rules")
        .delete()
        .eq("company_id", activeCompany.company_id)
        .eq("is_default", false);

      if (deleteError) throw deleteError;

      // Create default rules
      const defaultRules = [
        {
          company_id: activeCompany.company_id,
          rule_name: "Sem Fundos",
          rule_order: 1,
          status_output: "sem_fundos" as const,
          conditions: {
            logic: "OR" as const,
            conditions: [
              { field: "has_funding_issues", operator: "=" as const, value: true, type: "boolean" as const },
              { field: "account_balance", operator: "<=" as const, value: 0, type: "number" as const },
            ],
          },
          is_active: true,
          is_default: true,
        },
        {
          company_id: activeCompany.company_id,
          rule_name: "Inativo",
          rule_order: 2,
          status_output: "inativo" as const,
          conditions: {
            logic: "AND" as const,
            conditions: [
              { field: "days_without_changes", operator: ">" as const, value: 30, type: "number" as const },
              { field: "leads_last_30_days", operator: "=" as const, value: 0, type: "number" as const },
            ],
          },
          is_active: true,
          is_default: true,
        },
        {
          company_id: activeCompany.company_id,
          rule_name: "Emergencial",
          rule_order: 3,
          status_output: "emergencial" as const,
          conditions: {
            logic: "OR" as const,
            conditions: [
              { field: "leads_last_7_days", operator: "<" as const, value: 7, type: "number" as const },
              { field: "active_campaigns_count", operator: "=" as const, value: 0, type: "number" as const },
            ],
          },
          is_active: true,
          is_default: true,
        },
        {
          company_id: activeCompany.company_id,
          rule_name: "Atenção",
          rule_order: 4,
          status_output: "atencao" as const,
          conditions: {
            logic: "OR" as const,
            conditions: [
              { field: "lead_drop_percentage", operator: ">=" as const, value: 30, type: "number" as const },
              { field: "days_since_last_optimization", operator: ">" as const, value: 7, type: "number" as const },
            ],
          },
          is_active: true,
          is_default: true,
        },
        {
          company_id: activeCompany.company_id,
          rule_name: "Excelente",
          rule_order: 5,
          status_output: "excelente" as const,
          conditions: {
            logic: "AND" as const,
            conditions: [
              { field: "leads_last_7_days", operator: ">=" as const, value: 30, type: "number" as const },
              { field: "average_ctr", operator: ">" as const, value: 1.5, type: "number" as const },
            ],
          },
          is_active: true,
          is_default: true,
        },
      ];

      const { error: insertError } = await supabase
        .from("client_status_rules")
        .insert(defaultRules.map(r => ({ ...r, conditions: r.conditions as any })));

      if (insertError) throw insertError;

      toast({
        title: "Regras restauradas",
        description: "As regras padrão foram restauradas com sucesso.",
      });

      await fetchRules();
    } catch (err: any) {
      console.error("Error restoring defaults:", err);
      toast({
        title: "Erro ao restaurar padrões",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return {
    rules,
    loading,
    error,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    reorderRules,
    restoreDefaults,
  };
};
