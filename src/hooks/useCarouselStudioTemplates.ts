// src/hooks/useCarouselStudioTemplates.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CarouselTemplate,
  TemplateSlideConfig,
} from "@/components/carousel-studio/types";

/** Lista os templates de um cliente específico */
export function useClientTemplates(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ["carousel-studio-templates", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_studio_templates")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CarouselTemplate[];
    },
    enabled: !!clientId,
  });
}

/** Lista todos os templates da empresa */
export function useCompanyTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: ["carousel-studio-templates-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_studio_templates")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CarouselTemplate[];
    },
    enabled: !!companyId,
  });
}

export interface CreateTemplatePayload {
  companyId: string;
  clientId: string;
  name: string;
  style: string;
  fontPair: string;
  accentColor: string;
  instagramHandle: string | null;
  imageMode: string;
  slidesCount: number;
  slidesConfig: TemplateSlideConfig[];
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const { data, error } = await supabase
        .from("carousel_studio_templates")
        .insert({
          company_id: payload.companyId,
          client_id: payload.clientId,
          name: payload.name,
          style: payload.style,
          font_pair: payload.fontPair,
          accent_color: payload.accentColor,
          instagram_handle: payload.instagramHandle,
          image_mode: payload.imageMode,
          slides_count: payload.slidesCount,
          slides_config: payload.slidesConfig,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-templates", payload.clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-templates-company", payload.companyId],
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      clientId,
      companyId,
    }: {
      templateId: string;
      clientId: string;
      companyId: string;
    }) => {
      const { error } = await supabase
        .from("carousel_studio_templates")
        .delete()
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: (_, { clientId, companyId }) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-templates", clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-templates-company", companyId],
      });
    },
  });
}
