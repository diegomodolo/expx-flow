import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  StudioProject,
  WizardConfig,
} from "@/components/carousel-studio/types";

export function useCarouselStudioProjects(companyId: string | undefined) {
  return useQuery({
    queryKey: ["carousel-studio-projects", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_studio_projects")
        .select("*")
        .eq("company_id", companyId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as StudioProject[];
    },
    enabled: !!companyId,
  });
}

export function useCarouselStudioProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["carousel-studio-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_studio_projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data as StudioProject;
    },
    enabled: !!projectId,
  });
}

export function useCreateStudioProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      userId,
      config,
    }: {
      companyId: string;
      userId: string;
      config: WizardConfig;
    }) => {
      const { data, error } = await supabase
        .from("carousel_studio_projects")
        .insert({
          company_id: companyId,
          user_id: userId,
          title: config.prompt.slice(0, 60) || "Carrossel sem título",
          style: config.style,
          font_pair: config.fontPair,
          accent_color: config.accentColor,
          instagram_handle: config.instagramHandle || null,
          slides_count: config.slidesCount,
          image_mode: config.imageMode,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-projects", companyId],
      });
    },
  });
}

export function useUpdateStudioProjectClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      clientId,
    }: {
      projectId: string;
      clientId: string | null;
    }) => {
      const { error } = await supabase
        .from("carousel_studio_projects")
        .update({ client_id: clientId })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-project", projectId],
      });
    },
  });
}

export function useUpdateStudioProjectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      status,
      thumbnailUrl,
    }: {
      projectId: string;
      status: string;
      thumbnailUrl?: string;
    }) => {
      const update: Record<string, string> = { status };
      if (thumbnailUrl) update.thumbnail_url = thumbnailUrl;
      const { error } = await supabase
        .from("carousel_studio_projects")
        .update(update)
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-project", projectId],
      });
    },
  });
}
