import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface YouTubeChannel {
  id: string;
  client_id: string;
  company_id: string;
  channel_id: string;
  channel_url: string;
  channel_name: string;
  channel_handle: string | null;
  thumbnail_url: string | null;
  subscriber_count: number | null;
  video_count: number | null;
  is_active: boolean;
  last_analyzed_at: string | null;
  created_at: string;
}

export function useYouTubeChannels(clientId: string, companyId: string) {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const fetchChannels = useCallback(async () => {
    if (!clientId || !companyId) return;

    try {
      const { data, error } = await supabase
        .from('youtube_monitored_channels')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: 'Erro ao carregar canais',
        description: 'Não foi possível carregar os canais monitorados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId, toast]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const addChannel = async (channelUrl: string, periodDays = 30) => {
    if (!channelUrl.trim()) {
      toast({
        title: 'URL inválida',
        description: 'Insira uma URL válida do canal do YouTube.',
        variant: 'destructive',
      });
      return null;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-youtube-channel', {
        body: {
          channelUrl,
          clientId,
          companyId,
          periodDays,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to analyze channel');

      toast({
        title: 'Canal adicionado!',
        description: `${data.channel.name} foi adicionado e ${data.analyzedCount} vídeos foram analisados.`,
      });

      await fetchChannels();
      return data;
    } catch (error: any) {
      console.error('Error adding channel:', error);
      toast({
        title: 'Erro ao adicionar canal',
        description: error.message || 'Não foi possível adicionar o canal.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  const refreshChannel = async (channelId: string, periodDays = 30) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return null;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-youtube-channel', {
        body: {
          channelUrl: channel.channel_url,
          clientId,
          companyId,
          periodDays,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to refresh channel');

      toast({
        title: 'Canal atualizado!',
        description: `${data.analyzedCount} vídeos analisados.`,
      });

      await fetchChannels();
      return data;
    } catch (error: any) {
      console.error('Error refreshing channel:', error);
      toast({
        title: 'Erro ao atualizar canal',
        description: error.message || 'Não foi possível atualizar o canal.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  const removeChannel = async (channelId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_monitored_channels')
        .update({ is_active: false })
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: 'Canal removido',
        description: 'O canal foi removido do monitoramento.',
      });

      setChannels(prev => prev.filter(c => c.id !== channelId));
    } catch (error) {
      console.error('Error removing channel:', error);
      toast({
        title: 'Erro ao remover canal',
        description: 'Não foi possível remover o canal.',
        variant: 'destructive',
      });
    }
  };

  return {
    channels,
    loading,
    analyzing,
    addChannel,
    refreshChannel,
    removeChannel,
    refetch: fetchChannels,
  };
}
