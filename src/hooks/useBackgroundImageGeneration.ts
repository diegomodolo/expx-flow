import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EditableStrategy, EditableCreative } from '@/components/campaign-generator/editable/types';
import { toast } from 'sonner';

interface GenerationProgress {
  total: number;
  completed: number;
  current: string | null;
  isGenerating: boolean;
}

export function useBackgroundImageGeneration() {
  const [progress, setProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    current: null,
    isGenerating: false,
  });
  
  const abortRef = useRef(false);

  const generateImagesInBackground = useCallback(async (
    strategy: EditableStrategy,
    clientId: string,
    onCreativeUpdate: (adSetId: string, creativeId: string, imageUrl: string) => void
  ) => {
    // Collect all creatives that need images
    const creativesToGenerate: { 
      adSetId: string; 
      adSetName: string;
      creative: EditableCreative;
      index: number;
    }[] = [];

    strategy.adSets.forEach((adSet) => {
      adSet.creatives.forEach((creative, index) => {
        // Only generate for creatives without images and with text content
        if (creative.mediaUrls.length === 0 && (creative.headline || creative.body)) {
          creativesToGenerate.push({
            adSetId: adSet.id,
            adSetName: adSet.name,
            creative,
            index,
          });
        }
      });
    });

    if (creativesToGenerate.length === 0) {
      return;
    }

    abortRef.current = false;
    setProgress({
      total: creativesToGenerate.length,
      completed: 0,
      current: null,
      isGenerating: true,
    });

    toast.info(`Gerando ${creativesToGenerate.length} imagem(ns) em segundo plano...`, {
      duration: 3000,
    });

    // Generate images one by one
    for (let i = 0; i < creativesToGenerate.length; i++) {
      if (abortRef.current) {
        break;
      }

      const item = creativesToGenerate[i];
      
      setProgress(prev => ({
        ...prev,
        current: `${item.adSetName} - Criativo ${item.index + 1}`,
      }));

      try {
        const prompt = `Crie uma imagem profissional para anúncio de mídia social. 
          Título: ${item.creative.headline || 'Sem título'}
          Texto: ${item.creative.body || 'Sem texto'}
          Descrição: ${item.creative.description || 'Sem descrição'}
          Estilo: moderno, profissional, adequado para Instagram e Facebook.`;

        const { data, error } = await supabase.functions.invoke('generate-ai-campaign-image', {
          body: { prompt, clientId, placement: 'feed' }
        });

        if (error) {
          console.error('Error generating image:', error);
          continue;
        }

        if (data?.success && data?.imageUrl) {
          onCreativeUpdate(item.adSetId, item.creative.id, data.imageUrl);
          
          setProgress(prev => ({
            ...prev,
            completed: prev.completed + 1,
          }));
        }
      } catch (error) {
        console.error('Error generating image for creative:', error);
        // Continue with next creative even if one fails
      }
    }

    setProgress(prev => ({
      ...prev,
      current: null,
      isGenerating: false,
    }));

    const finalCompleted = progress.completed + 1;
    if (finalCompleted > 0) {
      toast.success(`${finalCompleted} imagem(ns) gerada(s) com sucesso!`, {
        duration: 3000,
      });
    }
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    setProgress(prev => ({
      ...prev,
      isGenerating: false,
      current: null,
    }));
  }, []);

  return {
    progress,
    generateImagesInBackground,
    stopGeneration,
  };
}
