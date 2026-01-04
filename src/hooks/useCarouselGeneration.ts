import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateCarouselParams {
  clientId: string;
  companyId: string;
  userId?: string;
  carouselType?: "tutorial" | "comparison" | "behind_scenes" | "curated_list";
  count?: number;
}

interface GenerateCarouselResult {
  success: boolean;
  generated: number;
  carousels?: any[];
  errors?: string[];
}

export function useCarouselGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCarousels = async (params: GenerateCarouselParams): Promise<GenerateCarouselResult> => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('daily-carousel-generator', {
        body: {
          client_id: params.clientId,
          company_id: params.companyId,
          user_id: params.userId,
          carousel_type: params.carouselType,
          count: params.count || 1,
        },
      });

      if (error) {
        console.error('[useCarouselGeneration] Error:', error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        success: true,
        generated: data.generated || 0,
        carousels: data.carousels,
        errors: data.errors,
      };
    } catch (error: any) {
      console.error('[useCarouselGeneration] Error:', error);
      
      let errorMessage = 'Erro ao gerar carrosséis';
      if (error.message?.includes('Rate limit')) {
        errorMessage = 'Limite de requisições atingido. Tente novamente em alguns minutos.';
      } else if (error.message?.includes('Payment required')) {
        errorMessage = 'Créditos de IA esgotados. Adicione mais créditos.';
      }
      
      toast.error(errorMessage);
      
      return {
        success: false,
        generated: 0,
        errors: [error.message],
      };
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generateCarousels,
  };
}
