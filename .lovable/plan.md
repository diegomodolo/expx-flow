
# Plano: Corrigir Re-início da Geração do Carrossel

## Problema Identificado

O modal de geração está **reiniciando a geração** após completar todas as imagens porque o `useEffect` que controla a geração tem dependências que são **objetos/arrays recriados a cada render**.

### Causa Raiz

No `CarouselGenerationProgressModal.tsx` (linha 152):

```typescript
useEffect(() => {
  // ... lógica de geração
}, [open, cancel, start, clientId, companyId, userId, carouselType, 
    referenceCarouselImages, preGeneratedSlides, visualVariations, onFinished]);
```

E no `GeradorCarrosseis.tsx` (linhas 576-585):

```typescript
preGeneratedSlides={
  generationMode === "fromExample" && generatedSlideContents && generatedSlideContents.length > 0
    ? generatedSlideContents.map(s => ({ ... }))  // ← NOVO ARRAY A CADA RENDER!
    : undefined
}
```

Quando a geração termina e chama `onFinished()`, isso pode causar um re-render do componente pai, que recria esses arrays, disparando o `useEffect` novamente.

---

## Solução

Usar **refs** para armazenar os parâmetros de geração e controlar se já iniciou, evitando re-execuções indesejadas.

### Alterações no CarouselGenerationProgressModal.tsx

```typescript
// Adicionar refs para controlar a geração
const hasStartedRef = useRef(false);
const paramsRef = useRef<{...} | null>(null);

useEffect(() => {
  if (!open) {
    // Reset quando fecha
    hasStartedRef.current = false;
    paramsRef.current = null;
    cancel();
    // ... reset states
    return;
  }

  // Se já iniciou, não inicia novamente
  if (hasStartedRef.current) {
    return;
  }

  // Marca como iniciado ANTES de chamar start()
  hasStartedRef.current = true;
  
  // Armazena os parâmetros para debug
  paramsRef.current = {
    clientId,
    companyId,
    userId,
    carouselType,
    referenceCarouselImages,
    preGeneratedSlides,
    visualVariations,
  };

  console.log("[CarouselGenerationProgressModal] Starting with:", paramsRef.current);

  start({ ... });
}, [open]); // ← APENAS 'open' como dependência!
```

---

## Fluxo Corrigido

```text
1. Modal abre (open = true)
2. hasStartedRef.current = false → entra no if
3. hasStartedRef.current = true ← marca antes de iniciar
4. Chama start() e começa geração
5. Durante geração, qualquer re-render acontece
6. useEffect dispara novamente
7. hasStartedRef.current = true → return (não reinicia!)
8. Geração completa, chama onFinished()
9. onFinished pode causar re-render
10. hasStartedRef.current = true → return (não reinicia!)
11. Usuário fecha modal (open = false)
12. hasStartedRef.current = false ← reset
13. Próxima abertura funciona normalmente
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/generators/CarouselGenerationProgressModal.tsx` | Adicionar ref para prevenir re-execução |

---

## Código Detalhado

```typescript
import { useEffect, useMemo, useRef, useState } from "react";

// ... dentro do componente

const { isGenerating, start, cancel } = useCarouselGenerationStream();

// Ref para prevenir re-execução da geração
const hasStartedRef = useRef(false);

// ... outros estados

useEffect(() => {
  if (!open) {
    // Reset completo quando fecha
    hasStartedRef.current = false;
    cancel();
    setCarouselId(null);
    setPickedType(null);
    setSlidesTotal(0);
    setSlides([]);
    setActiveIndex(0);
    setIsDone(false);
    return;
  }

  // GUARD: Se já iniciou, não inicia novamente
  if (hasStartedRef.current) {
    console.log("[CarouselGenerationProgressModal] Already started, skipping...");
    return;
  }

  // Marca como iniciado ANTES de chamar start
  hasStartedRef.current = true;

  // Debug log
  console.log("[CarouselGenerationProgressModal] Starting with:", {
    clientId,
    companyId,
    carouselType: carouselType || "NOT PROVIDED",
    referenceCarouselImages: referenceCarouselImages?.length || 0,
    preGeneratedSlides: preGeneratedSlides?.length || 0,
    visualVariations: visualVariations || "NOT PROVIDED",
  });

  // Start generation
  start({
    clientId,
    companyId,
    userId,
    carouselType,
    referenceCarouselImages,
    preGeneratedSlides,
    visualVariations,
    onEvent: (ev) => {
      // ... event handlers (sem mudanças)
    },
  }).catch((e: any) => {
    console.error(e);
    toast.error(e?.message || "Erro ao gerar carrossel");
    setIsDone(true);
  });
}, [open, cancel, start, clientId, companyId, userId, carouselType, 
    referenceCarouselImages, preGeneratedSlides, visualVariations, onFinished]);
```

---

## Alternativa: Memoizar no Componente Pai

Opcionalmente, também podemos memoizar os arrays no `GeradorCarrosseis.tsx` para evitar recriação:

```typescript
const memoizedPreGeneratedSlides = useMemo(() => {
  if (generationMode !== "fromExample" || !generatedSlideContents?.length) {
    return undefined;
  }
  return generatedSlideContents.map(s => ({
    slideNumber: s.slideNumber,
    type: s.type,
    headline: s.headline,
    bodyText: s.bodyText,
    visualDescription: s.visualDescription,
  }));
}, [generationMode, generatedSlideContents]);
```

Mas a solução com `useRef` é mais robusta e resolve o problema na raiz.

---

## Benefícios

- **Previne re-execução**: A geração só inicia uma vez por abertura do modal
- **Robusto**: Funciona mesmo se props mudarem durante a geração
- **Simples**: Mudança mínima no código
- **Debug fácil**: Log indica quando tentou reiniciar mas foi bloqueado
