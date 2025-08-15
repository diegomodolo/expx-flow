import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { contentTypes } from "@/components/content-generator/ContentTypes";

interface ContentPrompt {
  id: string;
  company_id: string;
  content_type: string;
  default_prompt: string;
  custom_prompt?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useContentPrompts() {
  const [prompts, setPrompts] = useState<ContentPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const fetchPrompts = async () => {
    if (!activeCompany) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('content_prompts')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('content_type');

      if (error) throw error;

      setPrompts(data || []);
    } catch (err) {
      console.error('Error fetching content prompts:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar prompts');
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async (contentType: string, customPrompt: string, defaultPrompt: string) => {
    if (!activeCompany) return;

    try {
      const { data, error } = await supabase
        .from('content_prompts')
        .upsert({
          company_id: activeCompany.company_id,
          content_type: contentType,
          default_prompt: defaultPrompt,
          custom_prompt: customPrompt.trim() || null,
          is_active: true,
        }, {
          onConflict: 'company_id,content_type'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPrompts(prev => {
        const existing = prev.find(p => p.content_type === contentType);
        if (existing) {
          return prev.map(p => p.content_type === contentType ? data : p);
        } else {
          return [...prev, data];
        }
      });

      toast({
        title: "Prompt salvo",
        description: "As alterações foram aplicadas com sucesso.",
      });

      return data;
    } catch (err) {
      console.error('Error saving prompt:', err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o prompt. Tente novamente.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const resetPrompt = async (contentType: string) => {
    if (!activeCompany) return;

    try {
      const { error } = await supabase
        .from('content_prompts')
        .delete()
        .eq('company_id', activeCompany.company_id)
        .eq('content_type', contentType);

      if (error) throw error;

      // Update local state
      setPrompts(prev => prev.filter(p => p.content_type !== contentType));

      toast({
        title: "Prompt resetado",
        description: "O prompt foi restaurado para o padrão.",
      });
    } catch (err) {
      console.error('Error resetting prompt:', err);
      toast({
        title: "Erro ao resetar",
        description: "Não foi possível resetar o prompt. Tente novamente.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const getPromptForContentType = (contentType: string) => {
    const customPrompt = prompts.find(p => p.content_type === contentType);
    return customPrompt?.custom_prompt || null;
  };

  const isCustomized = (contentType: string) => {
    const prompt = prompts.find(p => p.content_type === contentType);
    return prompt && prompt.custom_prompt && prompt.custom_prompt.trim().length > 0;
  };

  const getAllPromptsWithStatus = () => {
    return contentTypes.map(contentType => ({
      ...contentType,
      isCustomized: isCustomized(contentType.id),
      customPrompt: getPromptForContentType(contentType.id),
    }));
  };

  useEffect(() => {
    fetchPrompts();
  }, [activeCompany]);

  return {
    prompts,
    loading,
    error,
    savePrompt,
    resetPrompt,
    getPromptForContentType,
    isCustomized,
    getAllPromptsWithStatus,
    refetch: fetchPrompts,
  };
}