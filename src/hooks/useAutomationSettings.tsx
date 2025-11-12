import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

interface AutomationSettings {
  id: string;
  company_id: string;
  campaign_name_prefix: string;
  created_at: string;
  updated_at: string;
}

export function useAutomationSettings() {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!activeCompany?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("automation_settings")
        .select("*")
        .eq("company_id", activeCompany.company_id)
        .single();

      if (error) {
        // Se não existe, criar com valores padrão
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: insertError } = await supabase
            .from("automation_settings")
            .insert({
              company_id: activeCompany.company_id,
              campaign_name_prefix: "SHEGrowth"
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error creating default settings:", insertError);
            toast({
              variant: "destructive",
              title: "Erro ao criar configurações",
              description: insertError.message,
            });
            return;
          }

          setSettings(newSettings);
        } else {
          throw error;
        }
      } else {
        setSettings(data);
      }
    } catch (error: any) {
      console.error("Error fetching automation settings:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AutomationSettings>) => {
    if (!activeCompany?.company_id || !settings) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhuma configuração encontrada para atualizar",
      });
      return;
    }

    // Validar prefixo
    if (updates.campaign_name_prefix !== undefined) {
      const prefix = updates.campaign_name_prefix.trim();
      if (!prefix || prefix.length === 0) {
        toast({
          variant: "destructive",
          title: "Prefixo inválido",
          description: "O prefixo não pode estar vazio",
        });
        return;
      }
      if (prefix.length > 50) {
        toast({
          variant: "destructive",
          title: "Prefixo muito longo",
          description: "O prefixo deve ter no máximo 50 caracteres",
        });
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from("automation_settings")
        .update(updates)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast({
        title: "Configurações atualizadas",
        description: "As configurações foram salvas com sucesso",
      });
    } catch (error: any) {
      console.error("Error updating automation settings:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar configurações",
        description: error.message,
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [activeCompany?.company_id]);

  return {
    settings,
    loading,
    updateSettings,
    fetchSettings,
  };
}
