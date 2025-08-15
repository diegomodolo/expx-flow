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

const DEFAULT_IDEOGRAM_PROMPT = `PROFESSIONAL PHOTOGRAPHY: Create a real marketing campaign photograph - NOT an illustration or cartoon

TEXT: "{textToUse}"
MANDATORY: Use EXACTLY this text in Portuguese Brazil - no changes, additions or modifications

VISUAL CONTEXT:
- Client: {clientName} ({sectorContext} sector)
- Target audience: {audienceContext}
- Campaign theme: {theme}
- Creative type: {creativeType}
{clientBriefing}

PHOTOGRAPHY SPECIFICATIONS:
- MUST be ultra-realistic photography style - like shot with professional DSLR camera
- Professional studio lighting or natural lighting setup
- High-resolution commercial photography quality
- Corporate, professional design with clean, modern layout
- Clean, modern **typography** with excellent readability
- Colors and visual style aligned with the branding of the {sectorContext} sector
- Visual appeal for {audienceContext}
- Background: Clean, professional, and contextually appropriate

STRICT TEXT RULES:
- TEXT MUST BE EXACTLY: "{textToUse}"
- NO extra words, slogans, or additional text
- NO English words
- NO spelling errors or invented words
- NO distortions or variations in the text
- NO decorative or artistic fonts — only professional fonts

CRITICAL REQUIREMENTS:
- NEVER use illustration, cartoon, drawing, sketch, anime, manga, comic, flat design, vector art, digital art, painting, artistic rendering, 3D render, clipart, icon, logo, symbol, or graphic design
- MUST look like an actual photograph taken by a professional photographer
- MUST appear as a real marketing campaign photo that could be used by a major brand
- Use realistic lighting, shadows, depth of field, and photographic composition
- Focus on creating a highly professional and realistic advertisement photograph`;

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