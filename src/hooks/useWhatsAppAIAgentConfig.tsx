import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WhatsAppAIAgentConfig {
  id: string;
  company_id: string;
  instance_id: string | null;
  
  // Identidade e Função
  agent_name: string;
  department: string;
  primary_objective: string;
  
  // Equalizador de Tom e Voz
  formality_level: number;
  empathy_level: number;
  enthusiasm_level: number;
  emoji_usage: "none" | "moderate" | "intense";
  
  // Formatação da Resposta
  response_length: "short" | "medium" | "long";
  use_bold: boolean;
  use_lists: boolean;
  use_short_paragraphs: boolean;
  mandatory_cta: string | null;
  
  // Regras e Guardrails
  blacklist_words: string[];
  min_confidence_threshold: number;
  escalation_message: string;
  
  // Contexto do Cliente
  use_purchase_history: boolean;
  use_client_name: boolean;
  use_satisfaction_score: boolean;
  use_conversation_history: boolean;
  
  // Análise em tempo real
  force_realtime_analysis: boolean;
  ignore_group_analysis: boolean;
  
  created_at: string;
  updated_at: string;
}

export const defaultConfig: Omit<WhatsAppAIAgentConfig, "id" | "company_id" | "created_at" | "updated_at"> = {
  instance_id: null,
  agent_name: "Assistente",
  department: "atendimento_geral",
  primary_objective: "resolver_duvida",
  formality_level: 50,
  empathy_level: 50,
  enthusiasm_level: 50,
  emoji_usage: "moderate",
  response_length: "medium",
  use_bold: true,
  use_lists: true,
  use_short_paragraphs: true,
  mandatory_cta: null,
  blacklist_words: [],
  min_confidence_threshold: 70,
  escalation_message: "Vou transferir você para um de nossos especialistas que poderá ajudá-lo melhor.",
  use_purchase_history: false,
  use_client_name: true,
  use_satisfaction_score: false,
  use_conversation_history: true,
  force_realtime_analysis: false,
  ignore_group_analysis: true,
};

export function useWhatsAppAIAgentConfig(companyId: string | undefined, instanceId?: string | null) {
  const [config, setConfig] = useState<WhatsAppAIAgentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchConfig = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Try to find instance-specific config first, then global config
      let query = supabase
        .from("whatsapp_ai_agent_config")
        .select("*")
        .eq("company_id", companyId);

      if (instanceId) {
        query = query.eq("instance_id", instanceId);
      } else {
        query = query.is("instance_id", null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("[useWhatsAppAIAgentConfig] Error fetching config:", error);
        throw error;
      }

      if (data) {
        setConfig(data as WhatsAppAIAgentConfig);
      } else {
        // Return default config structure without saving
        setConfig(null);
      }
    } catch (error) {
      console.error("[useWhatsAppAIAgentConfig] Failed to fetch config:", error);
      toast({
        title: "Erro ao carregar configuração",
        description: "Não foi possível carregar as configurações do agente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, instanceId, toast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async (configData: Partial<WhatsAppAIAgentConfig>) => {
    if (!companyId) {
      console.error("[useWhatsAppAIAgentConfig] No companyId provided");
      return false;
    }

    try {
      setIsSaving(true);
      console.log("[useWhatsAppAIAgentConfig] Saving config...", { companyId, instanceId, hasExistingConfig: !!config?.id });

      const dataToSave = {
        ...defaultConfig,
        ...configData,
        company_id: companyId,
        instance_id: instanceId || null,
        updated_at: new Date().toISOString(),
      };

      // Remove id from dataToSave if it exists (will be set by upsert)
      delete (dataToSave as any).id;
      delete (dataToSave as any).created_at;

      let result;
      
      if (config?.id) {
        // Update existing
        console.log("[useWhatsAppAIAgentConfig] Updating existing config:", config.id);
        const { data, error } = await supabase
          .from("whatsapp_ai_agent_config")
          .update(dataToSave)
          .eq("id", config.id)
          .select()
          .single();

        if (error) {
          console.error("[useWhatsAppAIAgentConfig] Update error:", error);
          throw error;
        }
        result = data;
      } else {
        // Insert new
        console.log("[useWhatsAppAIAgentConfig] Inserting new config");
        const { data, error } = await supabase
          .from("whatsapp_ai_agent_config")
          .insert(dataToSave)
          .select()
          .single();

        if (error) {
          console.error("[useWhatsAppAIAgentConfig] Insert error:", error);
          throw error;
        }
        result = data;
      }

      console.log("[useWhatsAppAIAgentConfig] Save successful:", result);
      setConfig(result as WhatsAppAIAgentConfig);

      toast({
        title: "Configuração salva",
        description: "As configurações do agente foram salvas com sucesso.",
      });

      return true;
    } catch (error: any) {
      console.error("[useWhatsAppAIAgentConfig] Failed to save config:", error);
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    config,
    isLoading,
    isSaving,
    saveConfig,
    refetch: fetchConfig,
    defaultConfig,
  };
}
