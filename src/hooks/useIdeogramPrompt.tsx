import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';

interface IdeogramPrompt {
  id?: string;
  company_id: string;
  content_type: string;
  default_prompt: string;
  custom_prompt?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_IDEOGRAM_PROMPT = `TEXT: "{textToUse}"
MANDATORY: Use EXACTLY this text in Portuguese Brazil - no changes, additions or modifications

VISUAL CONTEXT:
- Client: {clientName} ({sectorContext} sector)
- Target audience: {audienceContext}
- Campaign theme: {theme}
- Creative type: {creativeType}
{clientBriefing}

STYLE REQUIREMENTS:
- Professional design for {creativeType}
- Clean, modern typography with high contrast
- Colors and style appropriate for {sectorContext} sector
- Visual appeal for {audienceContext}

STRICT TEXT RULES:
- TEXT MUST BE EXACTLY: "{textToUse}"
- NO extra words, slogans, or additional text
- NO English words
- NO spelling errors or invented words
- Professional typography only`;

export function useIdeogramPrompt() {
  const { activeCompany } = useCompany();
  const [prompt, setPrompt] = useState<IdeogramPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompt = async () => {
    if (!activeCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('content_prompts')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('content_type', 'ideogram_creative')
        .maybeSingle();

      if (error) {
        throw error;
      }

      setPrompt(data);
    } catch (err) {
      console.error('Error fetching ideogram prompt:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar prompt');
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async (customPrompt: string) => {
    if (!activeCompany?.id) return;

    // Validação mínima
    if (customPrompt.trim().length < 100) {
      toast({
        title: "Erro de validação",
        description: "O prompt deve ter pelo menos 100 caracteres.",
        variant: "destructive",
      });
      return;
    }

    // Validar se contém variáveis essenciais
    if (!customPrompt.includes('{textToUse}')) {
      toast({
        title: "Erro de validação",
        description: "O prompt deve conter a variável {textToUse}.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('content_prompts')
        .upsert({
          company_id: activeCompany.id,
          content_type: 'ideogram_creative',
          default_prompt: DEFAULT_IDEOGRAM_PROMPT,
          custom_prompt: customPrompt,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPrompt(data);
      toast({
        title: "Sucesso",
        description: "Prompt personalizado salvo com sucesso!",
      });
    } catch (err) {
      console.error('Error saving ideogram prompt:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar prompt');
      toast({
        title: "Erro",
        description: "Erro ao salvar prompt personalizado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPrompt = async () => {
    if (!activeCompany?.id || !prompt?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('content_prompts')
        .delete()
        .eq('id', prompt.id);

      if (error) {
        throw error;
      }

      setPrompt(null);
      toast({
        title: "Sucesso",
        description: "Prompt resetado para o padrão com sucesso!",
      });
    } catch (err) {
      console.error('Error resetting ideogram prompt:', err);
      setError(err instanceof Error ? err.message : 'Erro ao resetar prompt');
      toast({
        title: "Erro",
        description: "Erro ao resetar prompt para o padrão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFinalPrompt = () => {
    return prompt?.custom_prompt && prompt.custom_prompt.trim() 
      ? prompt.custom_prompt 
      : DEFAULT_IDEOGRAM_PROMPT;
  };

  const isCustomized = () => {
    return prompt?.custom_prompt && prompt.custom_prompt.trim().length > 0;
  };

  useEffect(() => {
    fetchPrompt();
  }, [activeCompany?.id]);

  return {
    prompt,
    loading,
    error,
    savePrompt,
    resetPrompt,
    getFinalPrompt,
    isCustomized,
    refetch: fetchPrompt,
    defaultPrompt: DEFAULT_IDEOGRAM_PROMPT,
  };
}