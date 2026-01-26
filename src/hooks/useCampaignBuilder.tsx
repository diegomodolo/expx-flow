import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UrlParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  customParams?: string;
}

export interface CreativeData {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  mediaUrls: string[];
  body: string;
  title: string;
  description: string;
  linkUrl: string;
  callToAction: string;
  urlParameters: UrlParameters;
}

export interface AdSetData {
  id: string;
  name: string;
  includedAudiences: string[];
  excludedAudiences: string[];
  ageMin: number;
  ageMax: number;
  genders: number[]; // 0 = all, 1 = male, 2 = female
  pixelId?: string;
  conversionEvent?: string;
  creatives: CreativeData[];
}

export interface CampaignData {
  name: string;
  objective: string;
  budgetType: 'daily' | 'lifetime';
  budgetValue: number;
  status: 'ACTIVE' | 'PAUSED';
}

export interface CampaignBuilderState {
  campaign: CampaignData;
  adSets: AdSetData[];
  currentSection: 'ai-generator' | 'campaign' | 'adsets' | 'review';
  currentAdSetIndex: number;
  selectedCreativeIndex?: number;
  isSubmitting: boolean;
}

const defaultCreative = (): CreativeData => ({
  id: crypto.randomUUID(),
  type: 'IMAGE',
  mediaUrls: [],
  body: '',
  title: '',
  description: '',
  linkUrl: '',
  callToAction: 'LEARN_MORE',
  urlParameters: {},
});

const defaultAdSet = (): AdSetData => ({
  id: crypto.randomUUID(),
  name: '',
  includedAudiences: [],
  excludedAudiences: [],
  ageMin: 18,
  ageMax: 65,
  genders: [0],
  pixelId: undefined,
  conversionEvent: undefined,
  creatives: [defaultCreative()],
});

const defaultCampaign = (): CampaignData => ({
  name: '',
  objective: 'OUTCOME_TRAFFIC',
  budgetType: 'daily',
  budgetValue: 50,
  status: 'PAUSED',
});

export function useCampaignBuilder(clientId: string) {
  const { toast } = useToast();
  const [state, setState] = useState<CampaignBuilderState>({
    campaign: defaultCampaign(),
    adSets: [defaultAdSet()],
    currentSection: 'campaign',
    currentAdSetIndex: 0,
    selectedCreativeIndex: undefined,
    isSubmitting: false,
  });

  const resetState = useCallback(() => {
    setState({
      campaign: defaultCampaign(),
      adSets: [defaultAdSet()],
      currentSection: 'campaign',
      currentAdSetIndex: 0,
      selectedCreativeIndex: undefined,
      isSubmitting: false,
    });
  }, []);

  const updateCampaign = useCallback((updates: Partial<CampaignData>) => {
    setState(prev => ({
      ...prev,
      campaign: { ...prev.campaign, ...updates },
    }));
  }, []);

  const setCurrentSection = useCallback((section: CampaignBuilderState['currentSection']) => {
    setState(prev => ({ ...prev, currentSection: section, selectedCreativeIndex: undefined }));
  }, []);

  const setCurrentAdSetIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, currentAdSetIndex: index, currentSection: 'adsets', selectedCreativeIndex: undefined }));
  }, []);

  const setSelectedCreativeIndex = useCallback((adSetIndex: number, creativeIndex: number) => {
    setState(prev => ({ ...prev, currentAdSetIndex: adSetIndex, selectedCreativeIndex: creativeIndex, currentSection: 'adsets' }));
  }, []);

  const addAdSet = useCallback(() => {
    setState(prev => ({
      ...prev,
      adSets: [...prev.adSets, defaultAdSet()],
      currentAdSetIndex: prev.adSets.length,
    }));
  }, []);

  const removeAdSet = useCallback((index: number) => {
    setState(prev => {
      if (prev.adSets.length <= 1) return prev;
      const newAdSets = prev.adSets.filter((_, i) => i !== index);
      return {
        ...prev,
        adSets: newAdSets,
        currentAdSetIndex: Math.min(prev.currentAdSetIndex, newAdSets.length - 1),
      };
    });
  }, []);

  const updateAdSet = useCallback((index: number, updates: Partial<AdSetData>) => {
    setState(prev => ({
      ...prev,
      adSets: prev.adSets.map((adSet, i) =>
        i === index ? { ...adSet, ...updates } : adSet
      ),
    }));
  }, []);

  const addCreative = useCallback((adSetIndex: number) => {
    setState(prev => ({
      ...prev,
      adSets: prev.adSets.map((adSet, i) =>
        i === adSetIndex
          ? { ...adSet, creatives: [...adSet.creatives, defaultCreative()] }
          : adSet
      ),
    }));
  }, []);

  const removeCreative = useCallback((adSetIndex: number, creativeIndex: number) => {
    setState(prev => ({
      ...prev,
      adSets: prev.adSets.map((adSet, i) =>
        i === adSetIndex
          ? {
              ...adSet,
              creatives: adSet.creatives.length > 1
                ? adSet.creatives.filter((_, ci) => ci !== creativeIndex)
                : adSet.creatives,
            }
          : adSet
      ),
    }));
  }, []);

  const updateCreative = useCallback((
    adSetIndex: number,
    creativeIndex: number,
    updates: Partial<CreativeData>
  ) => {
    setState(prev => ({
      ...prev,
      adSets: prev.adSets.map((adSet, i) =>
        i === adSetIndex
          ? {
              ...adSet,
              creatives: adSet.creatives.map((creative, ci) =>
                ci === creativeIndex ? { ...creative, ...updates } : creative
              ),
            }
          : adSet
      ),
    }));
  }, []);

  const validateCampaign = useCallback((): string | null => {
    if (!state.campaign.name.trim()) return 'Nome da campanha é obrigatório';
    if (state.campaign.budgetValue < 1) return 'Orçamento mínimo é R$ 1,00';
    return null;
  }, [state.campaign]);

  const validateAdSets = useCallback((): string | null => {
    for (let i = 0; i < state.adSets.length; i++) {
      const adSet = state.adSets[i];
      if (!adSet.name.trim()) return `Nome do conjunto ${i + 1} é obrigatório`;
      if (adSet.creatives.length === 0) return `Conjunto ${i + 1} precisa de pelo menos 1 criativo`;
      
      for (let j = 0; j < adSet.creatives.length; j++) {
        const creative = adSet.creatives[j];
        if (creative.mediaUrls.length === 0) return `Criativo ${j + 1} do conjunto ${i + 1} precisa de mídia`;
        if (!creative.body.trim()) return `Texto do criativo ${j + 1} do conjunto ${i + 1} é obrigatório`;
        if (!creative.linkUrl.trim()) return `URL do criativo ${j + 1} do conjunto ${i + 1} é obrigatória`;
      }
    }
    return null;
  }, [state.adSets]);

  const validateAll = useCallback((): string | null => {
    return validateCampaign() || validateAdSets();
  }, [validateCampaign, validateAdSets]);

  const submitCampaign = useCallback(async (): Promise<boolean> => {
    const error = validateAll();
    if (error) {
      toast({ title: 'Erro de validação', description: error, variant: 'destructive' });
      return false;
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-meta-campaign-full', {
        body: {
          clientId,
          campaign: {
            name: state.campaign.name,
            objective: state.campaign.objective,
            daily_budget: state.campaign.budgetType === 'daily' ? state.campaign.budgetValue : undefined,
            lifetime_budget: state.campaign.budgetType === 'lifetime' ? state.campaign.budgetValue : undefined,
            status: state.campaign.status,
          },
          adSets: state.adSets.map(adSet => ({
            name: adSet.name,
            pixel_id: adSet.pixelId,
            conversion_event: adSet.conversionEvent,
            targeting: {
              custom_audiences: adSet.includedAudiences,
              excluded_audiences: adSet.excludedAudiences,
              age_min: adSet.ageMin,
              age_max: adSet.ageMax,
              genders: adSet.genders.includes(0) ? undefined : adSet.genders,
            },
            creatives: adSet.creatives.map(creative => ({
              type: creative.type,
              media_urls: creative.mediaUrls,
              body: creative.body,
              title: creative.title,
              description: creative.description,
              link_url: creative.linkUrl,
              call_to_action: creative.callToAction,
              url_parameters: creative.urlParameters,
            })),
          })),
        },
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Campanha criada!',
        description: `Campanha "${state.campaign.name}" publicada no Meta com sucesso.`,
      });

      return true;
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      toast({
        title: 'Erro ao criar campanha',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [clientId, state, validateAll, toast]);

  const applyAIGeneratedData = useCallback((data: {
    campaign: CampaignData;
    adSets: AdSetData[];
  }) => {
    setState(prev => ({
      ...prev,
      campaign: data.campaign,
      adSets: data.adSets,
      currentSection: 'campaign',
      currentAdSetIndex: 0,
    }));
  }, []);

  return {
    state,
    resetState,
    updateCampaign,
    setCurrentSection,
    setCurrentAdSetIndex,
    setSelectedCreativeIndex,
    addAdSet,
    removeAdSet,
    updateAdSet,
    addCreative,
    removeCreative,
    updateCreative,
    validateCampaign,
    validateAdSets,
    validateAll,
    submitCampaign,
    applyAIGeneratedData,
  };
}
