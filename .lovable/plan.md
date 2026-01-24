

# Plano: Opções de Variação Visual para Geração a Partir de Exemplo

## Objetivo
Após validar os conteúdos gerados por IA, adicionar uma etapa de **configuração visual** que permite ao usuário escolher quais elementos variar nas imagens geradas. Se nenhuma opção for marcada, a IA deve reproduzir a imagem de referência exatamente igual, apenas trocando o texto.

---

## Arquitetura do Novo Fluxo

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    GERAR A PARTIR DE EXEMPLO                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Selecionar Carrossel do Instagram                                    │
│                                                                          │
│  2. Preview com Imagens (3 por linha)                                    │
│     + Conteúdo gerado por IA (editável)                                  │
│                                                                          │
│  3. NOVO: Configurações Visuais (aparece após conteúdo gerado)           │
│     ┌────────────────────────────────────────────────────────────────┐  │
│     │  🎨 Configurações de Variação Visual                           │  │
│     │                                                                │  │
│     │  ☐ Alterar paleta de cores                                     │  │
│     │    Inverte/troca as cores principais das imagens               │  │
│     │                                                                │  │
│     │  ☐ Alterar personagens/pessoas                                 │  │
│     │    Substitui as pessoas por outras diferentes                  │  │
│     │                                                                │  │
│     │  ☐ Alterar elementos de fundo                                  │  │
│     │    Troca os elementos decorativos e de fundo                   │  │
│     │                                                                │  │
│     │  ☐ Alterar disposição dos elementos                            │  │
│     │    Reposiciona textos e elementos visuais                      │  │
│     │                                                                │  │
│     │  💡 Se nenhuma opção marcada, a imagem será reproduzida        │  │
│     │     exatamente igual à referência, apenas com o texto novo.    │  │
│     └────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  4. [🎨 Gerar Carrossel]                                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Opções de Variação Visual

| Opção | Descrição | Instrução para IA |
|-------|-----------|-------------------|
| **Alterar Paleta de Cores** | Inverte/troca as cores principais | "Inverta a paleta de cores: onde tem azul, coloque vermelho; onde tem vermelho, coloque azul" |
| **Alterar Personagens** | Substitui pessoas por outras | "Substitua a pessoa/personagem por uma pessoa diferente (gênero, etnia, estilo diferentes)" |
| **Alterar Elementos de Fundo** | Troca elementos decorativos | "Substitua os elementos de fundo (ícones, formas, padrões) por outros diferentes" |
| **Alterar Disposição** | Reposiciona elementos | "Altere a disposição dos elementos: mova textos, mude alinhamentos, reposicione blocos" |

Se **NENHUMA opção marcada**:
> "REPRODUZA EXATAMENTE a imagem de referência anexada. Mantenha idêntico: cores, layout, personagens, fundo, posicionamento. APENAS SUBSTITUA o texto pelo novo texto fornecido."

---

## Componentes

### Criar Novo Componente

| Arquivo | Descrição |
|---------|-----------|
| `src/components/carousel-generator/VisualVariationOptions.tsx` | Card com as 4 opções de variação visual |

### Modificar Componentes Existentes

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/GeradorCarrosseis.tsx` | Adicionar estado para variações visuais, exibir card após conteúdo gerado |
| `src/hooks/useCarouselGenerationStream.ts` | Adicionar parâmetro `visualVariations` |
| `src/components/generators/CarouselGenerationProgressModal.tsx` | Passar `visualVariations` para o hook |
| `supabase/functions/daily-carousel-generator-stream/index.ts` | Receber `visual_variations` e ajustar prompt de imagem |

---

## Detalhes Técnicos

### 1. Interface das Opções de Variação

```typescript
// src/components/carousel-generator/VisualVariationOptions.tsx

export interface VisualVariationOptions {
  alterColorPalette: boolean;      // Alterar paleta de cores
  alterCharacters: boolean;        // Alterar personagens/pessoas
  alterBackground: boolean;        // Alterar elementos de fundo
  alterLayout: boolean;            // Alterar disposição dos elementos
}

// Valores padrão: todos false (reproduzir exatamente igual)
const defaultVariations: VisualVariationOptions = {
  alterColorPalette: false,
  alterCharacters: false,
  alterBackground: false,
  alterLayout: false,
};
```

### 2. Componente VisualVariationOptions

Um card simples com 4 checkboxes:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🎨 Configurações de Variação Visual                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ☐ Alterar paleta de cores                                          │
│     Inverte/troca as cores principais da imagem                     │
│                                                                     │
│  ☐ Alterar personagens/pessoas                                      │
│     Substitui pessoas que aparecem nas imagens                      │
│                                                                     │
│  ☐ Alterar elementos de fundo                                       │
│     Troca ícones, formas e elementos decorativos                    │
│                                                                     │
│  ☐ Alterar disposição dos elementos                                 │
│     Reposiciona textos e blocos visuais                             │
│                                                                     │
│  ───────────────────────────────────────────────────────────────    │
│  💡 Se nenhuma opção estiver marcada, a imagem será reproduzida     │
│     fielmente à referência, apenas com o novo texto.                │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Lógica do Prompt de Imagem

Na edge function `daily-carousel-generator-stream`, o prompt será construído dinamicamente:

```typescript
// Se nenhuma variação selecionada = modo "cópia fiel"
const noVariations = !visual_variations || 
  (!visual_variations.alterColorPalette && 
   !visual_variations.alterCharacters && 
   !visual_variations.alterBackground && 
   !visual_variations.alterLayout);

if (noVariations) {
  // Prompt para CÓPIA EXATA
  prompt += `
MODO CÓPIA FIEL:
- REPRODUZA EXATAMENTE a imagem de referência anexada
- MANTENHA IDÊNTICO: cores, layout, personagens, elementos de fundo, posicionamento
- APENAS SUBSTITUA o texto pelo novo texto abaixo
- O resultado deve ser visualmente IDÊNTICO à referência, só mudando o conteúdo textual`;
} else {
  // Prompt com variações selecionadas
  if (visual_variations.alterColorPalette) {
    prompt += "\n- INVERTA A PALETA DE CORES: onde tem uma cor, coloque outra (ex: azul↔vermelho)";
  }
  if (visual_variations.alterCharacters) {
    prompt += "\n- SUBSTITUA OS PERSONAGENS/PESSOAS por pessoas diferentes (aparência, gênero, estilo)";
  }
  if (visual_variations.alterBackground) {
    prompt += "\n- TROQUE OS ELEMENTOS DE FUNDO por outros diferentes (ícones, formas, padrões)";
  }
  if (visual_variations.alterLayout) {
    prompt += "\n- ALTERE A DISPOSIÇÃO DOS ELEMENTOS: reposicione textos, mude alinhamentos";
  }
}
```

### 4. Estados no GeradorCarrosseis

```typescript
// Novo estado para variações visuais
const [visualVariations, setVisualVariations] = useState<VisualVariationOptions>({
  alterColorPalette: false,
  alterCharacters: false,
  alterBackground: false,
  alterLayout: false,
});
```

O card de variações visuais só aparece quando:
- `generationMode === "fromExample"`
- `generatedSlideContents !== null && generatedSlideContents.length > 0`

### 5. Passagem de Dados

```text
GeradorCarrosseis
    ↓ visualVariations
CarouselGenerationProgressModal
    ↓ visualVariations
useCarouselGenerationStream.start()
    ↓ visual_variations (JSON body)
daily-carousel-generator-stream (Edge Function)
    ↓ Constrói prompt baseado nas opções
generateImageWithNanoBanana()
```

---

## Fluxo Completo do Usuário

1. Seleciona cliente
2. Escolhe "Gerar a Partir de Exemplo"
3. Seleciona carrossel do Instagram
4. Clica em "Gerar Conteúdo com IA"
5. Escolhe tema e IA gera conteúdos para cada slide
6. Edita os conteúdos se necessário
7. **NOVO: Configura variações visuais (ou deixa tudo desmarcado para cópia fiel)**
8. Clica em "Gerar Carrossel"
9. IA gera imagens baseadas nas referências + opções de variação

---

## Resumo das Alterações

### Arquivo a Criar

1. **`src/components/carousel-generator/VisualVariationOptions.tsx`**
   - Card com 4 checkboxes para opções de variação
   - Texto explicativo sobre cada opção
   - Nota sobre comportamento quando nada selecionado

### Arquivos a Modificar

2. **`src/pages/GeradorCarrosseis.tsx`**
   - Adicionar estado `visualVariations`
   - Importar e renderizar `VisualVariationOptions` após conteúdo gerado
   - Resetar variações quando carrossel/modo mudar
   - Passar `visualVariations` para o modal

3. **`src/hooks/useCarouselGenerationStream.ts`**
   - Adicionar `visualVariations?: VisualVariationOptions` nos parâmetros
   - Passar para o body da requisição como `visual_variations`

4. **`src/components/generators/CarouselGenerationProgressModal.tsx`**
   - Receber prop `visualVariations`
   - Passar para `start()` do hook

5. **`supabase/functions/daily-carousel-generator-stream/index.ts`**
   - Receber `visual_variations` do body
   - Construir prompt de imagem baseado nas opções:
     - Se nenhuma marcada → modo "cópia fiel"
     - Se alguma marcada → incluir instruções específicas

---

## Benefícios

- **Controle Total**: Usuário decide exatamente o que variar
- **Cópia Fiel**: Possibilidade de replicar o carrossel original com texto novo
- **Flexibilidade**: Combinar variações conforme necessidade
- **Consistência**: Manter elementos importantes (cores, pessoas) enquanto varia outros

