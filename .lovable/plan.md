

# Plano: Corrigir Passagem de Dados para Geração "A Partir de Exemplo"

## Problema Identificado

Analisando os logs da edge function, identifiquei que:

1. **O sistema recebe as imagens de referência** (`reference_carousel_images_count: 5`)
2. **Mas NÃO recebe os slides pré-gerados** (`pre_generated_slides_count` não aparece no log)
3. **A edge function cai no branch de "gerar do zero"** (log "Calling AI for carousel generation")
4. **Resultado**: Usa `slides_per_carousel` do schedule (8 slides) em vez dos 6 do exemplo

A causa raiz está em como os dados são passados e/ou como a condição para passar `preGeneratedSlides` funciona.

---

## Análise do Fluxo Atual

```text
GeradorCarrosseis.tsx (linha 574-580)
    ↓ preGeneratedSlides={generatedSlideContents?.map(...)}
CarouselGenerationProgressModal (linha 39)
    ↓ preGeneratedSlides?: PreGeneratedSlide[]
useCarouselGenerationStream.start() (linha 87)
    ↓ pre_generated_slides: preGeneratedSlides
Edge Function (linha 158)
    ↓ pre_generated_slides (CHEGANDO VAZIO!)
```

O problema está em que o `preGeneratedSlides` está sendo passado **condicionalmente** mas sem verificar se o `generationMode === "fromExample"`.

---

## Correções Necessárias

### 1. GeradorCarrosseis.tsx - Passar dados apenas no modo correto

Atualmente:
```typescript
preGeneratedSlides={generatedSlideContents?.map(s => ({...}))}
```

O problema é que `generatedSlideContents` pode estar null se houve algum problema. Precisamos garantir que:
- Só passe quando `generationMode === "fromExample"` E `generatedSlideContents` existe

### 2. Adicionar logs de debug no frontend

Para entender melhor o que está sendo passado, adicionar console.log antes de abrir o modal.

### 3. Edge Function - Melhorar log inicial

Garantir que o log mostra claramente se `pre_generated_slides` está definido e seu tamanho.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/GeradorCarrosseis.tsx` | Ajustar condição para passar `preGeneratedSlides` e adicionar log de debug |
| `src/components/generators/CarouselGenerationProgressModal.tsx` | Adicionar log para verificar props recebidas |
| `supabase/functions/daily-carousel-generator-stream/index.ts` | Melhorar log inicial para mostrar todos os parâmetros recebidos |

---

## Alterações Detalhadas

### 1. GeradorCarrosseis.tsx

Modificar a passagem de props para o modal (linhas 566-584):

```typescript
{selectedClientId && companyId && user?.id && (
  <CarouselGenerationProgressModal
    open={isModalOpen}
    onOpenChange={setIsModalOpen}
    clientId={selectedClientId}
    companyId={companyId}
    userId={user.id}
    // Só passa carouselType no modo "scratch"
    carouselType={generationMode === "scratch" ? carouselType : undefined}
    // Só passa referências e slides pré-gerados no modo "fromExample"
    referenceCarouselImages={generationMode === "fromExample" ? referenceCarouselImages : undefined}
    preGeneratedSlides={
      generationMode === "fromExample" && generatedSlideContents && generatedSlideContents.length > 0
        ? generatedSlideContents.map(s => ({
            slideNumber: s.slideNumber,
            type: s.type,
            headline: s.headline,
            bodyText: s.bodyText,
            visualDescription: s.visualDescription,
          }))
        : undefined
    }
    visualVariations={generationMode === "fromExample" ? visualVariations : undefined}
    onFinished={handleGenerationFinished}
  />
)}
```

### 2. CarouselGenerationProgressModal.tsx

Adicionar log na abertura:

```typescript
useEffect(() => {
  if (!open) {
    // ... reset code
    return;
  }

  // Log para debug
  console.log("[CarouselGenerationProgressModal] Starting with:", {
    clientId,
    companyId,
    carouselType,
    referenceCarouselImages: referenceCarouselImages?.length || 0,
    preGeneratedSlides: preGeneratedSlides?.length || 0,
    visualVariations,
  });

  start({
    // ... rest of code
  });
}, [...]);
```

### 3. daily-carousel-generator-stream/index.ts

Melhorar log inicial para garantir visibilidade:

```typescript
console.log("[daily-carousel-generator-stream] Start", { 
  client_id, 
  company_id, 
  user_id, 
  carousel_type: carousel_type || "NOT PROVIDED", 
  reference_carousel_images_count: reference_carousel_images?.length || 0,
  pre_generated_slides_count: pre_generated_slides?.length || 0,
  pre_generated_slides_provided: !!pre_generated_slides,
  visual_variations: visual_variations || "NOT PROVIDED"
});
```

---

## Fluxo Corrigido

Após as correções:

```text
Modo "fromExample":
├── carouselType = undefined (IA detecta do tipo dos slides)
├── referenceCarouselImages = [5 URLs]
├── preGeneratedSlides = [6 objetos com headline, bodyText, etc]
└── visualVariations = { alterColorPalette: true, ... }

Modo "scratch":
├── carouselType = "tutorial" (selecionado pelo usuário)
├── referenceCarouselImages = undefined
├── preGeneratedSlides = undefined
└── visualVariations = undefined
```

---

## Resultado Esperado

Após implementar essas correções:
- Quando usar "Gerar a Partir de Exemplo" com 6 imagens
- A edge function receberá `pre_generated_slides` com 6 slides
- O log mostrará: `pre_generated_slides_count: 6`
- O sistema usará `buildCarouselFromPreGenerated()` em vez de `generateCarousel()`
- Serão geradas exatamente 6 imagens, respeitando o exemplo

