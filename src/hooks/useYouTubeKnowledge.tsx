import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch video metadata from YouTube oEmbed API
async function fetchVideoMetadata(videoId: string): Promise<{
  title: string;
  thumbnailUrl: string;
} | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url
    };
  } catch {
    return null;
  }
}

export function useYouTubeKnowledge(configId: string) {
  const queryClient = useQueryClient();

  // Fetch saved knowledge videos for this config
  const { data: savedVideos = [], isLoading: isLoadingSaved } = useQuery({
    queryKey: ['youtube-knowledge-videos', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_autopost_knowledge_videos')
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeVideo[];
    },
    enabled: !!configId
  });

  // Add video by URL - extracts metadata and auto-transcribes
  const addVideoByUrlMutation = useMutation({
    mutationFn: async (videoUrl: string) => {
      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        throw new Error('URL de vídeo inválida. Use um link do YouTube válido.');
      }

      // Check if video already exists
      const existing = savedVideos.find(v => v.video_id === videoId);
      if (existing) {
        throw new Error('Este vídeo já está na base de conhecimento.');
      }

      // Fetch video metadata
      const metadata = await fetchVideoMetadata(videoId);
      if (!metadata) {
        throw new Error('Não foi possível obter informações do vídeo. Verifique se a URL está correta.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert video into database
      const { data: insertedVideo, error: insertError } = await supabase
        .from('instagram_autopost_knowledge_videos')
        .insert({
          config_id: configId,
          video_id: videoId,
          video_title: metadata.title,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail_url: metadata.thumbnailUrl,
          is_selected: true,
          created_by: user?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-trigger transcription
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe-youtube-video', {
        body: { 
          videoId, 
          knowledgeVideoId: insertedVideo.id, 
          videoTitle: metadata.title 
        }
      });

      if (transcribeError) {
        console.error('Transcription error:', transcribeError);
        // Don't throw - video was added successfully, transcription can be retried
      }

      return insertedVideo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-knowledge-videos', configId] });
      toast.success('Vídeo adicionado e transcrição iniciada');
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

  // Transcribe video (manual retry)
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
    addVideoByUrl: addVideoByUrlMutation.mutateAsync,
    isAddingVideo: addVideoByUrlMutation.isPending,
    toggleVideo: toggleVideoMutation.mutate,
    isTogglingVideo: toggleVideoMutation.isPending,
    removeVideo: removeVideoMutation.mutate,
    isRemovingVideo: removeVideoMutation.isPending,
    transcribeVideo: transcribeVideoMutation.mutate,
    isTranscribing: transcribeVideoMutation.isPending
  };
}
