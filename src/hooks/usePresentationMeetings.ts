import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface PresentationMeeting {
  id: string;
  presentation_id: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  current_slide: number;
  started_at: string | null;
  ended_at: string | null;
  recording_url: string | null;
  notes: string | null;
  approved_count: number;
  rejected_count: number;
  created_at: string;
  participants?: MeetingParticipant[];
  approvals?: CreativeApproval[];
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface CreativeApproval {
  id: string;
  meeting_id: string;
  creative_id: string;
  status: string;
  rejection_reason: string | null;
  approved_by: string | null;
  resubmitted_at: string | null;
  created_at: string;
}

export interface ExtendedPresentationCreative {
  id: string;
  presentation_id: string;
  creative_type: 'post_unico' | 'carrossel' | 'reels' | 'stories';
  order_index: number;
  scheduled_date: string | null;
  scheduled_time: string | null;
  objective: string | null;
  headline: string | null;
  subheadline: string | null;
  caption: string | null;
  hashtags: string | null;
  current_status: 'pending' | 'approved' | 'rejected' | 'resubmitted' | 'scheduled';
  scheduled_post_id: string | null;
  manager_approved_at: string | null;
  manager_approved_by: string | null;
  created_at: string;
  updated_at: string;
  creative_media?: {
    id: string;
    media_url: string;
    media_type: 'image' | 'video';
    order_index: number;
  }[];
}

export function usePresentationMeetings(presentationId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch meetings for this presentation
  const meetingsQuery = useQuery({
    queryKey: ['presentation-meetings', presentationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('presentation_meetings')
        .select(`
          *,
          participants:presentation_meeting_participants(*),
          approvals:presentation_creative_approvals(*)
        `)
        .eq('presentation_id', presentationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PresentationMeeting[];
    },
    enabled: !!presentationId,
  });

  // Fetch creatives with their current status
  const creativesQuery = useQuery({
    queryKey: ['presentation-creatives-extended', presentationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('presentation_creatives')
        .select(`
          *,
          creative_media (*)
        `)
        .eq('presentation_id', presentationId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ExtendedPresentationCreative[];
    },
    enabled: !!presentationId,
  });

  // Update creative status
  const updateCreativeStatus = useMutation({
    mutationFn: async ({ 
      creativeId, 
      status, 
      managerApproved = false 
    }: { 
      creativeId: string; 
      status: ExtendedPresentationCreative['current_status'];
      managerApproved?: boolean;
    }) => {
      const updates: Record<string, any> = { current_status: status };
      
      if (managerApproved) {
        const { data: user } = await supabase.auth.getUser();
        updates.manager_approved_at = new Date().toISOString();
        updates.manager_approved_by = user.user?.id;
      }

      const { error } = await supabase
        .from('presentation_creatives')
        .update(updates)
        .eq('id', creativeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation-creatives-extended', presentationId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manager approve creative directly
  const managerApproveCreative = useMutation({
    mutationFn: async (creativeId: string) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('presentation_creatives')
        .update({
          current_status: 'approved',
          manager_approved_at: new Date().toISOString(),
          manager_approved_by: user.user?.id,
        })
        .eq('id', creativeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation-creatives-extended', presentationId] });
      toast({
        title: "Criativo aprovado",
        description: "O criativo foi aprovado pelo gestor.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark creative as resubmitted
  const markAsResubmitted = useMutation({
    mutationFn: async (creativeId: string) => {
      const { error } = await supabase
        .from('presentation_creatives')
        .update({
          current_status: 'resubmitted',
        })
        .eq('id', creativeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation-creatives-extended', presentationId] });
      toast({
        title: "Criativo reenviado",
        description: "O criativo foi marcado como corrigido e aguarda aprovação.",
      });
    },
  });

  // Update meeting details (notes, recording, etc)
  const updateMeeting = useMutation({
    mutationFn: async ({ meetingId, updates }: { 
      meetingId: string; 
      updates: Partial<PresentationMeeting>;
    }) => {
      const { error } = await supabase
        .from('presentation_meetings')
        .update(updates)
        .eq('id', meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation-meetings', presentationId] });
      toast({
        title: "Reunião atualizada",
        description: "As informações da reunião foram salvas.",
      });
    },
  });

  // Upload meeting recording
  const uploadRecording = async (file: File, meetingId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${meetingId}-${Date.now()}.${fileExt}`;
    const filePath = `meeting-recordings/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('presentation-media')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('presentation-media')
      .getPublicUrl(filePath);

    // Update meeting with recording URL
    await updateMeeting.mutateAsync({ 
      meetingId, 
      updates: { recording_url: publicUrl } 
    });

    return publicUrl;
  };

  return {
    meetings: meetingsQuery.data || [],
    creatives: creativesQuery.data || [],
    isLoadingMeetings: meetingsQuery.isLoading,
    isLoadingCreatives: creativesQuery.isLoading,
    updateCreativeStatus,
    managerApproveCreative,
    markAsResubmitted,
    updateMeeting,
    uploadRecording,
    refetch: () => {
      meetingsQuery.refetch();
      creativesQuery.refetch();
    },
  };
}

// Hook to send creatives to scheduling
export function useSendToSchedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendToSchedule = useMutation({
    mutationFn: async ({ 
      creatives, 
      clientId,
      companyId,
      facebookPageId,
      instagramAccountId,
    }: { 
      creatives: ExtendedPresentationCreative[];
      clientId: string;
      companyId: string;
      facebookPageId?: string | null;
      instagramAccountId?: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const results: { creativeId: string; postId: string }[] = [];

      for (const creative of creatives) {
        if (creative.current_status !== 'approved' || creative.scheduled_post_id) {
          continue;
        }

        // Map creative type to scheduled post content type
        const contentTypeMap: Record<string, 'image' | 'video' | 'carousel' | 'reel'> = {
          'post_unico': 'image',
          'carrossel': 'carousel',
          'reels': 'reel',
          'stories': 'image',
        };

        // Get media URLs
        const mediaUrls = (creative.creative_media || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(m => m.media_url);

        if (mediaUrls.length === 0) continue;

        // Build scheduled datetime - preserve the exact time as entered (Brazil timezone)
        let scheduledAt = new Date().toISOString();
        if (creative.scheduled_date) {
          const date = creative.scheduled_date;
          let time = creative.scheduled_time || '10:00:00';
          // Ensure time has seconds (HH:MM:SS format)
          if (time.split(':').length === 2) {
            time = `${time}:00`;
          }
          // Add Brazil timezone offset to preserve the exact time entered
          // This ensures 04:00 stays as 04:00 in Brazil time
          scheduledAt = `${date}T${time}-03:00`;
        }

        // Build caption with hashtags
        let caption = creative.caption || '';
        if (creative.hashtags) {
          caption += `\n\n${creative.hashtags}`;
        }

        // Determine platforms
        const platforms: string[] = [];
        if (instagramAccountId) platforms.push('instagram');
        if (facebookPageId) platforms.push('facebook');

        // Create scheduled post
        const { data: postData, error: postError } = await supabase
          .from('scheduled_posts')
          .insert({
            company_id: companyId,
            created_by: user.user.id,
            client_id: clientId,
            content_type: contentTypeMap[creative.creative_type] || 'image',
            caption,
            media_urls: mediaUrls,
            thumbnail_url: mediaUrls[0],
            platforms,
            facebook_page_id: facebookPageId || null,
            instagram_account_id: instagramAccountId || null,
            scheduled_at: scheduledAt,
            timezone: 'America/Sao_Paulo',
            status: 'scheduled',
            metadata: {
              from_presentation_creative: creative.id,
              presentation_id: creative.presentation_id,
            },
          })
          .select()
          .single();

        if (postError) throw postError;

        // Update creative with scheduled_post_id and status
        const { error: updateError } = await supabase
          .from('presentation_creatives')
          .update({
            scheduled_post_id: postData.id,
            current_status: 'scheduled',
          })
          .eq('id', creative.id);

        if (updateError) throw updateError;

        results.push({ creativeId: creative.id, postId: postData.id });
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['presentation-creatives-extended'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast({
        title: "Enviado para agendamento",
        description: `${results.length} criativo(s) enviado(s) para o calendário de agendamento.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { sendToSchedule };
}
