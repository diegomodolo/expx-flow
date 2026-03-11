import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface YouTubeContentLab {
  id: string;
  company_id: string;
  name: string;
  client_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client_name?: string;
  channels_count?: number;
}

export function useYouTubeContentLabs(companyId: string) {
  const [labs, setLabs] = useState<YouTubeContentLab[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLabs = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('youtube_content_labs')
        .select('*, clients(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get channel counts per lab
      const labIds = (data || []).map((l: unknown) => l.id);
      const channelCounts = new Map<string, number>();
      
      if (labIds.length > 0) {
        const { data: channelData } = await supabase
          .from('youtube_monitored_channels')
          .select('lab_id')
          .in('lab_id', labIds)
          .eq('is_active', true);

        if (channelData) {
          channelData.forEach((c: unknown) => {
            channelCounts.set(c.lab_id, (channelCounts.get(c.lab_id) || 0) + 1);
          });
        }
      }

      const mapped: YouTubeContentLab[] = (data || []).map((l: unknown) => ({
        ...l,
        client_name: l.clients?.name || null,
        clients: undefined,
        channels_count: channelCounts.get(l.id) || 0,
      }));

      setLabs(mapped);
    } catch (error) {
      console.error('Error fetching labs:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  const createLab = async (name: string, clientId?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('youtube_content_labs')
        .insert({
          company_id: companyId,
          name,
          client_id: clientId || null,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Lab criado!' });
      await fetchLabs();
      return data;
    } catch (error: unknown) {
      console.error('Error creating lab:', error);
      toast({ title: 'Erro ao criar lab', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const deleteLab = async (labId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_content_labs')
        .delete()
        .eq('id', labId);

      if (error) throw error;

      toast({ title: 'Lab excluído' });
      setLabs(prev => prev.filter(l => l.id !== labId));
    } catch (error) {
      console.error('Error deleting lab:', error);
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const updateLab = async (labId: string, updates: { name?: string }) => {
    try {
      const { error } = await supabase
        .from('youtube_content_labs')
        .update(updates)
        .eq('id', labId);

      if (error) throw error;

      toast({ title: 'Lab atualizado' });
      await fetchLabs();
    } catch (error) {
      console.error('Error updating lab:', error);
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  // Get or create lab for a specific client
  const getOrCreateClientLab = async (clientId: string, clientName: string): Promise<string | null> => {
    // Check if lab already exists for this client
    const existing = labs.find(l => l.client_id === clientId);
    if (existing) return existing.id;

    // Check DB directly (in case labs haven't loaded yet)
    const { data: existingData } = await supabase
      .from('youtube_content_labs')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (existingData) return existingData.id;

    // Create new lab for this client
    const lab = await createLab(clientName, clientId);
    return lab?.id || null;
  };

  return {
    labs,
    loading,
    createLab,
    deleteLab,
    updateLab,
    getOrCreateClientLab,
    refetch: fetchLabs,
  };
}
