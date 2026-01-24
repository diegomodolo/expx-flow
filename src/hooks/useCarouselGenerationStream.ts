import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type CarouselType = "tutorial" | "comparison" | "behind_scenes" | "curated_list";

export interface PreGeneratedSlide {
  slideNumber: number;
  type: string;
  headline: string;
  bodyText: string;
  visualDescription: string;
  suggestedElement?: string;
}

export interface VisualVariations {
  alterColorPalette: boolean;
  alterCharacters: boolean;
  alterBackground: boolean;
  replaceMainElement: boolean;
  alterLayout: boolean;
}

type StreamEvent =
  | {
      type: "started";
      carousel_id: string;
      carousel_type: CarouselType;
      slides_total: number;
      slides: Array<{ slide_number: number; headline: string }>;
    }
  | { type: "slide_start"; index: number; total: number }
  | { type: "slide_done"; index: number; total: number; image_url: string }
  | { type: "slide_error"; index: number; total: number; message: string }
  | { type: "completed"; carousel_id: string; saved: boolean }
  | { type: "failed"; message: string };

function getStreamUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/daily-carousel-generator-stream`;
}

export function useCarouselGenerationStream() {
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
  }, []);

  const start = useCallback(
    async ({
      clientId,
      companyId,
      userId,
      carouselType,
      referenceCarouselImages,
      preGeneratedSlides,
      visualVariations,
      onEvent,
    }: {
      clientId: string;
      companyId: string;
      userId: string;
      carouselType?: CarouselType;
      referenceCarouselImages?: string[];
      preGeneratedSlides?: PreGeneratedSlide[];
      visualVariations?: VisualVariations;
      onEvent: (ev: StreamEvent) => void;
    }) => {
      setIsGenerating(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const resp = await fetch(getStreamUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            client_id: clientId,
            company_id: companyId,
            user_id: userId,
            carousel_type: carouselType,
            reference_carousel_images: referenceCarouselImages,
            pre_generated_slides: preGeneratedSlides,
            visual_variations: visualVariations,
          }),
          signal: controller.signal,
        });

        if (resp.status === 429) {
          toast.error("Limite de requisições atingido. Tente novamente em alguns minutos.");
          return;
        }
        if (resp.status === 402) {
          toast.error("Créditos de IA esgotados. Adicione mais créditos.");
          return;
        }

        if (!resp.ok || !resp.body) {
          const t = await resp.text().catch(() => "");
          throw new Error(t || "Falha ao iniciar geração");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const { value, done: rdDone } = await reader.read();
          if (rdDone) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":")) continue;
            if (!line.startsWith("data: ")) continue;

            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              done = true;
              break;
            }

            try {
              const ev = JSON.parse(payload) as StreamEvent;
              onEvent(ev);
            } catch {
              // JSON split across chunks; re-buffer
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    []
  );

  return useMemo(
    () => ({
      isGenerating,
      start,
      cancel,
    }),
    [isGenerating, start, cancel]
  );
}
