import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Interest {
  id: string;
  name: string;
}

export interface AdSetBuilderState {
  campaignId: string;
  metaCampaignId: string;
  name: string;
  includedAudiences: string[];
  excludedAudiences: string[];
  interests: Interest[];
  ageMin: number;
  ageMax: number;
  genders: number[];
  pixelId: string;
  conversionEvent: string;
  dailyBudget: number;
}

const initialState: AdSetBuilderState = {
  campaignId: '',
  metaCampaignId: '',
  name: '',
  includedAudiences: [],
  excludedAudiences: [],
  interests: [],
  ageMin: 18,
  ageMax: 65,
  genders: [],
  pixelId: '',
  conversionEvent: '',
  dailyBudget: 50,
};

export function useAdSetBuilder(clientId: string, companyId: string) {
  const [state, setState] = useState<AdSetBuilderState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback(<K extends keyof AdSetBuilderState>(
    field: K,
    value: AdSetBuilderState[K]
  ) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const submit = useCallback(async () => {
    if (!state.campaignId || !state.metaCampaignId || !state.name.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return null;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-meta-adset', {
        body: {
          clientId,
          campaignId: state.campaignId,
          metaCampaignId: state.metaCampaignId,
          adSet: {
            name: state.name,
            pixel_id: state.pixelId || undefined,
            conversion_event: state.conversionEvent || undefined,
            daily_budget: state.dailyBudget,
            targeting: {
              custom_audiences: state.includedAudiences.length > 0 ? state.includedAudiences : undefined,
              excluded_audiences: state.excludedAudiences.length > 0 ? state.excludedAudiences : undefined,
              interests: state.interests.length > 0 ? state.interests : undefined,
              age_min: state.ageMin,
              age_max: state.ageMax,
              genders: state.genders.length > 0 ? state.genders : undefined,
            },
          },
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao criar conjunto de anúncios');
      }

      toast.success('Conjunto de anúncios criado com sucesso!');
      reset();
      return data;
    } catch (error: any) {
      console.error('Error creating ad set:', error);
      toast.error(error.message || 'Erro ao criar conjunto de anúncios');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [clientId, state, reset]);

  return {
    state,
    updateField,
    reset,
    submit,
    isSubmitting,
  };
}
