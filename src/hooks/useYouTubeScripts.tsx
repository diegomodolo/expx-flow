import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SourceVideoInfo {
  title: string;
  channel_name: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  engagement_rate: number | null;
  thumbnail_url: string | null;
}

export interface YouTubeScript {
  id: string;
  client_id: string;
  company_id: string;
  suggestion_id: string | null;
  title: string;
  script_content: string;
  suggested_titles: string[];
  thumbnail_url: string | null;
  reference_thumbnails: string[];
  video_duration_target: number | null;
  status: 'draft' | 'review' | 'approved' | 'produced';
  created_at: string;
  updated_at: string;
  source_videos?: SourceVideoInfo[];
}

export interface ScriptMessage {
  id: string;
  script_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function useYouTubeScripts(clientId: string, companyId: string) {
  const [scripts, setScripts] = useState<YouTubeScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchScripts = useCallback(async () => {
    if (!clientId || !companyId) return;

    try {
      const { data, error } = await supabase
        .from('youtube_scripts')
        .select('*, youtube_content_suggestions(based_on_videos)')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Collect all video titles from suggestions AND source_video_id column
      const allVideoTitles: string[] = [];
      (data || []).forEach((s: any) => {
        const suggestion = s.youtube_content_suggestions;
        if (suggestion?.based_on_videos && Array.isArray(suggestion.based_on_videos)) {
          allVideoTitles.push(...suggestion.based_on_videos);
        }
        // Also include source_video_id (stores the original video title)
        if (s.source_video_id) {
          allVideoTitles.push(s.source_video_id);
        }
      });

      // Fetch video data for all referenced titles
      const combinedTitles = allVideoTitles;

      // Fetch video data for all referenced titles
      let videoMap = new Map<string, SourceVideoInfo>();
      if (combinedTitles.length > 0) {
        const uniqueTitles = [...new Set(combinedTitles)];
        const { data: videosData } = await supabase
          .from('youtube_video_analyses')
          .select('title, view_count, like_count, comment_count, engagement_rate, thumbnail_url, channel_id')
          .in('title', uniqueTitles)
          .eq('client_id', clientId);

        if (videosData && videosData.length > 0) {
          // Fetch channel names
          const channelIds = [...new Set(videosData.map(v => v.channel_id))];
          const { data: channelsData } = await supabase
            .from('youtube_monitored_channels')
            .select('id, channel_name')
            .in('id', channelIds);
          
          const channelMap = new Map((channelsData || []).map(c => [c.id, c.channel_name]));

          videosData.forEach(v => {
            videoMap.set(v.title, {
              title: v.title,
              channel_name: channelMap.get(v.channel_id) || 'Desconhecido',
              view_count: v.view_count,
              like_count: v.like_count,
              comment_count: v.comment_count,
              engagement_rate: v.engagement_rate,
              thumbnail_url: v.thumbnail_url,
            });
          });
        }
      }

      // Parse JSON fields with proper typing
      const parsedScripts: YouTubeScript[] = (data || []).map((s: any) => {
        const suggestion = s.youtube_content_suggestions;
        const basedOnVideos: string[] = suggestion?.based_on_videos && Array.isArray(suggestion.based_on_videos) 
          ? suggestion.based_on_videos 
          : [];
        
        // Try suggestion-based videos first, then source_video_id
        let sourceVideos = basedOnVideos
          .map(title => videoMap.get(title))
          .filter((v): v is SourceVideoInfo => !!v);
        
        if (sourceVideos.length === 0 && s.source_video_id) {
          const match = videoMap.get(s.source_video_id);
          if (match) {
            sourceVideos = [match];
          }
        }

        return {
          ...s,
          youtube_content_suggestions: undefined,
          status: s.status as YouTubeScript['status'],
          suggested_titles: Array.isArray(s.suggested_titles) 
            ? (s.suggested_titles as unknown as string[]) 
            : [],
          reference_thumbnails: Array.isArray(s.reference_thumbnails) 
            ? (s.reference_thumbnails as unknown as string[]) 
            : [],
          source_videos: sourceVideos.length > 0 ? sourceVideos : undefined,
        };
      });
      
      setScripts(parsedScripts);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const generateScript = async (
    topic: string,
    options?: {
      suggestionId?: string;
      clientContext?: string;
      referenceVideoIds?: string[];
      durationTarget?: number;
      sourceVideoTitle?: string;
    }
  ) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-script', {
        body: {
          topic,
          clientId,
          companyId,
          suggestionId: options?.suggestionId,
          clientContext: options?.clientContext,
          referenceVideoIds: options?.referenceVideoIds,
          durationTarget: options?.durationTarget || 600,
          sourceVideoTitle: options?.sourceVideoTitle,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate script');

      toast({
        title: 'Roteiro gerado!',
        description: 'O roteiro foi criado com sucesso.',
      });

      await fetchScripts();
      return data.script;
    } catch (error: any) {
      console.error('Error generating script:', error);
      toast({
        title: 'Erro ao gerar roteiro',
        description: error.message || 'Não foi possível gerar o roteiro.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const updateScript = async (scriptId: string, updates: Partial<YouTubeScript>) => {
    try {
      const { error } = await supabase
        .from('youtube_scripts')
        .update(updates)
        .eq('id', scriptId);

      if (error) throw error;

      setScripts(prev =>
        prev.map(s => (s.id === scriptId ? { ...s, ...updates } : s))
      );

      toast({
        title: 'Roteiro atualizado',
      });
    } catch (error) {
      console.error('Error updating script:', error);
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive',
      });
    }
  };

  const deleteScript = async (scriptId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_scripts')
        .delete()
        .eq('id', scriptId);

      if (error) throw error;

      setScripts(prev => prev.filter(s => s.id !== scriptId));

      toast({
        title: 'Roteiro excluído',
      });
    } catch (error) {
      console.error('Error deleting script:', error);
      toast({
        title: 'Erro ao excluir',
        variant: 'destructive',
      });
    }
  };

  const fetchScriptMessages = async (scriptId: string): Promise<ScriptMessage[]> => {
    const { data, error } = await supabase
      .from('youtube_script_messages')
      .select('*')
      .eq('script_id', scriptId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).map(m => ({
      ...m,
      role: m.role as ScriptMessage['role'],
    }));
  };

  const sendChatMessage = async (scriptId: string, message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('refine-script-chat', {
        body: { scriptId, message },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send message');

      return data;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
      return null;
    }
  };

  const generateTitles = async (scriptId: string, style = 'mixed') => {
    try {
      const script = scripts.find(s => s.id === scriptId);
      
      const { data, error } = await supabase.functions.invoke('generate-youtube-titles', {
        body: { scriptId, topic: script?.title, style },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate titles');

      await fetchScripts();
      return data.titles;
    } catch (error: any) {
      console.error('Error generating titles:', error);
      toast({
        title: 'Erro ao gerar títulos',
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    scripts,
    loading,
    generating,
    generateScript,
    updateScript,
    deleteScript,
    fetchScriptMessages,
    sendChatMessage,
    generateTitles,
    refetch: fetchScripts,
  };
}
