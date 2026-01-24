
# Plano: Correção do Elemento Sugerido + Nova Opção de Variação

## Diagnóstico do Problema

### Bug Principal Identificado
No arquivo `GeradorCarrosseis.tsx` (linhas 604-612), ao montar os `preGeneratedSlides` para enviar ao modal de geração, o campo **`suggestedElement` está sendo omitido** do mapeamento:

```typescript
preGeneratedSlides={
  generatedSlideContents.map(s => ({
    slideNumber: s.slideNumber,
    type: s.type,
    headline: s.headline,
    bodyText: s.bodyText,
    visualDescription: s.visualDescription,
    // ❌ FALTA: suggestedElement: s.suggestedElement
  }))
}
```

Isso explica os logs mostrando `suggestedElement: "none"` — o valor nunca chega à edge function!

### Problema Secundário
A opção "Alterar elementos de fundo" está tentando fazer duas coisas ao mesmo tempo:
1. Trocar ícones decorativos do fundo
2. Substituir o elemento principal pelo sugerido

Você prefere separá-las para ter controle granular.

---

## Alterações Planejadas

### 1. Corrigir Passagem do `suggestedElement` (Bug Principal)

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/GeradorCarrosseis.tsx` | Adicionar `suggestedElement: s.suggestedElement` no mapeamento (linha ~611) |

### 2. Criar Nova Opção de Variação Visual

Adicionar uma quinta opção: **"Substituir elemento principal"**

| Arquivo | Alteração |
|---------|-----------|
| `src/components/carousel-generator/VisualVariationOptions.tsx` | Adicionar checkbox "Substituir elemento principal" com ícone apropriado |
| `src/hooks/useCarouselGenerationStream.ts` | Adicionar `replaceMainElement: boolean` à interface `VisualVariations` |
| `supabase/functions/daily-carousel-generator-stream/index.ts` | Atualizar interface e lógica de instruções |

### 3. Atualizar Instruções da Edge Function

Separar as instruções:
- **"Alterar elementos de fundo"** = trocar apenas ícones/decorações do fundo
- **"Substituir elemento principal"** = trocar o objeto/ícone mais destacado pelo elemento sugerido

### 4. Implementar Auto-Retry

Quando `replaceMainElement` estiver ativado e houver `suggestedElement`, a edge function tentará até 2 vezes se a primeira geração não mencionar o elemento no retorno.

---

## Detalhes Técnicos

### Nova Interface VisualVariations

```typescript
export interface VisualVariations {
  alterColorPalette: boolean;
  alterCharacters: boolean;
  alterBackground: boolean;      // Agora = apenas decorativos
  replaceMainElement: boolean;   // NOVO = substitui elemento principal
  alterLayout: boolean;
}

export const defaultVisualVariations: VisualVariations = {
  alterColorPalette: false,
  alterCharacters: false,
  alterBackground: false,
  replaceMainElement: false,
  alterLayout: false,
};
```

### Nova Opção no Card de Variações

```text
┌─────────────────────────────────────────────────┐
│ ☑ Alterar paleta de cores                       │
│ ☑ Alterar personagens/pessoas                   │
│ ☑ Alterar elementos de fundo                    │
│   (decorativos, ícones de fundo)                │
│ ☑ Substituir elemento principal pelo sugerido   │  ← NOVA
│   (ex: trocar computador por ampulheta)         │
│ ☑ Alterar disposição dos elementos              │
└─────────────────────────────────────────────────┘
```

### Lógica de Instruções na Edge Function

```typescript
// Quando replaceMainElement = true E suggestedElement existe
if (variations.replaceMainElement && suggestedElement) {
  elementsToChange.push(
    `SUBSTITUA O ELEMENTO PRINCIPAL DA IMAGEM: ` +
    `Identifique o objeto/ícone mais destacado (ex: computador, dado, roleta) ` +
    `e TROQUE-O por "${suggestedElement}". ` +
    `MANTENHA a mesma posição, escala e integração visual.`
  );
}

// Quando alterBackground = true (agora só para decorativos)
if (variations.alterBackground) {
  elementsToChange.push(
    `TROQUE ELEMENTOS DECORATIVOS DE FUNDO: ` +
    `Substitua ícones pequenos, formas geométricas ou padrões decorativos ` +
    `(NÃO o elemento principal).`
  );
}
```

### Auto-Retry para Elemento Sugerido

```typescript
const MAX_RETRIES = 2;
let attempts = 0;
let imageDataUrl: string | null = null;

while (attempts < MAX_RETRIES && !imageDataUrl) {
  attempts++;
  
  try {
    imageDataUrl = await generateImageWithNanoBanana(
      attempts === 1 ? imagePrompt : 
        `${imagePrompt}\n\n⚠️ CRÍTICO: Você DEVE incluir "${suggestedElement}" como elemento principal. Esta é a segunda tentativa.`,
      LOVABLE_API_KEY,
      slideReferences
    );
  } catch (e) {
    console.log(`[Retry ${attempts}] Failed:`, e.message);
  }
}
```

---

## Resumo de Arquivos

| # | Arquivo | Ação | Descrição |
|---|---------|------|-----------|
| 1 | `src/pages/GeradorCarrosseis.tsx` | Modificar | Adicionar `suggestedElement` no mapeamento |
| 2 | `src/components/carousel-generator/VisualVariationOptions.tsx` | Modificar | Adicionar checkbox "Substituir elemento principal" |
| 3 | `src/hooks/useCarouselGenerationStream.ts` | Modificar | Adicionar `replaceMainElement` à interface |
| 4 | `supabase/functions/daily-carousel-generator-stream/index.ts` | Modificar | Atualizar interface, instruções e adicionar auto-retry |

---

## Fluxo Visual do Usuário

```text
Usuário seleciona carrossel de referência
          ↓
IA analisa e sugere elementos (ampulheta, gráfico, placa)
          ↓
Usuário edita os textos e elementos sugeridos
          ↓
Usuário marca [✓] "Substituir elemento principal pelo sugerido"
          ↓
Sistema envia:
  - Imagem de referência
  - Novo texto
  - Instrução: "Troque o objeto principal por AMPULHETA"
          ↓
IA gera imagem mantendo layout, cores, mas com ampulheta
          ↓
Se não aparecer ampulheta → auto-retry com prompt reforçado
          ↓
Imagem final com o elemento correto
```
