import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

export interface ContentPresentation {
  id: string;
  client_id: string;
  company_id: string;
  user_id: string;
  name: string;
  month: number;
  year: number;
  primary_color: string;
  secondary_color: string;
  status: 'draft' | 'ready' | 'published';
  public_token: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    company: string;
    avatar: string | null;
    team_id?: string | null;
    teams?: {
      id: string;
      name: string;
    } | null;
  };
}

export interface PresentationCreative {
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
  script: { scene: string; text: string }[];
  current_status?: 'pending' | 'approved' | 'rejected' | 'resubmitted' | 'scheduled';
  reels_cover_url?: string | null;
  created_at: string;
  updated_at: string;
  creative_media?: CreativeMedia[];
}

export interface CreativeMedia {
  id: string;
  creative_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  order_index: number;
  slide_headline: string | null;
  slide_subheadline: string | null;
  created_at: string;
}

export function usePresentations(clientId?: string) {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const presentationsQuery = useQuery({
    queryKey: ['presentations', activeCompany?.company_id, clientId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      let query = supabase
        .from('content_presentations')
        .select(`
          *,
          clients (
            name,
            company,
            avatar,
            team_id,
            teams (
              id,
              name
            )
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ContentPresentation[];
    },
    enabled: !!activeCompany?.company_id,
  });

  const createPresentation = useMutation({
    mutationFn: async (presentation: Omit<ContentPresentation, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'public_token' | 'clients'>) => {
      const { data, error } = await supabase
        .from('content_presentations')
        .insert(presentation)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      toast({
        title: "Apresentação criada",
        description: "A apresentação foi criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePresentation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentPresentation> & { id: string }) => {
      const { data, error } = await supabase
        .from('content_presentations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
    },
  });

  const deletePresentation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('content_presentations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      toast({
        title: "Apresentação excluída",
        description: "A apresentação foi excluída com sucesso.",
      });
    },
  });

  const publishPresentation = useMutation({
    mutationFn: async (id: string) => {
      const token = crypto.randomUUID();
      const { data, error } = await supabase
        .from('content_presentations')
        .update({ 
          status: 'published',
          public_token: token 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      toast({
        title: "Apresentação publicada",
        description: "O link público foi gerado com sucesso.",
      });
    },
  });

  return {
    presentations: presentationsQuery.data || [],
    isLoading: presentationsQuery.isLoading,
    error: presentationsQuery.error,
    createPresentation,
    updatePresentation,
    deletePresentation,
    publishPresentation,
  };
}

export function usePresentationDetails(presentationId: string) {
  return useQuery({
    queryKey: ['presentation', presentationId],
    queryFn: async () => {
      const { data: presentation, error: presentationError } = await supabase
        .from('content_presentations')
        .select(`
          *,
          clients (
            name,
            company,
            avatar
          )
        `)
        .eq('id', presentationId)
        .single();
      
      if (presentationError) throw presentationError;

      const { data: creatives, error: creativesError } = await supabase
        .from('presentation_creatives')
        .select(`
          *,
          creative_media (*)
        `)
        .eq('presentation_id', presentationId)
        .order('order_index', { ascending: true });
      
      if (creativesError) throw creativesError;

      return {
        ...presentation,
        creatives: creatives || [],
      } as unknown as ContentPresentation & { creatives: PresentationCreative[] };
    },
    enabled: !!presentationId,
  });
}

export function usePublicPresentation(token: string) {
  return useQuery({
    queryKey: ['public-presentation', token],
    queryFn: async () => {
      const { data: presentation, error: presentationError } = await supabase
        .from('content_presentations')
        .select(`
          *,
          clients (
            name,
            company,
            avatar
          )
        `)
        .eq('public_token', token)
        .eq('status', 'published')
        .single();
      
      if (presentationError) throw presentationError;

      const { data: creatives, error: creativesError } = await supabase
        .from('presentation_creatives')
        .select(`
          *,
          creative_media (*)
        `)
        .eq('presentation_id', presentation.id)
        .order('order_index', { ascending: true });
      
      if (creativesError) throw creativesError;

      // Increment view count
      await supabase
        .from('content_presentations')
        .update({ view_count: (presentation.view_count || 0) + 1 })
        .eq('id', presentation.id);

      return {
        ...presentation,
        creatives: creatives || [],
      } as unknown as ContentPresentation & { creatives: PresentationCreative[] };
    },
    enabled: !!token,
  });
}
