import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface AutomationRuleTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  rules?: AutomationTemplateRule[];
}

export interface AutomationTemplateRule {
  id: string;
  template_id: string;
  rule_id: string;
  order_index: number;
  rule?: any; // Full rule data when joined
}

export const useAutomationTemplates = () => {
  const [templates, setTemplates] = useState<AutomationRuleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchTemplates = async () => {
    if (!user || !activeCompany) return;

    try {
      setLoading(true);
      
      // Fetch templates with their associated rules
      const { data: templatesData, error: templatesError } = await supabase
        .from("automation_rule_templates")
        .select(`
          *,
          automation_template_rules (
            id,
            rule_id,
            order_index,
            rule:campaign_automation_rules (*)
          )
        `)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (templatesError) throw templatesError;

      // Transform the data to match our interface
      const transformedTemplates = templatesData?.map((template: any) => ({
        ...template,
        rules: template.automation_template_rules || []
      })) || [];

      setTemplates(transformedTemplates);
    } catch (error: any) {
      console.error("Error fetching automation templates:", error);
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeCompany) {
      fetchTemplates();
    }
  }, [user, activeCompany]);

  const createTemplate = async (
    name: string,
    description: string | null,
    category: string | null,
    ruleIds: string[]
  ) => {
    if (!activeCompany) {
      throw new Error("Nenhuma empresa selecionada");
    }

    try {
      // Create the template
      const { data: templateData, error: templateError } = await supabase
        .from("automation_rule_templates")
        .insert({
          company_id: activeCompany.company_id,
          name,
          description,
          category,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create the rule associations
      const ruleAssociations = ruleIds.map((ruleId, index) => ({
        template_id: templateData.id,
        rule_id: ruleId,
        order_index: index,
      }));

      const { error: rulesError } = await supabase
        .from("automation_template_rules")
        .insert(ruleAssociations);

      if (rulesError) throw rulesError;

      toast({
        title: "Template criado",
        description: "O template foi criado com sucesso.",
      });

      await fetchTemplates();
      return templateData;
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTemplate = async (
    templateId: string,
    updates: {
      name?: string;
      description?: string | null;
      category?: string | null;
      is_active?: boolean;
      ruleIds?: string[];
    }
  ) => {
    try {
      // Update template metadata
      const { name, description, category, is_active, ruleIds } = updates;
      const templateUpdates: any = {};
      
      if (name !== undefined) templateUpdates.name = name;
      if (description !== undefined) templateUpdates.description = description;
      if (category !== undefined) templateUpdates.category = category;
      if (is_active !== undefined) templateUpdates.is_active = is_active;

      if (Object.keys(templateUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from("automation_rule_templates")
          .update(templateUpdates)
          .eq("id", templateId);

        if (updateError) throw updateError;
      }

      // Update rule associations if provided
      if (ruleIds !== undefined) {
        // Delete existing associations
        const { error: deleteError } = await supabase
          .from("automation_template_rules")
          .delete()
          .eq("template_id", templateId);

        if (deleteError) throw deleteError;

        // Create new associations
        const ruleAssociations = ruleIds.map((ruleId, index) => ({
          template_id: templateId,
          rule_id: ruleId,
          order_index: index,
        }));

        const { error: insertError } = await supabase
          .from("automation_template_rules")
          .insert(ruleAssociations);

        if (insertError) throw insertError;
      }

      toast({
        title: "Template atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      await fetchTemplates();
    } catch (error: any) {
      console.error("Error updating template:", error);
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("automation_rule_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Template deletado",
        description: "O template foi removido com sucesso.",
      });

      await fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast({
        title: "Erro ao deletar template",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const importTemplateToClient = async (templateId: string, clientId: string) => {
    try {
      // Fetch template with all rules
      const { data: templateData, error: templateError } = await supabase
        .from("automation_rule_templates")
        .select(`
          *,
          automation_template_rules (
            rule:campaign_automation_rules (*)
          )
        `)
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Import each rule to the client
      const ruleImportPromises = templateData.automation_template_rules.map(
        async (templateRule: any) => {
          const rule = templateRule.rule;
          
          const { error: importError } = await supabase
            .from("campaign_automation_rules")
            .insert({
              company_id: rule.company_id,
              client_id: clientId,
              rule_name: rule.rule_name,
              rule_description: rule.rule_description,
              entity_type: rule.entity_type,
              action_type: rule.action_type,
              conditions: rule.conditions,
              action_config: rule.action_config,
              time_window_hours: rule.time_window_hours,
              priority: rule.priority,
              is_active: rule.is_active,
              is_template: false,
              template_id: rule.id,
              safety_limits: rule.safety_limits,
              recovery_trigger: rule.recovery_trigger,
              objectives: rule.objectives,
            });

          if (importError) throw importError;
        }
      );

      await Promise.all(ruleImportPromises);

      toast({
        title: "Template importado",
        description: `${templateData.automation_template_rules.length} regras foram importadas com sucesso.`,
      });

      return templateData;
    } catch (error: any) {
      console.error("Error importing template:", error);
      toast({
        title: "Erro ao importar template",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    importTemplateToClient,
  };
};
