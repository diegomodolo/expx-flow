

# Plano: Gerar Carrossel a Partir de Exemplo do Instagram

## Objetivo
Adicionar na página de Gerador de Carrossel a opção de escolher entre:
- **Gerar do Zero**: Fluxo atual (IA cria tudo do início)
- **Gerar a Partir de Exemplo**: Usuário seleciona um carrossel existente do Instagram do cliente como referência

---

## Arquitetura

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                       Gerador de Carrossel                               │
├──────────────────────────────────────────────────────────────────────────┤
│  1. Seletor de Cliente                                                   │
│  2. Tipo de Carrossel                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  NOVO: Modo de Geração                                             │ │
│  │  ○ Gerar do Zero          ○ Gerar a Partir de Exemplo              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ↓ Se "Gerar a Partir de Exemplo"                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  [Selecionar Carrossel do Instagram]                               │ │
│  │                                                                    │ │
│  │  → Abre Modal com grid de carrosseis do cliente                    │ │
│  │  → Ao selecionar, busca filhos (slides) via API                    │ │
│  │  → Exibe preview com todas as imagens do carrossel                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Preview do Carrossel Selecionado                                  │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          │ │
│  │  │ 1   │ │ 2   │ │ 3   │ │ 4   │ │ 5   │                          │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                          │ │
│  │  Legenda: "5 tendências de marketing para 2026..."                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  3. Número de Slides                                                     │
│  4. Tema/Orientação                                                      │
│  [Gerar Carrossel]                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Usuário

1. Usuário seleciona o cliente
2. Escolhe o tipo de carrossel
3. **NOVO**: Escolhe o modo de geração:
   - **Gerar do Zero**: Continua normalmente
   - **Gerar a Partir de Exemplo**: 
     - Clica em "Selecionar Carrossel do Instagram"
     - Modal abre com grid de carrosseis (apenas `CAROUSEL_ALBUM`) do Instagram do cliente
     - Ao selecionar um, sistema busca os `children` (slides) desse carrossel
     - Exibe preview horizontal com todas as imagens do carrossel
     - Caption do carrossel original é exibida abaixo
4. Define número de slides e tema
5. Gera o novo carrossel (IA usa as imagens de referência)

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/fetch-instagram-carousel-children/index.ts` | Edge function para buscar slides de um carrossel específico |
| `src/components/carousel-generator/InstagramCarouselSelector.tsx` | Modal para selecionar carrossel do Instagram |
| `src/components/carousel-generator/SelectedCarouselPreview.tsx` | Preview horizontal do carrossel selecionado |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/GeradorCarrosseis.tsx` | Adicionar modo de geração e integração com seletor |
| `supabase/config.toml` | Registrar nova edge function |
| `src/hooks/useCarouselGenerationStream.ts` | Aceitar referências do carrossel exemplo |
| `supabase/functions/daily-carousel-generator-stream/index.ts` | Usar imagens do carrossel exemplo como referência visual |

---

## Detalhes Técnicos

### 1. Edge Function: fetch-instagram-carousel-children

Busca os filhos (slides) de um carrossel específico do Instagram:

```typescript
// Endpoint: POST /functions/v1/fetch-instagram-carousel-children
// Body: { clientId, carouselMediaId }

// Chama: https://graph.facebook.com/v21.0/{carouselMediaId}/children
// Fields: id,media_type,media_url

// Retorna:
{
  success: true,
  children: [
    { id: "...", media_type: "IMAGE", media_url: "..." },
    { id: "...", media_type: "VIDEO", media_url: "...", thumbnail_url: "..." }
  ],
  count: 5
}
```

### 2. Componente InstagramCarouselSelector

Reutiliza lógica do `fetch-instagram-media` existente, mas:
- Filtra apenas `CAROUSEL_ALBUM`
- Ao selecionar, chama `fetch-instagram-carousel-children` para obter slides
- Retorna objeto com dados do carrossel + array de slides

```typescript
interface SelectedCarousel {
  id: string;
  media_url: string; // Capa
  caption?: string;
  timestamp: string;
  children: Array<{
    id: string;
    media_type: 'IMAGE' | 'VIDEO';
    media_url: string;
  }>;
}
```

### 3. Componente SelectedCarouselPreview

Exibe o carrossel selecionado:
- Grid horizontal scrollável com as imagens
- Caption do carrossel original (truncada)
- Botão para trocar/remover seleção

### 4. Modificações na Geração

O hook `useCarouselGenerationStream` passa as URLs das imagens de referência para a edge function:

```typescript
// Novo parâmetro
referenceCarouselImages?: string[]
```

A edge function `daily-carousel-generator-stream`:
- Recebe `reference_carousel_images` no body
- Usa essas imagens como referência visual adicional (junto com as referências do schedule)
- Prompt de IA inclui instrução para se basear no estilo/estrutura do carrossel de referência

---

## Interface do Usuário

### Modo de Geração (novo RadioGroup)

```text
Modo de Geração
○ Gerar do Zero
   Crie um carrossel totalmente novo com IA

● Gerar a Partir de Exemplo  
   Use um carrossel existente do Instagram como referência
```

### Seletor de Carrossel (quando "Gerar a Partir de Exemplo")

```text
Carrossel de Referência *
┌─────────────────────────────────────────────────────────────┐
│  📷 Selecionar Carrossel do Instagram                       │
└─────────────────────────────────────────────────────────────┘

ou se já selecionado:

┌─────────────────────────────────────────────────────────────┐
│ ┌────┐┌────┐┌────┐┌────┐┌────┐                             │
│ │ 1  ││ 2  ││ 3  ││ 4  ││ 5  │  ← scroll horizontal       │
│ └────┘└────┘└────┘└────┘└────┘                             │
│                                                             │
│ "5 tendências de marketing digital para 2026..."           │
│                                                             │
│ [ 🔄 Trocar ]  [ ✕ Remover ]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Resumo das Alterações

1. **Criar** `supabase/functions/fetch-instagram-carousel-children/index.ts`
   - Busca slides de um carrossel específico via Graph API

2. **Criar** `src/components/carousel-generator/InstagramCarouselSelector.tsx`
   - Modal para listar e selecionar carrosseis do Instagram
   - Usa `fetch-instagram-media` com filtro `CAROUSEL_ALBUM`
   - Ao selecionar, busca children e retorna dados completos

3. **Criar** `src/components/carousel-generator/SelectedCarouselPreview.tsx`
   - Preview compacto do carrossel selecionado
   - Grid horizontal com miniaturas dos slides

4. **Editar** `src/pages/GeradorCarrosseis.tsx`
   - Adicionar estado `generationMode: 'scratch' | 'fromExample'`
   - Adicionar estado `selectedCarousel` para armazenar o carrossel de referência
   - Renderizar RadioGroup para escolher modo
   - Renderizar seletor/preview quando modo = 'fromExample'

5. **Editar** `src/hooks/useCarouselGenerationStream.ts`
   - Adicionar parâmetro `referenceCarouselImages?: string[]`
   - Passar para a edge function

6. **Editar** `supabase/functions/daily-carousel-generator-stream/index.ts`
   - Aceitar `reference_carousel_images` no body
   - Combinar com referências existentes do schedule
   - Ajustar prompt para instruir IA a se basear no carrossel de referência

7. **Editar** `supabase/config.toml`
   - Registrar `fetch-instagram-carousel-children`

---

## Benefícios

- **Consistência Visual**: Novos carrosseis mantêm o estilo dos existentes
- **Inspiração Real**: Usuário pode replicar carrosseis de sucesso
- **Referência Precisa**: IA recebe imagens reais como guia visual
- **Flexibilidade**: Usuário escolhe entre criar do zero ou se basear em exemplo

