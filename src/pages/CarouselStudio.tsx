// src/pages/CarouselStudio.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { RegenerateModal } from "@/components/carousel-studio/RegenerateModal";
import { SendToContentPlanModal } from "@/components/carousel-studio/SendToContentPlanModal";
import { PublishCarouselModal } from "@/components/generators/PublishCarouselModal";
import { SaveTemplateModal } from "@/components/carousel-studio/SaveTemplateModal";
import {
  StudioSlide,
  StudioProject,
  CarouselStyle,
  WizardConfig,
} from "@/components/carousel-studio/types";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";
import {
  useClientCopywriter,
  serializeCopywriter,
} from "@/hooks/useClientCopywriter";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { proxyExternalImage } from "@/lib/proxyExternalImage";

/** Fetches a single Pexels photo for a slide and proxies it to Supabase storage. */
async function fetchPexelsForSlide(
  slide: { headline: string | null; subtitle: string | null },
  companyId: string,
  orientation: "portrait" | "landscape" | "square",
): Promise<string | null> {
  const query = [slide.headline, slide.subtitle].filter(Boolean).join(" ");
  if (!query.trim()) return null;

  const { data, error } = await supabase.functions.invoke(
    "search-pexels-photos",
    {
      body: {
        query: query.slice(0, 120),
        per_page: 1,
        orientation,
        company_id: companyId,
      },
    },
  );

  if (
    error ||
    !data?.success ||
    !Array.isArray(data.photos) ||
    data.photos.length === 0
  ) {
    return null;
  }

  const rawUrl: string = data.photos[0].large;
  return proxyExternalImage(rawUrl, companyId);
}

export default function CarouselStudio() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

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
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [sendToPlanOpen, setSendToPlanOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [publishCarousel, setPublishCarousel] = useState<{
    id: string;
    carousel_type: string;
    slides: Array<{
      slide_number: number;
      image_url: string;
      headline: string | null;
      body_text: string | null;
    }>;
    caption: string | null;
    hashtags: string | null;
    cta_text: string | null;
    theme: string | null;
    status: string;
    client_id: string;
    company_id: string;
  } | null>(null);
  const [preparingPublish, setPreparingPublish] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [userZoom, setUserZoom] = useState(620 / 1350);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    statusMessage?: string;
  } | null>(null);
  const autoGenerateStarted = useRef(false);
  const cancelGenerationRef = useRef(false);

  const slideRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { exportSlide, exportAllAsZip, isExporting, exportProgress } =
    useSlideExport();
  const queryClient = useQueryClient();
  const updateClient = useUpdateStudioProjectClient();
  const updateProject = useUpdateStudioProject();

  const { data: carouselCopywriter } = useClientCopywriter(
    project?.client_id ?? null,
  );

  // Resolve foto do cliente para usar como fallback no badge
  const { clients } = useClients();
  const clientBadgeUrl = React.useMemo(() => {
    if (!project?.client_id) return null;
    const client = clients.find((c) => c.id === project.client_id);
    return (
      client?.instagram_account?.profile_picture_url ?? client?.avatar ?? null
    );
  }, [project?.client_id, clients]);

  const instagramUsername = React.useMemo(() => {
    if (!project?.client_id) return null;
    const client = clients.find((c) => c.id === project.client_id);
    return client?.instagram_account?.username ?? null;
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

    // Clear nav state so a page refresh doesn't re-trigger generation
    navigate(location.pathname, { replace: true, state: null });

    // Capture stable references — must not close over changing `slides` state
    const projectId = project.id;
    const companyId = project.company_id;
    const clientId = project.client_id;
    const initialSlides = slides; // snapshot at generation start
    const config: WizardConfig = navState.config;
    const copywriterInstructions: string | null =
      config?.copywriterInstructions ?? null;

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
              copywriter_instructions: copywriterInstructions ?? undefined,
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
                ? "bottom_left"
                : LEFT_POSITIONS[idx % LEFT_POSITIONS.length];

            const patch: Partial<StudioSlide> = {};

            // Só aplica defaults de posição/estilo se NÃO veio de template
            // (template já foi aplicado no banco antes do navigate)
            if (!config.selectedTemplate) {
              patch.text_alignment = "left";
              patch.text_position = textPosition;

              if (textPosition.startsWith("bottom_"))
                patch.text_padding_y = 150;
              else if (textPosition.startsWith("top_"))
                patch.text_padding_y = 132;

              if (idx === 0) {
                patch.font_size_title = 80;
                patch.text_padding_y = 196;
                patch.overlay_style = "base_strong";
                patch.overlay_opacity = 100;
              }
            }

            // Headline e subtitle sempre aplicados (independente do template)
            if (s.headline != null) patch.headline = s.headline;
            if (s.subtitle != null) patch.subtitle = s.subtitle;
            updateSlide(s.id, patch);
          }
        }
      } catch (err) {
        console.error("[auto-generate] text generation failed:", err);
      }

      // Phase 2: generate images slide by slide
      if (config.selectedTemplate) {
        // Template mode: per-slide source routing
        for (let i = 0; i < initialSlides.length; i++) {
          if (cancelGenerationRef.current) break;

          const slide = initialSlides[i];
          const templateSlide = config.selectedTemplate.find(
            (ts) => ts.slide_number === slide.slide_number,
          );

          const bgSource = templateSlide?.bg_image_source ?? null;
          const contentSource = templateSlide?.content_image_source ?? null;

          if (!bgSource && !contentSource) continue;

          setGenerationProgress({
            current: i + 1,
            total,
            statusMessage: `Imagens slide ${i + 1} de ${total}...`,
          });

          const slideText = {
            headline: textSlides[slide.id]?.headline ?? slide.headline,
            subtitle: textSlides[slide.id]?.subtitle ?? slide.subtitle,
          };

          // ── Background image ──
          if (bgSource === "ai" || bgSource === "pexels") {
            try {
              let bgUrl: string | null = null;

              if (bgSource === "ai") {
                setGenerationProgress({
                  current: i + 1,
                  total,
                  statusMessage: `Gerando imagem IA (fundo) — slide ${i + 1} de ${total}...`,
                });
                const prompt =
                  [
                    slideText.headline,
                    slideText.subtitle,
                    slide.visual_description,
                    config.prompt,
                  ]
                    .filter(Boolean)
                    .join(" — ") || `Slide ${i + 1}`;
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
                  bgUrl = imgData.image_url;
                } else {
                  console.warn(
                    `[template] slide ${i + 1} AI bg failed:`,
                    imgError ?? imgData?.error,
                  );
                }
              } else {
                // pexels
                setGenerationProgress({
                  current: i + 1,
                  total,
                  statusMessage: `Buscando no Pexels (fundo) — slide ${i + 1} de ${total}...`,
                });
                bgUrl = await fetchPexelsForSlide(
                  slideText,
                  companyId,
                  "portrait",
                );
                if (!bgUrl) {
                  console.warn(
                    `[template] slide ${i + 1} Pexels bg: no result`,
                  );
                }
              }

              if (bgUrl) {
                updateSlide(slide.id, {
                  bg_image_url: bgUrl,
                  bg_image_source: bgSource,
                });
              }
            } catch (err) {
              console.error(`[template] slide ${i + 1} bg error:`, err);
            }
          }

          // ── Content image ──
          if (cancelGenerationRef.current) break;
          if (contentSource === "ai" || contentSource === "pexels") {
            try {
              let contentUrl: string | null = null;
              const contentLayout =
                templateSlide?.content_image_layout ?? "1_thumb_16_9";
              const orientation: "portrait" | "landscape" | "square" =
                contentLayout === "2_vertical"
                  ? "portrait"
                  : contentLayout === "1_square" ||
                      contentLayout === "4_square_2x2"
                    ? "square"
                    : "landscape";

              if (contentSource === "ai") {
                setGenerationProgress({
                  current: i + 1,
                  total,
                  statusMessage: `Gerando imagem IA (conteúdo) — slide ${i + 1} de ${total}...`,
                });
                const prompt =
                  [
                    slideText.headline,
                    slideText.subtitle,
                    slide.visual_description,
                    config.prompt,
                  ]
                    .filter(Boolean)
                    .join(" — ") || `Slide ${i + 1}`;
                const { data: cData, error: cError } =
                  await supabase.functions.invoke("generate-image-ai", {
                    body: {
                      prompt,
                      company_id: companyId,
                      client_id: clientId,
                      style: config.imageStyle || "cinematic photography",
                      background_only: true,
                      aspect_ratio:
                        orientation === "portrait"
                          ? "9:16"
                          : orientation === "square"
                            ? "1:1"
                            : "16:9",
                    },
                  });
                if (!cError && cData?.success && cData?.image_url) {
                  contentUrl = cData.image_url;
                } else {
                  console.warn(
                    `[template] slide ${i + 1} AI content failed:`,
                    cError ?? cData?.error,
                  );
                }
              } else {
                // pexels
                setGenerationProgress({
                  current: i + 1,
                  total,
                  statusMessage: `Buscando no Pexels (conteúdo) — slide ${i + 1} de ${total}...`,
                });
                contentUrl = await fetchPexelsForSlide(
                  slideText,
                  companyId,
                  orientation,
                );
                if (!contentUrl) {
                  console.warn(
                    `[template] slide ${i + 1} Pexels content: no result`,
                  );
                }
              }

              if (contentUrl) {
                updateSlide(slide.id, {
                  content_image_urls: contentUrl,
                  content_image_source: contentSource,
                });
              }
            } catch (err) {
              console.error(`[template] slide ${i + 1} content error:`, err);
            }
          }

          await new Promise((r) => setTimeout(r, 300));
        }
      } else if (
        config.generateAIImages !== false &&
        config.imageMode !== "none"
      ) {
        // Modo "both": intercalar — ciclo de 3 posições por slide
        // 0: bg_image_url | 1: content below_subtitle | 2: content above_title
        type SlideTarget =
          | { kind: "background" }
          | { kind: "content"; position: "below_subtitle" | "above_title" };

        const getTarget = (idx: number): SlideTarget => {
          if (config.imageMode === "background") return { kind: "background" };
          if (config.imageMode === "grid") {
            return { kind: "content", position: "below_subtitle" };
          }
          // "both" → intercala
          const cycle = idx % 3;
          if (cycle === 0) return { kind: "background" };
          if (cycle === 1)
            return { kind: "content", position: "below_subtitle" };
          return { kind: "content", position: "above_title" };
        };

        // Summary de todos os slides para dar contexto completo à LLM
        const allSlidesSummary = initialSlides.map((s, i) => {
          const t = textSlides[s.id];
          return {
            slide_number: i + 1,
            headline: t?.headline ?? s.headline,
            subtitle: t?.subtitle ?? s.subtitle,
          };
        });

        for (let i = 0; i < initialSlides.length; i++) {
          if (cancelGenerationRef.current) {
            console.log("[auto-generate] cancelled by user");
            toast.info("Geração de imagens interrompida");
            break;
          }
          const slide = initialSlides[i];
          const target = getTarget(i);

          setGenerationProgress({
            current: i + 1,
            total,
            statusMessage: `Gerando prompt visual slide ${i + 1} de ${total}...`,
          });

          const imageTypeKey: "background" | "content_below" | "content_above" =
            target.kind === "background"
              ? "background"
              : target.position === "below_subtitle"
                ? "content_below"
                : "content_above";

          // Passo 1: gerar prompt visual específico para este slide
          let visualPrompt = "";
          try {
            const { data: promptData, error: promptError } =
              await supabase.functions.invoke(
                "generate-carousel-slide-image-prompt",
                {
                  body: {
                    company_id: companyId,
                    carousel_prompt: config.prompt,
                    image_style: config.imageStyle,
                    all_slides: allSlidesSummary,
                    current_slide_number: i + 1,
                    image_type: imageTypeKey,
                  },
                },
              );
            if (!promptError && promptData?.success && promptData?.prompt) {
              visualPrompt = promptData.prompt;
            } else {
              console.warn(
                `[auto-generate] slide ${i + 1} prompt fallback:`,
                promptError ?? promptData?.error,
              );
            }
          } catch (err) {
            console.warn(`[auto-generate] slide ${i + 1} prompt error:`, err);
          }

          // Fallback: concatenação local caso a LLM falhe
          if (!visualPrompt.trim()) {
            const parts = [
              allSlidesSummary[i].headline,
              allSlidesSummary[i].subtitle,
              slide.visual_description,
              config.prompt,
            ].filter(Boolean);
            visualPrompt =
              parts.length > 0 ? parts.join(" — ") : `Slide ${i + 1}`;
          }

          console.log(
            `[auto-generate] slide ${i + 1} target:`,
            target,
            "prompt:",
            visualPrompt,
          );

          // Imagem de fundo → IA (gera única e cinematográfica)
          // Imagem de conteúdo → Pexels (foto pronta, economiza tokens)
          const useSource: "ai" | "pexels" =
            target.kind === "background" ? "ai" : "pexels";

          setGenerationProgress({
            current: i + 1,
            total,
            statusMessage:
              useSource === "ai"
                ? `Gerando imagem com IA — slide ${i + 1} de ${total}...`
                : `Buscando no Pexels — slide ${i + 1} de ${total}...`,
          });

          try {
            let generatedImageUrl: string | null = null;
            let sourceError: string | null = null;
            // Tracks actual source used (pexels may fall back to ai)
            let actualSource: "ai" | "pexels" = useSource;

            if (useSource === "ai") {
              const { data: imgData, error: imgError } =
                await supabase.functions.invoke("generate-image-ai", {
                  body: {
                    prompt: visualPrompt,
                    company_id: companyId,
                    client_id: clientId,
                    style: config.imageStyle || "cinematic photography",
                    background_only: true,
                    aspect_ratio: "4:5",
                  },
                });

              console.log(`[auto-generate] slide ${i + 1} AI result:`, {
                imgData,
                imgError,
              });

              if (imgError) {
                let msg = imgError.message;
                try {
                  const ctx = imgError as { context?: Response };
                  if (ctx.context) {
                    const body = await ctx.context.json();
                    msg = body?.error ?? msg;
                  }
                } catch {
                  // ignore
                }
                sourceError = msg;
              } else if (imgData?.success && imgData?.image_url) {
                generatedImageUrl = imgData.image_url;
              } else {
                sourceError = imgData?.error || "Imagem não gerada";
              }
            } else {
              // Buscar no Pexels — usa a headline + subtitle + prompt como query simples
              const queryParts = [
                allSlidesSummary[i].headline,
                allSlidesSummary[i].subtitle,
                config.prompt,
              ].filter(Boolean);
              const pexelsQuery =
                queryParts.join(" ").slice(0, 120) || `slide ${i + 1}`;

              const { data: pexelsData, error: pexelsError } =
                await supabase.functions.invoke("search-pexels-photos", {
                  body: {
                    company_id: companyId,
                    query: pexelsQuery,
                    per_page: 10,
                    orientation: "landscape",
                  },
                });

              console.log(`[auto-generate] slide ${i + 1} Pexels result:`, {
                pexelsData,
                pexelsError,
              });

              if (pexelsError) {
                let msg = pexelsError.message;
                try {
                  const ctx = pexelsError as { context?: Response };
                  if (ctx.context) {
                    const body = await ctx.context.json();
                    msg = body?.error ?? msg;
                  }
                } catch {
                  // ignore
                }
                sourceError = msg;
              } else if (
                pexelsData?.success &&
                Array.isArray(pexelsData.photos) &&
                pexelsData.photos.length > 0
              ) {
                // Pega a primeira foto e pré-hospeda no storage para evitar CORS
                generatedImageUrl = await proxyExternalImage(
                  pexelsData.photos[0].large,
                  companyId,
                );
              } else {
                sourceError =
                  pexelsData?.error ||
                  `Nenhuma foto encontrada no Pexels para "${pexelsQuery}"`;
              }
            }

            // Fallback: imagem de conteúdo que falhou no Pexels → tenta IA
            if (
              !generatedImageUrl &&
              target.kind === "content" &&
              useSource === "pexels"
            ) {
              console.warn(
                `[auto-generate] slide ${i + 1} Pexels falhou, fallback para IA`,
              );
              setGenerationProgress({
                current: i + 1,
                total,
                statusMessage: `Pexels indisponível, gerando com IA — slide ${i + 1} de ${total}...`,
              });
              const { data: fbData, error: fbError } =
                await supabase.functions.invoke("generate-image-ai", {
                  body: {
                    prompt: visualPrompt,
                    company_id: companyId,
                    client_id: clientId,
                    style: config.imageStyle || "cinematic photography",
                    background_only: true,
                    aspect_ratio: "16:9",
                  },
                });
              if (!fbError && fbData?.success && fbData?.image_url) {
                generatedImageUrl = fbData.image_url;
                actualSource = "ai";
                sourceError = null;
              } else {
                console.error(
                  `[auto-generate] slide ${i + 1} IA fallback failed:`,
                  fbError ?? fbData?.error,
                );
              }
            }

            if (sourceError && !generatedImageUrl) {
              console.error(
                `[auto-generate] slide ${i + 1} ${useSource} error:`,
                sourceError,
              );
              toast.error(`Slide ${i + 1}: ${sourceError}`);
            } else if (generatedImageUrl) {
              if (target.kind === "background") {
                const bgPatch: Partial<StudioSlide> = {
                  bg_image_url: generatedImageUrl,
                  bg_image_source: "ai",
                };
                // Slides com imagem de fundo que NÃO são o slide 1:
                // texto bottom_left, 252px vertical, overlay base_strong 100%
                if (i !== 0) {
                  bgPatch.text_position = "bottom_left";
                  bgPatch.text_alignment = "left";
                  bgPatch.text_padding_y = 252;
                  bgPatch.overlay_style = "base_strong";
                  bgPatch.overlay_opacity = 100;
                }
                updateSlide(slide.id, bgPatch);
              } else {
                const contentPatch: Partial<StudioSlide> = {
                  content_image_urls: generatedImageUrl,
                  content_image_source: actualSource,
                  content_image_layout: "1_thumb_16_9",
                  content_image_position: target.position,
                };
                // Quando imagem de conteúdo fica acima do título,
                // o texto vai para bottom_left com margem 276px para não colidir
                if (target.position === "above_title") {
                  contentPatch.text_position = "bottom_left";
                  contentPatch.text_alignment = "left";
                  contentPatch.text_padding_y = 276;
                  // Bolinhas em TL + BR (bit0 + bit3 = 9), opacidade 18%
                  contentPatch.corner_style = "dots";
                  contentPatch.corner_mask = 9;
                  contentPatch.corner_opacity = 18;
                }
                // Quando imagem de conteúdo fica abaixo do subtítulo:
                // Bolinhas em TR + BL (bit1 + bit2 = 6), opacidade 18%
                if (target.position === "below_subtitle") {
                  contentPatch.corner_style = "dots";
                  contentPatch.corner_mask = 6;
                  contentPatch.corner_opacity = 18;
                }
                updateSlide(slide.id, contentPatch);
              }
            }
          } catch (err) {
            console.error(`[auto-generate] slide ${i + 1} exception:`, err);
            toast.error(`Slide ${i + 1}: ${(err as Error).message ?? "erro"}`);
          }

          await new Promise((r) => setTimeout(r, 500));
        }
      }

      setGenerationProgress(null);
      if (!cancelGenerationRef.current) {
        toast.success("Carrossel gerado com sucesso!");
      }
      cancelGenerationRef.current = false;
    };

    generateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!project, !!slides?.length]);

  const handleCancelGeneration = useCallback(() => {
    cancelGenerationRef.current = true;
  }, []);

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

        updateSlide(activeSlide.id, {
          bg_image_url: data.image_url,
          bg_image_source: "ai",
        });
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
            copywriter_instructions:
              serializeCopywriter(carouselCopywriter) ?? undefined,
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

  const handleSendToPlan = useCallback(
    async (planId: string) => {
      if (!slides || !project) throw new Error("Projeto não carregado");

      // 1. Garantir que todas as edições pendentes estão salvas
      await flushAll();

      if (!project.caption?.trim()) {
        toast.error(
          "Preencha a legenda antes de enviar ao planejamento (sidebar → Legenda + Hashtags)",
        );
        return;
      }

      // 2. Exportar cada slide para storage — sempre re-renderiza para garantir
      // que a imagem reflete o estado atual do editor (não reusa URL antiga).
      const slideImages: Array<{ order: number; url: string }> = [];
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const el = slideRefs.current.get(s.id);
        if (!el) continue;
        const url = await exportSlide(el, s, project.id, (savedUrl) => {
          updateExportedUrl(s.id, savedUrl);
        });
        if (url) slideImages.push({ order: i, url });
      }

      if (slideImages.length === 0) {
        throw new Error("Nenhuma imagem foi exportada");
      }

      // 3. Usar caption salva no projeto
      const caption = project.caption ?? "";

      // 4. Descobrir próximo order_index no plano
      const { data: existingPosts } = await supabase
        .from("content_plan_posts")
        .select("order_index")
        .eq("content_plan_id", planId)
        .order("order_index", { ascending: false })
        .limit(1);
      const nextOrderIndex =
        existingPosts && existingPosts.length > 0
          ? (existingPosts[0].order_index ?? 0) + 1
          : 0;

      // 5. Criar post tipo carrossel
      const { data: postData, error: postError } = await supabase
        .from("content_plan_posts")
        .insert({
          content_plan_id: planId,
          post_type: "carrossel",
          order_index: nextOrderIndex,
          caption: caption || null,
          headline: slides[0]?.headline ?? null,
          subheadline: slides[0]?.subtitle ?? null,
          image_url: slideImages[0]?.url ?? null,
          status: "rascunho",
        })
        .select("id")
        .single();

      if (postError) throw postError;

      // 6. Inserir slides do carrossel
      const slideRows = slideImages.map((si, idx) => ({
        post_id: postData.id as string,
        order_index: idx,
        headline: slides[si.order]?.headline ?? null,
        content: slides[si.order]?.subtitle ?? null,
        image_url: si.url,
      }));

      const { error: slidesError } = await supabase
        .from("content_plan_slides")
        .insert(slideRows);

      if (slidesError) throw slidesError;
    },
    [slides, project, flushAll, exportSlide, updateExportedUrl],
  );

  const handleOpenPublish = useCallback(async () => {
    if (!slides || !project) return;
    if (!project.client_id) {
      toast.error(
        "Defina o cliente no editor antes de publicar (sidebar → Cliente)",
      );
      return;
    }

    if (!project.caption?.trim()) {
      toast.error(
        "Preencha a legenda antes de publicar (sidebar → Legenda + Hashtags)",
      );
      return;
    }

    setPreparingPublish(true);
    try {
      await flushAll();

      // Re-exporta cada slide para garantir que a imagem reflete o editor
      const slidesWithImages: Array<{
        slide_number: number;
        image_url: string;
        headline: string | null;
        body_text: string | null;
      }> = [];

      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const el = slideRefs.current.get(s.id);
        if (!el) continue;
        const url = await exportSlide(el, s, project.id, (savedUrl) => {
          updateExportedUrl(s.id, savedUrl);
        });
        if (url) {
          slidesWithImages.push({
            slide_number: s.slide_number,
            image_url: url,
            headline: s.headline,
            body_text: s.subtitle,
          });
        }
      }

      if (slidesWithImages.length === 0) {
        throw new Error("Nenhuma imagem foi exportada");
      }

      const caption = project.caption ?? "";
      const hashtags = project.hashtags ?? null;

      setPublishCarousel({
        id: project.id,
        carousel_type: "carousel",
        slides: slidesWithImages,
        caption: caption || null,
        hashtags: hashtags,
        cta_text: null,
        theme: project.prompt,
        status: "ready",
        client_id: project.client_id,
        company_id: project.company_id,
      });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || "Erro ao preparar carrossel para publicação",
      );
    } finally {
      setPreparingPublish(false);
    }
  }, [slides, project, flushAll, exportSlide, updateExportedUrl]);

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
          onOpenRegenerate={() => setRegenerateOpen(true)}
          onOpenSendToPlan={() => setSendToPlanOpen(true)}
          onOpenPublish={handleOpenPublish}
          isPreparingPublish={preparingPublish}
          onSave={flushAll}
          onOpenSaveTemplate={() => setSaveTemplateOpen(true)}
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
          onCancelGeneration={handleCancelGeneration}
          onDownloadZip={handleDownloadZip}
          isExporting={isExporting}
          exportProgress={exportProgress}
          zoom={userZoom}
          onZoomChange={setUserZoom}
        />
      </div>

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

      <SendToContentPlanModal
        open={sendToPlanOpen}
        onOpenChange={setSendToPlanOpen}
        clientId={project.client_id}
        onSend={handleSendToPlan}
      />

      {publishCarousel && (
        <PublishCarouselModal
          carousel={publishCarousel}
          open={!!publishCarousel}
          onOpenChange={(open) => !open && setPublishCarousel(null)}
          instagramUsername={instagramUsername}
          onCaptionChange={(newCaption, newHashtags) => {
            if (!project) return;
            updateProject.mutate({
              projectId: project.id,
              patch: {
                caption: newCaption || null,
                hashtags: newHashtags || null,
              },
            });
            setPublishCarousel((prev) =>
              prev
                ? { ...prev, caption: newCaption, hashtags: newHashtags }
                : prev,
            );
          }}
          onSuccess={() => {
            setPublishCarousel(null);
            toast.success("Publicação agendada!");
          }}
        />
      )}

      {project && slides && slides.length > 0 && (
        <SaveTemplateModal
          open={saveTemplateOpen}
          onOpenChange={setSaveTemplateOpen}
          project={project}
          slides={slides}
        />
      )}
    </DashboardLayout>
  );
}
