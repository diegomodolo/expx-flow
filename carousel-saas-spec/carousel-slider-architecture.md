# Arquitetura do Gerador de Carrossel — Foco em Sliders e Configurações de Slide

Documento de referência para replicar o sistema de configuração de slides do Carousel Studio.
Gerado em 2026-06-07 a partir da análise do código-fonte do Expx Flow.

---

## 1. Visão Geral da Arquitetura

O studio tem três camadas:

```
CarouselStudio (page)
  └── StudioSidebar           ← painel lateral de configuração
        └── 8 seções colapsáveis (SidebarSection)
              └── Slider (Radix UI) ← controles numéricos
  └── SlideCanvas             ← renderização 1080×1350px
  └── SlideStrip              ← navegador de slides (rodapé)
```

Cada seção recebe `slide: StudioSlide` e `onChange: (patch: Partial<StudioSlide>) => void`. Quando o usuário move um slider, a seção chama `onChange({ campo: novoValor })`, que sobe até a página e chama `updateSlide()` (debounced) do hook `useCarouselStudioSlides`.

---

## 2. Componente Slider — Implementação Crítica

### Arquivo: `src/components/ui/slider.tsx`

```tsx
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  // PONTO CRÍTICO: conta thumbs pelo length do array value/defaultValue
  const thumbCount = value?.length ?? defaultValue?.length ?? 1;

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
```

### Dependência obrigatória

```json
"@radix-ui/react-slider": "^1.x"
```

### Padrão de uso em todos os sliders

```tsx
// value SEMPRE é array: [número]
// onValueChange desestrutura o primeiro elemento: ([v]) => ...
<Slider
  value={[slide.algum_campo]}
  onValueChange={([v]) => onChange({ algum_campo: v })}
  min={0}
  max={100}
  step={1}
/>
```

**Erro comum:** passar `value={slide.algum_campo}` (number) ao invés de `value={[slide.algum_campo]}` (array). O componente espera sempre um array — isso causa crash silencioso ou slider travado.

---

## 3. Interface StudioSlide — Todos os Campos Numéricos com Slider

```typescript
export interface StudioSlide {
  id: string;
  project_id: string;
  slide_number: number;

  // Texto
  headline: string | null;
  subtitle: string | null;
  visual_description: string | null;

  // Posicionamento do texto
  text_position: TextPosition; // 9-point grid
  text_alignment: TextAlignment; // left | center | right
  text_padding_x: number; // Slider: 0–300, step 4
  text_padding_y: number; // Slider: 0–400, step 4

  // Tipografia
  font_size_title: number; // Slider: 16–120px, step 1
  font_size_subtitle: number; // Slider: 12–60px, step 1
  line_spacing: number; // Slider: 100–200%, step 5

  // Destaque de palavras (**palavra**)
  highlight_weight: string | null; // '400'|'600'|'700'|'900'|null
  highlight_color: string | null; // hex color ou null (usa accent_color)

  // Imagem de fundo individual
  bg_image_url: string | null;
  bg_color: string | null; // hex, default null = cinza escuro
  use_shared_bg: boolean; // usa bg compartilhada do projeto
  bg_position_x: number; // Slider: 0–100%, step 1
  bg_position_y: number; // Slider: 0–100%, step 1
  bg_zoom: number; // Slider: 50–200%, step 1

  // Overlay/sombra
  overlay_style: OverlayStyle; // enum de gradientes
  overlay_opacity: number; // Slider: 0–100, step 1

  // Cantos decorativos
  corner_style: CornerStyle; // none|grid|dots|horizontal_lines|diagonal_lines|diagonal_shadow
  corner_opacity: number; // Slider: 0–100, step 1
  corner_mask: number; // bitmask: bit0=TL, bit1=TR, bit2=BL, bit3=BR (default 15)

  // Efeito glass
  glass_enabled: boolean;
  glass_radius: number; // Slider: 0–40px, step 1

  // Badge de perfil
  badge_enabled: boolean;
  badge_photo_url: string | null;
  badge_position: BadgePosition; // 9-point grid
  badge_size: number; // Slider: 40–200px, step 4
  badge_offset_x: number; // Slider: 0–120px, step 4 (padding do canto)
  badge_offset_y: number; // Slider: 0–120px, step 4
  badge_handle_enabled: boolean;
  badge_handle_position: BadgeHandlePosition; // above|below|left|right
  badge_handle_font_size: number; // Slider: 16–60px, step 2
  badge_name_enabled: boolean;
  badge_name_text: string | null;
  badge_name_font_size: number; // Slider: 16–72px, step 2
  badge_name_font_weight: string; // '300'|'400'|'600'|'700'|'900'
  badge_name_line_height: number; // Slider: -20–48px, step 1

  // Imagem de conteúdo (dentro do slide, não como fundo)
  content_image_urls: string | null; // URLs separadas por vírgula
  content_image_layout: ContentImageLayout; // enum
  content_image_position: ContentImagePosition; // above_title|between|below_subtitle
  content_image_radius: number; // Slider: 0–80px, step 4
  content_image_width: number; // Slider: 20–100%, step 2
  content_image_gap: number; // Slider: 0–48px, step 4
  content_image_margin_top: number; // Slider: 0–120px, step 4
  content_image_margin_bottom: number; // Slider: 0–120px, step 4

  exported_image_url: string | null;
  created_at: string;
  updated_at: string;
}
```

### Interface StudioProject — Campos com Slider

```typescript
export interface StudioProject {
  id: string;
  company_id: string;
  // ...outros campos...

  // Imagem de fundo compartilhada (continuidade entre slides)
  shared_bg_image_url: string | null;
  shared_bg_zoom: number; // Slider: 10–200%, step 1
  shared_bg_position_x: number; // (não tem slider, reservado)
  shared_bg_position_y: number; // Slider: 0–100%, step 1

  font_pair: FontPair; // afeta todos os slides
  accent_color: string; // cor de destaque global
  instagram_handle: string | null;
}
```

---

## 4. Tabela de Todos os Sliders por Seção

| Seção                   | Campo                         | Min | Max | Step | Unidade |
| ----------------------- | ----------------------------- | --- | --- | ---- | ------- |
| **Texto**               | `text_padding_x`              | 0   | 300 | 4    | px      |
| **Texto**               | `text_padding_y`              | 0   | 400 | 4    | px      |
| **Fontes**              | `font_size_title`             | 16  | 120 | 1    | px      |
| **Fontes**              | `font_size_subtitle`          | 12  | 60  | 1    | px      |
| **Fontes**              | `line_spacing`                | 100 | 200 | 5    | %       |
| **Fundo individual**    | `bg_position_x`               | 0   | 100 | 1    | %       |
| **Fundo individual**    | `bg_position_y`               | 0   | 100 | 1    | %       |
| **Fundo individual**    | `bg_zoom`                     | 50  | 200 | 1    | %       |
| **Fundo compartilhado** | `shared_bg_position_y`        | 0   | 100 | 1    | %       |
| **Fundo compartilhado** | `shared_bg_zoom`              | 10  | 200 | 1    | %       |
| **Overlay**             | `overlay_opacity`             | 0   | 100 | 1    | %       |
| **Cantos**              | `corner_opacity`              | 0   | 100 | 1    | %       |
| **Glass**               | `glass_radius`                | 0   | 40  | 1    | px      |
| **Badge**               | `badge_size`                  | 40  | 200 | 4    | px      |
| **Badge**               | `badge_offset_x`              | 0   | 120 | 4    | px      |
| **Badge**               | `badge_offset_y`              | 0   | 120 | 4    | px      |
| **Badge Nome**          | `badge_name_font_size`        | 16  | 72  | 2    | px      |
| **Badge Nome**          | `badge_name_line_height`      | -20 | 48  | 1    | px      |
| **Badge Handle**        | `badge_handle_font_size`      | 16  | 60  | 2    | px      |
| **Imagem Conteúdo**     | `content_image_width`         | 20  | 100 | 2    | %       |
| **Imagem Conteúdo**     | `content_image_radius`        | 0   | 80  | 4    | px      |
| **Imagem Conteúdo**     | `content_image_gap`           | 0   | 48  | 4    | px      |
| **Imagem Conteúdo**     | `content_image_margin_top`    | 0   | 120 | 4    | px      |
| **Imagem Conteúdo**     | `content_image_margin_bottom` | 0   | 120 | 4    | px      |

---

## 5. Padrão de Seção Colapsável (SidebarSection)

```tsx
// src/components/carousel-studio/SidebarSection.tsx
import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  title: string;
  defaultOpen?: boolean; // false por padrão
  children: React.ReactNode;
}

export function SidebarSection({
  title,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        {open ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}
```

---

## 6. Exemplos Concretos de Uso do Slider

### 6.1 Padrão simples (opacidade)

```tsx
// OverlaySection.tsx
<div className="space-y-2">
  <Label className="text-xs text-muted-foreground">
    Opacidade: {slide.overlay_opacity}%
  </Label>
  <Slider
    value={[slide.overlay_opacity]}
    onValueChange={([v]) => onChange({ overlay_opacity: v })}
    min={0}
    max={100}
    step={1}
  />
</div>
```

### 6.2 Padrão com valor ao lado do label (badge)

```tsx
// BadgeSection.tsx
<div>
  <div className="flex items-center justify-between mb-2">
    <Label className="text-xs text-muted-foreground">Tamanho do badge</Label>
    <span className="text-xs text-muted-foreground">{badgeSize}px</span>
  </div>
  <Slider
    min={40}
    max={200}
    step={4}
    value={[badgeSize]}
    onValueChange={([v]) => onChange({ badge_size: v })}
  />
</div>
```

### 6.3 Slider com default via nullish coalescing

```tsx
// TextSection.tsx — campo pode ser null no banco
<Slider
  min={0}
  max={300}
  step={4}
  value={[slide.text_padding_x ?? 64]} // fallback se null
  onValueChange={([v]) => onChange({ text_padding_x: v })}
/>
```

### 6.4 Slider que atualiza StudioProject (não o slide)

```tsx
// BackgroundSection.tsx — zoom da imagem compartilhada
<Slider
  value={[project.shared_bg_zoom ?? 100]}
  onValueChange={([v]) => onProjectChange({ shared_bg_zoom: v })}
  min={10}
  max={200}
  step={1}
/>
```

---

## 7. Tipos Enum — Todos os Valores

```typescript
// Overlays (gradientes de sombra)
type OverlayStyle =
  | "none"
  | "base" // gradiente base embaixo
  | "top_strong" // gradiente forte em cima
  | "base_strong" // gradiente forte embaixo
  | "left" // gradiente da esquerda
  | "right" // gradiente da direita
  | "left_strong"
  | "right_strong";

// Estilos de canto decorativo
type CornerStyle =
  | "none"
  | "grid"
  | "dots"
  | "horizontal_lines"
  | "diagonal_lines"
  | "diagonal_shadow";

// Posição do texto (grade 3×3)
type TextPosition =
  | "top_left"
  | "top_center"
  | "top_right"
  | "mid_left"
  | "center"
  | "mid_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right";

// Posição do badge (mesma grade 3×3)
type BadgePosition =
  | "top_left"
  | "top_center"
  | "top_right"
  | "mid_left"
  | "center"
  | "mid_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right";

// Posição do @handle em relação à foto
type BadgeHandlePosition = "above" | "below" | "left" | "right";

// Alinhamento do texto
type TextAlignment = "left" | "center" | "right";

// Pares de fontes
type FontPair =
  | "space_inter"
  | "playfair_dmsans"
  | "syne_outfit"
  | "oswald_inter"
  | "raleway_playfair"
  | "outfit_caveat";

// Layout das imagens de conteúdo
type ContentImageLayout =
  | "1_thumb_16_9" // 1 imagem landscape
  | "1_square" // 1 imagem quadrada
  | "2_vertical" // 2 imagens portrait side-by-side
  | "2_thumb_16_9" // 2 thumbnails landscape
  | "4_square_2x2"; // grade 2×2

// Posição das imagens de conteúdo em relação ao texto
type ContentImagePosition =
  | "above_title" // antes do título
  | "between" // entre título e subtítulo
  | "below_subtitle"; // após subtítulo
```

---

## 8. Fluxo de Dados — Como onChange Funciona

```
User move slider
  → onValueChange([v]) disparado pelo Radix UI
    → Section chama onChange({ campo: v })
      → StudioSidebar repassa para handleSlideChange()
        → CarouselStudio.handleSlideChange()
          → setSlides(prev => prev.map(...patch))   ← state local imediato
          → debouncedUpdate(slideId, patch)         ← salva no banco após 600ms
            → supabase.from('carousel_studio_slides').update(patch)
```

O state local é atualizado imediatamente para UX fluida. O banco é atualizado com debounce para não sobrecarregar.

---

## 9. Possíveis Causas de Erro ao Replicar

### 9.1 value não é array

```tsx
// ERRADO — causa "value.length is not a function" ou slider travado
<Slider value={slide.overlay_opacity} ... />

// CORRETO
<Slider value={[slide.overlay_opacity]} ... />
```

### 9.2 onValueChange não desestrutura corretamente

```tsx
// ERRADO — v será um array, não um number
<Slider onValueChange={(v) => onChange({ overlay_opacity: v })} ... />

// CORRETO
<Slider onValueChange={([v]) => onChange({ overlay_opacity: v })} ... />
```

### 9.3 Campo null no banco sem fallback

```tsx
// ERRADO — Slider recebe null, comportamento indefinido
<Slider value={[slide.badge_name_line_height]} ... />

// CORRETO — sempre ter fallback numérico
<Slider value={[slide.badge_name_line_height ?? 4]} ... />
```

### 9.4 min/max trocados ou step errado

- `badge_name_line_height` tem `min={-20}` (negativo!) — é o espaçamento entre nome e @handle
- `line_spacing` começa em `min={100}`, não em 0 — é percentual de espaçamento de linha
- Campos de "zoom" têm `min` diferente: `bg_zoom` min=50, `shared_bg_zoom` min=10

### 9.5 @radix-ui/react-slider não instalado

O projeto usa `@radix-ui/react-slider` diretamente. Se o outro sistema usa uma lib diferente de slider (ex: shadcn gerou sem esse pacote, ou usa `rc-slider`, `react-slider`), a API vai ser diferente.

Verificar no `package.json`:

```json
"@radix-ui/react-slider": "^1.1.2"
```

### 9.6 CSS do Track não aparece

O Radix UI Slider precisa que os estilos do `Track` e `Range` sejam configurados via className. Se o CSS global não inclui as variáveis `bg-secondary` e `bg-primary` (do Tailwind + shadcn theme), o slider fica invisível mas funcional.

---

## 10. Checklist para Debug do Sistema de Sliders

- [ ] `@radix-ui/react-slider` está no `package.json`?
- [ ] O componente `<Slider>` foi implementado com `React.forwardRef` e `Array.from({ length: thumbCount })`?
- [ ] Todos os `value` passados são arrays `[número]`?
- [ ] Todos os `onValueChange` desestrutunam com `([v]) =>`?
- [ ] Campos que podem ser `null` no banco têm `?? defaultValue`?
- [ ] O Tailwind theme tem as variáveis `--secondary` e `--primary`?
- [ ] O `onChange` prop das seções está chegando até o componente (não está undefined)?
- [ ] O `slide` prop que chega às seções tem todos os campos do `StudioSlide`? (campos faltando = undefined → slider começa em 0 ou comportamento estranho)

---

## 11. Ordem das Seções no Sidebar

```
StudioSidebar
  1. ClientSection       — seletor de cliente
  2. BackgroundSection   — imagem de fundo (defaultOpen=true)
  3. OverlaySection      — sombra/gradiente
  4. TextSection         — título/subtítulo (defaultOpen=true)
  5. ImageContentSection — imagem dentro do slide
  6. FontsSection        — fontes e destaque de palavras
  7. BadgeSection        — foto de perfil/badge
  8. CornersSection      — cantos decorativos
```

---

## 12. Defaults dos Campos Numéricos

Esses são os valores padrão usados via `?? fallback` no código. Importante para inicializar corretamente:

| Campo                         | Default                           |
| ----------------------------- | --------------------------------- |
| `text_padding_x`              | 64                                |
| `text_padding_y`              | 64                                |
| `font_size_title`             | (definido no banco via migration) |
| `font_size_subtitle`          | (definido no banco via migration) |
| `line_spacing`                | (definido no banco via migration) |
| `bg_position_x`               | 50                                |
| `bg_position_y`               | 50                                |
| `bg_zoom`                     | 100                               |
| `overlay_opacity`             | 70                                |
| `corner_opacity`              | 80                                |
| `corner_mask`                 | 15 (todos os 4 cantos)            |
| `glass_radius`                | 12                                |
| `badge_size`                  | 80                                |
| `badge_offset_x`              | 24                                |
| `badge_offset_y`              | 24                                |
| `badge_handle_font_size`      | 28                                |
| `badge_name_font_size`        | 32                                |
| `badge_name_line_height`      | 4                                 |
| `content_image_radius`        | 12                                |
| `content_image_width`         | 100                               |
| `content_image_gap`           | 12                                |
| `content_image_margin_top`    | 24                                |
| `content_image_margin_bottom` | 24                                |
| `shared_bg_zoom`              | 100                               |
| `shared_bg_position_y`        | 50                                |
