# SPEC — Carousel Studio (SaaS standalone)

> Especificação funcional e técnica para reconstruir o **Editor Visual de Carrosséis** como um SaaS independente, multi-tenant, em **Next.js (App Router) + Supabase**.
>
> Este documento descreve **o quê** o produto faz. O `PLAN.md` descreve **como** implementá-lo em fases. O `CLAUDE.md` descreve as **convenções** para o agente que vai codar.

---

## 1. Visão Geral do Produto

**Carousel Studio** é uma ferramenta web para criar carrosséis visuais para Instagram (e redes similares). O usuário monta slides 1080×1350px num editor WYSIWYG (canvas HTML/CSS), com texto, imagens de fundo, badges de perfil, decorações e overlays, e exporta cada slide como PNG ou todos num ZIP. Há geração assistida por IA (conteúdo de texto, prompts de imagem, legendas/hashtags).

### Proposta de valor

- Editor visual rápido, sem precisar de Figma/Canva, focado em carrosséis de Instagram.
- IA gera o conteúdo textual e as imagens; o usuário refina visualmente.
- Export pixel-perfect (1080×1350) direto para publicação.

### Diferença para o módulo original

O módulo original vive dentro de um ERP de marketing (Expx Flow) onde "empresa → cliente → campanha". No SaaS standalone:

- **Multi-tenancy por organização (tenant)**. Cada organização (empresa cadastrada) configura suas próprias chaves de IA, marca, fontes e limites.
- **"Cliente"** vira um conceito opcional **interno do tenant** (marcas/perfis que a organização gerencia), não o tenant em si.
- Remoção de toda a dependência do ERP (campanhas, CRM, content plans, tarefas). O que sai do editor é **export de imagem + legenda**, ponto.

---

## 2. Multi-Tenancy (requisito central)

> **Cada empresa (organização) faz a sua própria configuração.** Isolamento total de dados e configuração por tenant.

### Modelo de tenant

```
organizations (tenant)
  └─ memberships (usuários ↔ organização, com role)
  └─ org_settings (configuração da organização)
       ├─ chaves de IA (OpenRouter / OpenAI / Anthropic / Gemini)
       ├─ chave Pexels
       ├─ marca padrão (cor de destaque, @handle, logo/badge)
       ├─ fontes / presets de fonte habilitados
       └─ limites de uso (planos)
  └─ brand_profiles (opcional — "clientes"/marcas internas do tenant)
  └─ carousel_projects
       └─ carousel_slides
```

### Regras de isolamento

- **Toda** tabela de negócio tem `org_id` e **RLS** que filtra por `org_id ∈ organizações do usuário`.
- Usar função `SECURITY DEFINER` `get_user_org_ids()` para evitar subquery direta em tabela com RLS dentro de policy (mesma armadilha do projeto original).
- Toda tabela nova precisa de `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`.
- **Configuração de IA é por tenant**: a organização cadastra sua própria API key (OpenRouter recomendado). Sem key da org → usar key de plataforma (fallback) com cota limitada, ou bloquear, conforme plano.
- Storage isolado por path: `org/{orgId}/...` nos buckets.

### Roles dentro do tenant

| Role     | Permissões                                 |
| -------- | ------------------------------------------ |
| `owner`  | Tudo, incl. billing e config de IA/keys    |
| `admin`  | Config da org, gerenciar membros, projetos |
| `editor` | Criar/editar/exportar carrosséis           |
| `viewer` | Apenas visualizar                          |

---

## 3. Funcionalidades (do editor original, mapeadas)

### 3.1 Editor de Slides (canvas WYSIWYG)

O canvas é **HTML/CSS div-based** (não `<canvas>`, não SVG como base), renderizado em **1080×1350px** e exibido escalado via `transform: scale()`. As decorações de canto usam SVG inline. Camadas (Z-order de baixo p/ cima):

1. **Fundo** — imagem individual do slide **ou** imagem panorâmica compartilhada entre slides (cria efeito de "esteira" contínua entre cards). Controles: `bg_position_x/y` (0–100%), `bg_zoom` (%), `bg_color` (fallback sem imagem).
2. **Overlay (gradiente)** — 8 estilos direcionais (`base`, `base_strong`, `top_strong`, `left/left_strong`, `right/right_strong`, `none`) com `overlay_opacity` 0–100. Gerado por `getOverlayGradient(style, opacity)` com alpha inline (não CSS `opacity`) para garantir 100% opaco no máximo.
3. **Badge de perfil** — foto circular + nome + @handle. 9 posições em grid, `badge_size`, offsets X/Y, posição do handle (acima/abaixo/esquerda/direita), tamanhos/peso de fonte, line-height entre nome e handle.
4. **Bloco de texto** — `<h2>` headline + `<p>` subtitle. 9 posições em grid, alinhamento (left/center/right), `font_size_title`/`font_size_subtitle`, `line_spacing` (%), `text_padding_x/y`. **Realce inline**: texto entre `**asteriscos**` vira `<span>` com `highlight_color` (default = accent da marca) e `highlight_weight`.
5. **Imagens de conteúdo (galeria inline)** — até 4 imagens em layouts (`1_thumb_16_9`, `1_square`, `2_vertical`, `2_thumb_16_9`, `4_square_2x2`), posição relativa ao texto (`above_title` / `between` / `below_subtitle`), `radius`, `width %`, `gap`, margens.
6. **Decorações de canto** — 6 estilos (`grid`, `dots`, `horizontal_lines`, `diagonal_lines`, `diagonal_shadow`, `none`), `corner_opacity`, `corner_mask` (bitmask: bit0=TL, bit1=TR, bit2=BL, bit3=BR; default 15 = 4 cantos), efeito "glass" (`glass_enabled`, `glass_radius`).

### 3.2 Tipografia

- 6 pares de fonte (Google Fonts): `space_inter`, `playfair_dmsans`, `syne_outfit`, `oswald_inter`, `raleway_playfair`, `outfit_caveat` (ver `FONT_PAIR_CSS`).
- A organização pode habilitar/desabilitar pares e (futuro) subir fontes próprias.

### 3.3 Estilo do carrossel

- `style`: `minimalist` | `profile` (afeta presets de layout).
- `accent_color` (hex) — cor de destaque da marca.

### 3.4 Geração por IA

- **Conteúdo de texto** (por carrossel): a partir de um briefing/prompt, gera headline + subtitle + visual_description por slide. (Tipos do original: tutorial / comparison / behind_scenes / curated_list — opcionais.)
- **Prompt de imagem por slide**: considera contexto de todos os slides + `image_style` + tipo (`background` / `content_below` / `content_above`).
- **Geração de imagem por slide** (opcional, modelo de imagem).
- **Legenda + hashtags + CTA** a partir do conteúdo dos slides.
- **Análise de carrossel a partir de imagens/URL** (importar referência e estruturar slides) — opcional na v1.
- Toda chamada de IA passa por um **gateway** que resolve modelo (primary/fallback) e key **por organização**.

### 3.5 Wizard de criação (4 passos)

1. Estilo & layout. 2. IA vs manual. 3. Prompt/briefing de conteúdo. 4. Design (fontes, cor, modo de imagem, @handle, marca).

### 3.6 Export & saída

- **Export de slide → PNG** via `html2canvas` (render off-screen em container fixo sem `transform` ancestral; aguarda `document.fonts.ready` + load de todas `<img>`). Upload no bucket `visual-creatives` em `org/{orgId}/carousel-studio/{projectId}/{slideNumber}.png` com cache-busting `?v=timestamp`.
- **Export de todos → ZIP** (`jszip`), download no browser.
- **(Opcional) PDF/PPTX** via `jspdf`/`pptxgenjs`.
- Copiar legenda+hashtags p/ clipboard.

### 3.7 Persistência & UX

- **Optimistic update** no cache (React Query) + **debounce de 2s** para persistir no banco (`updateSlide`).
- `flushAll()` ao sair/desmontar para não perder edições em fila.
- `exported_image_url` cacheado por slide.

---

## 4. Modelo de Dados (alvo)

> Adaptado de `carousel_studio_projects` / `carousel_studio_slides`, trocando `company_id` por `org_id` e `client_id` por `brand_profile_id`.

### `organizations`

`id, name, slug, plan, created_at, updated_at`

### `memberships`

`id, org_id → organizations, user_id → auth.users, role ('owner'|'admin'|'editor'|'viewer'), created_at` — UNIQUE(org_id, user_id)

### `org_settings`

`org_id (PK → organizations), ai_provider, openrouter_api_key (cifrada), pexels_api_key (cifrada), default_accent_color, default_instagram_handle, default_badge_url, enabled_font_pairs (jsonb), monthly_export_limit, updated_at`

### `ai_model_configs` (por org, por função)

`id, org_id, function_name, primary_model, fallback_model` — UNIQUE(org_id, function_name). Default global no código (`FUNCTION_DEFAULTS`), override por org.

### `brand_profiles` (opcional — "clientes" internos do tenant)

`id, org_id, name, instagram_handle, accent_color, badge_url, created_at, updated_at`

### `carousel_projects`

```
id, org_id → organizations, brand_profile_id → brand_profiles (nullable),
user_id → auth.users,
title, style ('minimalist'|'profile'),
font_pair, accent_color, instagram_handle,
slides_count, image_mode ('none'|'background'|'grid'|'both'),
prompt, image_style, generate_ai_images,
status ('draft'|'generating'|'ready'),
thumbnail_url,
shared_bg_image_url, shared_bg_zoom, shared_bg_position_x, shared_bg_position_y,
created_at, updated_at
```

### `carousel_slides`

Todos os campos de `StudioSlide` (ver `types.ts` no anexo do CLAUDE.md). Resumo dos grupos:

- Conteúdo: `headline, subtitle, visual_description`
- Fundo: `bg_image_url, bg_position_x, bg_position_y, bg_zoom, bg_color, use_shared_bg`
- Overlay: `overlay_style, overlay_opacity`
- Texto: `text_position, text_alignment, font_size_title, font_size_subtitle, line_spacing, text_padding_x, text_padding_y`
- Realce: `highlight_weight, highlight_color`
- Cantos: `corner_style, corner_opacity, corner_mask, glass_enabled, glass_radius`
- Badge: `badge_enabled, badge_photo_url, badge_position, badge_size, badge_offset_x, badge_offset_y, badge_handle_enabled, badge_handle_position, badge_handle_font_size, badge_name_enabled, badge_name_text, badge_name_font_size, badge_name_font_weight, badge_name_line_height`
- Imagens de conteúdo: `content_image_urls, content_image_layout, content_image_position, content_image_radius, content_image_width, content_image_gap, content_image_margin_top, content_image_margin_bottom`
- Export: `exported_image_url`
- Chaves: `project_id → carousel_projects`, UNIQUE(project_id, slide_number)

### Storage (Supabase Storage)

- Bucket **público** `visual-creatives`: exports e imagens, paths sob `org/{orgId}/...`.
- (Opcional) bucket privado para uploads de referência.

---

## 5. IA — Gateway e Modelos

Reaproveitar o padrão do `_shared/ai-gateway.ts`:

- Provider padrão: **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`), modelo default `google/gemini-2.5-flash`.
- `FUNCTION_DEFAULTS`: cada função tem `primary` + `fallback`. Resolução: default do código → override em `ai_model_configs` (por org) → key da org (`org_settings`) → fallback key de plataforma (env).
- Cache de config curto (60s).
- Funções de IA (como rotas/Server Actions ou Edge Functions):
  - `generate-carousel-content` (texto de todos os slides)
  - `generate-slide-image-prompt`
  - `generate-slide-image` (geração de imagem)
  - `generate-carousel-caption` (legenda+hashtags+CTA)
  - `search-pexels-photos` (proxy Pexels com key da org)
  - `analyze-carousel` (importar de imagens/URL) — opcional v1
  - `fetch-webpage-content` (enriquecer prompt a partir de URL) — opcional

> No SaaS standalone, essas funções podem rodar como **Route Handlers / Server Actions no Next.js (Fluid Compute)** OU como **Supabase Edge Functions**. Ver decisão no PLAN.

---

## 6. Telas / Rotas (Next.js App Router)

| Rota                      | Descrição                                                            | Acesso              |
| ------------------------- | -------------------------------------------------------------------- | ------------------- |
| `/`                       | Landing pública                                                      | público             |
| `/login`, `/signup`       | Auth (Supabase)                                                      | público             |
| `/onboarding`             | Criar organização + config inicial (keys de IA, marca)               | autenticado sem org |
| `/app`                    | Dashboard: lista de carrosséis do tenant                             | membro              |
| `/app/new`                | Wizard de criação (4 passos)                                         | editor+             |
| `/app/studio/[projectId]` | **Editor visual** (core)                                             | editor+             |
| `/app/brands`             | Marcas/perfis internos ("clientes")                                  | admin+              |
| `/app/settings`           | Config da org: IA keys, Pexels, marca padrão, fontes, membros, plano | admin+              |
| `/app/settings/members`   | Convites e roles                                                     | admin+              |
| `/app/settings/billing`   | Plano/uso                                                            | owner               |

---

## 7. Fora de Escopo (v1)

- Publicação direta no Instagram (Graph API), agendamento, content plan, CRM — **removidos** (eram do ERP).
- Geração agendada diária (cron) — opcional, fase posterior.
- Export Google Slides — opcional.
- Colaboração em tempo real (multi-cursor).

## 8. Requisitos Não-Funcionais

- **Export pixel-perfect** 1080×1350; fontes carregadas antes do `html2canvas`.
- **CORS**: imagens externas (Pexels/IA) precisam de `crossOrigin="anonymous"` + proxy/cache em storage próprio para o `html2canvas` não "tintar" o canvas.
- **Isolamento de tenant** garantido por RLS (não confiar só no front).
- **Idioma da UI**: PT-BR (manter), mas i18n-ready.
- Deploy: **Vercel** (Next.js) + **Supabase** (DB/Auth/Storage/Edge).

## 9. Critérios de Aceite (alto nível)

1. Dois tenants diferentes nunca veem dados um do outro (verificado via RLS).
2. Cada tenant usa **sua própria** key de IA e Pexels.
3. Criar projeto → editar slide → export PNG idêntico ao preview.
4. Export ZIP com todos os slides.
5. Geração por IA preenche conteúdo de todos os slides a partir de um prompt.
6. Persistência com debounce + flush sem perda de edição.
