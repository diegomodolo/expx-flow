
# Plano: Melhorias no Gerador de Carrosséis

## Resumo dos Problemas

1. **Variações visuais alterando cor de fundo indevidamente** - Mesmo marcando apenas "alterar personagens", a IA mudou a cor de fundo
2. **Preview de referência não está em 4:5** - As imagens do carrossel de referência aparecem em aspect ratio quadrado
3. **Falta edição individual de slides gerados** - Após gerar, não há como editar cada imagem individualmente

---

## 1. Correção das Variações Visuais

### Problema
A função `buildVisualVariationInstructions` no edge function precisa ser mais explícita sobre o que NÃO alterar quando apenas uma opção está marcada.

### Solução
Atualizar a edge function `daily-carousel-generator-stream` para incluir instruções mais fortes sobre manter elementos não selecionados:

```typescript
// Quando alterCharacters = true MAS alterColorPalette = false e alterBackground = false
instructions += `
- SUBSTITUA OS PERSONAGENS/PESSOAS: coloque pessoas diferentes
- MANTENHA ABSOLUTAMENTE INALTERADAS: cores de fundo, paleta de cores, elementos decorativos`;
```

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/daily-carousel-generator-stream/index.ts` | Reforçar instruções de preservação na função `buildVisualVariationInstructions` |

---

## 2. Preview de Referência em 4:5

### Problema
No `SelectedCarouselPreview.tsx`, as imagens usam `aspect-square` (1:1) ao invés de `aspect-[4/5]`.

### Solução
Alterar o aspect ratio de `aspect-square` para `aspect-[4/5]` em todas as renderizações de slides.

| Arquivo | Alteração |
|---------|-----------|
| `src/components/carousel-generator/SelectedCarouselPreview.tsx` | Mudar `aspect-square` para `aspect-[4/5]` nas linhas 64 e 76 |
| `src/components/carousel-generator/SlideContentCard.tsx` | Mudar `aspect-square` para `aspect-[4/5]` na linha 76 |

---

## 3. Edição Individual de Slides Gerados

### Visão Geral
Adicionar uma seção abaixo do mockup do Instagram mostrando cada slide gerado com opção de editar individualmente, usando o mesmo modal de edição do Planejador de Conteúdo.

### Componentes Necessários

#### 3.1 Novo Componente: `GeneratedSlideEditCard`
Um card para cada slide com:
- Thumbnail da imagem (4:5)
- Botão "Editar" que abre modal
- Indicador de slide número

#### 3.2 Novo Modal: `SlideImageEditModal`
Reutilizando a lógica do ContentPlanPostCard:
- Switch "Usar imagem atual como referência"
- Upload de "Imagem para incorporar" (opcional)
- Textarea para prompt de edição
- Botões Cancelar/Editar Imagem

#### 3.3 Atualização do `GeneratedCarouselPreview`
- Adicionar grid de slides editáveis abaixo do mockup
- Cada slide com botão de edição
- Chamar edge function `generate-visual-creative` para edição
- Atualizar imagem no banco após edição

### Estrutura Visual

```text
┌─────────────────────────────────────┐
│  Carrossel Gerado!                  │
│  5 slides • tutorial                │
├─────────────────────────────────────┤
│                                     │
│   ┌──────────────────────────┐      │
│   │   Instagram Mockup       │      │
│   │   (navegável)            │      │
│   │   [4:5 aspect ratio]     │      │
│   └──────────────────────────┘      │
│                                     │
├─────────────────────────────────────┤
│  Editar Slides Individuais          │
│                                     │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│  │ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │ │
│  │[4:5]│ │[4:5]│ │[4:5]│ │[4:5]│ │[4:5]││
│  │Editar│ │Editar│ │Editar│ │Editar│ │Editar││
│  └────┘ └────┘ └────┘ └────┘ └────┘ │
├─────────────────────────────────────┤
│  [Ver Detalhes e Editar]            │
└─────────────────────────────────────┘
```

### Fluxo de Edição

1. Usuário clica "Editar" em um slide
2. Abre modal com:
   - Switch para usar imagem atual como referência (pré-marcado)
   - Área de upload para imagem adicional
   - Campo de texto para instruções
3. Usuário descreve alteração desejada
4. Sistema chama `generate-visual-creative` com:
   - `references: [url_imagem_atual]`
   - `additionalImageToMerge: url_imagem_extra` (se houver)
   - `extraPrompt: instrucoes_usuario`
5. Nova imagem substituí a anterior no banco
6. Preview atualiza automaticamente

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/carousel-generator/SlideImageEditModal.tsx` | Criar | Modal de edição reutilizável |
| `src/components/carousel-generator/GeneratedSlideEditCard.tsx` | Criar | Card de slide com botão editar |
| `src/components/carousel-generator/GeneratedCarouselPreview.tsx` | Modificar | Adicionar grid de slides editáveis |

---

## Detalhes Técnicos

### SlideImageEditModal.tsx

```typescript
interface SlideImageEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideNumber: number;
  currentImageUrl: string;
  carouselId: string;
  clientId: string;
  companyId: string;
  onImageUpdated: (newImageUrl: string) => void;
}

// Lógica interna:
// - useState para useAsReference, additionalImage, prompt, isGenerating
// - Ref para input de upload da imagem adicional
// - Handler para upload de imagem adicional ao storage
// - Handler para chamar generate-visual-creative
// - Atualizar carousel_generation_queue.slides após sucesso
```

### GeneratedSlideEditCard.tsx

```typescript
interface GeneratedSlideEditCardProps {
  slide: CarouselSlide;
  onEditClick: () => void;
  isEditing?: boolean;
}

// Renderiza:
// - Imagem 4:5
// - Badge com número do slide
// - Botão "Editar" com ícone Pencil
// - Overlay de loading quando isEditing
```

### Atualização do GeneratedCarouselPreview

```typescript
// Novos estados:
const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
const [isSlideEditModalOpen, setIsSlideEditModalOpen] = useState(false);

// Nova seção após o mockup:
<div className="space-y-2">
  <p className="text-xs font-medium text-muted-foreground">
    Editar Slides Individuais
  </p>
  <div className="grid grid-cols-5 gap-2">
    {carousel.slides.map((slide, idx) => (
      <GeneratedSlideEditCard
        key={idx}
        slide={slide}
        onEditClick={() => {
          setEditingSlideIndex(idx);
          setIsSlideEditModalOpen(true);
        }}
        isEditing={editingSlideIndex === idx}
      />
    ))}
  </div>
</div>

<SlideImageEditModal
  open={isSlideEditModalOpen}
  onOpenChange={setIsSlideEditModalOpen}
  slideNumber={editingSlideIndex !== null ? editingSlideIndex + 1 : 1}
  currentImageUrl={editingSlideIndex !== null ? carousel.slides[editingSlideIndex]?.image_url : ''}
  carouselId={carouselId}
  clientId={clientId}
  companyId={companyId}
  onImageUpdated={(newUrl) => {
    // Atualizar estado local e refetch
  }}
/>
```

---

## Resumo de Alterações

| # | Arquivo | Tipo | Descrição |
|---|---------|------|-----------|
| 1 | `supabase/functions/daily-carousel-generator-stream/index.ts` | Modificar | Reforçar instruções de variações visuais |
| 2 | `src/components/carousel-generator/SelectedCarouselPreview.tsx` | Modificar | Aspect ratio 4:5 |
| 3 | `src/components/carousel-generator/SlideContentCard.tsx` | Modificar | Aspect ratio 4:5 |
| 4 | `src/components/carousel-generator/SlideImageEditModal.tsx` | Criar | Modal de edição de slide |
| 5 | `src/components/carousel-generator/GeneratedSlideEditCard.tsx` | Criar | Card de slide editável |
| 6 | `src/components/carousel-generator/GeneratedCarouselPreview.tsx` | Modificar | Adicionar grid de edição + passar clientId/companyId |

---

## Dependências

- O `GeneratedCarouselPreview` precisará receber `clientId` e `companyId` como props adicionais
- A edge function `generate-visual-creative` já existe e será reutilizada
- Após edição, o sistema atualizará o array `slides` na tabela `carousel_generation_queue`
