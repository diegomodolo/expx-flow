import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MetaAudience {
  id: string;
  name: string;
  description?: string;
  subtype?: string;
  approximate_count: number;
  operation_status?: any;
}

export interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface UploadResult {
  session_id: string;
  num_received: number;
  num_invalid_entries: number;
  invalid_entry_samples?: any;
}

export function useMetaAudiences(clientId: string | null) {
  const [loading, setLoading] = useState(false);
  const [audiences, setAudiences] = useState<MetaAudience[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAudiences = useCallback(async (sync = false) => {
    if (!clientId) return;

    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-meta-audiences', {
        body: {
          action: sync ? 'sync' : 'list',
          clientId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setAudiences(data.audiences || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching audiences:', err);
      setError(err.message);
      // Only show toast for non-integration errors
      if (!err.message?.includes('Facebook integration') && !err.message?.includes('ad account')) {
        toast({
          title: 'Erro ao carregar públicos',
          description: err.message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  const createAudience = useCallback(async (name: string, description?: string): Promise<MetaAudience | null> => {
    if (!clientId) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-meta-audiences', {
        body: {
          action: 'create',
          clientId,
          name,
          description,
        },
      });

      if (error) throw error;
      
      // Check for TOS error response
      if (!data.success && data.error === 'TOS_NOT_ACCEPTED') {
        throw { 
          type: 'TOS_NOT_ACCEPTED', 
          message: data.errorMessage,
          tosUrl: data.tosUrl 
        };
      }
      
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Público criado',
        description: `Público "${name}" criado com sucesso.`,
      });

      await fetchAudiences();
      return data.audience;
    } catch (error: any) {
      console.error('Error creating audience:', error);
      
      // Re-throw TOS error for component handling
      if (error?.type === 'TOS_NOT_ACCEPTED') {
        throw error;
      }
      
      toast({
        title: 'Erro ao criar público',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientId, fetchAudiences, toast]);

  const deleteAudience = useCallback(async (audienceId: string): Promise<boolean> => {
    if (!clientId) return false;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-meta-audiences', {
        body: {
          action: 'delete',
          clientId,
          audienceId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Público excluído',
        description: 'Público excluído com sucesso.',
      });

      await fetchAudiences();
      return true;
    } catch (error: any) {
      console.error('Error deleting audience:', error);
      toast({
        title: 'Erro ao excluir público',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [clientId, fetchAudiences, toast]);

  const getAudienceDetails = useCallback(async (audienceId: string): Promise<MetaAudience | null> => {
    if (!clientId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('manage-meta-audiences', {
        body: {
          action: 'get-details',
          clientId,
          audienceId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.audience;
    } catch (error: any) {
      console.error('Error getting audience details:', error);
      toast({
        title: 'Erro ao carregar detalhes',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [clientId, toast]);

  const addUsersToAudience = useCallback(async (
    audienceId: string,
    users: UserData[],
    onProgress?: (batch: number, totalBatches: number, partialResult: UploadResult) => void
  ): Promise<UploadResult | null> => {
    if (!clientId) return null;

    setLoading(true);
    try {
      const FRONT_BATCH_SIZE = 5000;
      const totalBatches = Math.ceil(users.length / FRONT_BATCH_SIZE);
      let totalReceived = 0;
      let totalInvalid = 0;
      let lastSessionId = '';

      for (let i = 0; i < totalBatches; i++) {
        const batchUsers = users.slice(i * FRONT_BATCH_SIZE, (i + 1) * FRONT_BATCH_SIZE);

        const { data, error } = await supabase.functions.invoke('manage-audience-users', {
          body: {
            action: 'add',
            clientId,
            audienceId,
            users: batchUsers,
          },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        totalReceived += data.result.num_received || 0;
        totalInvalid += data.result.num_invalid_entries || 0;
        lastSessionId = data.result.session_id || lastSessionId;

        if (onProgress) {
          onProgress(i + 1, totalBatches, {
            session_id: lastSessionId,
            num_received: totalReceived,
            num_invalid_entries: totalInvalid,
          });
        }
      }

      const finalResult: UploadResult = {
        session_id: lastSessionId,
        num_received: totalReceived,
        num_invalid_entries: totalInvalid,
      };

      toast({
        title: 'Leads adicionados',
        description: `${totalReceived} leads enviados em ${totalBatches} lote(s).`,
      });

      return finalResult;
    } catch (error: any) {
      console.error('Error adding users:', error);
      toast({
        title: 'Erro ao adicionar leads',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  const removeUsersFromAudience = useCallback(async (
    audienceId: string,
    users: UserData[]
  ): Promise<UploadResult | null> => {
    if (!clientId) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-audience-users', {
        body: {
          action: 'remove',
          clientId,
          audienceId,
          users,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Leads removidos',
        description: `${data.result.num_received} leads enviados para remoção.`,
      });

      return data.result;
    } catch (error: any) {
      console.error('Error removing users:', error);
      toast({
        title: 'Erro ao remover leads',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  const createLookalikeAudience = useCallback(async (
    originAudienceId: string,
    name: string,
    country: string = 'BR',
    ratio: number = 1,
    lookalikeType?: 'similarity' | 'reach'
  ): Promise<MetaAudience | null> => {
    if (!clientId) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-meta-audiences', {
        body: {
          action: 'create_lookalike',
          clientId,
          originAudienceId,
          name,
          country,
          ratio,
          lookalikeType,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Público semelhante criado',
        description: `Lookalike "${name}" criado com sucesso. Pode levar algumas horas para popular.`,
      });

      await fetchAudiences();
      return data.audience;
    } catch (error: any) {
      console.error('Error creating lookalike audience:', error);
      toast({
        title: 'Erro ao criar público semelhante',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientId, fetchAudiences, toast]);

  const createWebsiteAudience = useCallback(async (params: {
    name: string;
    pixelId: string;
    retentionDays: number;
    ruleType: 'all_visitors' | 'url_contains' | 'url_equals' | 'event';
    urlValue?: string;
    eventName?: string;
  }): Promise<MetaAudience | null> => {
    if (!clientId) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-meta-audiences', {
        body: {
          action: 'create_website_audience',
          clientId,
          name: params.name,
          pixelId: params.pixelId,
          retentionDays: params.retentionDays,
          ruleType: params.ruleType,
          urlValue: params.urlValue,
          eventName: params.eventName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Público de website criado',
        description: `Público "${params.name}" criado com sucesso. Será populado com dados históricos.`,
      });

      await fetchAudiences();
      return data.audience;
    } catch (error: any) {
      console.error('Error creating website audience:', error);
      toast({
        title: 'Erro ao criar público de website',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientId, fetchAudiences, toast]);

  const createEngagementAudience = useCallback(async (params: {
    name: string;
    engagementType: 'page' | 'instagram' | 'video';
    sourceId: string;
    retentionDays: number;
    engagementEvent: string;
    videoPercentile?: number;
    videoIds?: string[];
  }): Promise<MetaAudience | null> => {
    if (!clientId) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-meta-audiences', {
        body: {
          action: 'create_engagement_audience',
          clientId,
          name: params.name,
          engagementType: params.engagementType,
          sourceId: params.sourceId,
          retentionDays: params.retentionDays,
          engagementEvent: params.engagementEvent,
          videoPercentile: params.videoPercentile,
          videoIds: params.videoIds,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const typeLabels = {
        page: 'Página Facebook',
        instagram: 'Instagram',
        video: 'Vídeo',
      };

      toast({
        title: `Público de ${typeLabels[params.engagementType]} criado`,
        description: `Público "${params.name}" criado com sucesso. Será populado com dados históricos.`,
      });

      await fetchAudiences();
      return data.audience;
    } catch (error: any) {
      console.error('Error creating engagement audience:', error);
      toast({
        title: 'Erro ao criar público de engajamento',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientId, fetchAudiences, toast]);

  return {
    loading,
    audiences,
    error,
    fetchAudiences,
    createAudience,
    deleteAudience,
    getAudienceDetails,
    addUsersToAudience,
    removeUsersFromAudience,
    createLookalikeAudience,
    createWebsiteAudience,
    createEngagementAudience,
  };
}
