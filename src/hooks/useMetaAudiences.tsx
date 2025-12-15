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
  const { toast } = useToast();

  const fetchAudiences = useCallback(async (sync = false) => {
    if (!clientId) return;

    setLoading(true);
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
    } catch (error: any) {
      console.error('Error fetching audiences:', error);
      toast({
        title: 'Erro ao carregar públicos',
        description: error.message,
        variant: 'destructive',
      });
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
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Público criado',
        description: `Público "${name}" criado com sucesso.`,
      });

      await fetchAudiences();
      return data.audience;
    } catch (error: any) {
      console.error('Error creating audience:', error);
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
    users: UserData[]
  ): Promise<UploadResult | null> => {
    if (!clientId) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-audience-users', {
        body: {
          action: 'add',
          clientId,
          audienceId,
          users,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Leads adicionados',
        description: `${data.result.num_received} leads enviados para processamento.`,
      });

      return data.result;
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

  return {
    loading,
    audiences,
    fetchAudiences,
    createAudience,
    deleteAudience,
    getAudienceDetails,
    addUsersToAudience,
    removeUsersFromAudience,
  };
}
