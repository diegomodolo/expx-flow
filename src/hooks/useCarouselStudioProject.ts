import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  StudioProject,
  WizardConfig,
} from "@/components/carousel-studio/types";

const PAGE_SIZE = 15;

export function useCarouselStudioProjects(
  companyId: string | undefined,
  options?: { page?: number; nameFilter?: string; clientId?: string },
) {
  const page = options?.page ?? 0;
  const nameFilter = options?.nameFilter ?? "";
  const clientId =
    options?.clientId && options.clientId !== "all"
      ? options.clientId
      : undefined;

  return useQuery({
    queryKey: [
      "carousel-studio-projects",
      companyId,
      page,
      nameFilter,
      clientId,
    ],
    queryFn: async () => {
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      let query = supabase
        .from("carousel_studio_projects")
        .select("*, clients(id, name, avatar), carousel_studio_slides(*)", {
          count: "exact",
        })
        .eq("company_id", companyId!)
        .order("updated_at", { ascending: false })
        .range(start, end);

      if (nameFilter) {
        query = query.ilike("title", `%${nameFilter}%`);
      }
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { projects: data as StudioProject[], total: count ?? 0 };
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
    refetchOnWindowFocus: false,
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
          client_id: config.clientId || null,
          slides_count: config.slidesCount,
          image_mode: config.imageMode,
          prompt: config.prompt || null,
          image_style: config.imageStyle || null,
          generate_ai_images: config.generateAIImages,
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

export function useUpdateStudioProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      patch,
    }: {
      projectId: string;
      patch: Partial<StudioProject>;
    }) => {
      const { error } = await supabase
        .from("carousel_studio_projects")
        .update(patch)
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

export function useDeleteStudioProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
    }: {
      projectId: string;
      companyId: string;
    }) => {
      const { error } = await supabase
        .from("carousel_studio_projects")
        .delete()
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-projects", companyId],
      });
    },
  });
}
