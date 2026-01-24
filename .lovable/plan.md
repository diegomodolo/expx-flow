
# Plano: Corrigir Geração de Carrossel "A Partir de Exemplo"

## Problemas Identificados

Analisando os logs, identifiquei 3 problemas críticos:

### Problema 1: Edge function usando versão antiga
Os logs mostram:
```
reference_carousel_images_count: 5
// NÃO mostra pre_generated_slides_count!
```

Mas o log atualizado deveria mostrar:
```
pre_generated_slides_count: 5
pre_generated_slides_provided: true
```

Isso indica que a edge function precisa ser redeployada com as mudanças mais recentes.

### Problema 2: Passando TODAS as referências para CADA slide
Atualmente, a função `generateImageWithNanoBanana` recebe TODAS as 5 imagens de referência para cada slide:
```typescript
// PROBLEMA: passa todas as referências para cada slide
const dataUrl = await generateImageWithNanoBanana(imagePrompt, LOVABLE_API_KEY, allReferenceImages);
```

O correto seria passar apenas a imagem de referência CORRESPONDENTE ao slide atual:
```typescript
// CORRETO: passa apenas a referência do slide específico
const slideReferenceImage = allReferenceImages[i] || null;
```

### Problema 3: Prompt não instrui a copiar a imagem específica
O prompt de imagem precisa instruir a IA a:
- Usar a imagem de referência ESPECÍFICA do slide como base
- Reproduzir o layout/composição exata
- Apenas trocar o texto

---

## Solução

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/daily-carousel-generator-stream/index.ts` | Corrigir lógica de geração por slide |

### Alterações Detalhadas

#### 1. Passar imagem de referência ESPECÍFICA por slide

No loop de geração (linhas 271-338), modificar para passar apenas a referência correspondente:

```typescript
for (let i = 0; i < carousel.slides.length; i++) {
  // ...
  
  // Pega apenas a imagem de referência CORRESPONDENTE a este slide
  const slideReferenceImage = reference_carousel_images?.[i] || null;
  
  // Se tem imagem de referência específica para este slide, usa ela
  const slideReferences = slideReferenceImage ? [slideReferenceImage] : allReferenceImages;
  
  // ...
  const dataUrl = await generateImageWithNanoBanana(
    imagePrompt, 
    LOVABLE_API_KEY, 
    slideReferences
  );
}
```

#### 2. Melhorar o prompt para modo "fromExample"

Quando há uma imagem de referência ESPECÍFICA, o prompt deve ser muito mais direto:

```typescript
// Se tem referência específica do slide, usar prompt de "cópia com edição"
const specificReferenceMode = slideReferenceImage !== null;

if (specificReferenceMode) {
  imagePrompt = `EDITE a imagem de referência anexada (imagem número 1).

TAREFA: Reproduzir EXATAMENTE a imagem de referência, APENAS substituindo o texto.

NOVO CONTEÚDO DE TEXTO:
Headline: ${slide.headline}
Texto secundário: ${slide.body_text}

REGRAS ABSOLUTAS:
- COPIE EXATAMENTE o layout, composição, cores, elementos visuais da referência
- MANTENHA IDÊNTICOS: posição dos elementos, paleta de cores, tipografia, fundo
- REPRODUZA o logotipo/marca IDÊNTICO (mesma fonte, cor, posição)
- APENAS SUBSTITUA o texto pelo novo texto acima
- O resultado deve ser visualmente IDÊNTICO à referência
- Formato VERTICAL 3:4 (1080x1440 pixels)
- Texto em português brasileiro sem erros

${variationInstructions}`;
} else {
  // Prompt original para quando não há referência específica
  imagePrompt = `Crie uma imagem profissional para carrossel do Instagram...`;
}
```

#### 3. Ajustar buildVisualVariationInstructions

Quando há referência específica e modo cópia fiel, as instruções devem ser mais enfáticas:

```typescript
if (noVariations && hasSpecificReference) {
  return `
MODO CÓPIA EXATA:
- Esta é uma operação de EDIÇÃO, não de criação
- A imagem anexada é o TEMPLATE que deve ser copiado
- REPRODUZA pixel por pixel o layout e design
- APENAS mude o texto pelos novos valores fornecidos
- Resultado deve ser indistinguível da original (exceto texto)`;
}
```

#### 4. Log detalhado para debug

Adicionar log antes de gerar cada slide:

```typescript
console.log("[daily-carousel-generator-stream] Generating slide", {
  slideNumber: i + 1,
  hasSpecificReference: !!slideReferenceImage,
  referenceUrl: slideReferenceImage?.substring(0, 50) + "...",
  headline: slide.headline.substring(0, 30) + "...",
  variationsApplied: visual_variations,
});
```

---

## Fluxo Corrigido

```text
Modo "fromExample" com 5 slides:

Slide 1:
├── Referência: reference_carousel_images[0]  ← imagem específica
├── Headline: "Novo texto 1"
├── Prompt: "EDITE a imagem de referência..."
└── Resultado: Cópia fiel com texto novo

Slide 2:
├── Referência: reference_carousel_images[1]  ← imagem específica
├── Headline: "Novo texto 2"
├── Prompt: "EDITE a imagem de referência..."
└── Resultado: Cópia fiel com texto novo

... (continua para cada slide)
```

---

## Benefícios

1. **Fidelidade visual**: Cada slide será baseado EXATAMENTE na imagem de referência correspondente
2. **Textos corretos**: Usará os textos pré-gerados e editados pelo usuário
3. **Variações controladas**: Aplica variações apenas quando solicitado
4. **Quantidade correta**: Gera exatamente N slides (onde N = número de referências)

---

## Resumo das Mudanças

1. **No loop de geração**: Passar `reference_carousel_images[i]` para cada slide específico
2. **No prompt de imagem**: Quando tem referência específica, usar prompt de "EDIÇÃO" em vez de "criação"
3. **Na função buildVisualVariationInstructions**: Adicionar modo "hasSpecificReference" para instruções mais diretas
4. **Logs**: Adicionar logs detalhados para cada slide sendo gerado
