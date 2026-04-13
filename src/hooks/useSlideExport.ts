import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StudioSlide } from "@/components/carousel-studio/types";

async function preloadFonts() {
  const fontFaces = [
    new FontFace(
      "Space Grotesk",
      "url(https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gx9dA.woff2)",
    ),
    new FontFace(
      "Playfair Display",
      "url(https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff2)",
    ),
    new FontFace(
      "Inter",
      "url(https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2)",
    ),
  ];
  await Promise.allSettled(
    fontFaces.map(async (ff) => {
      await ff.load();
      document.fonts.add(ff);
    }),
  );
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

      // Clona o slide em container off-screen sem transform escalado —
      // isso garante que o html2canvas capture o tamanho 1080×1350 real
      // e não a versão escalada usada no preview.
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-99999px";
      container.style.top = "0";
      container.style.width = "1080px";
      container.style.height = "1350px";
      container.style.overflow = "hidden";
      container.style.pointerEvents = "none";

      const clone = slideEl.cloneNode(true) as HTMLElement;
      clone.style.transform = "none";
      clone.style.width = "1080px";
      clone.style.height = "1350px";
      container.appendChild(clone);
      document.body.appendChild(container);

      // Aguarda as imagens do clone carregarem completamente
      const imgs = Array.from(clone.querySelectorAll("img"));
      await Promise.allSettled(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalHeight > 0) return resolve();
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
              // timeout de segurança
              setTimeout(resolve, 8000);
            }),
        ),
      );

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(clone, {
          scale: 1,
          useCORS: true,
          allowTaint: true,
          width: 1080,
          height: 1350,
          backgroundColor: null,
          logging: false,
        });
      } finally {
        document.body.removeChild(container);
      }

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

      const publicUrl = urlData.publicUrl;
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

        const canvas = await html2canvas(el, {
          scale: 1,
          useCORS: true,
          allowTaint: false,
          width: 1080,
          height: 1080,
          logging: false,
        });
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
