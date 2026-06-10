# Carousel Studio — Instruções do Projeto (CLAUDE.md)

> Este arquivo guia o agente (Claude) na implementação do **Carousel Studio**, um SaaS standalone, multi-tenant, de criação de carrosséis visuais para Instagram. Leia `SPEC.md` (o quê) e `PLAN.md` (como/fases) antes de codar.

## Visão Geral

Carousel Studio é um editor visual WYSIWYG de carrosséis (slides 1080×1350px) com geração assistida por IA e export para PNG/ZIP. É **multi-tenant**: cada organização (empresa) tem dados e configuração isolados — **inclusive suas próprias chaves de IA e Pexels**.

Foi extraído de um módulo maior (ERP de marketing). Toda dependência de campanhas/CRM/content-plan/tarefas **não existe** aqui — a saída do editor é imagem + legenda.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Radix + lucide-react
- **Forms:** React Hook Form + Zod
- **Data:** TanStack React Query + Supabase JS
- **Auth/DB/Storage:** Supabase (`@supabase/ssr` para cookies em SSR)
- **IA:** OpenRouter via gateway próprio (`lib/ai/gateway.ts`)
- **Export:** html2canvas, jszip, jspdf
- **Toasts:** sonner
- **Deploy:** Vercel (front + API) + Supabase (DB/Auth/Storage; opcional Edge Functions)

## Comandos

```bash
npm run dev      # dev server
npm run build    # build produção
npm run lint     # ESLint
```

## Estrutura sugerida

```
src/
├── app/
│   ├── (auth)/login, signup
│   ├── onboarding/                 # criar org + config inicial
│   ├── app/                        # área autenticada
│   │   ├── page.tsx                # lista de projetos
│   │   ├── new/                    # wizard 4 passos
│   │   ├── studio/[projectId]/     # EDITOR (core)
│   │   ├── brands/                 # marcas internas ("clientes")
│   │   └── settings/               # config da org (IA keys, marca, membros)
│   └── api/
│       ├── ai/                     # generate-content, image, caption, pexels
│       └── proxy-image/            # recache de imagem externa (CORS)
├── components/
│   ├── ui/                         # shadcn (não editar à mão; usar CLI)
│   └── studio/                     # SlideCanvas, sidebar, sections, barras
│       └── sections/               # Background, Text, Fonts, Badge, Corners, ...
├── hooks/                          # useProjects, useSlides, useSlideExport...
├── lib/
│   ├── supabase/                   # client.ts (browser) + server.ts (ssr)
│   ├── ai/                         # gateway.ts + funções
│   └── studio/                     # types.ts, helpers de render
supabase/
├── migrations/
└── functions/                      # (opcional) Edge Functions Deno
```

## Modelo de Dados

Tenant: `organizations` → `memberships` / `org_settings` / `ai_model_configs` / `brand_profiles` → `carousel_projects` → `carousel_slides`. **Tudo** carrega `org_id`. Ver `SPEC.md §4` e o **Anexo A** (tipos exatos do editor).

## Convenções de Código

- **Path alias `@` → `./src`**. Sempre `@/` nos imports.
- **Idioma da UI em PT-BR** (toasts, labels, rotas em português onde fizer sentido). Código/identificadores em inglês.
- **Data fetching:** hooks em `hooks/` com `useQuery`/`useMutation`. Nome `use<Entidade><Ação>`.
- **Optimistic + debounce:** edições de slide atualizam o cache na hora e persistem após **2s** (`updateSlide`). Sempre `flushAll()` ao sair do editor (unmount).
- **Server vs Client:** Server Components por padrão; `"use client"` só onde há estado/efeito/eventos (o editor inteiro é client).
- **Secrets de IA nunca no client.** Chamadas de IA passam por Route Handlers/Server Actions que leem a key da org no backend.

## Regras OBRIGATÓRIAS (herdadas — não repetir os erros do projeto original)

1. **org_id em tudo + RLS.** Toda tabela de negócio tem `org_id` e RLS filtrando por `org_id IN (SELECT get_user_org_ids())`.
2. **RLS com SECURITY DEFINER.** **Nunca** subquery direta em tabela com RLS dentro de uma policy — usar função `get_user_org_ids()` (e `get_user_project_ids()` para slides) com `SECURITY DEFINER`. Subquery nested falha silenciosamente retornando **0 rows**.
3. **GRANT em toda tabela nova.** Após criar tabela com RLS: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tabela> TO authenticated`. Sem isso o front recebe **array vazio sem erro**.
4. **Sempre usar `org_id` correto** ao inserir/consultar — nunca o id de `memberships`. (Equivalente ao bug `activeCompany.company_id` vs `.id` do original.)
5. **CORS de imagens externas.** Toda `<img>` no canvas usa `crossOrigin="anonymous"`. Imagens de Pexels/IA precisam ser **recacheadas no storage da org** via `/api/proxy-image` antes do `html2canvas`, senão o canvas fica _tainted_ e o export falha.
6. **Fontes antes do export.** Sempre `await document.fonts.ready` + `document.fonts.load(...)` dos pesos usados **antes** de `html2canvas`. Render off-screen sem `transform` ancestral.
7. **Enums no banco.** Campos com `CHECK (... IN (...))` (style, overlay_style, corner_style, etc.) — atualizar o constraint no banco **antes** de usar novo valor no front.
8. **Config de IA é por org.** Resolver modelo/key sempre via gateway na ordem: default do código → `ai_model_configs` da org → key de `org_settings` → fallback de plataforma (env).

## Render do Canvas (detalhes críticos)

- Canvas é **HTML/CSS div-based**, fixo em **1080×1350px**, exibido escalado com `transform: scale()`. Cantos decorativos são **SVG inline**.
- Overlay usa `getOverlayGradient(style, opacity)` com **alpha inline** (não CSS `opacity`) — garante preto 100% no máximo.
- Realce de texto: parser de `**palavra**` → `<span>` com `highlight_color` (default = `accent_color`) e `highlight_weight`.
- Fundo compartilhado (panorâmico): `background-size`/`background-position` calculados por slide para efeito contínuo entre cards.
- Export: clonar o nó do slide num container `position:fixed; left:-99999px`, remover `transform`, aguardar imgs + fonts, `html2canvas({ scale:1, useCORS:true, allowTaint:true, width:1080, height:1350, backgroundColor:null })`. Upload em `org/{orgId}/carousel-studio/{projectId}/{slideNumber}.png` com `?v=Date.now()`.

## IA Gateway

- Provider padrão **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`), modelo default `google/gemini-2.5-flash`.
- `FUNCTION_DEFAULTS` define `primary`/`fallback` por função. Funções: `generate-carousel-content`, `generate-slide-image-prompt`, `generate-slide-image`, `generate-carousel-caption`, `search-pexels-photos`, (opcional) `analyze-carousel`, `fetch-webpage-content`.
- Streaming por SSE/`ReadableStream` para geração com progresso por slide.

## Definition of Done por feature

Ao concluir uma feature/módulo, criar uma skill de contexto em `.claude/skills/<modulo>/SKILL.md` cobrindo: visão geral, arquivos-chave, padrões estabelecidos, armadilhas/bugs, contexto não-óbvio. Commitar junto.

## Variáveis de Ambiente

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # só backend
OPENROUTER_API_KEY               # fallback de plataforma (orgs usam a própria)
PEXELS_API_KEY                   # fallback de plataforma
```

---

# Anexo A — Tipos exatos do editor (`lib/studio/types.ts`)

> Copiar integralmente. Trocar `company_id`→`org_id`, `client_id`→`brand_profile_id` em `StudioProject`.

```typescript
export type CarouselStyle = "minimalist" | "profile";
export type ImageMode = "none" | "background" | "grid" | "both";
export type OverlayStyle =
  | "none"
  | "base"
  | "top_strong"
  | "base_strong"
  | "left"
  | "right"
  | "left_strong"
  | "right_strong";
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
export type ContentImagePosition = "above_title" | "between" | "below_subtitle";
export type ContentImageLayout =
  | "1_thumb_16_9"
  | "1_square"
  | "2_vertical"
  | "2_thumb_16_9"
  | "4_square_2x2";
export type BadgePosition = TextPosition; // mesmas 9 posições
export type BadgeHandlePosition = "above" | "below" | "left" | "right";
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
  org_id: string; // era company_id
  brand_profile_id: string | null; // era client_id
  user_id: string;
  title: string;
  style: CarouselStyle;
  font_pair: FontPair;
  accent_color: string; // hex
  instagram_handle: string | null;
  slides_count: number;
  image_mode: ImageMode;
  prompt: string | null;
  image_style: string | null;
  generate_ai_images: boolean;
  status: ProjectStatus;
  thumbnail_url: string | null;
  shared_bg_image_url: string | null;
  shared_bg_zoom: number;
  shared_bg_position_x: number; // 0-100
  shared_bg_position_y: number; // 0-100
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
  // Fundo
  bg_image_url: string | null;
  bg_position_x: number; // 0-100
  bg_position_y: number; // 0-100
  bg_zoom: number; // %
  bg_color: string | null; // fallback sem imagem
  use_shared_bg: boolean;
  // Overlay
  overlay_style: OverlayStyle;
  overlay_opacity: number; // 0-100
  // Texto
  text_position: TextPosition;
  text_alignment: TextAlignment;
  font_size_title: number; // default 56
  font_size_subtitle: number; // default 41
  line_spacing: number; // % default 105
  text_padding_x: number;
  text_padding_y: number;
  // Realce **palavra**
  highlight_weight: string | null; // ex '700','900'; null herda do título
  highlight_color: string | null; // null usa accent_color
  // Cantos
  corner_style: CornerStyle;
  corner_opacity: number; // 0-100
  corner_mask: number; // bitmask TL/TR/BL/BR; default 15
  glass_enabled: boolean;
  glass_radius: number;
  // Badge
  badge_enabled: boolean;
  badge_photo_url: string | null;
  badge_position: BadgePosition;
  badge_size: number;
  badge_offset_x: number;
  badge_offset_y: number;
  badge_handle_enabled: boolean;
  badge_handle_position: BadgeHandlePosition;
  badge_handle_font_size: number;
  badge_name_enabled: boolean;
  badge_name_text: string | null;
  badge_name_font_size: number;
  badge_name_font_weight: string;
  badge_name_line_height: number; // espaçamento nome/handle
  // Imagens de conteúdo (até 4, separadas por vírgula em content_image_urls)
  content_image_urls: string | null;
  content_image_layout: ContentImageLayout;
  content_image_position: ContentImagePosition;
  content_image_radius: number;
  content_image_width: number; // 10-100
  content_image_gap: number;
  content_image_margin_top: number;
  content_image_margin_bottom: number;
  // Export
  exported_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WizardConfig {
  style: CarouselStyle;
  useAI: boolean;
  prompt: string;
  referenceImages: string[];
  slidesCount: number;
  imageMode: ImageMode;
  generateAIImages: boolean;
  imageStyle: string;
  instagramHandle: string;
  fontPair: FontPair;
  accentColor: string;
  brandProfileId: string | null; // era clientId
}

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

// getOverlayGradient(style, opacity) — usa alpha inline (não CSS opacity).
// BADGE_POSITION_STYLES e TEXT_POSITION_CLASSES — mapas de 9 posições.
// Ver arquivo original src/components/carousel-studio/types.ts (286 linhas) para corpo completo.
```

## Anexo B — Google Fonts a pré-carregar (export)

```
Caveat:400,500,600,700
DM Sans:400,500,700,900
Inter:400,500,600,700,800,900
Oswald:400,500,600,700
Outfit:400,500,600,700,800,900
Playfair Display:400,500,600,700,800,900
Raleway:400,500,600,700,800,900
Space Grotesk:400,500,600,700
Syne:400,500,600,700,800
```

Injetar `<link>` idempotente do Google Fonts, `await document.fonts.ready`, e `document.fonts.load()` dos pesos-chave antes de capturar.

## Anexo C — Arquivos de referência no projeto original

(Para portar 1:1; caminhos no repo Expx Flow original)

| Arquivo original                                                      | Vira                                          |
| --------------------------------------------------------------------- | --------------------------------------------- |
| `src/components/carousel-studio/types.ts`                             | `lib/studio/types.ts`                         |
| `src/components/carousel-studio/SlideCanvas.tsx` (646 ln)             | `components/studio/SlideCanvas.tsx`           |
| `src/components/carousel-studio/sections/*`                           | `components/studio/sections/*` (Client→Brand) |
| `src/components/carousel-studio/Studio{TopBar,Sidebar,BottomBar}.tsx` | idem                                          |
| `src/components/carousel-studio/StudioWizardModal.tsx` (728 ln)       | `app/app/new/*` (stepper)                     |
| `src/hooks/useCarouselStudioSlides.ts`                                | `hooks/useSlides.ts`                          |
| `src/hooks/useSlideExport.ts`                                         | `hooks/useSlideExport.ts`                     |
| `src/hooks/useCarouselStudioProject.ts`                               | `hooks/useProjects.ts`                        |
| `src/hooks/useCarouselGenerationStream.ts`                            | `hooks/useGenerationStream.ts`                |
| `supabase/functions/_shared/ai-gateway.ts`                            | `lib/ai/gateway.ts`                           |
| `supabase/functions/generate-carousel-caption/*`                      | `app/api/ai/caption/route.ts`                 |
| `supabase/functions/generate-carousel-slide-image-prompt/*`           | `app/api/ai/slide-image-prompt/route.ts`      |
| `supabase/functions/generate-slide-image/*`                           | `app/api/ai/generate-image/route.ts`          |
| `supabase/functions/search-pexels-photos/*`                           | `app/api/ai/pexels/route.ts`                  |
| `supabase/migrations/20260412000000_carousel_studio.sql` + extensões  | base do schema (trocar company→org)           |

```

```
