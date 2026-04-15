# Publicar Carrossel — Mockup Instagram no Modal

**Data:** 2026-04-15  
**Status:** Aprovado

## Visão Geral

Substituir o preview minimalista atual do `PublishCarouselModal` por um mockup visual do Instagram com navegação entre slides, legenda editável e salvamento de volta ao projeto.

---

## Layout

Modal `max-w-4xl`, duas colunas lado a lado:

| Coluna esquerda (mockup)                | Coluna direita (controles)            |
| --------------------------------------- | ------------------------------------- |
| Frame de telefone simulando o Instagram | Legenda editável (caption + hashtags) |
| Imagem do slide atual (exportada)       | Seleção de plataformas                |
| Pontos de navegação + setas esq/dir     | Botão Publicar                        |
| Username + caption preview truncada     |                                       |

---

## Componente: `PublishCarouselModal`

Arquivo: `src/components/generators/PublishCarouselModal.tsx`

### Novas props

```typescript
interface Props {
  carousel: Carousel; // já existente
  open: boolean; // já existente
  onOpenChange: (open: boolean) => void; // já existente
  onSuccess: () => void; // já existente
  onCaptionChange?: (caption: string, hashtags: string) => void; // NOVO
  instagramUsername?: string | null; // NOVO — passado pelo CarouselStudio
}
```

### Estado interno

```typescript
const [currentSlide, setCurrentSlide] = useState(0);
const [caption, setCaption] = useState(carousel.caption ?? "");
const [hashtags, setHashtags] = useState(carousel.hashtags ?? "");
```

### Mockup Instagram (coluna esquerda)

Estrutura HTML/CSS — sem dependência externa:

```
div.phone-frame (rounded-[2.5rem] border-2 border-zinc-700 bg-black overflow-hidden w-[300px])
  └─ div.status-bar (h-6 bg-black flex justify-between px-4 — bateria/hora decorativa)
  └─ div.instagram-header (bg-white flex items-center px-3 py-2 gap-2)
       ├─ div.avatar (w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500)
       └─ span.username (text-xs font-semibold text-black)
  └─ div.slide-area (relative aspect-square bg-black)
       ├─ img (src=slides[currentSlide].image_url, object-cover)
       ├─ button.prev (absolute left-1 top-1/2, apenas se currentSlide > 0)
       ├─ button.next (absolute right-1 top-1/2, apenas se currentSlide < total-1)
       └─ div.dots (absolute bottom-2 flex gap-1 — bolinhas de navegação)
  └─ div.actions (bg-white px-3 py-2 — ícones decorativos: coração, comentário, avião, bookmark)
  └─ div.caption-preview (bg-white px-3 pb-3 text-xs text-black)
       └─ "<strong>username</strong> {caption truncado em 80 chars}..."
```

### Controles (coluna direita)

- **Título "Publicar Carrossel"** com ícone Send
- **Textarea legenda** — `value={caption}`, `onChange` atualiza estado + chama `onCaptionChange` debounced (300ms)
- **Textarea hashtags** — mesmo padrão
- **Seleção de plataformas** — igual ao atual (Instagram/Facebook com border colorida)
- **Botão Publicar** — igual ao atual

### Salvamento da legenda de volta ao projeto

`onCaptionChange` é chamado a cada mudança (debounced 300ms). Em `CarouselStudio.tsx`, a prop é conectada a uma função que chama `updateProject.mutate({ caption, hashtags })`.

---

## Integração em `CarouselStudio.tsx`

```typescript
<PublishCarouselModal
  carousel={publishCarousel}
  open={!!publishCarousel}
  onOpenChange={(open) => !open && setPublishCarousel(null)}
  onSuccess={() => { setPublishCarousel(null); }}
  instagramUsername={project?.instagram_username ?? null}
  onCaptionChange={(caption, hashtags) => {
    if (!project) return;
    updateProject.mutate({ caption: caption || null, hashtags: hashtags || null });
    // Atualiza o publishCarousel local para que o botão publicar use o texto editado
    setPublishCarousel(prev => prev ? { ...prev, caption, hashtags } : prev);
  }}
/>
```

> Verificar se `updateProject` mutation já existe e qual a sua assinatura antes de implementar.

---

## Arquivos

| Arquivo                                              | Ação                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `src/components/generators/PublishCarouselModal.tsx` | Modificar — novo layout + mockup + legenda editável        |
| `src/pages/CarouselStudio.tsx`                       | Modificar — passar `onCaptionChange` e `instagramUsername` |
