# Carousel Studio — Templates por Cliente

**Data:** 2026-04-15  
**Status:** Aprovado

## Visão Geral

Permitir salvar um carrossel do Carousel Studio como **template visual** vinculado a um cliente. O template captura todas as configurações de estilo/posicionamento dos slides (overlay, fontes, badges, bullets, cores, etc.) mas **não** o conteúdo de texto nem imagens. No wizard de criação, ao selecionar um cliente, seus templates aparecem para seleção e pré-preenchem as configurações do novo carrossel.

---

## Banco de Dados

### Nova tabela: `carousel_studio_templates`

```sql
id               uuid PK DEFAULT gen_random_uuid()
company_id       uuid NOT NULL FK companies
client_id        uuid NOT NULL FK clients  -- template sempre tem cliente
name             text NOT NULL
-- campos de projeto
style            text NOT NULL  -- 'minimalist' | 'profile'
font_pair        text NOT NULL
accent_color     text NOT NULL
instagram_handle text
image_mode       text NOT NULL
slides_count     int NOT NULL
-- config visual dos slides (array JSONB, um objeto por slide)
slides_config    jsonb NOT NULL DEFAULT '[]'
created_at       timestamptz DEFAULT now()
updated_at       timestamptz DEFAULT now()
```

**`slides_config` schema (por elemento):**

```jsonc
{
  "slide_number": 1,
  "overlay_style": "base",
  "overlay_opacity": 60,
  "overlay_color": null,
  "text_position": "bottom_left",
  "text_alignment": "left",
  "font_size_title": 48,
  "font_size_subtitle": 20,
  "line_spacing": 1.2,
  "corner_style": "none",
  "corner_opacity": 80,
  "corner_mask": 15,
  "glass_enabled": false,
  "glass_radius": 16,
  "badge_enabled": false,
  "badge_position": "bottom_right",
  "badge_size": 48,
  "badge_handle_enabled": false,
  "badge_handle_position": "below",
  "badge_handle_font_size": 14,
  "badge_name_enabled": false,
  "badge_name_font_size": 14,
  "badge_name_font_weight": "400",
  "badge_name_line_height": 1.2,
  "badge_offset_x": 0,
  "badge_offset_y": 0,
  "text_padding_x": 40,
  "text_padding_y": 40,
  "use_shared_bg": false,
  "bg_color": null,
  "highlight_weight": null,
  "highlight_color": null,
  "content_image_layout": "1_square",
  "content_image_position": "below_subtitle",
  "content_image_radius": 8,
  "content_image_width": 100,
  "content_image_gap": 8,
  "content_image_margin_top": 16,
  "content_image_margin_bottom": 16,
  "bullets_enabled": false,
  "bullet_icon": "none",
  "bullet_icon_color": null,
  "bullet_icon_size": 16,
  "bullet_box_enabled": false,
  "bullet_box_color": null,
  "bullet_box_radius": 8,
  "bullet_box_padding_x": 12,
  "bullet_box_padding_y": 8,
  "bullet_font_size": 16,
  "bullet_line_height": 1.4,
  "bullet_gap": 12,
  "bullet_position": "mid_left",
  "bullet_alignment": "left",
  "bullet_padding_x": 40,
  "bullet_padding_y": 40,
}
```

**Campos excluídos:** `headline`, `subtitle`, `visual_description`, `bg_image_url`, `bg_position_x`, `bg_position_y`, `bg_zoom`, `content_image_urls`, `badge_photo_url`, `badge_name_text`, `exported_image_url`.

**RLS:** policy usando `get_user_company_ids()` SECURITY DEFINER  
**GRANT:** `SELECT, INSERT, UPDATE, DELETE ON carousel_studio_templates TO authenticated`

---

## Componentes

### `SaveTemplateModal.tsx`

Dialog com:

- Input `Nome` (pré-preenchido com título do projeto)
- Dropdown `Cliente` (pré-selecionado com `client_id` do projeto; obrigatório)
- Botão "Salvar Template"

Ao confirmar: captura campos de projeto + campos visuais de cada slide (lista de exclusão acima) → chama `useCreateTemplate()`.

### `StudioTopBar.tsx`

Novo botão com ícone `Bookmark` entre "Publicar" e o separador do "Salvar":

```
[Prompt IA] [Legenda] [Enviar ao Planejamento] [Publicar] [Template] | [Salvar]
```

Nova prop: `onOpenSaveTemplate: () => void`

### `StudioWizardModal.tsx` — Etapa 4

Após o preview do cliente selecionado, nova seção "TEMPLATES DO CLIENTE" (visível somente quando `config.clientId` está definido e o cliente tem templates):

- Carrega `useClientTemplates(config.clientId)`
- Renderiza cards clicáveis com nome e contagem de slides
- Ao clicar: `handleSelectTemplate(template)` atualiza o WizardConfig com os campos de projeto do template + armazena `slides_config` em `config.selectedTemplate`
- Campos do WizardConfig atualizados: `style`, `fontPair`, `accentColor`, `instagramHandle`, `imageMode`, `slidesCount`

### `CarouselStudio.tsx`

- Conecta `SaveTemplateModal` (passa projeto atual + slides atuais)
- Passa `onOpenSaveTemplate` para `StudioTopBar`
- Nova função `applyTemplateConfig(slides, templateSlides)`: após `createSlides()`, itera sobre os slides criados e chama `updateSlide()` com os campos visuais do template (match por `slide_number`; slides além do range do template ficam com defaults)

---

## Tipos (`types.ts`)

```typescript
export interface CarouselTemplate {
  id: string;
  company_id: string;
  client_id: string;
  name: string;
  style: CarouselStyle;
  font_pair: FontPair;
  accent_color: string;
  instagram_handle: string | null;
  image_mode: ImageMode;
  slides_count: number;
  slides_config: TemplateSlideConfig[];
  created_at: string;
  updated_at: string;
}

export type TemplateSlideConfig = Omit<
  StudioSlide,
  | "id"
  | "project_id"
  | "headline"
  | "subtitle"
  | "visual_description"
  | "bg_image_url"
  | "bg_position_x"
  | "bg_position_y"
  | "bg_zoom"
  | "content_image_urls"
  | "badge_photo_url"
  | "badge_name_text"
  | "exported_image_url"
  | "created_at"
  | "updated_at"
>;

// WizardConfig — campo adicional
export interface WizardConfig {
  // ... campos existentes ...
  selectedTemplate: TemplateSlideConfig[] | null;
}
```

---

## Hooks (`useCarouselStudioTemplates.ts`)

- `useClientTemplates(clientId)` — query por `client_id`
- `useCreateTemplate()` — mutation insert
- `useDeleteTemplate()` — mutation delete (para uso futuro na UI de gerenciamento)

---

## Fluxo Completo

```
[Studio] → Botão "Template" → SaveTemplateModal
                                   ↓ nome + cliente
                               INSERT carousel_studio_templates
                               Toast "Template salvo!"

[Novo Carrossel] → StudioWizardModal Etapa 4
    → Seleciona cliente
    → Carrega useClientTemplates(clientId)
    → Mostra cards de templates
    → Seleciona template → atualiza WizardConfig (style, fontPair, accentColor, etc.)
    → Avança → onComplete(config)

[CarouselStudio.tsx onComplete]
    → createProject (com settings do template)
    → createSlides (IA ou manual — texto gerado normalmente)
    → applyTemplateConfig(slides, config.selectedTemplate)
        → para cada slide: updateSlide(id, templateVisualFields)
```

---

## Arquivos

| Arquivo                                                            | Ação      |
| ------------------------------------------------------------------ | --------- |
| `supabase/migrations/20260415000000_carousel_studio_templates.sql` | Criar     |
| `src/hooks/useCarouselStudioTemplates.ts`                          | Criar     |
| `src/components/carousel-studio/SaveTemplateModal.tsx`             | Criar     |
| `src/components/carousel-studio/types.ts`                          | Modificar |
| `src/components/carousel-studio/StudioTopBar.tsx`                  | Modificar |
| `src/components/carousel-studio/StudioWizardModal.tsx`             | Modificar |
| `src/pages/CarouselStudio.tsx`                                     | Modificar |
