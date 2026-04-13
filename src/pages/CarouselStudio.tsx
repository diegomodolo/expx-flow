// src/pages/CarouselStudio.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  useCarouselStudioProject,
  useUpdateStudioProjectClient,
  useUpdateStudioProject,
} from "@/hooks/useCarouselStudioProject";
import { ClientDefaults } from "@/components/carousel-studio/sections/ClientSection";
import { useCarouselStudioSlides } from "@/hooks/useCarouselStudioSlides";
import { useSlideExport } from "@/hooks/useSlideExport";
import { SlideCanvas } from "@/components/carousel-studio/SlideCanvas";
import { StudioSidebar } from "@/components/carousel-studio/StudioSidebar";
import { StudioTopBar } from "@/components/carousel-studio/StudioTopBar";
import { StudioBottomBar } from "@/components/carousel-studio/StudioBottomBar";
import { CaptionModal } from "@/components/carousel-studio/CaptionModal";
import { RegenerateModal } from "@/components/carousel-studio/RegenerateModal";
import {
  StudioSlide,
  StudioProject,
  CarouselStyle,
  WizardConfig,
} from "@/components/carousel-studio/types";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function CarouselStudio() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();

  const { data: project, isLoading: loadingProject } =
    useCarouselStudioProject(projectId);
  const {
    data: slides,
    isLoading: loadingSlides,
    updateSlide,
    updateExportedUrl,
    flushAll,
  } = useCarouselStudioSlides(projectId);

  const [activeIndex, setActiveIndex] = useState(0);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [userZoom, setUserZoom] = useState(620 / 1350);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    statusMessage?: string;
  } | null>(null);
  const autoGenerateStarted = useRef(false);

  const slideRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { exportSlide, exportAllAsZip, isExporting, exportProgress } =
    useSlideExport();
  const queryClient = useQueryClient();
  const updateClient = useUpdateStudioProjectClient();
  const updateProject = useUpdateStudioProject();

  // Resolve foto do cliente para usar como fallback no badge
  const { clients } = useClients();
  const clientBadgeUrl = React.useMemo(() => {
    if (!project?.client_id) return null;
    const client = clients.find((c) => c.id === project.client_id);
    return (
      client?.instagram_account?.profile_picture_url ?? client?.avatar ?? null
    );
  }, [project?.client_id, clients]);

  React.useEffect(() => {
    if (!slides) return;
    const currentIds = new Set(slides.map((s) => s.id));
    slideRefs.current.forEach((_, id) => {
      if (!currentIds.has(id)) slideRefs.current.delete(id);
    });
  }, [slides]);

  // Auto-generation: triggered when navigating from wizard with autoGenerate flag
  // Depends only on project/slides being loaded (not on slides content changing)
  useEffect(() => {
    const navState = location.state as {
      autoGenerate?: boolean;
      config?: WizardConfig;
    } | null;
    if (!navState?.autoGenerate || !navState?.config) return;
    if (!project || !slides || slides.length === 0) return;
    if (autoGenerateStarted.current) return;
    autoGenerateStarted.current = true;

    // Capture stable references — must not close over changing `slides` state
    const projectId = project.id;
    const companyId = project.company_id;
    const clientId = project.client_id;
    const initialSlides = slides; // snapshot at generation start
    const config = navState.config;

    const LEFT_POSITIONS: StudioSlide["text_position"][] = [
      "top_left",
      "mid_left",
      "bottom_left",
    ];

    const generateAll = async () => {
      const total = initialSlides.length;

      // Phase 1: generate text for all slides at once
      setGenerationProgress({
        current: 0,
        total,
        statusMessage: "Gerando textos dos slides...",
      });

      // textSlides: map id → { headline, subtitle } after text generation
      const textSlides: Record<
        string,
        { headline: string | null; subtitle: string | null }
      > = {};

      try {
        const { data: textData, error: textError } =
          await supabase.functions.invoke("regenerate-carousel-slides", {
            body: {
              project_id: projectId,
              prompt: config.prompt,
              slides_count: total,
              company_id: companyId,
            },
          });

        if (textError) throw textError;
        if (textData?.success && Array.isArray(textData.slides)) {
          for (
            let idx = 0;
            idx <
            (
              textData.slides as Array<{
                id: string;
                headline: string | null;
                subtitle: string | null;
              }>
            ).length;
            idx++
          ) {
            const s = (
              textData.slides as Array<{
                id: string;
                headline: string | null;
                subtitle: string | null;
              }>
            )[idx];
            textSlides[s.id] = {
              headline: s.headline,
              subtitle: s.subtitle,
            };
            const textPosition: StudioSlide["text_position"] =
              idx === 0
                ? "mid_left"
                : LEFT_POSITIONS[idx % LEFT_POSITIONS.length];

            const patch: Partial<StudioSlide> = {
              text_alignment: "left",
              text_position: textPosition,
            };

            // Margem vertical baseada na posição
            if (textPosition.startsWith("bottom_")) patch.text_padding_y = 150;
            else if (textPosition.startsWith("top_"))
              patch.text_padding_y = 132;

            // Slide 1 (capa): fonte maior
            if (idx === 0) patch.font_size_title = 80;
            if (s.headline != null) patch.headline = s.headline;
            if (s.subtitle != null) patch.subtitle = s.subtitle;
            updateSlide(s.id, patch);
          }
        }
      } catch (err) {
        console.error("[auto-generate] text generation failed:", err);
      }

      // Phase 2: generate images slide by slide (only if needed)
      if (config.imageMode !== "none" && config.generateAIImages) {
        for (let i = 0; i < initialSlides.length; i++) {
          const slide = initialSlides[i];
          setGenerationProgress({
            current: i + 1,
            total,
            statusMessage: `Gerando imagem slide ${i + 1} de ${total}...`,
          });

          // Use texts from phase 1 result directly (not from React state)
          const texts = textSlides[slide.id];
          const prompt = [
            texts?.headline ?? slide.headline,
            texts?.subtitle ?? slide.subtitle,
            slide.visual_description,
            config.prompt,
          ]
            .filter(Boolean)
            .join(" — ");

          if (!prompt.trim()) continue;

          try {
            const { data: imgData, error: imgError } =
              await supabase.functions.invoke("generate-image-ai", {
                body: {
                  prompt,
                  company_id: companyId,
                  client_id: clientId,
                  style: config.imageStyle || "cinematic photography",
                  background_only: true,
                  aspect_ratio: "4:5",
                },
              });

            if (!imgError && imgData?.success && imgData?.image_url) {
              updateSlide(slide.id, { bg_image_url: imgData.image_url });
            } else {
              console.error(
                `[auto-generate] image slide ${i + 1} failed:`,
                imgError ?? imgData?.error,
              );
            }
          } catch (err) {
            console.error(
              `[auto-generate] image generation failed for slide ${i + 1}:`,
              err,
            );
          }
        }
      }

      setGenerationProgress(null);
      toast.success("Carrossel gerado com sucesso!");
    };

    generateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!project, !!slides?.length]);

  const activeSlide = slides?.[activeIndex] ?? null;

  const handleSlideChange = useCallback(
    (patch: Partial<StudioSlide>) => {
      if (!activeSlide) return;
      updateSlide(activeSlide.id, patch);
    },
    [activeSlide, updateSlide],
  );

  const handleProjectChange = useCallback(
    (patch: Partial<StudioProject>) => {
      if (!project) return;
      // Optimistic update no cache
      queryClient.setQueryData(
        ["carousel-studio-project", projectId],
        (prev: StudioProject | undefined) =>
          prev ? { ...prev, ...patch } : prev,
      );
      // Debounced persist via mutation
      updateProject.mutate({ projectId: project.id, patch });
    },
    [project, projectId, queryClient, updateProject],
  );

  const handleSlidesBatchChange = useCallback(
    (ids: string[], patch: Partial<StudioSlide>) => {
      ids.forEach((id) => updateSlide(id, patch));
    },
    [updateSlide],
  );

  const handleGenerateAIImage = useCallback(
    async (aspectRatio?: string, extraPrompt?: string) => {
      if (!activeSlide || !project) return;
      setIsGeneratingImage(true);
      try {
        const basePrompt = [
          activeSlide.headline,
          activeSlide.subtitle,
          activeSlide.visual_description,
          project.prompt,
        ]
          .filter(Boolean)
          .join(" — ");

        const prompt = [basePrompt, extraPrompt].filter(Boolean).join(". ");

        if (!prompt.trim()) {
          toast.error(
            "Adicione um texto ao slide antes de gerar imagem com IA",
          );
          return;
        }

        toast.info("Gerando imagem com IA...");
        const { data, error } = await supabase.functions.invoke(
          "generate-image-ai",
          {
            body: {
              prompt,
              company_id: project.company_id,
              client_id: project.client_id,
              style: project.image_style ?? "cinematic photography",
              background_only: true,
              aspect_ratio: aspectRatio ?? "4:5",
            },
          },
        );

        if (error) throw error;
        if (!data?.success || !data?.image_url)
          throw new Error(data?.error || "Imagem não gerada");

        updateSlide(activeSlide.id, { bg_image_url: data.image_url });
        toast.success("Imagem gerada com sucesso!");
      } catch (err: unknown) {
        toast.error((err as Error).message || "Erro ao gerar imagem");
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [activeSlide, project, updateSlide],
  );

  const handleGenerateSharedAIImage = useCallback(
    async (aspectRatio?: string, extraPrompt?: string) => {
      if (!activeSlide || !project) return;
      setIsGeneratingImage(true);
      try {
        const basePrompt = [
          activeSlide.headline,
          activeSlide.subtitle,
          activeSlide.visual_description,
          project.prompt,
        ]
          .filter(Boolean)
          .join(" — ");

        const prompt = [basePrompt, extraPrompt].filter(Boolean).join(". ");

        if (!prompt.trim()) {
          toast.error(
            "Adicione um texto ao slide antes de gerar imagem com IA",
          );
          return;
        }

        toast.info("Gerando imagem compartilhada com IA...");
        const { data, error } = await supabase.functions.invoke(
          "generate-image-ai",
          {
            body: {
              prompt,
              company_id: project.company_id,
              client_id: project.client_id,
              style: project.image_style ?? "cinematic photography",
              background_only: true,
              aspect_ratio: aspectRatio ?? "4:5",
            },
          },
        );

        if (error) throw error;
        if (!data?.success || !data?.image_url)
          throw new Error(data?.error || "Imagem não gerada");

        handleProjectChange({ shared_bg_image_url: data.image_url });
        toast.success("Imagem compartilhada gerada com sucesso!");
      } catch (err: unknown) {
        toast.error((err as Error).message || "Erro ao gerar imagem");
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [activeSlide, project, handleProjectChange],
  );

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
            .eq("id", project.id)
            .then(() => {});
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

  const handleClientChange = useCallback(
    (clientId: string | null, defaults: ClientDefaults | null) => {
      if (!project) return;

      // Salva o client_id no projeto
      updateClient.mutate({ projectId: project.id, clientId });

      // Aplica defaults do cliente ao projeto (cor destaque, instagram handle)
      if (
        defaults?.projectPatch &&
        Object.keys(defaults.projectPatch).length > 0
      ) {
        updateProject.mutate({
          projectId: project.id,
          patch: defaults.projectPatch,
        });
      }

      // Aplica defaults do cliente ao slide ativo (badge foto de perfil)
      if (
        defaults?.slidePatch &&
        activeSlide &&
        Object.keys(defaults.slidePatch).length > 0
      ) {
        updateSlide(activeSlide.id, defaults.slidePatch);
        toast.success("Configurações do cliente aplicadas ao carrossel");
      }
    },
    [project, activeSlide, updateClient, updateProject, updateSlide],
  );

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

  // Slides são 1080×1350px (4:5 Instagram)
  const SLIDE_W = 1080;
  const SLIDE_H = 1350;
  const scale = userZoom;

  return (
    <DashboardLayout noPadding>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden">
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
          onOpenRegenerate={() => setRegenerateOpen(true)}
          onSave={flushAll}
        />

        <div className="flex flex-1 overflow-hidden">
          <StudioSidebar
            slide={activeSlide}
            slides={slides}
            project={project}
            onSlideChange={handleSlideChange}
            onProjectChange={handleProjectChange}
            onSlidesBatchChange={handleSlidesBatchChange}
            onGenerateAIImage={handleGenerateAIImage}
            onGenerateSharedAIImage={handleGenerateSharedAIImage}
            isGeneratingImage={isGeneratingImage}
            onGenerateContent={handleGenerateContent}
            isGeneratingContent={isGeneratingContent}
            onDownloadSlide={handleDownloadSlide}
            onClientChange={handleClientChange}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex items-center overflow-auto px-8 py-4 gap-4">
              {(() => {
                // Calcula índice panorâmico: posição de cada slide na sequência de slides com use_shared_bg
                const sharedIds = slides
                  .filter((s) => s.use_shared_bg)
                  .map((s) => s.id);
                const sharedTotal = sharedIds.length;
                return slides.map((slide, i) => {
                  const isActive = i === activeIndex;
                  const displayScale = scale;
                  const sharedBgIndex = sharedIds.indexOf(slide.id);
                  return (
                    <button
                      key={slide.id}
                      onClick={() => setActiveIndex(i)}
                      className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                        isActive
                          ? "border-green-500 shadow-lg shadow-green-500/20"
                          : "border-transparent"
                      }`}
                      style={{
                        width: SLIDE_W * displayScale,
                        height: SLIDE_H * displayScale,
                      }}
                    >
                      <div
                        style={{
                          width: SLIDE_W,
                          height: SLIDE_H,
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
                          sharedBgIndex={sharedBgIndex >= 0 ? sharedBgIndex : 0}
                          sharedBgTotal={sharedTotal}
                          clientBadgeUrl={clientBadgeUrl}
                        />
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        <StudioBottomBar
          generationProgress={generationProgress}
          onDownloadZip={handleDownloadZip}
          isExporting={isExporting}
          exportProgress={exportProgress}
          zoom={userZoom}
          onZoomChange={setUserZoom}
        />
      </div>

      <CaptionModal
        open={captionOpen}
        onOpenChange={setCaptionOpen}
        projectId={project.id}
        slides={slides}
      />

      <RegenerateModal
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        project={project}
        onSlidesRegenerated={(newSlides) => {
          queryClient.setQueryData(
            ["carousel-studio-slides", projectId],
            newSlides,
          );
          setActiveIndex(0);
        }}
        onProjectPatched={(patch) => {
          queryClient.setQueryData(
            ["carousel-studio-project", projectId],
            (prev: StudioProject | undefined) =>
              prev ? { ...prev, ...patch } : prev,
          );
        }}
      />
    </DashboardLayout>
  );
}
