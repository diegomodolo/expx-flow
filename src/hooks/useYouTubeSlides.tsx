import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PptxGenJS from "pptxgenjs";
import html2canvas from "html2canvas";
import {
  renderSlideHTML,
  extractColorsFromThumbnail,
  DEFAULT_COLORS,
  type SlideColors,
  type SlideDesign,
} from "@/components/youtube-content-lab/slideTemplates";

export interface YouTubeSlide {
  id: string;
  script_id: string;
  slide_order: number;
  title: string;
  content: string | null;
  visual_suggestion: string | null;
  image_url: string | null;
  status: "draft" | "generating" | "completed" | "error";
  created_at: string;
  updated_at: string;
}

export function useYouTubeSlides(scriptId: string | null, companyId?: string) {
  const [slides, setSlides] = useState<YouTubeSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(
    new Set(),
  );
  const [generatingThumbnailFirst, setGeneratingThumbnailFirst] =
    useState(false);

  const fetchSlides = useCallback(async () => {
    if (!scriptId) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("youtube_script_slides")
        .select("*")
        .eq("script_id", scriptId)
        .order("slide_order", { ascending: true });

      if (error) throw error;

      const typedSlides = (data || []).map((slide) => ({
        ...slide,
        status: slide.status as YouTubeSlide["status"],
      }));

      setSlides(typedSlides);
      return typedSlides;
    } catch (error: unknown) {
      console.error("Error fetching slides:", error);
      toast.error("Erro ao carregar slides");
      return [];
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  const generateStructure = useCallback(
    async (
      scriptContent: string,
      title: string,
      numberOfSlides: number = 10,
    ) => {
      if (!scriptId) return null;

      setGeneratingStructure(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "generate-presentation-slides",
          {
            body: { scriptId, scriptContent, title, numberOfSlides, companyId },
          },
        );

        if (error) throw error;

        if (data?.slides) {
          const typedSlides = data.slides.map((slide: unknown) => ({
            ...slide,
            status: slide.status as YouTubeSlide["status"],
          }));
          setSlides(typedSlides);
          toast.success(`${typedSlides.length} slides gerados com sucesso!`);
          return typedSlides;
        }

        return null;
      } catch (error: unknown) {
        console.error("Error generating structure:", error);
        toast.error(error.message || "Erro ao gerar estrutura de slides");
        return null;
      } finally {
        setGeneratingStructure(false);
      }
    },
    [scriptId],
  );

  const updateSlide = useCallback(
    async (slideId: string, updates: Partial<YouTubeSlide>) => {
      try {
        const { error } = await supabase
          .from("youtube_script_slides")
          .update(updates)
          .eq("id", slideId);

        if (error) throw error;

        setSlides((prev) =>
          prev.map((s) => (s.id === slideId ? { ...s, ...updates } : s)),
        );

        return true;
      } catch (error: unknown) {
        console.error("Error updating slide:", error);
        toast.error("Erro ao atualizar slide");
        return false;
      }
    },
    [],
  );

  const htmlToImageAndUpload = useCallback(
    async (html: string, slide: YouTubeSlide): Promise<string> => {
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "1920px";
      container.style.height = "1080px";
      container.style.overflow = "hidden";
      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        width: 1920,
        height: 1080,
        scale: 1,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      document.body.removeChild(container);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          0.92,
        );
      });

      const fileName = `slides/${slide.script_id}/${slide.id}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("ai-generated-images")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("ai-generated-images")
        .getPublicUrl(fileName);

      return `${urlData.publicUrl}?t=${Date.now()}`;
    },
    [],
  );

  const fetchSlideDesigns = useCallback(
    async (
      companyId: string,
      thumbnailColors: SlideColors,
    ): Promise<SlideDesign[]> => {
      const { data, error } = await supabase.functions.invoke(
        "generate-slide-design",
        {
          body: { scriptId, companyId, thumbnailColors },
        },
      );

      if (error) throw error;
      if (!data?.success || !data?.design) {
        throw new Error(data?.error || "Erro ao gerar design dos slides");
      }

      return data.design as SlideDesign[];
    },
    [scriptId],
  );

  const regenerateSlideImageHTML = useCallback(
    async (
      slideId: string,
      videoTitle: string,
      companyId: string,
      thumbnailUrl?: string | null,
      customColors?: Partial<SlideColors>,
    ) => {
      const slide = slides.find((s) => s.id === slideId);
      if (!slide) return null;

      setGeneratingImages((prev) => new Set(prev).add(slideId));
      setSlides((prev) =>
        prev.map((s) =>
          s.id === slideId ? { ...s, status: "generating" as const } : s,
        ),
      );

      try {
        let colors: SlideColors = DEFAULT_COLORS;
        if (thumbnailUrl) {
          try {
            colors = await extractColorsFromThumbnail(thumbnailUrl);
          } catch {
            // use defaults
          }
        }
        if (customColors) {
          colors = { ...colors, ...customColors };
        }

        // Call LLM to get design instructions
        const designs = await fetchSlideDesigns(companyId, colors);
        const design = designs.find((d) => d.slideId === slideId) || {
          slideId,
          layout:
            slide.slide_order === 1
              ? "cover"
              : slide.slide_order === slides.length
                ? "closing"
                : "split-bullets",
          title: slide.title,
          bullets: slide.content?.split("\n").filter(Boolean) || [],
        };

        const html = renderSlideHTML({
          design,
          slideOrder: slide.slide_order,
          totalSlides: slides.length,
          videoTitle,
          colors,
        });

        const publicUrl = await htmlToImageAndUpload(html, slide);

        await supabase
          .from("youtube_script_slides")
          .update({
            image_url: publicUrl,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", slide.id);

        setSlides((prev) =>
          prev.map((s) =>
            s.id === slideId
              ? { ...s, image_url: publicUrl, status: "completed" as const }
              : s,
          ),
        );

        return publicUrl;
      } catch (error: unknown) {
        console.error("Error regenerating slide image:", error);
        setSlides((prev) =>
          prev.map((s) =>
            s.id === slideId ? { ...s, status: "error" as const } : s,
          ),
        );
        toast.error(`Erro ao gerar imagem: ${(error as Error).message}`);
        return null;
      } finally {
        setGeneratingImages((prev) => {
          const next = new Set(prev);
          next.delete(slideId);
          return next;
        });
      }
    },
    [slides, fetchSlideDesigns, htmlToImageAndUpload],
  );

  const generateSlideImage = useCallback(
    async (
      slideId: string,
      companyId: string,
      thumbnailUrl?: string | null,
    ) => {
      setGeneratingImages((prev) => new Set(prev).add(slideId));

      // Update local state to show generating
      setSlides((prev) =>
        prev.map((s) =>
          s.id === slideId ? { ...s, status: "generating" as const } : s,
        ),
      );

      try {
        const { data, error } = await supabase.functions.invoke(
          "generate-slide-image",
          {
            body: { slideId, companyId, thumbnailUrl },
          },
        );

        if (error) throw error;

        if (data?.imageUrl) {
          setSlides((prev) =>
            prev.map((s) =>
              s.id === slideId
                ? {
                    ...s,
                    image_url: data.imageUrl,
                    status: "completed" as const,
                  }
                : s,
            ),
          );
          return data.imageUrl;
        }

        throw new Error("No image returned");
      } catch (error: unknown) {
        console.error("Error generating slide image:", error);
        setSlides((prev) =>
          prev.map((s) =>
            s.id === slideId ? { ...s, status: "error" as const } : s,
          ),
        );
        toast.error(`Erro ao gerar imagem: ${error.message}`);
        return null;
      } finally {
        setGeneratingImages((prev) => {
          const next = new Set(prev);
          next.delete(slideId);
          return next;
        });
      }
    },
    [],
  );

  const generateAllImages = useCallback(
    async (
      companyId: string,
      thumbnailUrl?: string | null,
      onThumbnailNeeded?: () => Promise<string | null>,
    ) => {
      const slidesToGenerate = slides.filter(
        (s) => !s.image_url || s.status === "draft" || s.status === "error",
      );

      if (slidesToGenerate.length === 0) {
        toast.info("Todos os slides já possuem imagens");
        return;
      }

      let effectiveThumbnailUrl = thumbnailUrl;

      // If no thumbnail, we need to generate one first
      if (!effectiveThumbnailUrl && onThumbnailNeeded) {
        setGeneratingThumbnailFirst(true);
        toast.info(
          "Gerando thumbnail primeiro para definir o estilo visual...",
        );

        try {
          effectiveThumbnailUrl = await onThumbnailNeeded();
          if (!effectiveThumbnailUrl) {
            toast.error("Não foi possível gerar a thumbnail. Tente novamente.");
            setGeneratingThumbnailFirst(false);
            return;
          }
          toast.success("Thumbnail gerada! Agora gerando os slides...");
        } catch (error) {
          console.error("Error generating thumbnail first:", error);
          toast.error("Erro ao gerar thumbnail");
          setGeneratingThumbnailFirst(false);
          return;
        }
        setGeneratingThumbnailFirst(false);
      }

      toast.info(
        `Gerando ${slidesToGenerate.length} imagens com o estilo da thumbnail...`,
      );

      let successCount = 0;
      for (const slide of slidesToGenerate) {
        const result = await generateSlideImage(
          slide.id,
          companyId,
          effectiveThumbnailUrl,
        );
        if (result) successCount++;
        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (successCount === slidesToGenerate.length) {
        toast.success("Todas as imagens foram geradas!");
      } else {
        toast.warning(
          `${successCount}/${slidesToGenerate.length} imagens geradas`,
        );
      }
    },
    [slides, generateSlideImage],
  );

  const generateAllImagesHTML = useCallback(
    async (
      videoTitle: string,
      companyId: string,
      thumbnailUrl?: string | null,
      customColors?: Partial<SlideColors>,
    ) => {
      const slidesToGenerate = slides.filter(
        (s) => !s.image_url || s.status === "draft" || s.status === "error",
      );

      if (slidesToGenerate.length === 0) {
        toast.info("Todos os slides já possuem imagens");
        return;
      }

      // Extract colors from thumbnail, then apply custom overrides
      let colors: SlideColors = DEFAULT_COLORS;
      if (thumbnailUrl) {
        try {
          colors = await extractColorsFromThumbnail(thumbnailUrl);
        } catch {
          console.warn(
            "Could not extract colors from thumbnail, using defaults",
          );
        }
      }
      if (customColors) {
        colors = { ...colors, ...customColors };
      }

      // Mark all as generating
      const allGeneratingIds = new Set(slidesToGenerate.map((s) => s.id));
      setGeneratingImages(allGeneratingIds);
      setSlides((prev) =>
        prev.map((s) =>
          allGeneratingIds.has(s.id)
            ? { ...s, status: "generating" as const }
            : s,
        ),
      );

      // Call LLM to get design instructions for all slides (1 single call)
      toast.info("Analisando conteúdo e definindo design dos slides...");
      let designs: SlideDesign[] = [];
      try {
        designs = await fetchSlideDesigns(companyId, colors);
      } catch (error) {
        console.error("Error fetching slide designs:", error);
        toast.error(
          "Erro ao gerar design dos slides. Usando layout automático.",
        );
      }

      toast.info(
        `Renderizando ${slidesToGenerate.length} imagens da apresentação...`,
      );

      let successCount = 0;
      const totalSlides = slides.length;

      for (const slide of slidesToGenerate) {
        try {
          // Find design for this slide, or build a varied fallback
          const fallbackLayouts = [
            "cover",
            "split-bullets",
            "big-number",
            "icon-grid",
            "split-accent",
            "timeline",
            "feature-list",
            "quote",
            "card-stack",
            "columns",
            "comparison",
            "full-gradient",
            "split-inverted",
            "closing",
          ];
          const fallbackLayout =
            slide.slide_order === 1
              ? "cover"
              : slide.slide_order === totalSlides
                ? "closing"
                : fallbackLayouts[
                    ((slide.slide_order - 1) % (fallbackLayouts.length - 2)) + 1
                  ];
          const design = designs.find((d) => d.slideId === slide.id) || {
            slideId: slide.id,
            layout: fallbackLayout,
            title: slide.title,
            bullets: slide.content?.split("\n").filter(Boolean) || [],
          };

          const html = renderSlideHTML({
            design,
            slideOrder: slide.slide_order,
            totalSlides,
            videoTitle,
            colors,
          });

          const publicUrl = await htmlToImageAndUpload(html, slide);

          // Update DB
          await supabase
            .from("youtube_script_slides")
            .update({
              image_url: publicUrl,
              status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", slide.id);

          // Update local state
          setSlides((prev) =>
            prev.map((s) =>
              s.id === slide.id
                ? { ...s, image_url: publicUrl, status: "completed" as const }
                : s,
            ),
          );

          successCount++;
        } catch (error: unknown) {
          console.error(`Error generating slide image for ${slide.id}:`, error);
          setSlides((prev) =>
            prev.map((s) =>
              s.id === slide.id ? { ...s, status: "error" as const } : s,
            ),
          );
          await supabase
            .from("youtube_script_slides")
            .update({ status: "error" })
            .eq("id", slide.id);
        }

        // Remove from generating set
        setGeneratingImages((prev) => {
          const next = new Set(prev);
          next.delete(slide.id);
          return next;
        });
      }

      if (successCount === slidesToGenerate.length) {
        toast.success("Todas as imagens foram geradas!");
      } else if (successCount > 0) {
        toast.warning(
          `${successCount}/${slidesToGenerate.length} imagens geradas`,
        );
      } else {
        toast.error("Erro ao gerar imagens dos slides");
      }
    },
    [slides, fetchSlideDesigns, htmlToImageAndUpload],
  );

  const deleteSlide = useCallback(async (slideId: string) => {
    try {
      const { error } = await supabase
        .from("youtube_script_slides")
        .delete()
        .eq("id", slideId);

      if (error) throw error;

      setSlides((prev) => prev.filter((s) => s.id !== slideId));
      toast.success("Slide removido");
      return true;
    } catch (error: unknown) {
      console.error("Error deleting slide:", error);
      toast.error("Erro ao remover slide");
      return false;
    }
  }, []);

  const reorderSlides = useCallback(
    async (slideId: string, newOrder: number) => {
      try {
        const { error } = await supabase
          .from("youtube_script_slides")
          .update({ slide_order: newOrder })
          .eq("id", slideId);

        if (error) throw error;

        setSlides((prev) => {
          const updated = prev.map((s) =>
            s.id === slideId ? { ...s, slide_order: newOrder } : s,
          );
          return updated.sort((a, b) => a.slide_order - b.slide_order);
        });

        return true;
      } catch (error: unknown) {
        console.error("Error reordering slides:", error);
        return false;
      }
    },
    [],
  );

  const [exportingToPpt, setExportingToPpt] = useState(false);

  const exportToPpt = useCallback(
    async (scriptTitle: string) => {
      if (!scriptId || slides.length === 0) return;

      const slidesWithImgs = slides.filter((s) => s.image_url);
      if (slidesWithImgs.length === 0) {
        toast.error("Nenhum slide com imagem para exportar");
        return;
      }

      setExportingToPpt(true);
      toast.info("Gerando arquivo PPT...");

      try {
        const pptx = new PptxGenJS();
        pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches (16:9)
        pptx.title = scriptTitle;

        for (const slide of slidesWithImgs) {
          const pptSlide = pptx.addSlide();

          // Convert image URL to base64 for reliable embedding
          try {
            const response = await fetch(slide.image_url!);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            pptSlide.addImage({
              data: base64,
              x: 0,
              y: 0,
              w: "100%",
              h: "100%",
            });
          } catch (imgError) {
            console.error("Error loading slide image:", imgError);
            // Fallback: add title text if image fails
            pptSlide.addText(slide.title, {
              x: 0.5,
              y: 3,
              w: 12,
              h: 1.5,
              fontSize: 32,
              align: "center",
              color: "363636",
            });
          }
        }

        const fileName = `${scriptTitle
          .replace(/[^a-zA-Z0-9À-ÿ\s]/g, "")
          .trim()
          .substring(0, 50)}.pptx`;
        await pptx.writeFile({ fileName });
        toast.success(`PPT baixado com ${slidesWithImgs.length} slides!`);
      } catch (error: unknown) {
        console.error("Error exporting to PPT:", error);
        toast.error(error.message || "Erro ao gerar arquivo PPT");
      } finally {
        setExportingToPpt(false);
      }
    },
    [scriptId, slides],
  );

  const hasSlides = slides.length > 0;
  const allImagesGenerated = slides.every(
    (s) => s.image_url && s.status === "completed",
  );
  const pendingImages = slides.filter(
    (s) => !s.image_url || s.status === "draft" || s.status === "error",
  ).length;
  const slidesWithImages = slides.filter((s) => s.image_url).length;

  return {
    slides,
    loading,
    generatingStructure,
    generatingImages,
    generatingThumbnailFirst,
    exportingToPpt,
    hasSlides,
    allImagesGenerated,
    pendingImages,
    slidesWithImages,
    fetchSlides,
    generateStructure,
    updateSlide,
    generateSlideImage,
    regenerateSlideImageHTML,
    generateAllImages,
    generateAllImagesHTML,
    deleteSlide,
    reorderSlides,
    exportToPpt,
  };
}
