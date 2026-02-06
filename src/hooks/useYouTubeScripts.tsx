import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse JSON fields with proper typing
      const parsedScripts: YouTubeScript[] = (data || []).map(s => ({
        ...s,
        status: s.status as YouTubeScript['status'],
        suggested_titles: Array.isArray(s.suggested_titles) 
          ? (s.suggested_titles as unknown as string[]) 
          : [],
        reference_thumbnails: Array.isArray(s.reference_thumbnails) 
          ? (s.reference_thumbnails as unknown as string[]) 
          : [],
      }));
      
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
