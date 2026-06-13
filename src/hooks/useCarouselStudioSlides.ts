import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StudioSlide } from "@/components/carousel-studio/types";

type DebounceEntry = {
  timer: ReturnType<typeof setTimeout>;
  patch: Partial<StudioSlide>;
};

export function useCarouselStudioSlides(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const debounceRefs = useRef<Map<string, DebounceEntry>>(new Map());

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
    refetchOnWindowFocus: false,
  });

  const updateSlide = useCallback(
    (slideId: string, patch: Partial<StudioSlide>) => {
      // Optimistic update no cache
      queryClient.setQueryData<StudioSlide[]>(
        ["carousel-studio-slides", projectId],
        (prev) =>
          prev?.map((s) => (s.id === slideId ? { ...s, ...patch } : s)) ?? [],
      );

      // Debounce persist 2s — acumula patches para evitar race condition
      const existing = debounceRefs.current.get(slideId);
      const accumulatedPatch = existing
        ? { ...existing.patch, ...patch }
        : { ...patch };
      if (existing) clearTimeout(existing.timer);
      const timer = setTimeout(async () => {
        const entry = debounceRefs.current.get(slideId);
        if (!entry) return;
        debounceRefs.current.delete(slideId);
        await supabase
          .from("carousel_studio_slides")
          .update(entry.patch)
          .eq("id", slideId);
      }, 2000);
      debounceRefs.current.set(slideId, { timer, patch: accumulatedPatch });
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
      // Persiste apenas no banco — sem setQueryData para evitar re-renders
      // durante o loop de exportação que corrompem o mapeamento de slideRefs.
      // O cache é sincronizado via invalidateQueries ao fim do loop.
      await supabase
        .from("carousel_studio_slides")
        .update({ exported_image_url: url })
        .eq("id", slideId);
    },
    [],
  );

  /** Cancela os timers pendentes e persiste imediatamente todos os patches acumulados */
  const flushAll = useCallback(async () => {
    const promises: Promise<unknown>[] = [];
    debounceRefs.current.forEach(({ timer, patch }, slideId) => {
      clearTimeout(timer);
      promises.push(
        supabase.from("carousel_studio_slides").update(patch).eq("id", slideId),
      );
    });
    debounceRefs.current.clear();
    await Promise.all(promises);
  }, []);

  // Flush debounces on unmount
  useEffect(() => {
    return () => {
      debounceRefs.current.forEach(({ timer }) => clearTimeout(timer));
    };
  }, []);

  return { ...query, updateSlide, createSlides, updateExportedUrl, flushAll };
}
