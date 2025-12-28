import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  publishedAt: string;
}

export interface KnowledgeVideo {
  id: string;
  config_id: string;
  video_id: string;
  video_title: string | null;
  video_url: string;
  thumbnail_url: string | null;
  transcription: string | null;
  published_at: string | null;
  is_selected: boolean;
  created_at: string;
}

export function useYouTubeKnowledge(configId: string, youtubeChannelUrl?: string | null) {
  const queryClient = useQueryClient();

  // Fetch saved knowledge videos for this config
  const { data: savedVideos = [], isLoading: isLoadingSaved } = useQuery({
    queryKey: ['youtube-knowledge-videos', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_autopost_knowledge_videos')
        .select('*')
        .eq('config_id', configId)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeVideo[];
    },
    enabled: !!configId
  });

  // Fetch channel videos mutation
  const fetchChannelVideosMutation = useMutation({
    mutationFn: async (channelUrl: string) => {
      const { data, error } = await supabase.functions.invoke('fetch-youtube-channel-videos', {
        body: { channelUrl }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to fetch videos');
      
      return data.videos as YouTubeVideo[];
    },
    onError: (error: any) => {
      toast.error('Erro ao buscar vídeos', { description: error.message });
    }
  });

  // Add video to knowledge base
  const addVideoMutation = useMutation({
    mutationFn: async (video: YouTubeVideo) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('instagram_autopost_knowledge_videos')
        .insert({
          config_id: configId,
          video_id: video.videoId,
          video_title: video.title,
          video_url: video.videoUrl,
          thumbnail_url: video.thumbnailUrl,
          published_at: video.publishedAt,
          is_selected: true,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-knowledge-videos', configId] });
      toast.success('Vídeo adicionado à base de conhecimento');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este vídeo já está na base de conhecimento');
      } else {
        toast.error('Erro ao adicionar vídeo', { description: error.message });
      }
    }
  });

  // Toggle video selection
  const toggleVideoMutation = useMutation({
    mutationFn: async ({ videoId, isSelected }: { videoId: string; isSelected: boolean }) => {
      const { error } = await supabase
        .from('instagram_autopost_knowledge_videos')
        .update({ is_selected: isSelected })
        .eq('id', videoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-knowledge-videos', configId] });
    }
  });

  // Remove video from knowledge base
  const removeVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from('instagram_autopost_knowledge_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-knowledge-videos', configId] });
      toast.success('Vídeo removido da base de conhecimento');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover vídeo', { description: error.message });
    }
  });

  // Transcribe video
  const transcribeVideoMutation = useMutation({
    mutationFn: async ({ knowledgeVideoId, videoId, videoTitle }: { 
      knowledgeVideoId: string; 
      videoId: string;
      videoTitle: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('transcribe-youtube-video', {
        body: { videoId, knowledgeVideoId, videoTitle }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to transcribe video');
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-knowledge-videos', configId] });
      toast.success('Transcrição concluída');
    },
    onError: (error: any) => {
      toast.error('Erro ao transcrever vídeo', { description: error.message });
    }
  });

  const selectedVideos = savedVideos.filter(v => v.is_selected);
  const selectedCount = selectedVideos.length;

  return {
    savedVideos,
    selectedVideos,
    selectedCount,
    isLoadingSaved,
    fetchChannelVideos: fetchChannelVideosMutation.mutateAsync,
    isFetchingChannel: fetchChannelVideosMutation.isPending,
    channelVideos: fetchChannelVideosMutation.data,
    addVideo: addVideoMutation.mutate,
    isAddingVideo: addVideoMutation.isPending,
    toggleVideo: toggleVideoMutation.mutate,
    isTogglingVideo: toggleVideoMutation.isPending,
    removeVideo: removeVideoMutation.mutate,
    isRemovingVideo: removeVideoMutation.isPending,
    transcribeVideo: transcribeVideoMutation.mutate,
    isTranscribing: transcribeVideoMutation.isPending
  };
}
