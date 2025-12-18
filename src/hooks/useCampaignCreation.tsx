import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CampaignObjective = 
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_APP_PROMOTION';

export interface CreateCampaignParams {
  clientId: string;
  name: string;
  objective: CampaignObjective;
  status: 'PAUSED' | 'ACTIVE';
  dailyBudget?: number;
  lifetimeBudget?: number;
  specialAdCategories?: string[];
}

export interface CreateCampaignResult {
  success: boolean;
  campaign?: any;
  facebook_id?: string;
  error?: string;
  warning?: string;
}

export function useCampaignCreation() {
  const [loading, setLoading] = useState(false);

  const createCampaign = async (params: CreateCampaignParams): Promise<CreateCampaignResult> => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-facebook-campaign', {
        body: params
      });

      if (error) {
        console.error('Error invoking create-facebook-campaign:', error);
        toast.error('Erro ao criar campanha', {
          description: error.message
        });
        return { success: false, error: error.message };
      }

      if (data.error) {
        console.error('API error:', data.error);
        toast.error('Erro ao criar campanha', {
          description: data.error
        });
        return { success: false, error: data.error };
      }

      if (data.warning) {
        toast.warning('Campanha criada com aviso', {
          description: data.warning
        });
      } else {
        toast.success('Campanha criada com sucesso!', {
          description: `A campanha "${params.name}" foi criada no Meta Ads`
        });
      }

      return {
        success: true,
        campaign: data.campaign,
        facebook_id: data.facebook_id,
        warning: data.warning
      };

    } catch (err: any) {
      console.error('Unexpected error creating campaign:', err);
      toast.error('Erro inesperado', {
        description: err.message || 'Não foi possível criar a campanha'
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    createCampaign,
    loading
  };
}
