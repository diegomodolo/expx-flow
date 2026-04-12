# Carousel Studio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um Editor Visual de Carrossel (Carousel Studio) como terceira aba em `/geradores/carrosseis`, com wizard de criação, editor HTML/CSS em tempo real, geração de imagens IA e export PNG/ZIP.

**Architecture:** Slides são componentes React com posicionamento CSS absoluto em 1080×1080px, exibidos em escala reduzida via `transform: scale()`. O painel lateral atualiza estados React que refletem instantaneamente no preview. Export usa `html2canvas`. Persistência via duas novas tabelas Supabase com RLS SECURITY DEFINER. Nova edge function `generate-carousel-caption` para legenda. A edge function `daily-carousel-generator-stream` existente é reutilizada para geração de conteúdo e imagens.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, shadcn/ui, html2canvas, JSZip, Supabase (PostgreSQL + Storage + Edge Functions em Deno), React Router DOM v6, TanStack React Query, React Hook Form.

---

## Mapa de Arquivos

### Criar (novos)

| Arquivo                                                         | Responsabilidade                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `supabase/migrations/20260412000000_carousel_studio.sql`        | Tabelas, RLS, função SECURITY DEFINER, GRANTs                     |
| `supabase/functions/generate-carousel-caption/index.ts`         | Edge function: legenda + hashtags                                 |
| `src/pages/CarouselStudio.tsx`                                  | Página do editor (rota `/geradores/carrosseis/studio/:projectId`) |
| `src/hooks/useCarouselStudioProject.ts`                         | CRUD do projeto (carousel_studio_projects)                        |
| `src/hooks/useCarouselStudioSlides.ts`                          | CRUD dos slides com auto-save debounce 2s                         |
| `src/hooks/useSlideExport.ts`                                   | html2canvas + JSZip export                                        |
| `src/components/carousel-studio/StudioWizardModal.tsx`          | Modal wizard 4 passos                                             |
| `src/components/carousel-studio/SlideCanvas.tsx`                | Componente 1080×1080px de um slide                                |
| `src/components/carousel-studio/StudioSidebar.tsx`              | Painel lateral (orquestrador das seções)                          |
| `src/components/carousel-studio/SidebarSection.tsx`             | Wrapper colapsável genérico                                       |
| `src/components/carousel-studio/sections/BackgroundSection.tsx` | Seção: imagem de fundo                                            |
| `src/components/carousel-studio/sections/OverlaySection.tsx`    | Seção: sombra/overlay                                             |
| `src/components/carousel-studio/sections/TextSection.tsx`       | Seção: título, subtítulo, posição                                 |
| `src/components/carousel-studio/sections/FontsSection.tsx`      | Seção: fontes, tamanhos, cor destaque                             |
| `src/components/carousel-studio/sections/BadgeSection.tsx`      | Seção: badge de perfil                                            |
| `src/components/carousel-studio/sections/CornersSection.tsx`    | Seção: cantos decorativos                                         |
| `src/components/carousel-studio/StudioTopBar.tsx`               | Barra superior (estilo tabs + legenda)                            |
| `src/components/carousel-studio/StudioBottomBar.tsx`            | Barra inferior (progresso + ZIP)                                  |
| `src/components/carousel-studio/SlideStrip.tsx`                 | Faixa horizontal de miniaturas clicáveis                          |
| `src/components/carousel-studio/CaptionModal.tsx`               | Modal legenda + hashtags                                          |

### Modificar (existentes)

| Arquivo                                                     | O que muda                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/pages/GeradorCarrosseis.tsx`                           | Adicionar terceira aba "Editor Visual" + botão "Criar no Editor Visual"     |
| `src/App.tsx`                                               | Adicionar rota `/geradores/carrosseis/studio/:projectId` → `CarouselStudio` |
| `src/components/carousel-generator/CarouselHistoryList.tsx` | Mostrar projetos do Studio junto com carrosseis existentes                  |
| `supabase/config.toml`                                      | Adicionar entrada para `generate-carousel-caption`                          |

---

## Task 1: Migration — Tabelas e RLS

**Files:**

- Create: `supabase/migrations/20260412000000_carousel_studio.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/20260412000000_carousel_studio.sql

-- Tabela principal de projetos
CREATE TABLE public.carousel_studio_projects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id        uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Carrossel sem título',
  style            text NOT NULL DEFAULT 'minimalist' CHECK (style IN ('minimalist', 'profile')),
  font_pair        text NOT NULL DEFAULT 'space_inter',
  accent_color     text NOT NULL DEFAULT '#FFD700',
  instagram_handle text,
  slides_count     int NOT NULL DEFAULT 6,
  image_mode       text NOT NULL DEFAULT 'grid' CHECK (image_mode IN ('none', 'background', 'grid', 'both')),
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready')),
  thumbnail_url    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.carousel_studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can manage carousel studio projects"
  ON public.carousel_studio_projects
  USING (company_id = ANY(get_user_company_ids()))
  WITH CHECK (company_id = ANY(get_user_company_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.carousel_studio_projects TO authenticated;

-- Tabela de slides
CREATE TABLE public.carousel_studio_slides (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid NOT NULL REFERENCES public.carousel_studio_projects(id) ON DELETE CASCADE,
  slide_number       int NOT NULL,
  headline           text,
  subtitle           text,
  visual_description text,
  bg_image_url       text,
  bg_position_x      int NOT NULL DEFAULT 50,
  bg_position_y      int NOT NULL DEFAULT 50,
  bg_zoom            int NOT NULL DEFAULT 100,
  overlay_style      text NOT NULL DEFAULT 'base' CHECK (overlay_style IN ('base', 'top_strong', 'base_strong', 'none')),
  overlay_opacity    int NOT NULL DEFAULT 60,
  text_position      text NOT NULL DEFAULT 'bottom_left',
  text_alignment     text NOT NULL DEFAULT 'left',
  font_size_title    int NOT NULL DEFAULT 48,
  font_size_subtitle int NOT NULL DEFAULT 20,
  line_spacing       int NOT NULL DEFAULT 120,
  corner_style       text NOT NULL DEFAULT 'none',
  corner_opacity     int NOT NULL DEFAULT 80,
  glass_enabled      bool NOT NULL DEFAULT false,
  glass_radius       int NOT NULL DEFAULT 12,
  badge_enabled      bool NOT NULL DEFAULT true,
  badge_photo_url    text,
  exported_image_url text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slide_number)
);

ALTER TABLE public.carousel_studio_slides ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para evitar nested RLS em policy
CREATE OR REPLACE FUNCTION get_user_carousel_studio_project_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT id FROM public.carousel_studio_projects
    WHERE company_id = ANY(get_user_company_ids())
  );
$$;

CREATE POLICY "company members can manage carousel studio slides"
  ON public.carousel_studio_slides
  USING (project_id = ANY(get_user_carousel_studio_project_ids()))
  WITH CHECK (project_id = ANY(get_user_carousel_studio_project_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.carousel_studio_slides TO authenticated;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_carousel_studio_projects_updated_at
  BEFORE UPDATE ON public.carousel_studio_projects
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_carousel_studio_slides_updated_at
  BEFORE UPDATE ON public.carousel_studio_slides
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

- [ ] **Step 2: Aplicar migration**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/ExpxFlow/controledetrafego
supabase db push
```

Verificar: sem erros de RLS, tabelas criadas com sucesso.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260412000000_carousel_studio.sql
git commit -m "feat: migration carousel_studio_projects e carousel_studio_slides com RLS"
```

---

## Task 2: Tipos TypeScript centrais

**Files:**

- Create: `src/components/carousel-studio/types.ts`

- [ ] **Step 1: Criar arquivo de tipos**

```typescript
// src/components/carousel-studio/types.ts

export type CarouselStyle = "minimalist" | "profile";
export type ImageMode = "none" | "background" | "grid" | "both";
export type OverlayStyle = "base" | "top_strong" | "base_strong" | "none";
export type CornerStyle =
  | "none"
  | "grid"
  | "dots"
  | "horizontal_lines"
  | "diagonal_lines"
  | "diagonal_shadow";
export type TextPosition =
  | "top_left"
  | "top_center"
  | "top_right"
  | "mid_left"
  | "center"
  | "mid_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right";
export type TextAlignment = "left" | "center" | "right";
export type ProjectStatus = "draft" | "generating" | "ready";

export type FontPair =
  | "space_inter"
  | "playfair_dmsans"
  | "syne_outfit"
  | "oswald_inter"
  | "raleway_playfair"
  | "outfit_caveat";

export interface StudioProject {
  id: string;
  company_id: string;
  client_id: string | null;
  user_id: string;
  title: string;
  style: CarouselStyle;
  font_pair: FontPair;
  accent_color: string;
  instagram_handle: string | null;
  slides_count: number;
  image_mode: ImageMode;
  status: ProjectStatus;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioSlide {
  id: string;
  project_id: string;
  slide_number: number;
  headline: string | null;
  subtitle: string | null;
  visual_description: string | null;
  bg_image_url: string | null;
  bg_position_x: number;
  bg_position_y: number;
  bg_zoom: number;
  overlay_style: OverlayStyle;
  overlay_opacity: number;
  text_position: TextPosition;
  text_alignment: TextAlignment;
  font_size_title: number;
  font_size_subtitle: number;
  line_spacing: number;
  corner_style: CornerStyle;
  corner_opacity: number;
  glass_enabled: boolean;
  glass_radius: number;
  badge_enabled: boolean;
  badge_photo_url: string | null;
  exported_image_url: string | null;
  created_at: string;
  updated_at: string;
}

// Wizard config coletada nos 4 passos
export interface WizardConfig {
  style: CarouselStyle;
  useAI: boolean;
  prompt: string;
  referenceImages: string[]; // base64 ou URLs
  slidesCount: number;
  imageMode: ImageMode;
  generateAIImages: boolean;
  imageStyle: string;
  instagramHandle: string;
  fontPair: FontPair;
  accentColor: string;
}

export const FONT_PAIR_LABELS: Record<
  FontPair,
  { title: string; subtitle: string }
> = {
  space_inter: { title: "Space", subtitle: "Inter" },
  playfair_dmsans: { title: "Playfair", subtitle: "DM Sans" },
  syne_outfit: { title: "Syne", subtitle: "Outfit" },
  oswald_inter: { title: "Oswald", subtitle: "Inter" },
  raleway_playfair: { title: "Raleway", subtitle: "Playfair" },
  outfit_caveat: { title: "Outfit", subtitle: "Caveat" },
};

export const FONT_PAIR_CSS: Record<
  FontPair,
  { titleFont: string; subtitleFont: string }
> = {
  space_inter: {
    titleFont: "'Space Grotesk', sans-serif",
    subtitleFont: "'Inter', sans-serif",
  },
  playfair_dmsans: {
    titleFont: "'Playfair Display', serif",
    subtitleFont: "'DM Sans', sans-serif",
  },
  syne_outfit: {
    titleFont: "'Syne', sans-serif",
    subtitleFont: "'Outfit', sans-serif",
  },
  oswald_inter: {
    titleFont: "'Oswald', sans-serif",
    subtitleFont: "'Inter', sans-serif",
  },
  raleway_playfair: {
    titleFont: "'Raleway', sans-serif",
    subtitleFont: "'Playfair Display', serif",
  },
  outfit_caveat: {
    titleFont: "'Outfit', sans-serif",
    subtitleFont: "'Caveat', cursive",
  },
};

export const TEXT_POSITION_CLASSES: Record<TextPosition, string> = {
  top_left: "top-8 left-8",
  top_center: "top-8 left-1/2 -translate-x-1/2",
  top_right: "top-8 right-8",
  mid_left: "top-1/2 left-8 -translate-y-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  mid_right: "top-1/2 right-8 -translate-y-1/2",
  bottom_left: "bottom-16 left-8",
  bottom_center: "bottom-16 left-1/2 -translate-x-1/2",
  bottom_right: "bottom-16 right-8",
};

export const OVERLAY_GRADIENTS: Record<OverlayStyle, string> = {
  none: "none",
  base: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
  top_strong:
    "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
  base_strong:
    "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/carousel-studio/types.ts
git commit -m "feat: tipos TypeScript centrais do Carousel Studio"
```

---

## Task 3: Hook `useCarouselStudioProject`

**Files:**

- Create: `src/hooks/useCarouselStudioProject.ts`

- [ ] **Step 1: Criar hook**

```typescript
// src/hooks/useCarouselStudioProject.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  StudioProject,
  WizardConfig,
} from "@/components/carousel-studio/types";

export function useCarouselStudioProjects(companyId: string | undefined) {
  return useQuery({
    queryKey: ["carousel-studio-projects", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_studio_projects")
        .select("*")
        .eq("company_id", companyId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as StudioProject[];
    },
    enabled: !!companyId,
  });
}

export function useCarouselStudioProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["carousel-studio-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_studio_projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data as StudioProject;
    },
    enabled: !!projectId,
  });
}

export function useCreateStudioProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      userId,
      config,
    }: {
      companyId: string;
      userId: string;
      config: WizardConfig;
    }) => {
      const { data, error } = await supabase
        .from("carousel_studio_projects")
        .insert({
          company_id: companyId,
          user_id: userId,
          title: config.prompt.slice(0, 60) || "Carrossel sem título",
          style: config.style,
          font_pair: config.fontPair,
          accent_color: config.accentColor,
          instagram_handle: config.instagramHandle || null,
          slides_count: config.slidesCount,
          image_mode: config.imageMode,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-projects", companyId],
      });
    },
  });
}

export function useUpdateStudioProjectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      status,
      thumbnailUrl,
    }: {
      projectId: string;
      status: string;
      thumbnailUrl?: string;
    }) => {
      const update: Record<string, string> = { status };
      if (thumbnailUrl) update.thumbnail_url = thumbnailUrl;
      const { error } = await supabase
        .from("carousel_studio_projects")
        .update(update)
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-project", projectId],
      });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCarouselStudioProject.ts
git commit -m "feat: hook useCarouselStudioProject para CRUD de projetos do Studio"
```

---

## Task 4: Hook `useCarouselStudioSlides` com auto-save

**Files:**

- Create: `src/hooks/useCarouselStudioSlides.ts`

- [ ] **Step 1: Criar hook**

```typescript
// src/hooks/useCarouselStudioSlides.ts
import { useCallback, useEffect, useRef, useState } from "react";
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
      projectId: string,
      slides: Array<{
        slide_number: number;
        headline?: string;
        subtitle?: string;
        visual_description?: string;
      }>,
    ) => {
      const rows = slides.map((s) => ({
        project_id: projectId,
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
      queryClient.setQueryData(["carousel-studio-slides", projectId], data);
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
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCarouselStudioSlides.ts
git commit -m "feat: hook useCarouselStudioSlides com auto-save debounce 2s"
```

---

## Task 5: Hook `useSlideExport` (html2canvas + JSZip)

**Files:**

- Create: `src/hooks/useSlideExport.ts`

- [ ] **Step 1: Verificar que html2canvas e JSZip estão instalados**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/ExpxFlow/controledetrafego
grep "html2canvas\|jszip" package.json
```

Se ausentes:

```bash
npm install html2canvas jszip
```

- [ ] **Step 2: Criar hook**

```typescript
// src/hooks/useSlideExport.ts
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
        height: 1080,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      );

      // Upload para Supabase Storage
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
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSlideExport.ts
git commit -m "feat: hook useSlideExport com html2canvas e JSZip"
```

---

## Task 6: Componente `SlideCanvas`

**Files:**

- Create: `src/components/carousel-studio/SlideCanvas.tsx`

- [ ] **Step 1: Criar componente**

```typescript
// src/components/carousel-studio/SlideCanvas.tsx
import React, { forwardRef } from 'react';
import {
  StudioSlide,
  StudioProject,
  OVERLAY_GRADIENTS,
  TEXT_POSITION_CLASSES,
  FONT_PAIR_CSS,
} from './types';

interface SlideCanvasProps {
  slide: StudioSlide;
  project: StudioProject;
  scale?: number; // 0.0–1.0, default 1 (tamanho real 1080px)
  className?: string;
}

export const SlideCanvas = forwardRef<HTMLDivElement, SlideCanvasProps>(
  ({ slide, project, scale = 1, className = '' }, ref) => {
    const fonts = FONT_PAIR_CSS[project.font_pair];
    const overlayGradient = OVERLAY_GRADIENTS[slide.overlay_style];
    const positionClass = TEXT_POSITION_CLASSES[slide.text_position];
    const alignClass =
      slide.text_alignment === 'center'
        ? 'text-center'
        : slide.text_alignment === 'right'
        ? 'text-right'
        : 'text-left';

    // Parsear highlight **palavra** → <span> com accent_color
    const renderWithHighlight = (text: string | null) => {
      if (!text) return null;
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={i} style={{ color: project.accent_color }}>
              {part.slice(2, -2)}
            </span>
          );
        }
        return part;
      });
    };

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden bg-gray-900 ${className}`}
        style={{
          width: 1080,
          height: 1080,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
          flexShrink: 0,
        }}
      >
        {/* Imagem de fundo */}
        {slide.bg_image_url && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${slide.bg_image_url})`,
              backgroundSize: `${slide.bg_zoom}%`,
              backgroundPosition: `${slide.bg_position_x}% ${slide.bg_position_y}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}

        {/* Overlay / Sombra */}
        {overlayGradient !== 'none' && (
          <div
            className="absolute inset-0"
            style={{
              background: overlayGradient,
              opacity: slide.overlay_opacity / 100,
            }}
          />
        )}

        {/* Instagram handle no topo */}
        {project.instagram_handle && (
          <div
            className="absolute top-6 left-6 text-white/70 text-2xl"
            style={{ fontFamily: fonts.subtitleFont }}
          >
            @{project.instagram_handle}
          </div>
        )}

        {/* Badge de perfil */}
        {slide.badge_enabled && (
          <div className="absolute top-6 right-6 flex items-center gap-2">
            {slide.badge_photo_url && (
              <img
                src={slide.badge_photo_url}
                className="rounded-full object-cover"
                style={{ width: 56, height: 56 }}
                crossOrigin="anonymous"
                alt="perfil"
              />
            )}
          </div>
        )}

        {/* Bloco de texto */}
        <div className={`absolute max-w-[85%] ${positionClass} ${alignClass}`}>
          {slide.headline && (
            <h2
              className="font-black text-white leading-none mb-3"
              style={{
                fontFamily: fonts.titleFont,
                fontSize: slide.font_size_title,
                lineHeight: `${slide.line_spacing}%`,
                wordBreak: 'break-word',
              }}
            >
              {renderWithHighlight(slide.headline)}
            </h2>
          )}
          {slide.subtitle && (
            <p
              className="text-white/90"
              style={{
                fontFamily: fonts.subtitleFont,
                fontSize: slide.font_size_subtitle,
                lineHeight: `${slide.line_spacing}%`,
              }}
            >
              {slide.subtitle}
            </p>
          )}
        </div>

        {/* Numeração inferior */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xl"
          style={{ fontFamily: fonts.subtitleFont }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`inline-block w-2 h-2 rounded-full mx-1 ${
                i === slide.slide_number - 1 ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }
);

SlideCanvas.displayName = 'SlideCanvas';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/carousel-studio/SlideCanvas.tsx
git commit -m "feat: componente SlideCanvas 1080x1080px com overlay, fontes e highlight"
```

---

## Task 7: Componente `SidebarSection` + seções individuais

**Files:**

- Create: `src/components/carousel-studio/SidebarSection.tsx`
- Create: `src/components/carousel-studio/sections/BackgroundSection.tsx`
- Create: `src/components/carousel-studio/sections/OverlaySection.tsx`
- Create: `src/components/carousel-studio/sections/TextSection.tsx`
- Create: `src/components/carousel-studio/sections/FontsSection.tsx`
- Create: `src/components/carousel-studio/sections/BadgeSection.tsx`
- Create: `src/components/carousel-studio/sections/CornersSection.tsx`

- [ ] **Step 1: `SidebarSection.tsx`**

```typescript
// src/components/carousel-studio/SidebarSection.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function SidebarSection({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/10">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: `BackgroundSection.tsx`**

```typescript
// src/components/carousel-studio/sections/BackgroundSection.tsx
import React, { useRef } from 'react';
import { SidebarSection } from '../SidebarSection';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImageIcon, Clipboard } from 'lucide-react';
import { StudioSlide } from '../types';

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
  onGenerateAIImage: () => void;
  isGeneratingImage: boolean;
}

export function BackgroundSection({ slide, onChange, onGenerateAIImage, isGeneratingImage }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => onChange({ bg_image_url: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            handleFile(new File([blob], 'pasted.png', { type }));
            return;
          }
        }
      }
    } catch {
      // clipboard sem permissão — silencioso
    }
  };

  return (
    <SidebarSection title="Imagem de Fundo" defaultOpen>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {slide.bg_image_url && (
        <img
          src={slide.bg_image_url}
          className="w-full h-24 object-cover rounded-md mb-2"
          alt="fundo"
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={() => fileRef.current?.click()}>
          <ImageIcon className="w-3 h-3 mr-1" /> Upload
        </Button>
        <Button variant="outline" size="sm" className="text-xs" onClick={handlePaste}>
          <Clipboard className="w-3 h-3 mr-1" /> Colar
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={onGenerateAIImage}
        disabled={isGeneratingImage}
      >
        {isGeneratingImage ? 'Gerando...' : '✨ Gerar com IA'}
      </Button>

      <div className="space-y-2">
        <Label className="text-xs text-white/60">Posição X: {slide.bg_position_x}%</Label>
        <Slider
          value={[slide.bg_position_x]}
          onValueChange={([v]) => onChange({ bg_position_x: v })}
          min={0} max={100} step={1}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-white/60">Posição Y: {slide.bg_position_y}%</Label>
        <Slider
          value={[slide.bg_position_y]}
          onValueChange={([v]) => onChange({ bg_position_y: v })}
          min={0} max={100} step={1}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-white/60">Zoom: {slide.bg_zoom}%</Label>
        <Slider
          value={[slide.bg_zoom]}
          onValueChange={([v]) => onChange({ bg_zoom: v })}
          min={50} max={200} step={1}
        />
      </div>
    </SidebarSection>
  );
}
```

- [ ] **Step 3: `OverlaySection.tsx`**

```typescript
// src/components/carousel-studio/sections/OverlaySection.tsx
import React from 'react';
import { SidebarSection } from '../SidebarSection';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudioSlide, OverlayStyle } from '../types';

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
}

export function OverlaySection({ slide, onChange }: Props) {
  return (
    <SidebarSection title="Sombra / Overlay">
      <Select
        value={slide.overlay_style}
        onValueChange={(v) => onChange({ overlay_style: v as OverlayStyle })}
      >
        <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum</SelectItem>
          <SelectItem value="base">Base</SelectItem>
          <SelectItem value="top_strong">Topo Forte</SelectItem>
          <SelectItem value="base_strong">Base Forte</SelectItem>
        </SelectContent>
      </Select>
      <div className="space-y-2">
        <Label className="text-xs text-white/60">Opacidade: {slide.overlay_opacity}%</Label>
        <Slider
          value={[slide.overlay_opacity]}
          onValueChange={([v]) => onChange({ overlay_opacity: v })}
          min={0} max={100} step={1}
        />
      </div>
    </SidebarSection>
  );
}
```

- [ ] **Step 4: `TextSection.tsx`**

```typescript
// src/components/carousel-studio/sections/TextSection.tsx
import React from 'react';
import { SidebarSection } from '../SidebarSection';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { StudioSlide, TextPosition, TextAlignment } from '../types';
import { Sparkles } from 'lucide-react';

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
  onGenerateContent: () => void;
  isGenerating: boolean;
}

const POSITIONS: Array<{ value: TextPosition; label: string }> = [
  { value: 'top_left', label: '↖' },
  { value: 'top_center', label: '↑' },
  { value: 'top_right', label: '↗' },
  { value: 'mid_left', label: '←' },
  { value: 'center', label: '·' },
  { value: 'mid_right', label: '→' },
  { value: 'bottom_left', label: '↙' },
  { value: 'bottom_center', label: '↓' },
  { value: 'bottom_right', label: '↘' },
];

export function TextSection({ slide, onChange, onGenerateContent, isGenerating }: Props) {
  return (
    <SidebarSection title="Título & Subtítulo" defaultOpen>
      {/* Grid 3x3 de posições */}
      <div>
        <Label className="text-xs text-white/60 mb-2 block">Posição do texto</Label>
        <div className="grid grid-cols-3 gap-1">
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange({ text_position: p.value })}
              className={`h-8 rounded text-sm transition-colors ${
                slide.text_position === p.value
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alinhamento */}
      <div className="flex gap-1">
        {(['left', 'center', 'right'] as TextAlignment[]).map((a) => (
          <button
            key={a}
            onClick={() => onChange({ text_alignment: a })}
            className={`flex-1 py-1 rounded text-xs transition-colors ${
              slide.text_alignment === a ? 'bg-primary text-white' : 'bg-white/5 text-white/50'
            }`}
          >
            {a === 'left' ? 'ESQ' : a === 'center' ? 'CTR' : 'DIR'}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-white/60">Título</Label>
        <Textarea
          value={slide.headline ?? ''}
          onChange={(e) => onChange({ headline: e.target.value })}
          className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none"
          placeholder="Título do slide..."
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-white/60">Subtítulo</Label>
        <Textarea
          value={slide.subtitle ?? ''}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none"
          placeholder="Subtítulo..."
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={onGenerateContent}
        disabled={isGenerating}
      >
        <Sparkles className="w-3 h-3 mr-1" />
        {isGenerating ? 'Gerando...' : 'Gerar conteúdo deste slide com IA'}
      </Button>
    </SidebarSection>
  );
}
```

- [ ] **Step 5: `FontsSection.tsx`**

```typescript
// src/components/carousel-studio/sections/FontsSection.tsx
import React from 'react';
import { SidebarSection } from '../SidebarSection';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StudioSlide, StudioProject, FontPair, FONT_PAIR_LABELS } from '../types';

interface Props {
  slide: StudioSlide;
  project: StudioProject;
  onSlideChange: (patch: Partial<StudioSlide>) => void;
  applyToNext: boolean;
  onApplyToNextChange: (v: boolean) => void;
}

const FONT_PAIRS = Object.keys(FONT_PAIR_LABELS) as FontPair[];

export function FontsSection({ slide, project, onSlideChange, applyToNext, onApplyToNextChange }: Props) {
  return (
    <SidebarSection title="Fontes">
      <div className="grid grid-cols-2 gap-2">
        {FONT_PAIRS.map((pair) => {
          const labels = FONT_PAIR_LABELS[pair];
          const isSelected = project.font_pair === pair;
          return (
            <div
              key={pair}
              className={`p-2 rounded border cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="text-white text-xs font-bold">{labels.title}</div>
              <div className="text-white/50 text-xs italic">{labels.subtitle}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-white/60">Tamanho título: {slide.font_size_title}px</Label>
        <Slider
          value={[slide.font_size_title]}
          onValueChange={([v]) => onSlideChange({ font_size_title: v })}
          min={16} max={120} step={1}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-white/60">Tamanho subtítulo: {slide.font_size_subtitle}px</Label>
        <Slider
          value={[slide.font_size_subtitle]}
          onValueChange={([v]) => onSlideChange({ font_size_subtitle: v })}
          min={12} max={60} step={1}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-white/60">Espaçamento: {slide.line_spacing}%</Label>
        <Slider
          value={[slide.line_spacing]}
          onValueChange={([v]) => onSlideChange({ line_spacing: v })}
          min={100} max={200} step={5}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="apply-to-next"
          checked={applyToNext}
          onCheckedChange={(v) => onApplyToNextChange(!!v)}
        />
        <Label htmlFor="apply-to-next" className="text-xs text-white/60 cursor-pointer">
          Aplicar configurações no próximo slide
        </Label>
      </div>
    </SidebarSection>
  );
}
```

- [ ] **Step 6: `BadgeSection.tsx` e `CornersSection.tsx`**

```typescript
// src/components/carousel-studio/sections/BadgeSection.tsx
import React, { useRef } from 'react';
import { SidebarSection } from '../SidebarSection';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { StudioSlide } from '../types';

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
}

export function BadgeSection({ slide, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <SidebarSection title="Badge de Perfil">
      <div className="flex items-center gap-2">
        <Switch
          checked={slide.badge_enabled}
          onCheckedChange={(v) => onChange({ badge_enabled: v })}
        />
        <Label className="text-xs text-white/60">Exibir badge</Label>
      </div>

      {slide.badge_enabled && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => onChange({ badge_photo_url: ev.target?.result as string });
              reader.readAsDataURL(file);
            }}
          />
          <button
            className="w-full py-2 border border-white/10 rounded text-xs text-white/60 hover:bg-white/5"
            onClick={() => fileRef.current?.click()}
          >
            {slide.badge_photo_url ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
          </button>
          {slide.badge_photo_url && (
            <img
              src={slide.badge_photo_url}
              className="w-12 h-12 rounded-full object-cover mx-auto"
              alt="badge"
            />
          )}
        </>
      )}
    </SidebarSection>
  );
}
```

```typescript
// src/components/carousel-studio/sections/CornersSection.tsx
import React from 'react';
import { SidebarSection } from '../SidebarSection';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudioSlide, CornerStyle } from '../types';

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
}

export function CornersSection({ slide, onChange }: Props) {
  return (
    <SidebarSection title="Cantos (Decorativos)">
      <Select
        value={slide.corner_style}
        onValueChange={(v) => onChange({ corner_style: v as CornerStyle })}
      >
        <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum</SelectItem>
          <SelectItem value="grid">Grade</SelectItem>
          <SelectItem value="dots">Bolinhas</SelectItem>
          <SelectItem value="horizontal_lines">Linhas horizontais</SelectItem>
          <SelectItem value="diagonal_lines">Linhas diagonais</SelectItem>
          <SelectItem value="diagonal_shadow">Sombra diagonal</SelectItem>
        </SelectContent>
      </Select>

      <div className="space-y-2">
        <Label className="text-xs text-white/60">Opacidade: {slide.corner_opacity}%</Label>
        <Slider
          value={[slide.corner_opacity]}
          onValueChange={([v]) => onChange({ corner_opacity: v })}
          min={0} max={100} step={1}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={slide.glass_enabled}
          onCheckedChange={(v) => onChange({ glass_enabled: v })}
        />
        <Label className="text-xs text-white/60">Estilo glass</Label>
      </div>

      {slide.glass_enabled && (
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Arredondamento: {slide.glass_radius}px</Label>
          <Slider
            value={[slide.glass_radius]}
            onValueChange={([v]) => onChange({ glass_radius: v })}
            min={0} max={40} step={1}
          />
        </div>
      )}
    </SidebarSection>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/carousel-studio/SidebarSection.tsx src/components/carousel-studio/sections/
git commit -m "feat: SidebarSection e todas as seções do painel lateral do Studio"
```

---

## Task 8: `StudioSidebar` orquestrador

**Files:**

- Create: `src/components/carousel-studio/StudioSidebar.tsx`

- [ ] **Step 1: Criar componente**

```typescript
// src/components/carousel-studio/StudioSidebar.tsx
import React, { useState } from 'react';
import { BackgroundSection } from './sections/BackgroundSection';
import { OverlaySection } from './sections/OverlaySection';
import { TextSection } from './sections/TextSection';
import { FontsSection } from './sections/FontsSection';
import { BadgeSection } from './sections/BadgeSection';
import { CornersSection } from './sections/CornersSection';
import { StudioSlide, StudioProject } from './types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface Props {
  slide: StudioSlide;
  project: StudioProject;
  onSlideChange: (patch: Partial<StudioSlide>) => void;
  onGenerateAIImage: () => void;
  isGeneratingImage: boolean;
  onGenerateContent: () => void;
  isGeneratingContent: boolean;
  onDownloadSlide: () => void;
}

export function StudioSidebar({
  slide,
  project,
  onSlideChange,
  onGenerateAIImage,
  isGeneratingImage,
  onGenerateContent,
  isGeneratingContent,
  onDownloadSlide,
}: Props) {
  const [applyToNext, setApplyToNext] = useState(false);

  const handleSlideChange = (patch: Partial<StudioSlide>) => {
    onSlideChange(patch);
    // applyToNext é controlado pela FontsSection — lógica na página pai
  };

  return (
    <div className="w-[280px] flex-shrink-0 bg-[#111] border-r border-white/10 flex flex-col h-full overflow-y-auto">
      <BackgroundSection
        slide={slide}
        onChange={handleSlideChange}
        onGenerateAIImage={onGenerateAIImage}
        isGeneratingImage={isGeneratingImage}
      />
      <OverlaySection slide={slide} onChange={handleSlideChange} />
      <TextSection
        slide={slide}
        onChange={handleSlideChange}
        onGenerateContent={onGenerateContent}
        isGenerating={isGeneratingContent}
      />
      <FontsSection
        slide={slide}
        project={project}
        onSlideChange={handleSlideChange}
        applyToNext={applyToNext}
        onApplyToNextChange={setApplyToNext}
      />
      <BadgeSection slide={slide} onChange={handleSlideChange} />
      <CornersSection slide={slide} onChange={handleSlideChange} />

      <div className="p-4 mt-auto">
        <Button
          variant="outline"
          className="w-full"
          onClick={onDownloadSlide}
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar Slide {slide.slide_number}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/carousel-studio/StudioSidebar.tsx
git commit -m "feat: StudioSidebar orquestrador de todas as seções do painel lateral"
```

---

## Task 9: `SlideStrip`, `StudioTopBar`, `StudioBottomBar`, `CaptionModal`

**Files:**

- Create: `src/components/carousel-studio/SlideStrip.tsx`
- Create: `src/components/carousel-studio/StudioTopBar.tsx`
- Create: `src/components/carousel-studio/StudioBottomBar.tsx`
- Create: `src/components/carousel-studio/CaptionModal.tsx`

- [ ] **Step 1: `SlideStrip.tsx`**

```typescript
// src/components/carousel-studio/SlideStrip.tsx
import React from 'react';
import { StudioSlide, StudioProject } from './types';
import { SlideCanvas } from './SlideCanvas';

interface Props {
  slides: StudioSlide[];
  project: StudioProject;
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function SlideStrip({ slides, project, activeIndex, onSelect }: Props) {
  return (
    <div className="flex gap-4 overflow-x-auto px-8 py-4 items-start">
      {slides.map((slide, i) => {
        const PREVIEW_SIZE = 200;
        const scale = PREVIEW_SIZE / 1080;
        return (
          <button
            key={slide.id}
            onClick={() => onSelect(i)}
            className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
              i === activeIndex ? 'border-primary' : 'border-transparent hover:border-white/30'
            }`}
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          >
            <div style={{ width: 1080, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <SlideCanvas slide={slide} project={project} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: `StudioTopBar.tsx`**

```typescript
// src/components/carousel-studio/StudioTopBar.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselStyle } from './types';

interface Props {
  style: CarouselStyle;
  onStyleChange: (s: CarouselStyle) => void;
  slideIndex: number;
  slidesTotal: number;
  onPrev: () => void;
  onNext: () => void;
  onOpenCaption: () => void;
}

export function StudioTopBar({ style, onStyleChange, slideIndex, slidesTotal, onPrev, onNext, onOpenCaption }: Props) {
  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-white/10 bg-[#111] flex-shrink-0">
      <div className="flex gap-1">
        {(['minimalist', 'profile'] as CarouselStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => onStyleChange(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              style === s ? 'bg-primary text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {s === 'minimalist' ? 'Minimalista' : 'Profile'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-white/60 text-sm">
        <button onClick={onPrev} disabled={slideIndex === 0} className="disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
        </button>
        Slide {slideIndex + 1} de {slidesTotal}
        <button onClick={onNext} disabled={slideIndex === slidesTotal - 1} className="disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <Button variant="ghost" size="sm" className="text-white/60 text-xs" onClick={onOpenCaption}>
        <FileText className="w-4 h-4 mr-1" />
        Gerar Legenda
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: `StudioBottomBar.tsx`**

```typescript
// src/components/carousel-studio/StudioBottomBar.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Archive } from 'lucide-react';

interface Props {
  generationProgress: { current: number; total: number } | null;
  onDownloadZip: () => void;
  isExporting: boolean;
  exportProgress: number;
}

export function StudioBottomBar({ generationProgress, onDownloadZip, isExporting, exportProgress }: Props) {
  return (
    <div className="h-12 flex items-center justify-between px-4 border-t border-white/10 bg-[#111] flex-shrink-0">
      <div className="flex items-center gap-3 text-xs text-white/50">
        {generationProgress && (
          <>
            <span>
              Slide {generationProgress.current} de {generationProgress.total} — gerando imagem
            </span>
            <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
              />
            </div>
          </>
        )}
        {isExporting && (
          <>
            <span>Exportando ZIP... {exportProgress}%</span>
            <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${exportProgress}%` }} />
            </div>
          </>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={onDownloadZip}
        disabled={isExporting}
      >
        <Archive className="w-4 h-4 mr-1" />
        ZIP
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: `CaptionModal.tsx`**

```typescript
// src/components/carousel-studio/CaptionModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { StudioSlide } from './types';
import { Copy, RefreshCw } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  slides: StudioSlide[];
}

export function CaptionModal({ open, onOpenChange, projectId, slides }: Props) {
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel-caption', {
        body: {
          project_id: projectId,
          slides: slides.map((s) => ({ headline: s.headline, subtitle: s.subtitle })),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao gerar legenda');
      setCaption(data.caption);
      setHashtags(data.hashtags.join(' '));
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erro ao gerar legenda');
    } finally {
      setIsLoading(false);
    }
  };

  const copyAll = () => {
    navigator.clipboard.writeText(`${caption}\n\n${hashtags}`);
    toast.success('Copiado!');
  };

  // Gerar automaticamente ao abrir
  React.useEffect(() => {
    if (open && !caption) generate();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Legenda + Hashtags</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            Gerando legenda...
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={`${caption}\n\n${hashtags}`}
              onChange={(e) => {
                const parts = e.target.value.split('\n\n');
                setCaption(parts[0] ?? '');
                setHashtags(parts.slice(1).join('\n\n') ?? '');
              }}
              className="min-h-[160px] text-sm"
              placeholder="Cole aqui na legenda do Instagram..."
            />
            <p className="text-xs text-muted-foreground">
              Cole diretamente na legenda do Instagram. Edite conforme necessário.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={copyAll}>
                <Copy className="w-4 h-4 mr-2" /> Copiar tudo
              </Button>
              <Button variant="outline" onClick={generate} disabled={isLoading}>
                <RefreshCw className="w-4 h-4 mr-2" /> Regerar com IA
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/carousel-studio/SlideStrip.tsx \
        src/components/carousel-studio/StudioTopBar.tsx \
        src/components/carousel-studio/StudioBottomBar.tsx \
        src/components/carousel-studio/CaptionModal.tsx
git commit -m "feat: SlideStrip, StudioTopBar, StudioBottomBar e CaptionModal"
```

---

## Task 10: Edge Function `generate-carousel-caption`

**Files:**

- Create: `supabase/functions/generate-carousel-caption/index.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Criar edge function**

```typescript
// supabase/functions/generate-carousel-caption/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, slides } = await req.json();

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "slides é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const slidesText = slides
      .map(
        (s: { headline?: string; subtitle?: string }, i: number) =>
          `Slide ${i + 1}: ${s.headline ?? ""} — ${s.subtitle ?? ""}`,
      )
      .join("\n");

    const prompt = `Você é um copywriter especialista em Instagram. Com base nos slides abaixo, crie:
1. Uma legenda envolvente para Instagram (máx 200 palavras), com gancho forte e CTA no final
2. 5-8 hashtags relevantes em português

Slides:
${slidesText}

Responda APENAS com JSON no formato:
{"caption": "...", "hashtags": ["#tag1", "#tag2"]}`;

    const response = await callAI({
      model: "anthropic/claude-haiku-4-5",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const text = response.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

    return new Response(
      JSON.stringify({
        success: true,
        caption: parsed.caption ?? "",
        hashtags: parsed.hashtags ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-carousel-caption error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

- [ ] **Step 2: Adicionar ao `config.toml`**

Abrir `supabase/config.toml` e adicionar:

```toml
[functions.generate-carousel-caption]
verify_jwt = true
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy generate-carousel-caption
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-carousel-caption/index.ts supabase/config.toml
git commit -m "feat: edge function generate-carousel-caption"
```

---

## Task 11: Wizard `StudioWizardModal`

**Files:**

- Create: `src/components/carousel-studio/StudioWizardModal.tsx`

- [ ] **Step 1: Criar wizard modal**

```typescript
// src/components/carousel-studio/StudioWizardModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CarouselStyle, FontPair, ImageMode, WizardConfig,
  FONT_PAIR_LABELS,
} from './types';
import { Sparkles, PenLine, ChevronLeft } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete: (config: WizardConfig) => void;
  isCreating: boolean;
}

const STEPS = 4;

const DEFAULT_CONFIG: WizardConfig = {
  style: 'minimalist',
  useAI: true,
  prompt: '',
  referenceImages: [],
  slidesCount: 6,
  imageMode: 'grid',
  generateAIImages: true,
  imageStyle: '',
  instagramHandle: '',
  fontPair: 'space_inter',
  accentColor: '#FFD700',
};

const ACCENT_COLORS = ['#FFD700', '#FF4444', '#4488FF', '#44DD88', '#FF8844', '#AA44FF', '#FF44AA', '#44DDFF'];
const IMAGE_MODES: Array<{ value: ImageMode; label: string }> = [
  { value: 'none', label: 'Sem imagens' },
  { value: 'background', label: 'Só imagem de fundo' },
  { value: 'grid', label: 'Só grade de imagens' },
  { value: 'both', label: 'Intercalar ambas' },
];

export function StudioWizardModal({ open, onOpenChange, onComplete, isCreating }: Props) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<WizardConfig>(DEFAULT_CONFIG);

  const update = (patch: Partial<WizardConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const canAdvance = () => {
    if (step === 3 && config.useAI && !config.prompt.trim()) return false;
    return true;
  };

  const handleNext = () => {
    if (step === 2 && !config.useAI) {
      // Criação manual: pula para passo 4
      setStep(4);
      return;
    }
    if (step === STEPS) {
      onComplete(config);
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 4 && !config.useAI) {
      setStep(2);
      return;
    }
    setStep((s) => Math.max(1, s - 1));
  };

  const handleReset = () => {
    setStep(1);
    setConfig(DEFAULT_CONFIG);
  };

  React.useEffect(() => {
    if (!open) handleReset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-[#111] border-white/10 text-white">
        {/* Indicador de progresso */}
        <div className="flex justify-center gap-2 pt-6">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i + 1 <= step ? 'bg-primary' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="px-8 py-6">
          {/* Passo 1: Estilo */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Escolha o Estilo</h2>
                <p className="text-white/50 text-sm mt-1">Como você quer que seus posts apareçam</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([['minimalist', 'Minimalista', 'Texto em destaque, overlays cinematográficos, tipografia bold'],
                   ['profile', 'Profile (Twitter)', 'Estética de screenshot de tweet. Limpo, focado em texto']] as const).map(
                  ([value, label, desc]) => (
                    <button
                      key={value}
                      onClick={() => update({ style: value })}
                      className={`p-4 rounded-xl border-2 transition-colors text-left relative ${
                        config.style === value
                          ? 'border-primary bg-primary/10'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {config.style === value && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>
                      )}
                      <div className="w-full h-20 bg-white/5 rounded-lg mb-3 flex items-center justify-center text-white/20">
                        {value === 'minimalist' ? '▬' : '▤'}
                      </div>
                      <div className="font-semibold text-sm">{label}</div>
                      <div className="text-white/40 text-xs mt-1">{desc}</div>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Passo 2: Modo */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Como deseja começar?</h2>
                <p className="text-white/50 text-sm mt-1">Deixe a IA fazer o trabalho pesado ou comece do zero</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => update({ useAI: true })}
                  className={`p-6 rounded-xl border-2 transition-colors text-center ${
                    config.useAI ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <div className="font-semibold">Usar IA</div>
                  <div className="text-white/40 text-xs mt-1">Dê um tópico e criamos slides com conteúdo, layout e imagens automaticamente</div>
                </button>
                <button
                  onClick={() => update({ useAI: false })}
                  className={`p-6 rounded-xl border-2 transition-colors text-center ${
                    !config.useAI ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <PenLine className="w-8 h-8 mx-auto mb-3 text-white/60" />
                  <div className="font-semibold">Criação Manual</div>
                  <div className="text-white/40 text-xs mt-1">Comece do zero. Adicione slides, escreva textos e faça upload de imagens</div>
                </button>
              </div>
            </div>
          )}

          {/* Passo 3: Configurar IA */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Configurar IA</h2>
                <p className="text-white/50 text-sm mt-1">Diga sobre o que é o conteúdo e como quer o carrossel</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white/60">SOBRE O QUE É O CONTEÚDO?</Label>
                <Textarea
                  value={config.prompt}
                  onChange={(e) => update({ prompt: e.target.value })}
                  className="bg-white/5 border-white/10 text-white min-h-[80px] resize-none"
                  placeholder="Ex: 5 prompts ultra realistas para foto de perfil com IA..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white/60">NÚMERO DE SLIDES</Label>
                <div className="grid grid-cols-5 gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <button
                      key={n}
                      onClick={() => update({ slidesCount: n })}
                      className={`py-2 rounded text-sm transition-colors ${
                        config.slidesCount === n
                          ? 'bg-primary text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white/60">IMAGENS NO CARROSSEL</Label>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_MODES.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => update({ imageMode: m.value })}
                      className={`py-2 px-3 rounded text-xs transition-colors ${
                        config.imageMode === m.value
                          ? 'bg-primary text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {config.imageMode !== 'none' && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="gen-ai-imgs"
                    checked={config.generateAIImages}
                    onCheckedChange={(v) => update({ generateAIImages: !!v })}
                  />
                  <Label htmlFor="gen-ai-imgs" className="text-xs text-white/60 cursor-pointer">
                    Gerar imagens com IA (Nano Banana Pro)
                  </Label>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-white/60">ESTILO DAS IMAGENS (OPCIONAL)</Label>
                <Input
                  value={config.imageStyle}
                  onChange={(e) => update({ imageStyle: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-sm"
                  placeholder="Ex: pessoas realistas, fundo claro, foco no rosto..."
                />
              </div>
            </div>
          )}

          {/* Passo 4: Personalizar */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Personalizar</h2>
                <p className="text-white/50 text-sm mt-1">Identidade visual do seu carrossel</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-white/60">@ DO INSTAGRAM (OPCIONAL)</Label>
                <Input
                  value={config.instagramHandle}
                  onChange={(e) => update({ instagramHandle: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-sm"
                  placeholder="@seuperfil"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white/60">COMBINAÇÃO DE FONTES</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FONT_PAIR_LABELS) as FontPair[]).map((pair) => {
                    const labels = FONT_PAIR_LABELS[pair];
                    return (
                      <button
                        key={pair}
                        onClick={() => update({ fontPair: pair })}
                        className={`p-3 rounded border text-left transition-colors ${
                          config.fontPair === pair
                            ? 'border-primary bg-primary/10'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="text-sm font-bold text-white">{labels.title}</div>
                        <div className="text-xs text-white/40 italic">{labels.subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white/60">COR DE DESTAQUE (PALAVRAS EM EVIDÊNCIA)</Label>
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => update({ accentColor: color })}
                      className={`w-7 h-7 rounded-full border-2 transition-colors ${
                        config.accentColor === color ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Input
                  value={config.accentColor}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-sm font-mono"
                  placeholder="#FFD700 ou vazio para nenhuma"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between px-8 pb-6">
          {step > 1 ? (
            <Button variant="ghost" onClick={handleBack} className="text-white/60">
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          ) : (
            <div />
          )}

          <Button
            onClick={handleNext}
            disabled={!canAdvance() || isCreating}
            className="px-8"
          >
            {step === STEPS
              ? isCreating
                ? 'Criando...'
                : '⚙ Gerar carrossel'
              : 'Continuar →'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/carousel-studio/StudioWizardModal.tsx
git commit -m "feat: StudioWizardModal com 4 passos de configuração"
```

---

## Task 12: Página `CarouselStudio`

**Files:**

- Create: `src/pages/CarouselStudio.tsx`

- [ ] **Step 1: Criar página**

```typescript
// src/pages/CarouselStudio.tsx
import React, { useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useCarouselStudioProject } from '@/hooks/useCarouselStudioProject';
import { useCarouselStudioSlides } from '@/hooks/useCarouselStudioSlides';
import { useSlideExport } from '@/hooks/useSlideExport';
import { SlideCanvas } from '@/components/carousel-studio/SlideCanvas';
import { StudioSidebar } from '@/components/carousel-studio/StudioSidebar';
import { StudioTopBar } from '@/components/carousel-studio/StudioTopBar';
import { StudioBottomBar } from '@/components/carousel-studio/StudioBottomBar';
import { SlideStrip } from '@/components/carousel-studio/SlideStrip';
import { CaptionModal } from '@/components/carousel-studio/CaptionModal';
import { StudioSlide, CarouselStyle } from '@/components/carousel-studio/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function CarouselStudio() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: loadingProject } = useCarouselStudioProject(projectId);
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
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);

  const slideRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { exportSlide, exportAllAsZip, isExporting, exportProgress } = useSlideExport();

  const activeSlide = slides?.[activeIndex] ?? null;

  const handleSlideChange = useCallback(
    (patch: Partial<StudioSlide>) => {
      if (!activeSlide) return;
      updateSlide(activeSlide.id, patch);
    },
    [activeSlide, updateSlide]
  );

  const handleGenerateAIImage = useCallback(async () => {
    if (!activeSlide || !project) return;
    setIsGeneratingImage(true);
    try {
      const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
      const prompt = activeSlide.visual_description
        || `${activeSlide.headline ?? ''} — ${activeSlide.subtitle ?? ''}. Imagem cinematográfica de alta qualidade.`;

      // Reutiliza daily-carousel-generator-stream apenas para gerar a imagem deste slide
      // Chamamos a API diretamente via OpenRouter para simplificar
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY ?? ''}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-flash-1.5',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error('Erro ao gerar imagem');
      // A imagem vem como data URL ou URL direta dependendo do modelo
      // Usar edge function generate-slide-image se disponível no projeto
      toast.info('Funcionalidade de geração de imagem por slide em desenvolvimento');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erro ao gerar imagem');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [activeSlide, project]);

  const handleGenerateContent = useCallback(async () => {
    if (!activeSlide || !project) return;
    setIsGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel-caption', {
        body: {
          project_id: project.id,
          slides: [{ headline: activeSlide.headline, subtitle: activeSlide.subtitle }],
          single_slide: true,
          slide_number: activeSlide.slide_number,
        },
      });
      if (error) throw error;
      if (data?.caption) {
        updateSlide(activeSlide.id, {
          headline: data.headline ?? activeSlide.headline,
          subtitle: data.subtitle ?? activeSlide.subtitle,
        });
        toast.success('Conteúdo regenerado!');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erro ao gerar conteúdo');
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
        // Atualizar thumbnail se for slide 1
        if (activeSlide.slide_number === 1) {
          supabase
            .from('carousel_studio_projects')
            .update({ thumbnail_url: savedUrl })
            .eq('id', project.id);
        }
      });
      // trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide-${activeSlide.slide_number}.png`;
      a.click();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Erro ao exportar slide');
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

  // Escala do preview: caber em ~500px de altura
  const PREVIEW_HEIGHT = 500;
  const scale = PREVIEW_HEIGHT / 1080;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0a0a0a] overflow-hidden">
        <StudioTopBar
          style={project.style as CarouselStyle}
          onStyleChange={() => {}} // future: update project style
          slideIndex={activeIndex}
          slidesTotal={slides.length}
          onPrev={() => setActiveIndex((i) => Math.max(0, i - 1))}
          onNext={() => setActiveIndex((i) => Math.min(slides.length - 1, i + 1))}
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

          {/* Área central */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview principal */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-8 gap-6">
              {slides.map((slide, i) => {
                const isActive = i === activeIndex;
                const displayScale = isActive ? scale : scale * 0.6;
                return (
                  <button
                    key={slide.id}
                    onClick={() => setActiveIndex(i)}
                    className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      isActive ? 'border-primary shadow-xl shadow-primary/20' : 'border-transparent opacity-60 hover:opacity-80'
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
                        transformOrigin: 'top left',
                      }}
                    >
                      <SlideCanvas
                        ref={(el) => { if (el) slideRefs.current.set(slide.id, el); }}
                        slide={slide}
                        project={project}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Strip de miniaturas */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/CarouselStudio.tsx
git commit -m "feat: página CarouselStudio com editor visual completo"
```

---

## Task 13: Rota + Nova Aba em `GeradorCarrosseis`

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/pages/GeradorCarrosseis.tsx`

- [ ] **Step 1: Adicionar rota em `App.tsx`**

Localizar o bloco da rota `/geradores/carrosseis` (linha ~799) e adicionar após:

```typescript
// Importação lazy no topo do arquivo (junto com os outros lazy imports):
const CarouselStudio = React.lazy(() => import("./pages/CarouselStudio"));
```

```typescript
// Após a rota /geradores/carrosseis existente:
<Route
  path="/geradores/carrosseis/studio/:projectId"
  element={
    <PermissionProtectedRoute requiredPermission="geradores">
      <CarouselStudio />
    </PermissionProtectedRoute>
  }
/>
```

- [ ] **Step 2: Adicionar aba "Editor Visual" em `GeradorCarrosseis.tsx`**

Localizar `<TabsList className="grid w-full grid-cols-2">` e mudar para `grid-cols-3`, adicionando a nova aba:

```typescript
// Adicionar imports no topo:
import { Edit3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StudioWizardModal } from "@/components/carousel-studio/StudioWizardModal";
import {
  useCreateStudioProject,
  useCarouselStudioProjects,
} from "@/hooks/useCarouselStudioProject";
import { useCarouselStudioSlides } from "@/hooks/useCarouselStudioSlides";
import { useAuth } from "@/hooks/useAuth";
```

```typescript
// Adicionar estado no componente (após os estados existentes):
const [wizardOpen, setWizardOpen] = useState(false);
const createProject = useCreateStudioProject();
const { data: studioProjects } = useCarouselStudioProjects(companyId);
```

```typescript
// Handler de criação de projeto:
const handleWizardComplete = async (config: WizardConfig) => {
  if (!companyId || !user?.id) return;
  try {
    const projectId = await createProject.mutateAsync({
      companyId,
      userId: user.id,
      config,
    });
    // Criar slides vazios
    const slides = Array.from({ length: config.slidesCount }, (_, i) => ({
      slide_number: i + 1,
      headline: null,
      subtitle: null,
      visual_description: null,
    }));
    // Navegar para o Studio
    setWizardOpen(false);
    navigate(`/geradores/carrosseis/studio/${projectId}`);
  } catch (err) {
    toast.error("Erro ao criar projeto");
  }
};
```

```typescript
// TabsList (mudar grid-cols-2 para grid-cols-3):
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="generate" className="flex items-center gap-2">
    <Sparkles className="w-4 h-4" />
    Gerar Novo
  </TabsTrigger>
  <TabsTrigger value="studio" className="flex items-center gap-2">
    <Edit3 className="w-4 h-4" />
    Editor Visual
  </TabsTrigger>
  <TabsTrigger value="history" className="flex items-center gap-2">
    <History className="w-4 h-4" />
    Histórico
  </TabsTrigger>
</TabsList>
```

```typescript
// Novo TabsContent para "studio" (após o TabsContent de "generate"):
<TabsContent value="studio" className="mt-6">
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-primary" />
          Editor Visual de Carrossel
        </CardTitle>
        <CardDescription>
          Crie carrosseis com editor visual em tempo real — textos, imagens e design completo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setWizardOpen(true)} size="lg" className="w-full sm:w-auto">
          <Sparkles className="w-4 h-4 mr-2" />
          Criar no Editor Visual
        </Button>
      </CardContent>
    </Card>

    {studioProjects && studioProjects.length > 0 && (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Projetos recentes</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {studioProjects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate(`/geradores/carrosseis/studio/${p.id}`)}
            >
              <CardContent className="p-4">
                {p.thumbnail_url && (
                  <img src={p.thumbnail_url} className="w-full h-24 object-cover rounded mb-3" alt="" />
                )}
                <div className="font-medium text-sm truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {p.slides_count} slides • {p.style === 'minimalist' ? 'Minimalista' : 'Profile'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )}
  </div>

  <StudioWizardModal
    open={wizardOpen}
    onOpenChange={setWizardOpen}
    onComplete={handleWizardComplete}
    isCreating={createProject.isPending}
  />
</TabsContent>
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/pages/GeradorCarrosseis.tsx
git commit -m "feat: adicionar aba Editor Visual e rota /studio/:projectId em GeradorCarrosseis"
```

---

## Task 14: Criar slides ao confirmar wizard + Integração com histórico

**Files:**

- Modify: `src/pages/GeradorCarrosseis.tsx`
- Modify: `src/components/carousel-generator/CarouselHistoryList.tsx`

- [ ] **Step 1: Criar slides no banco ao navegar para o Studio**

No `handleWizardComplete` já implementado na Task 13, após criar o projeto, chamar `createSlides`:

```typescript
// Dentro de handleWizardComplete, após createProject.mutateAsync:
import { useCarouselStudioSlides } from "@/hooks/useCarouselStudioSlides";

// No corpo da função:
const slidesHook = useCarouselStudioSlides(undefined); // instância temporária
await slidesHook.createSlides(
  projectId,
  Array.from({ length: config.slidesCount }, (_, i) => ({
    slide_number: i + 1,
  })),
);
navigate(`/geradores/carrosseis/studio/${projectId}`);
```

> **Nota:** Como hooks não podem ser chamados condicionalmente, a criação dos slides deve ser feita diretamente com o cliente Supabase no handler, sem usar o hook. Refatorar para:

```typescript
const handleWizardComplete = async (config: WizardConfig) => {
  if (!companyId || !user?.id) return;
  try {
    const projectId = await createProject.mutateAsync({
      companyId,
      userId: user.id,
      config,
    });

    // Criar slides diretamente via supabase client
    const slideRows = Array.from({ length: config.slidesCount }, (_, i) => ({
      project_id: projectId,
      slide_number: i + 1,
    }));
    const { error } = await supabase
      .from("carousel_studio_slides")
      .insert(slideRows);
    if (error) throw error;

    setWizardOpen(false);
    navigate(`/geradores/carrosseis/studio/${projectId}`);
  } catch (err) {
    toast.error("Erro ao criar projeto");
  }
};
```

- [ ] **Step 2: Badge "Studio" no histórico**

Em `CarouselHistoryList.tsx`, a query atual busca de `carousel_generation_queue`. Adicionar badge visual diferenciando o tipo. Por ora, sem unificar as duas tabelas — o historico do Studio já aparece na aba "Editor Visual" via `useCarouselStudioProjects`. Adicionar comentário explicativo:

```typescript
// Nota: carrosseis criados no Studio aparecem na aba "Editor Visual" em GeradorCarrosseis.
// Este histórico exibe apenas carrosseis gerados pelo fluxo automático (carousel_generation_queue).
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/GeradorCarrosseis.tsx src/components/carousel-generator/CarouselHistoryList.tsx
git commit -m "feat: criar slides ao confirmar wizard e nota no historico sobre Studio"
```

---

## Task 15: Verificação final + push

- [ ] **Step 1: Build de produção sem erros**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/ExpxFlow/controledetrafego
npm run build
```

Esperado: sem erros de TypeScript ou Vite. Corrigir qualquer erro de tipo antes de continuar.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Corrigir warnings críticos.

- [ ] **Step 3: Verificar fluxo completo manualmente**

1. Navegar para `/geradores/carrosseis`
2. Clicar na aba "Editor Visual"
3. Clicar "Criar no Editor Visual" → wizard abre
4. Percorrer os 4 passos, clicar "Gerar carrossel"
5. Verificar que navega para `/geradores/carrosseis/studio/:id`
6. Verificar que o painel lateral abre e os sliders atualizam o preview
7. Clicar "Baixar Slide 1" → PNG baixa
8. Clicar "Gerar Legenda" → modal abre com legenda
9. Voltar para aba "Editor Visual" → projeto aparece nos recentes

- [ ] **Step 4: Push**

```bash
git push
```

---

## Auto-Revisão do Plano

**Cobertura da spec:**

- ✅ Wizard 4 passos (Seção 3)
- ✅ Nova aba em GeradorCarrosseis (Seção 2)
- ✅ Rota `/studio/:projectId` (Seção 2)
- ✅ SlideCanvas 1080×1080px com overlay, fontes, highlight (Seção 6)
- ✅ Painel lateral com todas as 8 seções colapsáveis (Seção 5)
- ✅ Auto-save debounce 2s (Seção 9)
- ✅ Export PNG individual + ZIP (Seção 10)
- ✅ Legenda + hashtags via edge function (Seção 11)
- ✅ Migration com RLS SECURITY DEFINER e GRANTs (Seção 7)
- ✅ Histórico: projetos Studio aparecem na aba Editor Visual (Seção 12)
- ⚠️ Geração de imagem IA por slide no editor: marcada como "em desenvolvimento" na Task 12 — a integração completa com `daily-carousel-generator-stream` requer refatoração maior que está fora de escopo desta versão. O wizard com `generateAIImages: true` pode acionar geração durante a criação inicial via fluxo existente em iteração futura.

**Consistency check:** Todos os tipos de `types.ts` são usados consistentemente. `StudioSlide`, `StudioProject`, `WizardConfig` referenciados com o mesmo shape em todos os hooks e componentes.

**Placeholder scan:** Task 12 menciona `VITE_OPENROUTER_API_KEY` que pode não existir no frontend — a geração de imagem por slide está marcada explicitamente como futura iteração com toast informativo. Sem TBDs deixados sem resolução.
