import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface YouTubeSuggestion {
  id: string;
  client_id: string;
  company_id: string;
  title: string;
  description: string | null;
  based_on_videos: string[];
  theme_category: string | null;
  estimated_engagement: string | null;
  status: 'pending' | 'selected' | 'scripted' | 'completed' | 'dismissed';
  created_at: string;
  updated_at: string;
}

export function useYouTubeSuggestions(clientId: string, companyId: string) {
  const [suggestions, setSuggestions] = useState<YouTubeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchSuggestions = useCallback(async () => {
    if (!clientId || !companyId) return;

    try {
      const { data, error } = await supabase
        .from('youtube_content_suggestions')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse JSON fields with proper typing
      const parsed: YouTubeSuggestion[] = (data || []).map(s => ({
        ...s,
        status: s.status as YouTubeSuggestion['status'],
        based_on_videos: Array.isArray(s.based_on_videos) 
          ? (s.based_on_videos as unknown as string[]) 
          : [],
      }));
      
      setSuggestions(parsed);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const generateSuggestions = async (clientContext?: string, count = 5) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-suggestions', {
        body: {
          clientId,
          companyId,
          clientContext,
          count,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate suggestions');

      toast({
        title: 'Sugestões geradas!',
        description: `${data.suggestions.length} sugestões criadas baseadas em ${data.analyzedVideosCount} vídeos.`,
      });

      await fetchSuggestions();
      return data;
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast({
        title: 'Erro ao gerar sugestões',
        description: error.message || 'Não foi possível gerar sugestões.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const updateSuggestionStatus = async (suggestionId: string, status: YouTubeSuggestion['status']) => {
    try {
      const { error } = await supabase
        .from('youtube_content_suggestions')
        .update({ status })
        .eq('id', suggestionId);

      if (error) throw error;

      setSuggestions(prev =>
        prev.map(s => (s.id === suggestionId ? { ...s, status } : s))
      );
    } catch (error) {
      console.error('Error updating suggestion:', error);
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive',
      });
    }
  };

  const deleteSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_content_suggestions')
        .delete()
        .eq('id', suggestionId);

      if (error) throw error;

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

      toast({
        title: 'Sugestão excluída',
      });
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      toast({
        title: 'Erro ao excluir',
        variant: 'destructive',
      });
    }
  };

  // Get pending suggestions
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  return {
    suggestions,
    pendingSuggestions,
    loading,
    generating,
    generateSuggestions,
    updateSuggestionStatus,
    deleteSuggestion,
    refetch: fetchSuggestions,
  };
}
