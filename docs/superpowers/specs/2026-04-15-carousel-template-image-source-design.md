# Carousel Studio — Template Inteligente de Imagens (Image Source Tracking)

**Data:** 2026-04-15  
**Status:** Aprovado

## Visão Geral

Estender o sistema de templates do Carousel Studio para rastrear a **origem de cada imagem** por slide (`'ai'`, `'pexels'`, `'manual'`). Quando um template é aplicado na criação de um novo carrossel, o sistema replica automaticamente o padrão de imagem de cada slide: gera IA para os marcados como `'ai'`, busca Pexels automaticamente para `'pexels'`, e deixa vazio para `'manual'`.

---

## Banco de Dados

### Migration: `supabase/migrations/20260415100000_carousel_studio_slides_image_source.sql`

```sql
ALTER TABLE public.carousel_studio_slides
  ADD COLUMN IF NOT EXISTS bg_image_source      text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS content_image_source text DEFAULT NULL;
-- Valores válidos: 'ai' | 'pexels' | 'manual' | NULL (sem imagem)
-- Validação feita no frontend via TypeScript (sem enum no banco)
```

Não requer RLS adicional — a tabela já está coberta pela policy existente via `project_id → carousel_studio_projects.company_id`.

---

## Tipos TypeScript (`src/components/carousel-studio/types.ts`)

```typescript
export type ImageSource = "ai" | "pexels" | "manual";
```

Adicionado antes de `StudioSlide`. A interface `StudioSlide` ganha dois novos campos:

```typescript
/** Origem da imagem de fundo. Null = sem imagem. */
bg_image_source: ImageSource | null;
/** Origem das imagens de conteúdo. Null = sem imagem. */
content_image_source: ImageSource | null;
```

`TemplateSlideConfig` herda automaticamente via `Omit` — esses campos não estão na lista de exclusão, portanto são salvos e restaurados pelo template sem modificação adicional.

---

## Rastreamento de Origem (Instrumentação)

### `BackgroundSection.tsx`

| Ação do usuário                       | Patch enviado                                      |
| ------------------------------------- | -------------------------------------------------- |
| Clicar "Gerar com IA" → imagem gerada | `{ bg_image_url: url, bg_image_source: 'ai' }`     |
| Selecionar foto no Pexels             | `{ bg_image_url: url, bg_image_source: 'pexels' }` |
| Upload de arquivo ou colar imagem     | `{ bg_image_url: url, bg_image_source: 'manual' }` |
| Remover imagem (botão X)              | `{ bg_image_url: null, bg_image_source: null }`    |

Mesmo padrão para imagem compartilhada (`shared_bg_image_url` em `StudioProject`) — não precisa de rastreamento pois é nível de projeto, não de slide.

### `ImageContentSection.tsx`

| Ação do usuário                 | Patch enviado                                                 |
| ------------------------------- | ------------------------------------------------------------- |
| Gerar imagem de conteúdo com IA | `{ content_image_urls: url, content_image_source: 'ai' }`     |
| Selecionar do Pexels            | `{ content_image_urls: url, content_image_source: 'pexels' }` |
| Upload de arquivo               | `{ content_image_urls: url, content_image_source: 'manual' }` |
| Remover todas as imagens        | `{ content_image_urls: null, content_image_source: null }`    |

---

## Fluxo de Geração com Template (`CarouselStudio.tsx`)

### Lógica expandida no `generateAll`

O guard existente `if (!config.selectedTemplate)` é substituído por uma lógica por slide:

```typescript
// Para cada slide durante generateAll:
const effectiveBgSource = config.selectedTemplate
  ? templateSlide?.bg_image_source // origem definida pelo template
  : config.imageMode !== "none" && config.generateAIImages
    ? "ai"
    : null; // fluxo atual

const effectiveContentSource = config.selectedTemplate
  ? templateSlide?.content_image_source
  : (config.imageMode === "grid" || config.imageMode === "both") &&
      config.generateAIImages
    ? "ai"
    : null;
```

### Por origem:

| `bg_image_source` | Ação                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `'ai'`            | Gera imagem IA (fluxo atual via `generate-image` edge function)             |
| `'pexels'`        | Chama `fetchPexelsForSlide(slide)` — busca Pexels com `headline + subtitle` |
| `'manual'`        | Nenhuma ação — slide fica sem imagem                                        |
| `null`            | Nenhuma ação                                                                |

### `fetchPexelsForSlide(slide)` — nova função em `CarouselStudio.tsx`

```typescript
async function fetchPexelsForSlide(
  slide: { headline: string | null; subtitle: string | null },
  companyId: string,
  orientation: "portrait" | "landscape" | "square",
): Promise<string | null> {
  const query = [slide.headline, slide.subtitle].filter(Boolean).join(" ");
  if (!query.trim()) return null;

  const { data } = await supabase.functions.invoke("search-pexels-photos", {
    body: { query, per_page: 1, orientation, company_id: companyId },
  });

  if (!data?.success || !data?.photos?.[0]) return null;

  const rawUrl = data.photos[0].large; // edge function returns flat .large (not .src.large)
  return proxyExternalImage(rawUrl, companyId);
}
```

> Verificar o nome exato da edge function Pexels existente no projeto antes de implementar.

---

## Arquivos

| Arquivo                                                                      | Ação                                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `supabase/migrations/20260415100000_carousel_studio_slides_image_source.sql` | Criar                                                                 |
| `src/components/carousel-studio/types.ts`                                    | Modificar — `ImageSource` type + campos em `StudioSlide`              |
| `src/components/carousel-studio/sections/BackgroundSection.tsx`              | Modificar — rastrear `bg_image_source`                                |
| `src/components/carousel-studio/sections/ImageContentSection.tsx`            | Modificar — rastrear `content_image_source`                           |
| `src/pages/CarouselStudio.tsx`                                               | Modificar — `fetchPexelsForSlide` + lógica expandida no `generateAll` |
