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

      const canvas = await html2canvas(slideEl, {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        width: 1080,
        height: 1350,
        logging: false,
      });

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
