# Spec: Editor Visual de Carrossel (Carousel Studio)

**Data:** 2026-04-12  
**Status:** Aprovado  
**Rota:** `/geradores/carrosseis` (nova aba "Editor Visual")  
**Referência:** MyPostFlow (vídeo analisado + screenshots)

---

## 1. Visão Geral

Adicionar um **Editor Visual de Carrossel** (Carousel Studio) como terceira aba na página existente `/geradores/carrosseis`. O editor permite criar carrosseis para Instagram com:

- Wizard de 4 passos para configuração inicial
- Editor visual em tempo real (painel lateral + preview HTML/CSS)
- Geração de texto e imagens via IA
- Export dos slides como PNG via `html2canvas`
- Persistência completa no banco (histórico, plano de conteúdo, agendamento)
- Geração de legenda + hashtags

A abordagem de renderização é **HTML/CSS com `html2canvas`** — o slide é um `div` React com posicionamento absoluto. O usuário vê o resultado final em tempo real, sem round-trip para backend a cada ajuste.

---

## 2. Integração com a Página Atual

### Nova aba em `GeradorCarrosseis.tsx`

```
[Gerar Novo]  [Editor Visual ✨]  [Histórico]
```

A aba "Editor Visual" exibe:

- Botão "Criar no Editor Visual" → abre o wizard modal
- Lista de projetos em rascunho (status `draft` ou `ready`) do usuário, com opção de retomar edição

### Rota do editor aberto

Ao criar ou retomar um projeto: `/geradores/carrosseis/studio/:projectId`

Esta sub-rota usa layout de tela quase-cheia (mantém o `DashboardLayout` mas sem padding lateral, usando `w-full h-screen overflow-hidden`).

---

## 3. Wizard de Criação (4 Passos)

Modal com indicador de progresso (4 bolinhas no topo). Botões "Voltar" / "Continuar". Fecha ao clicar fora apenas no passo 1.

### Passo 1 — Escolha o Estilo

Dois cards visuais clicáveis com preview miniatura:

| Estilo                | Descrição                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **Minimalista**       | Fundo escuro ou imagem, texto grande em destaque, tipografia bold cinematic, overlays de sombra |
| **Profile (Twitter)** | Screenshot-style, foto de perfil + nome + handle no topo, texto em coluna, fundo neutro         |

### Passo 2 — Como deseja começar?

Dois cards clicáveis:

| Opção              | Descrição                                                              |
| ------------------ | ---------------------------------------------------------------------- |
| **Usar IA**        | Prompt → IA gera conteúdo de todos os slides + imagens automaticamente |
| **Criação Manual** | Abre o editor com slides em branco; usuário escreve tudo               |

Se "Criação Manual" → pula para Passo 4.

### Passo 3 — Configurar IA _(só se "Usar IA")_

| Campo                     | Tipo                                                                                      | Obrigatório         |
| ------------------------- | ----------------------------------------------------------------------------------------- | ------------------- |
| Sobre o que é o conteúdo? | Textarea                                                                                  | Sim                 |
| Imagens de referência     | Colar imagem (clipboard) ou upload de arquivo                                             | Não                 |
| Número de slides          | Grid de botões 1–10                                                                       | Sim (default: 6)    |
| Imagens no carrossel      | 4 opções radio: Sem imagens / Só imagem de fundo / Só grade de imagens / Intercalar ambas | Sim                 |
| Gerar imagens com IA      | Checkbox                                                                                  | Não (default: true) |
| Estilo das imagens        | Textarea para direcionamento extra                                                        | Não                 |

### Passo 4 — Personalizar

| Campo                | Tipo                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| @ do Instagram       | Input texto (opcional, aparece em cada slide)                                                           |
| Combinação de fontes | 6 cards: Space+Inter / Playfair+DM Sans / Syne+Outfit / Oswald+Inter / Raleway+Playfair / Outfit+Caveat |
| Cor de destaque      | Paleta de 8 cores predefinidas + input hex                                                              |

Botão final: **"Gerar Carrossel"** → dispara geração IA → modal de loading com barra de progresso → abre o editor.

---

## 4. Editor Visual — Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Minimalista][Profile]  ✨Gerador  📝Gerar Legenda  Slide 1/6 ◀▶ │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  PAINEL      │            ÁREA DE PREVIEW                       │
│  LATERAL     │   ┌──────────────┐  ┌──────────────┐            │
│  280px       │   │  Slide 1     │  │  Slide 2     │            │
│              │   │  (ativo,     │  │  (miniatura) │            │
│  Seções      │   │  maior)      │  │              │            │
│  colapsáveis │   └──────────────┘  └──────────────┘            │
│              │                                                  │
├──────────────┴──────────────────────────────────────────────────┤
│  ▶ Atualizar  📦 ZIP  |  Slide 3 de 6 — gerando grade  85%     │
└─────────────────────────────────────────────────────────────────┘
```

- **Painel lateral:** 280px fixo, fundo escuro, seções colapsáveis com chevron
- **Área central:** scroll horizontal, slide ativo com borda de destaque, miniaturas dos outros slides clicáveis
- **Barra inferior:** progresso de geração de imagens IA + ações de download

---

## 5. Editor Visual — Painel Lateral (Seções)

Cada seção é colapsável. A seção aberta ao entrar é "Imagem de Fundo".

### 5.1 Imagem de Fundo

- Área de drop/upload de arquivo
- Botão "Colar Imagem do Clipboard"
- Botão "Gerar Imagem com IA (Banana Pro)" → chama edge function existente
- Slider Posição X (0–100)
- Slider Posição Y (0–100)
- Slider Zoom (100–200)
- Toggle "Aplicar também na Grade"

### 5.2 Sombra / Overlay

- Select estilo: Base / Topo Forte / Base Forte / Nenhum
- Slider Opacidade (0–100)

### 5.3 Fundo do Slide

- Color picker para cor sólida (alternativa à imagem)

### 5.4 Grade de Imagens _(só quando modo grade ativo)_

- Toggle Mostrar grade
- Slider arredondamento das imagens (0–50px)

### 5.5 Título & Subtítulo

- Grid 3×3 de posições (9 posições possíveis para o bloco de texto)
- Alinhamento: ESQ / CENTRO / DIR
- Textarea título (editável diretamente)
- Textarea subtítulo (editável diretamente)
- Botão "Gerar conteúdo deste slide com IA"
- Slider Escala do slide (50–100%)

### 5.6 Fontes

- Grid de fontes disponíveis: Inter, Space, Syne, Outfit, DM Sans, Raleway, Oswald, Playfair, Caveat
- Slider Tamanho título (16–80px)
- Slider Tamanho subtítulo (12–40px)
- Slider Espaçamento entre linhas (100–200%)
- Paleta cor destaque + input hex
- Checkbox "Aplicar configurações no próximo slide"

### 5.7 Badge de Perfil

- Toggle Exibir badge
- Upload foto de perfil (circular)
- Input nome
- Input handle (@)
- Slider tamanho do badge (40–120px)
- Select posição: canto superior esquerdo / superior direito

### 5.8 Cantos (Decorativos)

- Select tipo: Nenhum / Grade / Bolinhas / Linhas horizontais / Linhas diagonais / Sombra diagonal
- Slider tamanho (8–32px)
- Slider distância das bordas (8–48px)
- Slider opacidade (0–100)
- Toggle Estilo glass (glassmorphism)
- Slider arredondamento (0–24px)

---

## 6. Preview do Slide (Componente React)

### Dimensões e Escala

- Tamanho real do slide: **1080×1080px** (quadrado Instagram)
- Exibido em escala reduzida: calculada automaticamente para caber na área central (`containerWidth / 1080`)
- Aplicado via `transform: scale(ratio) transform-origin: top-left`
- Container tem `width: 1080px; height: 1080px` fixos → escala visual via CSS transform

### Estrutura do componente `SlideCanvas`

```tsx
// Div externo: 1080×1080px, position: relative, overflow: hidden
// ├── Imagem de fundo (object-fit: cover, posição e zoom via CSS)
// ├── Overlay (gradient CSS conforme estilo selecionado)
// ├── Grade de imagens (grid CSS, imagens com border-radius configurável)
// ├── Cantos decorativos (SVG ou divs posicionados absolutos)
// ├── Bloco de texto (position: absolute, 9 posições via CSS classes)
// │   ├── Título (font-family, size, color, highlight span)
// │   └── Subtítulo
// └── Badge de perfil (position: absolute, canto configurável)
```

### Highlight de palavras

Palavras em destaque são marcadas com `<span>` com a cor de accent. O usuário seleciona palavras no textarea e clica em "Destacar" — ou a IA já retorna com marcação `**palavra**` que é parseada para `<span>`.

---

## 7. Modelo de Dados

### Tabela `carousel_studio_projects`

```sql
CREATE TABLE public.carousel_studio_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Carrossel sem título',
  style           text NOT NULL CHECK (style IN ('minimalist', 'profile')),
  font_pair       text NOT NULL DEFAULT 'space_inter',
  accent_color    text NOT NULL DEFAULT '#FFD700',
  instagram_handle text,
  slides_count    int NOT NULL DEFAULT 6,
  image_mode      text NOT NULL DEFAULT 'grid' CHECK (image_mode IN ('none', 'background', 'grid', 'both')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready')),
  thumbnail_url   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.carousel_studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can manage their carousel studio projects"
  ON public.carousel_studio_projects
  USING (company_id = ANY(get_user_company_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.carousel_studio_projects TO authenticated;
```

### Tabela `carousel_studio_slides`

```sql
CREATE TABLE public.carousel_studio_slides (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES public.carousel_studio_projects(id) ON DELETE CASCADE,
  slide_number        int NOT NULL,
  headline            text,
  subtitle            text,
  visual_description  text,  -- usado para gerar imagem IA
  bg_image_url        text,
  bg_position_x       int NOT NULL DEFAULT 50,
  bg_position_y       int NOT NULL DEFAULT 50,
  bg_zoom             int NOT NULL DEFAULT 100,
  overlay_style       text NOT NULL DEFAULT 'base' CHECK (overlay_style IN ('base', 'top_strong', 'base_strong', 'none')),
  overlay_opacity     int NOT NULL DEFAULT 60,
  text_position       text NOT NULL DEFAULT 'bottom_left',
  text_alignment      text NOT NULL DEFAULT 'left',
  font_size_title     int NOT NULL DEFAULT 48,
  font_size_subtitle  int NOT NULL DEFAULT 20,
  line_spacing        int NOT NULL DEFAULT 120,
  corner_style        text NOT NULL DEFAULT 'none',
  corner_opacity      int NOT NULL DEFAULT 80,
  glass_enabled       bool NOT NULL DEFAULT false,
  glass_radius        int NOT NULL DEFAULT 12,
  badge_enabled       bool NOT NULL DEFAULT true,
  badge_photo_url     text,
  exported_image_url  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slide_number)
);

ALTER TABLE public.carousel_studio_slides ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para evitar subquery nested em tabela com RLS
CREATE OR REPLACE FUNCTION get_user_carousel_studio_project_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT id FROM public.carousel_studio_projects
    WHERE company_id = ANY(get_user_company_ids())
  );
$$;

CREATE POLICY "company members can manage their carousel studio slides"
  ON public.carousel_studio_slides
  USING (project_id = ANY(get_user_carousel_studio_project_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.carousel_studio_slides TO authenticated;
```

---

## 8. Edge Functions

### Existente — reutilizada: `daily-carousel-generator-stream`

Usada para:

1. Geração do conteúdo de slides (headline + subtitle + visual_description) a partir do prompt do wizard
2. Geração de imagens IA por slide (quando marcado "Gerar com IA")

**Requer auditoria da edge function** antes da implementação: verificar se aceita os campos abaixo ou se precisa de adaptação mínima. Adicionar `mode: 'studio'` como guard para não quebrar o fluxo existente.

Payload adicional necessário: `{ mode: 'studio', style: 'minimalist' | 'profile', font_pair, accent_color, image_mode }`

### Nova — `generate-carousel-caption`

Recebe os slides do projeto e retorna legenda + hashtags.

```typescript
// Input
{
  project_id: string,
  slides: Array<{ headline: string, subtitle: string }>,
  style?: string  // para adaptar o tom da legenda
}

// Output
{
  success: boolean,
  caption: string,
  hashtags: string[]
}
```

---

## 9. Auto-save e Persistência

- Cada alteração no painel lateral dispara um **debounce de 2s** → `UPDATE carousel_studio_slides SET ... WHERE id = ?`
- Ao gerar PNG de um slide: `html2canvas` → upload para Supabase Storage (`carousel-studio/{project_id}/{slide_number}.png`) → `UPDATE carousel_studio_slides SET exported_image_url = ?`
- Thumbnail do projeto = `exported_image_url` do slide 1
- `updated_at` do projeto atualizado via trigger PostgreSQL

---

## 10. Export

### Download individual

- Botão "Baixar Slide N" no painel lateral
- Chama `html2canvas` no `SlideCanvas` com `{ scale: 1, useCORS: true, allowTaint: false }`
- Pré-carrega fontes via `FontFace API` antes da captura
- Salva via `<a download>` com nome `slide-{N}.png`

### Download ZIP

- Botão "ZIP" na barra inferior
- Itera todos os slides, captura cada um com `html2canvas`
- Usa `JSZip` (já no projeto) para agrupar → `{titulo-do-projeto}.zip`
- Mostra progress bar durante o processo

---

## 11. Geração de Legenda

Modal acionado pelo botão "Gerar Legenda" na barra superior do editor:

- Chama `generate-carousel-caption` com os slides do projeto
- Exibe legenda em textarea editável + hashtags em linha separada
- Botão "Copiar tudo" (legenda + hashtags juntos)
- Botão "Regerar com IA" (nova chamada)

---

## 12. Integração com Histórico

O `CarouselHistoryList` existente é estendido para exibir projetos do `carousel_studio_projects` junto com os carrosseis existentes. Badge "Studio" diferencia o tipo.

Ações disponíveis no card do histórico:

- **Abrir no Editor** → navega para `/geradores/carrosseis/studio/:id`
- **Enviar para Plano de Conteúdo** → reutiliza `SendCarouselToPlanModal` existente
- **Agendar** → reutiliza `SendCarouselToScheduleModal` existente
- **Baixar ZIP** → dispara export direto

---

## 13. Novos Arquivos e Estrutura

```
src/
├── pages/
│   └── GeradorCarrosseis.tsx              (EDITAR — adicionar aba)
│   └── CarouselStudio.tsx                 (NOVO — layout do editor)
├── components/
│   └── carousel-studio/
│       ├── StudioWizardModal.tsx           (wizard 4 passos)
│       ├── SlideCanvas.tsx                 (componente do slide 1080×1080)
│       ├── StudioSidebar.tsx               (painel lateral com seções)
│       ├── SidebarSection.tsx              (seção colapsável genérica)
│       ├── sections/
│       │   ├── BackgroundSection.tsx
│       │   ├── OverlaySection.tsx
│       │   ├── SlideBgSection.tsx
│       │   ├── ImageGridSection.tsx
│       │   ├── TextSection.tsx
│       │   ├── FontsSection.tsx
│       │   ├── BadgeSection.tsx
│       │   └── CornersSection.tsx
│       ├── StudioTopBar.tsx                (barra superior com tabs estilo/legenda)
│       ├── StudioBottomBar.tsx             (barra inferior com progresso/download)
│       ├── CaptionModal.tsx                (modal de legenda + hashtags)
│       └── SlideStrip.tsx                  (faixa horizontal de miniaturas)
├── hooks/
│   ├── useCarouselStudioProject.ts         (CRUD do projeto)
│   ├── useCarouselStudioSlides.ts          (CRUD dos slides + auto-save)
│   └── useSlideExport.ts                   (html2canvas + JSZip)
supabase/
├── migrations/
│   └── 20260412000000_carousel_studio.sql   (tabelas + RLS + GRANT)
├── functions/
│   └── generate-carousel-caption/
│       └── index.ts
```

---

## 14. Fora de Escopo (nesta versão)

- Modo "Treinar Carrossel" (persona/estilo da IA por cliente) — futuro
- Criação de múltiplos carrosseis simultâneos — futuro
- Storytelling / Stories — futuro
- Drag-and-drop de elementos dentro do slide (Fabric.js) — não necessário com posicionamento por grid 3×3
- Histórico de versões de um projeto
