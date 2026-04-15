# Carousel Studio — Template Image Source Tracking Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track whether each slide's background and content images came from AI generation, Pexels, or manual upload — and replay that origin automatically when applying a template to a new carousel.

**Architecture:** Two new nullable columns (`bg_image_source`, `content_image_source`) on `carousel_studio_slides` record the image origin per slide. `BackgroundSection` and `ImageContentSection` patch these fields alongside every image change. In `generateAll` (CarouselStudio.tsx), when a template is active, each slide's sources override the global `imageMode` logic: AI sources trigger image generation, Pexels sources call `search-pexels-photos`, and manual/null sources skip.

**Tech Stack:** Supabase migrations (PostgreSQL), TypeScript, React 18, TanStack React Query, Supabase client (edge function invocations).

---

## Chunk 1: Data Layer

### Task 1: Migration — add image source columns to carousel_studio_slides

**Files:**

- Create: `supabase/migrations/20260415100000_carousel_studio_slides_image_source.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260415100000_carousel_studio_slides_image_source.sql

ALTER TABLE public.carousel_studio_slides
  ADD COLUMN IF NOT EXISTS bg_image_source      text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS content_image_source text DEFAULT NULL;

-- Valid values: 'ai' | 'pexels' | 'manual' | NULL (no image)
-- Validation is done in TypeScript — no DB enum needed
COMMENT ON COLUMN public.carousel_studio_slides.bg_image_source      IS 'Origin of the background image: ai, pexels, manual, or NULL';
COMMENT ON COLUMN public.carousel_studio_slides.content_image_source IS 'Origin of the content image(s): ai, pexels, manual, or NULL';
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with the SQL above.

- [ ] **Step 3: Verify columns exist**

Run via MCP execute_sql:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'carousel_studio_slides'
  AND column_name IN ('bg_image_source', 'content_image_source');
```

Expected: 2 rows returned, both `text` with `NULL` default.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260415100000_carousel_studio_slides_image_source.sql
git commit -m "feat: add bg_image_source + content_image_source columns to carousel_studio_slides"
```

---

### Task 2: TypeScript types — add ImageSource type and fields to StudioSlide

**Files:**

- Modify: `src/components/carousel-studio/types.ts`

**Context:** `TemplateSlideConfig = Omit<StudioSlide, ...excluded fields>`. Since `bg_image_source` and `content_image_source` are NOT in the exclusion list, they are automatically included in `TemplateSlideConfig` — no change needed to that type. `SaveTemplateModal.tsx` uses `EXCLUDED_SLIDE_FIELDS` set which also doesn't include these fields, so they are saved to template `slides_config` automatically.

- [ ] **Step 1: Add `ImageSource` type before the `StudioProject` interface**

In `src/components/carousel-studio/types.ts`, add after the existing type aliases (around line 70, before `StudioProject`):

```typescript
/** Origin of an image set on a slide. */
export type ImageSource = "ai" | "pexels" | "manual";
```

- [ ] **Step 2: Add the two new fields to `StudioSlide`**

In `src/components/carousel-studio/types.ts`, inside the `StudioSlide` interface (after `exported_image_url: string | null;` around line 165), add:

```typescript
/** Origin of the background image. Null = no image. */
bg_image_source: ImageSource | null;
/** Origin of the content image(s). Null = no image. */
content_image_source: ImageSource | null;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no type errors related to `StudioSlide`, `TemplateSlideConfig`, or `ImageSource`.

- [ ] **Step 4: Commit**

```bash
git add src/components/carousel-studio/types.ts
git commit -m "feat: add ImageSource type and bg/content image source fields to StudioSlide"
```

---

## Chunk 2: Manual Tracking in Sections

### Task 3: BackgroundSection.tsx — track bg_image_source on every user action

**Files:**

- Modify: `src/components/carousel-studio/sections/BackgroundSection.tsx`

**Context:** This component calls `onChange(patch)` to update the active slide. The `onChange` prop is `(patch: Partial<StudioSlide>) => void`. We add `bg_image_source` to every patch that sets or clears `bg_image_url`.

Actions to instrument:

1. `handleFile` (upload or paste) → `bg_image_source: 'manual'`
2. `handlePexelsSelect` (Pexels) → `bg_image_source: 'pexels'`
3. Remove button `onClick` → `bg_image_source: null`

**Note:** AI image generation for background is handled by `onGenerateAIImage` prop, which is implemented in `CarouselStudio.tsx` as `handleGenerateAIImage`. Source tracking for AI is done in Task 5 (in the parent).

- [ ] **Step 1: Update `handleFile` to include source**

Find the `handleFile` function (lines ~63-74). The `reader.onload` sets `bg_image_url`. Add `bg_image_source: 'manual'` to the individual (non-shared) branch:

```typescript
const handleFile = (file: File, shared = false) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const url = e.target?.result as string;
    if (shared) {
      onProjectChange({ shared_bg_image_url: url });
    } else {
      onChange({ bg_image_url: url, bg_image_source: "manual" });
    }
  };
  reader.readAsDataURL(file);
};
```

- [ ] **Step 2: Update `handlePaste` to include source**

Find `handlePaste` (lines ~76-91). In the non-shared branch where `handleFile` is called, the source is already set via `handleFile` above. Verify `handleFile(new File([blob], "pasted.png", { type }), shared)` is still called without changes — the `shared=false` default means the file handler above will set `'manual'`. No additional change needed here (the fix in Step 1 covers this path). Verify by reading: line ~91 calls `handleFile(new File([blob], ...), shared)`.

- [ ] **Step 3: Update `handlePexelsSelect` to include source**

Find `handlePexelsSelect` (lines ~122-133). Add `bg_image_source: 'pexels'` to the non-shared branch:

```typescript
const handlePexelsSelect = async (photo: PexelsPhoto) => {
  const rawUrl = photo.original || photo.large;
  const url = await proxyExternalImage(rawUrl, project.company_id);
  if (pexelsOpen === "shared") {
    onProjectChange({ shared_bg_image_url: url });
  } else {
    onChange({ bg_image_url: url, bg_image_source: "pexels" });
  }
  setPexelsOpen(null);
};
```

- [ ] **Step 4: Update the remove button to clear source**

Find the remove button JSX (lines ~209-218):

```tsx
onClick={() => onChange({ bg_image_url: null })}
```

Change to:

```tsx
onClick={() => onChange({ bg_image_url: null, bg_image_source: null })}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "BackgroundSection|bg_image_source" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/carousel-studio/sections/BackgroundSection.tsx
git commit -m "feat: track bg_image_source in BackgroundSection (manual, pexels, clear)"
```

---

### Task 4: ImageContentSection.tsx — track content_image_source on every user action

**Files:**

- Modify: `src/components/carousel-studio/sections/ImageContentSection.tsx`

**Context:** This component manages content images. It has its own AI generation inside (`handleGenerateAI`), file upload (`handleFileChange`), Pexels select (`handlePexelsSelect`), and remove (`handleRemove`). All these need to patch `content_image_source`.

The tricky part: a slide can have multiple content image URLs (comma-separated), all sharing ONE `content_image_source`. The source tracks the origin of the set, not individual URLs. When all URLs are removed (the toggle `setUrls([])`), clear the source.

- [ ] **Step 1: Update the toggle switch off to clear source**

Find the Switch `onCheckedChange` handler (around line 202-204):

```tsx
onCheckedChange={(v) => {
  if (!v) setUrls([]);
}}
```

Change to:

```tsx
onCheckedChange={(v) => {
  if (!v) onChange({ content_image_urls: null, content_image_source: null });
}}
```

- [ ] **Step 2: Update `handleFileChange` to set source to 'manual'**

Find `handleFileChange` (lines ~102-121). It calls `setUrls(next)`. Change it to:

```typescript
const handleFileChange = async (
  e: React.ChangeEvent<HTMLInputElement>,
  index: number,
) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = "";
  setUploadingSlot(index);
  try {
    const url = await uploadImageFile(file);
    const next = [...urls];
    next[index] = url;
    onChange({
      content_image_urls: next.filter(Boolean).join(",") || null,
      content_image_source: "manual",
    });
  } catch (err: unknown) {
    toast.error((err as Error).message || "Erro ao fazer upload da imagem");
  } finally {
    setUploadingSlot(null);
  }
};
```

- [ ] **Step 3: Update `handlePexelsSelect` to set source to 'pexels'**

Find `handlePexelsSelect` (lines ~144-153). It calls `setUrls(next)`. Change to:

```typescript
const handlePexelsSelect = async (photo: PexelsPhoto) => {
  if (pexelsSlot === null) return;
  const idx = pexelsSlot;
  setPexelsSlot(null);
  const url = await proxyExternalImage(photo.large, project.company_id);
  const next = [...urls];
  next[idx] = url;
  onChange({
    content_image_urls: next.filter(Boolean).join(",") || null,
    content_image_source: "pexels",
  });
  toast.success("Foto do Pexels adicionada");
};
```

- [ ] **Step 4: Update `handleGenerateAI` to set source to 'ai'**

Find `handleGenerateAI` (lines ~156-192). It calls `setUrls(next)`. After successful generation, change:

```typescript
// Replace: setUrls(next);
// With:
onChange({
  content_image_urls: next.filter(Boolean).join(",") || null,
  content_image_source: "ai",
});
toast.success("Imagem gerada!");
```

- [ ] **Step 5: Update `handleCopyFromBackground` to set source to 'manual'**

Find `handleCopyFromBackground` (lines ~133-142). It calls `setUrls(next)`. Change to:

```typescript
const handleCopyFromBackground = (index: number) => {
  if (!bgImageUrl) {
    toast.error("Este slide não tem imagem de fundo");
    return;
  }
  const next = [...urls];
  next[index] = bgImageUrl;
  onChange({
    content_image_urls: next.filter(Boolean).join(",") || null,
    content_image_source: "manual",
  });
  toast.success("Imagem de fundo copiada");
};
```

- [ ] **Step 6: Update `handleRemove` to clear source when last image is removed**

Find `handleRemove` (lines ~123-127):

```typescript
const handleRemove = (index: number) => {
  const next = [...urls];
  next.splice(index, 1);
  setUrls(next);
};
```

Change to:

```typescript
const handleRemove = (index: number) => {
  const next = [...urls];
  next.splice(index, 1);
  const joined = next.filter(Boolean).join(",") || null;
  onChange({
    content_image_urls: joined,
    content_image_source: joined ? slide.content_image_source : null,
  });
};
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "ImageContentSection|content_image_source" | head -20
```

Expected: no errors.

- [ ] **Step 8: Verify lint passes**

```bash
npm run lint -- src/components/carousel-studio/sections/ImageContentSection.tsx 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/carousel-studio/sections/ImageContentSection.tsx
git commit -m "feat: track content_image_source in ImageContentSection (ai, pexels, manual, clear)"
```

---

### Task 5: CarouselStudio.tsx — track bg_image_source: 'ai' in handleGenerateAIImage

**Files:**

- Modify: `src/pages/CarouselStudio.tsx` (lines ~570-620)

**Context:** When the user manually clicks "Gerar com IA" in BackgroundSection, `handleGenerateAIImage` is called in `CarouselStudio.tsx`. Currently it calls `updateSlide(activeSlide.id, { bg_image_url: data.image_url })` on line 612. Add `bg_image_source: 'ai'` to that patch.

- [ ] **Step 1: Update the updateSlide call in `handleGenerateAIImage`**

Find line ~612:

```typescript
updateSlide(activeSlide.id, { bg_image_url: data.image_url });
```

Change to:

```typescript
updateSlide(activeSlide.id, {
  bg_image_url: data.image_url,
  bg_image_source: "ai",
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "handleGenerateAIImage|bg_image_source" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CarouselStudio.tsx
git commit -m "feat: track bg_image_source='ai' when generating background image via handleGenerateAIImage"
```

---

## Chunk 3: Template-Aware Generation

### Task 6: CarouselStudio.tsx — add fetchPexelsForSlide helper

**Files:**

- Modify: `src/pages/CarouselStudio.tsx`

**Context:** When `generateAll` encounters a template slide with `bg_image_source === 'pexels'`, it needs to search Pexels using the slide's text as the query. Add a standalone async function `fetchPexelsForSlide` near the top of the module (above the component, after the imports).

The Pexels edge function is `search-pexels-photos`. Its request body accepts `{ query: string, per_page?: number, orientation?: "landscape" | "portrait" | "square", company_id: string }`. Response: `{ success: boolean, photos: Array<{ large: string, ... }> }`.

`proxyExternalImage` is already imported in `CarouselStudio.tsx` at line 33.

- [ ] **Step 1: Add the `fetchPexelsForSlide` function**

Find the import block end in `src/pages/CarouselStudio.tsx` (around line 33-50). Add the function after the imports, before the component:

```typescript
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

  const rawUrl: string = data.photos[0].large; // edge function normalizes to flat .large
  return proxyExternalImage(rawUrl, companyId);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "fetchPexelsForSlide" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CarouselStudio.tsx
git commit -m "feat: add fetchPexelsForSlide helper to CarouselStudio"
```

---

### Task 7: CarouselStudio.tsx — template-aware image source routing in generateAll

**Files:**

- Modify: `src/pages/CarouselStudio.tsx` (Phase 2 image generation block, lines ~221-521)

**Context:** Phase 2 currently runs only if `config.generateAIImages !== false && config.imageMode !== "none"`. Inside it, `getTarget(idx)` determines whether each slide gets a background or content image based on `imageMode`. When a template is active, we need per-slide source decisions instead.

**Type note:** `WizardConfig.selectedTemplate` is typed as `TemplateSlideConfig[] | null`. After Task 2 adds `bg_image_source` and `content_image_source` to `StudioSlide`, they are automatically included in `TemplateSlideConfig` (via `Omit`) — no cast needed.

**AI prompt note:** The template AI path uses a simpler prompt built from `headline + subtitle + visual_description + config.prompt`, skipping the separate visual-prompt-generation step used by the non-template path. This is intentional — the template path is optimized for speed; the non-template path's two-step LLM chain for prompt quality is its own optimization not needed here.

**New behavior:**

- When `config.selectedTemplate` is set: for each slide, read `templateSlide.bg_image_source` and `templateSlide.content_image_source`, and process each independently:
  - `'ai'` → generate AI image (existing logic)
  - `'pexels'` → call `fetchPexelsForSlide`
  - `'manual'` | `null` → skip
- When no template: keep the current logic entirely unchanged (the `getTarget` path, fallbacks, etc.)

The Phase 2 block starts at line ~221. The simplest approach is to wrap the current logic in an `else` branch of `if (config.selectedTemplate)`.

**Orientation mapping:** Use the same logic as `BackgroundSection.tsx` — default to `'portrait'` for background (4:5 is most common). For content, map from `slide.content_image_layout`:

- `'2_vertical'` → `'portrait'`
- `'1_square'` | `'4_square_2x2'` → `'square'`
- everything else → `'landscape'`

- [ ] **Step 1: Identify the Phase 2 block boundaries**

Read `src/pages/CarouselStudio.tsx` lines 221-521. The block is:

```typescript
// Phase 2: generate images slide by slide
// generateAIImages defaults to true — treat undefined as true
if (config.generateAIImages !== false && config.imageMode !== "none") {
  // ... entire Phase 2 code ...
}
```

- [ ] **Step 2: Add the template-aware branch before the existing Phase 2 block**

Replace the start of Phase 2 (`// Phase 2: ...` comment + `if (config.generateAIImages !== false && config.imageMode !== "none") {`) with:

```typescript
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
    if (bgSource === 'ai' || bgSource === 'pexels') {
      try {
        let bgUrl: string | null = null;

        if (bgSource === 'ai') {
          setGenerationProgress({
            current: i + 1,
            total,
            statusMessage: `Gerando imagem IA (fundo) — slide ${i + 1} de ${total}...`,
          });
          const prompt = [slideText.headline, slideText.subtitle, slide.visual_description, config.prompt]
            .filter(Boolean)
            .join(' — ') || `Slide ${i + 1}`;
          const { data: imgData, error: imgError } = await supabase.functions.invoke(
            'generate-image-ai',
            {
              body: {
                prompt,
                company_id: companyId,
                client_id: clientId,
                style: config.imageStyle || 'cinematic photography',
                background_only: true,
                aspect_ratio: '4:5',
              },
            },
          );
          if (!imgError && imgData?.success && imgData?.image_url) {
            bgUrl = imgData.image_url;
          } else {
            console.warn(`[template] slide ${i + 1} AI bg failed:`, imgError ?? imgData?.error);
          }
        } else {
          // pexels
          setGenerationProgress({
            current: i + 1,
            total,
            statusMessage: `Buscando no Pexels (fundo) — slide ${i + 1} de ${total}...`,
          });
          bgUrl = await fetchPexelsForSlide(slideText, companyId, 'portrait');
          if (!bgUrl) {
            console.warn(`[template] slide ${i + 1} Pexels bg: no result`);
          }
        }

        if (bgUrl) {
          updateSlide(slide.id, { bg_image_url: bgUrl, bg_image_source: bgSource });
        }
      } catch (err) {
        console.error(`[template] slide ${i + 1} bg error:`, err);
      }
    }

    // ── Content image ──
    if (contentSource === 'ai' || contentSource === 'pexels') {
      try {
        let contentUrl: string | null = null;
        const contentLayout = templateSlide?.content_image_layout ?? '1_thumb_16_9';
        const orientation: 'portrait' | 'landscape' | 'square' =
          contentLayout === '2_vertical'
            ? 'portrait'
            : contentLayout === '1_square' || contentLayout === '4_square_2x2'
              ? 'square'
              : 'landscape';

        if (contentSource === 'ai') {
          setGenerationProgress({
            current: i + 1,
            total,
            statusMessage: `Gerando imagem IA (conteúdo) — slide ${i + 1} de ${total}...`,
          });
          const prompt = [slideText.headline, slideText.subtitle, slide.visual_description, config.prompt]
            .filter(Boolean)
            .join(' — ') || `Slide ${i + 1}`;
          const { data: cData, error: cError } = await supabase.functions.invoke(
            'generate-image-ai',
            {
              body: {
                prompt,
                company_id: companyId,
                client_id: clientId,
                style: config.imageStyle || 'cinematic photography',
                background_only: true,
                aspect_ratio: orientation === 'portrait' ? '9:16' : orientation === 'square' ? '1:1' : '16:9',
              },
            },
          );
          if (!cError && cData?.success && cData?.image_url) {
            contentUrl = cData.image_url;
          } else {
            console.warn(`[template] slide ${i + 1} AI content failed:`, cError ?? cData?.error);
          }
        } else {
          // pexels
          setGenerationProgress({
            current: i + 1,
            total,
            statusMessage: `Buscando no Pexels (conteúdo) — slide ${i + 1} de ${total}...`,
          });
          contentUrl = await fetchPexelsForSlide(slideText, companyId, orientation);
          if (!contentUrl) {
            console.warn(`[template] slide ${i + 1} Pexels content: no result`);
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
} else if (config.generateAIImages !== false && config.imageMode !== "none") {
```

And at the end of the existing Phase 2 block closing `}`, add an extra `}` to close the new `else if`.

- [ ] **Step 3: Verify the Phase 2 block structure is correct**

Read lines 221-540 to confirm:

- New `if (config.selectedTemplate)` block is before the old block
- Old block is now `else if (config.generateAIImages !== false && config.imageMode !== "none")`
- All braces balanced

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Manual smoke test**

1. Start dev server: `npm run dev`
2. Open Carousel Studio in the browser
3. Create a carousel slide, set an AI background, set a Pexels content image → confirm source badges update (they won't be visible yet — the fields are only in the DB)
4. Check the browser console and Supabase logs to confirm `bg_image_source` and `content_image_source` columns are being set correctly
5. Save a template from this carousel
6. Create a new carousel using that template → confirm that during `generateAll`, the template-aware path runs and generates/fetches images per the recorded sources

- [ ] **Step 6: Commit**

```bash
git add src/pages/CarouselStudio.tsx
git commit -m "feat: template-aware image source routing in generateAll — ai/pexels/manual per slide"
```

---

## Final verification

- [ ] **Full build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ built in` with no errors.

- [ ] **Lint passes**

```bash
npm run lint 2>&1 | grep -v "^$" | tail -20
```

Expected: no new lint errors introduced.
