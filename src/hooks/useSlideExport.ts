import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StudioSlide } from "@/components/carousel-studio/types";

// Todas as famílias usadas em FONT_PAIR_CSS. Injetamos o <link> do Google
// Fonts (idempotente) e aguardamos document.fonts.ready para garantir que
// os pesos usados no preview estejam carregados antes do html2canvas capturar.
const FONT_LINK_ID = "carousel-studio-fonts-link";
const FONT_LINK_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Caveat:wght@400;500;600;700",
    "family=DM+Sans:wght@400;500;700;900",
    "family=Inter:wght@400;500;600;700;800;900",
    "family=Oswald:wght@400;500;600;700",
    "family=Outfit:wght@400;500;600;700;800;900",
    "family=Playfair+Display:wght@400;500;600;700;800;900",
    "family=Raleway:wght@400;500;600;700;800;900",
    "family=Space+Grotesk:wght@400;500;600;700",
    "family=Syne:wght@400;500;600;700;800",
  ].join("&") +
  "&display=swap";

async function preloadFonts() {
  if (typeof document === "undefined") return;
  if (!document.getElementById(FONT_LINK_ID)) {
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = FONT_LINK_HREF;
    document.head.appendChild(link);
  }
  // Aguarda todas as fontes declaradas via CSS ficarem prontas
  await document.fonts.ready;
  // Força o browser a reconhecer que as fontes estão disponíveis
  // carregando explicitamente alguns pesos chave
  await Promise.allSettled(
    [
      "700 48px 'Space Grotesk'",
      "400 48px 'Playfair Display'",
      "700 48px 'Syne'",
      "700 48px 'Oswald'",
      "700 48px 'Raleway'",
      "700 48px 'Outfit'",
      "500 48px 'Caveat'",
      "500 48px 'Inter'",
      "500 48px 'DM Sans'",
    ].map((spec) => document.fonts.load(spec)),
  );
}

const SLIDE_WIDTH = 1080;
const SLIDE_HEIGHT = 1350;

// Renderiza o slide em um container off-screen sem transform ancestral
// (o preview usa transform:scale() que confundiria o html2canvas) e
// aguarda todas as imagens carregarem antes de capturar.
async function renderSlideElementToCanvas(
  html2canvas: any,
  slideEl: HTMLElement,
): Promise<HTMLCanvasElement> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${SLIDE_WIDTH}px`;
  container.style.height = `${SLIDE_HEIGHT}px`;
  container.style.overflow = "hidden";
  container.style.pointerEvents = "none";

  const clone = slideEl.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.width = `${SLIDE_WIDTH}px`;
  clone.style.height = `${SLIDE_HEIGHT}px`;
  container.appendChild(clone);
  document.body.appendChild(container);

  const imgs = Array.from(clone.querySelectorAll("img"));
  await Promise.allSettled(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
          setTimeout(resolve, 8000);
        }),
    ),
  );

  try {
    return await html2canvas(clone, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      backgroundColor: null,
      logging: false,
    });
  } finally {
    document.body.removeChild(container);
  }
}

export function useSlideExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportSlide = useCallback(
    async (
      slideEl: HTMLElement,
      slide: StudioSlide,
      projectId: string,
      onUrlSaved?: (url: string) => void,
    ): Promise<string> => {
      const html2canvas = (await import("html2canvas")).default;
      await preloadFonts();
      await document.fonts.ready;

      const canvas = await renderSlideElementToCanvas(html2canvas, slideEl);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      );

      const path = `carousel-studio/${projectId}/${slide.slide_number}.png`;
      const { error } = await supabase.storage
        .from("visual-creatives")
        .upload(path, blob, { upsert: true, contentType: "image/png" });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("visual-creatives")
        .getPublicUrl(path);

      // Cache-busting: evita servir versão antiga do CDN quando o path é reusado (upsert)
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      onUrlSaved?.(publicUrl);
      return publicUrl;
    },
    [],
  );

  const exportAllAsZip = useCallback(
    async (
      slideEls: Map<string, HTMLElement>,
      slides: StudioSlide[],
      projectTitle: string,
    ) => {
      setIsExporting(true);
      setExportProgress(0);
      const html2canvas = (await import("html2canvas")).default;
      const JSZip = (await import("jszip")).default;
      await preloadFonts();
      await document.fonts.ready;

      const zip = new JSZip();
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const el = slideEls.get(slide.id);
        if (!el) continue;

        const canvas = await renderSlideElementToCanvas(html2canvas, el);
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png"),
        );
        zip.file(`slide-${slide.slide_number}.png`, blob);
        setExportProgress(Math.round(((i + 1) / slides.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle.replace(/\s+/g, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setExportProgress(0);
    },
    [],
  );

  return { exportSlide, exportAllAsZip, isExporting, exportProgress };
}
