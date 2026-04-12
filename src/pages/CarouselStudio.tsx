// src/pages/CarouselStudio.tsx
import React, { useCallback, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useCarouselStudioProject } from "@/hooks/useCarouselStudioProject";
import { useCarouselStudioSlides } from "@/hooks/useCarouselStudioSlides";
import { useSlideExport } from "@/hooks/useSlideExport";
import { SlideCanvas } from "@/components/carousel-studio/SlideCanvas";
import { StudioSidebar } from "@/components/carousel-studio/StudioSidebar";
import { StudioTopBar } from "@/components/carousel-studio/StudioTopBar";
import { StudioBottomBar } from "@/components/carousel-studio/StudioBottomBar";
import { SlideStrip } from "@/components/carousel-studio/SlideStrip";
import { CaptionModal } from "@/components/carousel-studio/CaptionModal";
import { StudioSlide, CarouselStyle } from "@/components/carousel-studio/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function CarouselStudio() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: loadingProject } =
    useCarouselStudioProject(projectId);
  const {
    data: slides,
    isLoading: loadingSlides,
    updateSlide,
    updateExportedUrl,
  } = useCarouselStudioSlides(projectId);

  const [activeIndex, setActiveIndex] = useState(0);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const slideRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { exportSlide, exportAllAsZip, isExporting, exportProgress } =
    useSlideExport();

  const activeSlide = slides?.[activeIndex] ?? null;

  const handleSlideChange = useCallback(
    (patch: Partial<StudioSlide>) => {
      if (!activeSlide) return;
      updateSlide(activeSlide.id, patch);
    },
    [activeSlide, updateSlide],
  );

  const handleGenerateAIImage = useCallback(async () => {
    if (!activeSlide || !project) return;
    setIsGeneratingImage(true);
    try {
      toast.info(
        "Funcionalidade de geração de imagem por slide em desenvolvimento",
      );
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao gerar imagem");
    } finally {
      setIsGeneratingImage(false);
    }
  }, [activeSlide, project]);

  const handleGenerateContent = useCallback(async () => {
    if (!activeSlide || !project) return;
    setIsGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-carousel-caption",
        {
          body: {
            project_id: project.id,
            slides: [
              {
                headline: activeSlide.headline,
                subtitle: activeSlide.subtitle,
              },
            ],
            single_slide: true,
            slide_number: activeSlide.slide_number,
          },
        },
      );
      if (error) throw error;
      if (data?.caption) {
        updateSlide(activeSlide.id, {
          headline: data.headline ?? activeSlide.headline,
          subtitle: data.subtitle ?? activeSlide.subtitle,
        });
        toast.success("Conteúdo regenerado!");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao gerar conteúdo");
    } finally {
      setIsGeneratingContent(false);
    }
  }, [activeSlide, project, updateSlide]);

  const handleDownloadSlide = useCallback(async () => {
    if (!activeSlide || !project) return;
    const el = slideRefs.current.get(activeSlide.id);
    if (!el) return;
    try {
      const url = await exportSlide(el, activeSlide, project.id, (savedUrl) => {
        updateExportedUrl(activeSlide.id, savedUrl);
        if (activeSlide.slide_number === 1) {
          supabase
            .from("carousel_studio_projects")
            .update({ thumbnail_url: savedUrl })
            .eq("id", project.id);
        }
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `slide-${activeSlide.slide_number}.png`;
      a.click();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao exportar slide");
    }
  }, [activeSlide, project, exportSlide, updateExportedUrl]);

  const handleDownloadZip = useCallback(async () => {
    if (!slides || !project) return;
    const elMap = new Map<string, HTMLDivElement>();
    slideRefs.current.forEach((el, id) => elMap.set(id, el));
    await exportAllAsZip(elMap, slides, project.title);
  }, [slides, project, exportAllAsZip]);

  if (loadingProject || loadingSlides) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <Skeleton className="w-64 h-8" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project || !slides || !activeSlide) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center text-muted-foreground">
          Projeto não encontrado.
        </div>
      </DashboardLayout>
    );
  }

  const PREVIEW_HEIGHT = 500;
  const scale = PREVIEW_HEIGHT / 1080;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0a0a0a] overflow-hidden">
        <StudioTopBar
          style={project.style as CarouselStyle}
          onStyleChange={() => {}}
          slideIndex={activeIndex}
          slidesTotal={slides.length}
          onPrev={() => setActiveIndex((i) => Math.max(0, i - 1))}
          onNext={() =>
            setActiveIndex((i) => Math.min(slides.length - 1, i + 1))
          }
          onOpenCaption={() => setCaptionOpen(true)}
        />

        <div className="flex flex-1 overflow-hidden">
          <StudioSidebar
            slide={activeSlide}
            project={project}
            onSlideChange={handleSlideChange}
            onGenerateAIImage={handleGenerateAIImage}
            isGeneratingImage={isGeneratingImage}
            onGenerateContent={handleGenerateContent}
            isGeneratingContent={isGeneratingContent}
            onDownloadSlide={handleDownloadSlide}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex items-center justify-center overflow-auto p-8 gap-6">
              {slides.map((slide, i) => {
                const isActive = i === activeIndex;
                const displayScale = isActive ? scale : scale * 0.6;
                return (
                  <button
                    key={slide.id}
                    onClick={() => setActiveIndex(i)}
                    className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      isActive
                        ? "border-primary shadow-xl shadow-primary/20"
                        : "border-transparent opacity-60 hover:opacity-80"
                    }`}
                    style={{
                      width: 1080 * displayScale,
                      height: 1080 * displayScale,
                    }}
                  >
                    <div
                      style={{
                        width: 1080,
                        height: 1080,
                        transform: `scale(${displayScale})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <SlideCanvas
                        ref={(el) => {
                          if (el) slideRefs.current.set(slide.id, el);
                        }}
                        slide={slide}
                        project={project}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-white/10 overflow-x-auto">
              <SlideStrip
                slides={slides}
                project={project}
                activeIndex={activeIndex}
                onSelect={setActiveIndex}
              />
            </div>
          </div>
        </div>

        <StudioBottomBar
          generationProgress={generationProgress}
          onDownloadZip={handleDownloadZip}
          isExporting={isExporting}
          exportProgress={exportProgress}
        />
      </div>

      <CaptionModal
        open={captionOpen}
        onOpenChange={setCaptionOpen}
        projectId={project.id}
        slides={slides}
      />
    </DashboardLayout>
  );
}
