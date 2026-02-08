
# Plano: Gerador de Slides de Apresentação para Roteiros do YouTube

## Visao Geral

Adicionar uma nova funcionalidade ao **YouTubeScriptBuilder** que permite gerar slides de apresentacao baseados no conteudo do roteiro. A IA vai analisar o roteiro, detalhar os slides sugeridos, e apos aprovacao, gerar as imagens dos slides que poderao ser visualizados em um carrossel interativo com navegacao, modo tela cheia e integracao com o editor de imagens.

---

## Fluxo do Usuario

```text
1. Usuario abre um roteiro no YouTubeScriptBuilder
2. Clica em "Gerar Slides" (novo botao)
3. IA analisa o roteiro e retorna estrutura detalhada dos slides:
   - Titulo do slide
   - Conteudo/bullets
   - Sugestao visual (elementos, cores, icones)
4. Usuario visualiza a estrutura e pode:
   - Editar o texto de cada slide
   - Aprovar e gerar as imagens
5. Sistema gera as imagens de cada slide via IA (Gemini)
6. Slides sao exibidos em um carrossel com:
   - Navegacao esquerda/direita
   - Indicador de slide atual
   - Botao de tela cheia
   - Botao para editar cada slide no ImageEditorModal
7. Slides sao salvos vinculados ao roteiro
```

---

## Componentes da Solucao

### 1. Nova Tabela no Banco de Dados

**Tabela: `youtube_script_slides`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| script_id | UUID | FK para youtube_scripts |
| slide_order | INTEGER | Ordem do slide (1, 2, 3...) |
| title | TEXT | Titulo do slide |
| content | TEXT | Conteudo/bullets do slide |
| visual_suggestion | TEXT | Sugestao visual para a IA |
| image_url | TEXT | URL da imagem gerada (nullable) |
| status | TEXT | draft, generating, completed, error |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Data de atualizacao |

### 2. Nova Edge Function

**`generate-presentation-slides`**

Funcionalidade:
- Recebe o `scriptId` e conteudo do roteiro
- Envia para Gemini com prompt especializado para estruturar apresentacao
- Retorna array de slides com:
  - title, content, visual_suggestion
- Salva na tabela `youtube_script_slides` com status "draft"

**`generate-slide-image`**

Funcionalidade:
- Recebe dados de um slide especifico
- Usa o `generate-visual-creative` existente como base
- Gera imagem no formato 16:9 (YouTube/apresentacao)
- Atualiza o slide com a URL da imagem

### 3. Novo Hook

**`useYouTubeSlides.tsx`**

```typescript
interface Slide {
  id: string;
  script_id: string;
  slide_order: number;
  title: string;
  content: string;
  visual_suggestion: string;
  image_url: string | null;
  status: 'draft' | 'generating' | 'completed' | 'error';
}

// Funcoes:
- fetchSlides(scriptId)
- generateStructure(scriptId, scriptContent)
- updateSlide(slideId, updates)
- generateSlideImage(slideId)
- generateAllImages()
- deleteSlide(slideId)
- reorderSlides(slideId, newOrder)
```

### 4. Novos Componentes UI

**`SlidesGeneratorSection.tsx`** (Secao dentro do ScriptBuilder)

- Botao "Gerar Slides" na barra superior
- Quando clicado, abre painel lateral ou modal
- Exibe status de geracao

**`SlideStructureEditor.tsx`**

- Lista editavel dos slides antes de gerar imagens
- Campos: titulo, conteudo, sugestao visual
- Botoes: adicionar slide, remover, reordenar (drag-and-drop)
- Botao "Gerar Todas as Imagens"

**`SlideCarousel.tsx`**

- Usa o componente Carousel existente (embla-carousel)
- Exibe cada slide em proporcao 16:9
- Navegacao com setas e indicadores
- Overlay com botoes:
  - Tela cheia (usando Dialog fullscreen)
  - Editar no ImageEditorModal
- Loading state para slides sendo gerados

**`SlideFullscreenViewer.tsx`**

- Modal de tela cheia para visualizar slides
- Navegacao com teclado (setas)
- Indicador de slide atual
- Botao de fechar

### 5. Modificacoes no YouTubeScriptBuilder

- Adicionar novo botao "Slides" no header (ao lado de Gerar Thumb)
- Adicionar nova secao/card para os slides gerados
- Integrar com ImageEditorModal existente

---

## Detalhes Tecnicos

### Prompt para Estruturar Slides

```text
Voce e um especialista em criar apresentacoes de slides para videos do YouTube.

Analise o roteiro abaixo e crie uma estrutura de apresentacao profissional.

Para cada slide, defina:
1. Titulo (maximo 6 palavras, impactante)
2. Conteudo (3-5 bullets concisos)
3. Sugestao visual (elementos graficos, icones, estilo)

Quantidade sugerida: 8-12 slides

Roteiro:
{script_content}

Retorne em JSON:
{
  "slides": [
    {
      "title": "...",
      "content": "...",
      "visual_suggestion": "..."
    }
  ]
}
```

### Integracao com ImageEditorModal

Ao clicar em "Editar" em um slide:
```typescript
<ImageEditorModal
  open={showEditor}
  onOpenChange={setShowEditor}
  images={[slide.image_url]}
  onSave={(newImages) => updateSlide(slide.id, { image_url: newImages[0] })}
  clientId={clientId}
  companyId={companyId}
/>
```

### Formato dos Slides

- Proporcao: 16:9 (1920x1080)
- Usa a mesma logica de orientacao do ImageEditor
- Integra com o branding do cliente (cores, logo)

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `supabase/migrations/xxx_youtube_script_slides.sql` | Schema da tabela |
| `supabase/functions/generate-presentation-slides/index.ts` | Edge function para estruturar slides |
| `supabase/functions/generate-slide-image/index.ts` | Edge function para gerar imagem de slide |
| `src/hooks/useYouTubeSlides.tsx` | Hook para gerenciar slides |
| `src/components/youtube-content-lab/SlidesSection.tsx` | Secao principal de slides |
| `src/components/youtube-content-lab/SlideStructureEditor.tsx` | Editor de estrutura |
| `src/components/youtube-content-lab/SlideCarousel.tsx` | Carrossel de slides |
| `src/components/youtube-content-lab/SlideFullscreenViewer.tsx` | Visualizador tela cheia |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/youtube-content-lab/YouTubeScriptBuilder.tsx` | Adicionar botao e secao de slides |
| `src/hooks/useYouTubeScripts.tsx` | Adicionar campo slides_generated ao tipo |
| `supabase/config.toml` | Adicionar novas edge functions |

---

## Experiencia do Usuario Final

1. **Botao "Gerar Slides"** aparece no header do ScriptBuilder
2. Ao clicar, mostra loading enquanto IA estrutura a apresentacao
3. Exibe lista editavel com os slides sugeridos
4. Usuario pode ajustar textos e reordenar
5. Clica em "Gerar Imagens" para criar os visuais
6. Slides aparecem em um carrossel bonito abaixo do roteiro
7. Pode navegar pelos slides, ver em tela cheia
8. Pode editar qualquer slide no editor de imagens
9. Slides ficam salvos e vinculados ao roteiro
