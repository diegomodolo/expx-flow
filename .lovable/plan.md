

# Plano: Análise de Slides de Referência e Geração de Conteúdo com IA

## Objetivo
Transformar o fluxo "Gerar a Partir de Exemplo" em um processo mais inteligente:
1. Imagens de referência maiores para melhor visualização
2. Ocultar seletor de número de slides (usa a quantidade do exemplo)
3. IA analisa cada slide de referência e identifica o tipo de conteúdo
4. Gera novos conteúdos mantendo a estrutura/tipo do original
5. Usuário pode editar cada conteúdo antes de gerar

---

## Arquitetura do Novo Fluxo

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    GERAR A PARTIR DE EXEMPLO                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Selecionar Carrossel do Instagram                                    │
│                                                                          │
│  2. Preview do Carrossel Selecionado (IMAGENS MAIORES)                   │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│     │          │ │          │ │          │ │          │                 │
│     │   120px  │ │   120px  │ │   120px  │ │   120px  │                 │
│     │          │ │          │ │          │ │          │                 │
│     └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │
│                                                                          │
│  3. [✨ Gerar Conteúdo com IA]  ← Novo botão                             │
│                                                                          │
│  4. Modal de Temas (após clicar em Gerar Conteúdo)                       │
│     ┌────────────────────────────────────────────────────┐              │
│     │  Sugestões de Tema:                                │              │
│     │  ○ 5 estratégias de marketing digital              │              │
│     │  ○ Como aumentar suas vendas online                │              │
│     │  ○ Ferramentas essenciais para empreendedores      │              │
│     │  ● Tema personalizado: [_____________________]     │              │
│     │                                        [Gerar]     │              │
│     └────────────────────────────────────────────────────┘              │
│                                                                          │
│  5. Após IA analisar, exibe abaixo de cada imagem:                       │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│     │          │ │          │ │          │ │          │                 │
│     │  Slide 1 │ │  Slide 2 │ │  Slide 3 │ │  Slide 4 │                 │
│     │          │ │          │ │          │ │          │                 │
│     └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │
│     Tipo: Capa   Tipo: Lista  Tipo: Dica   Tipo: CTA                    │
│     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│     │ "5 es-  │ │ "1. Au- │ │ "Use fe-│ │ "Baixe  │                     │
│     │ tratégi-│ │ tomatize│ │ rrament-│ │ o guia  │                     │
│     │ as..."  │ │ tarefas"│ │ as de IA│ │ grátis" │                     │
│     └─────────┘ └─────────┘ └─────────┘ └─────────┘                     │
│       [✏️]        [✏️]        [✏️]        [✏️]                          │
│                                                                          │
│  6. [🎨 Gerar Carrossel] (Só aparece após conteúdo gerado)               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar/Modificar

### Novos Componentes

| Componente | Descrição |
|------------|-----------|
| `ThemeSelectorModal.tsx` | Modal para selecionar tema (sugestões + custom) |
| `SlideContentEditor.tsx` | Card com preview da imagem + conteúdo editável |

### Componentes Modificados

| Componente | Modificação |
|------------|-------------|
| `SelectedCarouselPreview.tsx` | Imagens maiores (120px), exibe conteúdo gerado por slide, botão IA |
| `GeradorCarrosseis.tsx` | Ocultar slider quando fromExample, gerenciar estado dos conteúdos |

### Nova Edge Function

| Edge Function | Descrição |
|---------------|-----------|
| `analyze-carousel-slides` | Analisa cada imagem e gera conteúdo para novo tema |

---

## Detalhes Técnicos

### 1. Edge Function: analyze-carousel-slides

A IA recebe todas as imagens do carrossel de referência e:
1. Analisa o tipo de cada slide (capa, lista, pergunta, CTA, dica, etc.)
2. Gera sugestões de tema baseadas no briefing do cliente
3. Quando o usuário escolhe um tema, gera o conteúdo novo para cada slide

```typescript
// POST /functions/v1/analyze-carousel-slides
// Body: { clientId, images: string[], selectedTheme?: string }

// Resposta (sem tema - apenas sugestões):
{
  success: true,
  themeSuggestions: [
    "5 estratégias de marketing digital para 2026",
    "Como aumentar suas vendas online em 30 dias",
    "Ferramentas essenciais para empreendedores"
  ],
  slideAnalysis: [
    { slideNumber: 1, detectedType: "cover", description: "Slide de capa com título impactante" },
    { slideNumber: 2, detectedType: "list_item", description: "Item de lista numerada" },
    ...
  ]
}

// Resposta (com tema - gera conteúdos):
{
  success: true,
  theme: "5 estratégias de marketing digital",
  slideContents: [
    { 
      slideNumber: 1, 
      type: "cover",
      headline: "5 Estratégias de Marketing",
      bodyText: "Que vão transformar seu negócio",
      visualDescription: "Fundo gradiente com ícone de gráfico"
    },
    { 
      slideNumber: 2, 
      type: "list_item",
      headline: "1. Automatize tarefas",
      bodyText: "Use ferramentas como Zapier",
      visualDescription: "Ícone de automação"
    },
    ...
  ]
}
```

### 2. Interface SelectedCarouselPreview (Atualizada)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Carrossel de Referência                           5 slides            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │             │ │             │ │             │ │             │       │
│  │   IMAGEM    │ │   IMAGEM    │ │   IMAGEM    │ │   IMAGEM    │  →    │
│  │   120x120   │ │   120x120   │ │   120x120   │ │   120x120   │       │
│  │             │ │             │ │             │ │             │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  (Se conteúdo já gerado, mostra abaixo de cada imagem)                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Tipo: Capa  │ │ Tipo: Lista │ │ Tipo: Dica  │ │ Tipo: CTA   │       │
│  │ "5 estra-   │ │ "1. Auto-   │ │ "Use ferra- │ │ "Baixe o    │       │
│  │ tégias de   │ │ matize ta-  │ │ mentas de   │ │ guia grá-   │       │
│  │ marketing"  │ │ refas re-   │ │ IA para..." │ │ tis..."     │       │
│  │ [✏️ Editar] │ │ petitivas"  │ │ [✏️ Editar] │ │ [✏️ Editar] │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  "Legenda original do carrossel..."                                     │
│                                                                         │
│  ┌────────────────────┐  ┌────────────────────┐                        │
│  │ ✨ Gerar Conteúdo  │  │ 🔄 Trocar          │  │ ✕ Remover │        │
│  └────────────────────┘  └────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. ThemeSelectorModal

Modal que aparece ao clicar em "Gerar Conteúdo com IA":

```text
┌──────────────────────────────────────────────────────────────┐
│                    Escolha o Tema                            │
│                                                              │
│  A IA analisou as imagens do carrossel de referência.       │
│  Escolha um tema para gerar o novo conteúdo:                │
│                                                              │
│  ○ 5 estratégias de marketing digital para 2026             │
│  ○ Como aumentar suas vendas online em 30 dias              │
│  ○ Ferramentas essenciais para empreendedores               │
│                                                              │
│  ● Tema personalizado:                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Digite seu tema aqui...                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│              [Cancelar]  [✨ Gerar Conteúdo]                 │
└──────────────────────────────────────────────────────────────┘
```

### 4. Estado no GeradorCarrosseis

```typescript
// Novos estados
const [generatedSlideContents, setGeneratedSlideContents] = useState<SlideContent[] | null>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [themeSuggestions, setThemeSuggestions] = useState<string[]>([]);
const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

// Interface para conteúdo do slide
interface SlideContent {
  slideNumber: number;
  type: string; // "cover", "list_item", "question", "cta", "tip", etc.
  headline: string;
  bodyText: string;
  visualDescription: string;
}
```

---

## Fluxo Completo do Usuário

1. Usuário seleciona cliente
2. Escolhe tipo de carrossel
3. Escolhe "Gerar a Partir de Exemplo"
4. Clica em "Selecionar Carrossel do Instagram"
5. Seleciona um carrossel → exibe preview com imagens maiores
6. **Slider de número de slides OCULTO** (usa quantidade do exemplo)
7. Clica em "✨ Gerar Conteúdo com IA"
8. Modal de temas abre com sugestões + campo customizado
9. Escolhe tema e clica "Gerar"
10. IA analisa cada imagem e gera conteúdo correspondente
11. Preview atualiza mostrando abaixo de cada imagem:
    - Tipo detectado (Capa, Lista, CTA, etc.)
    - Headline gerada
    - Botão de editar
12. Usuário pode clicar em qualquer slide para editar o conteúdo
13. Quando satisfeito, clica em "Gerar Carrossel"
14. Sistema usa os conteúdos editados + imagens de referência para gerar

---

## Resumo de Alterações

### Arquivos a Criar

1. **`supabase/functions/analyze-carousel-slides/index.ts`**
   - Recebe imagens de referência
   - Analisa tipo de cada slide via IA com visão
   - Gera sugestões de tema
   - Quando tema fornecido, gera conteúdo para cada slide

2. **`src/components/carousel-generator/ThemeSelectorModal.tsx`**
   - Modal com radio buttons para sugestões
   - Campo de texto para tema customizado
   - Loading state durante análise

3. **`src/components/carousel-generator/SlideContentCard.tsx`**
   - Card compacto com imagem de referência
   - Badge do tipo detectado
   - Texto do conteúdo gerado
   - Botão/modal para editar

### Arquivos a Modificar

4. **`src/components/carousel-generator/SelectedCarouselPreview.tsx`**
   - Aumentar tamanho das imagens (80px → 120px)
   - Adicionar botão "Gerar Conteúdo com IA"
   - Renderizar SlideContentCard quando há conteúdo gerado
   - Receber/emitir estado dos conteúdos

5. **`src/pages/GeradorCarrosseis.tsx`**
   - Ocultar slider de slides quando `generationMode === "fromExample"`
   - Adicionar estados para conteúdos gerados e modal de tema
   - Passar conteúdos editados para a geração final
   - Só habilitar "Gerar Carrossel" após conteúdos gerados

6. **`supabase/functions/daily-carousel-generator-stream/index.ts`**
   - Aceitar `pre_generated_slides` no body
   - Se fornecido, pular etapa de geração de texto e usar direto

7. **`src/hooks/useCarouselGenerationStream.ts`**
   - Aceitar `preGeneratedSlides?: SlideContent[]`
   - Passar para edge function

8. **`supabase/config.toml`**
   - Registrar `analyze-carousel-slides`

---

## Benefícios

- **Consistência Estrutural**: Novo carrossel mantém a mesma estrutura do original
- **Controle Total**: Usuário visualiza e edita cada conteúdo antes de gerar
- **Economia de Créditos**: Ajustes feitos antes da geração de imagens
- **Melhor UX**: Imagens maiores facilitam visualização
- **Flexibilidade**: Tema pode ser sugerido ou customizado

