import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UrlParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  customParams?: string;
}

export interface CreativeBuilderState {
  campaignId: string;
  adSetId: string;
  metaAdSetId: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  mediaUrls: string[];
  body: string;
  title: string;
  description: string;
  linkUrl: string;
  callToAction: string;
  urlParameters: UrlParameters;
}

const initialState: CreativeBuilderState = {
  campaignId: '',
  adSetId: '',
  metaAdSetId: '',
  type: 'IMAGE',
  mediaUrls: [],
  body: '',
  title: '',
  description: '',
  linkUrl: '',
  callToAction: 'LEARN_MORE',
  urlParameters: {},
};

export function useCreativeBuilder(clientId: string, companyId: string) {
  const [state, setState] = useState<CreativeBuilderState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback(<K extends keyof CreativeBuilderState>(
    field: K,
    value: CreativeBuilderState[K]
  ) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const submit = useCallback(async () => {
    if (!state.adSetId || !state.metaAdSetId || !state.body.trim() || !state.linkUrl.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return null;
    }

    if (state.mediaUrls.length === 0) {
      toast.error('Adicione pelo menos uma mídia');
      return null;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-meta-ad', {
        body: {
          clientId,
          adSetId: state.adSetId,
          metaAdSetId: state.metaAdSetId,
          creative: {
            type: state.type,
            media_urls: state.mediaUrls,
            body: state.body,
            title: state.title,
            description: state.description,
            link_url: state.linkUrl,
            call_to_action: state.callToAction,
            url_parameters: Object.keys(state.urlParameters).length > 0 ? state.urlParameters : undefined,
          },
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao criar criativo');
      }

      toast.success('Criativo criado com sucesso!');
      reset();
      return data;
    } catch (error: any) {
      console.error('Error creating creative:', error);
      toast.error(error.message || 'Erro ao criar criativo');
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
