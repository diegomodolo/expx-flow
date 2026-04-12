import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudioSlide } from "@/components/carousel-studio/types";

export function useCarouselStudioSlides(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const query = useQuery({
    queryKey: ["carousel-studio-slides", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_studio_slides")
        .select("*")
        .eq("project_id", projectId!)
        .order("slide_number");
      if (error) throw error;
      return data as StudioSlide[];
    },
    enabled: !!projectId,
  });

  const updateSlide = useCallback(
    (slideId: string, patch: Partial<StudioSlide>) => {
      // Optimistic update no cache
      queryClient.setQueryData<StudioSlide[]>(
        ["carousel-studio-slides", projectId],
        (prev) =>
          prev?.map((s) => (s.id === slideId ? { ...s, ...patch } : s)) ?? [],
      );

      // Debounce persist 2s
      const existing = debounceRefs.current.get(slideId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(async () => {
        await supabase
          .from("carousel_studio_slides")
          .update(patch)
          .eq("id", slideId);
        debounceRefs.current.delete(slideId);
      }, 2000);
      debounceRefs.current.set(slideId, timer);
    },
    [projectId, queryClient],
  );

  const createSlides = useCallback(
    async (
      pid: string,
      slides: Array<{
        slide_number: number;
        headline?: string;
        subtitle?: string;
        visual_description?: string;
      }>,
    ) => {
      const rows = slides.map((s) => ({
        project_id: pid,
        slide_number: s.slide_number,
        headline: s.headline ?? null,
        subtitle: s.subtitle ?? null,
        visual_description: s.visual_description ?? null,
      }));
      const { data, error } = await supabase
        .from("carousel_studio_slides")
        .insert(rows)
        .select("*");
      if (error) throw error;
      queryClient.setQueryData(["carousel-studio-slides", pid], data);
      return data as StudioSlide[];
    },
    [queryClient],
  );

  const updateExportedUrl = useCallback(
    async (slideId: string, url: string) => {
      await supabase
        .from("carousel_studio_slides")
        .update({ exported_image_url: url })
        .eq("id", slideId);
      queryClient.setQueryData<StudioSlide[]>(
        ["carousel-studio-slides", projectId],
        (prev) =>
          prev?.map((s) =>
            s.id === slideId ? { ...s, exported_image_url: url } : s,
          ) ?? [],
      );
    },
    [projectId, queryClient],
  );

  // Flush debounces on unmount
  useEffect(() => {
    return () => {
      debounceRefs.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return { ...query, updateSlide, createSlides, updateExportedUrl };
}
