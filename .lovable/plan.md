
# Plano: Gerador de Carrossel (usando motor da Fábrica)

## Objetivo
Adicionar um novo gerador **"Gerador de Carrossel"** na página `/geradores`, que usa o mesmo motor de geração de carrosseis já existente na Fábrica de Carrosseis. Este será um fluxo simplificado e direto para gerar carrosseis avulsos.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        /geradores/carrosseis                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────────────┐  │
│  │ 1. Seletor  │ → │ 2. Tipo de   │ → │ 3. Tema/Orientações         │  │
│  │   Cliente   │   │   Carrossel  │   │   (Opcional c/ IA)          │  │
│  └─────────────┘   └──────────────┘   └─────────────────────────────┘  │
│                                                                         │
│              ↓ [Gerar Carrossel]                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │     CarouselGenerationProgressModal (REUTILIZADO)               │   │
│  │     - Streaming SSE em tempo real                               │   │
│  │     - Preview de cada slide gerado                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│              ↓ [Concluído]                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │     Resultado: CarouselPreviewCard (REUTILIZADO)                │   │
│  │     - Download, Agendar, Salvar                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes Reutilizados

| Componente | Origem | Uso |
|------------|--------|-----|
| `useCarouselGenerationStream` | `src/hooks/` | Hook de streaming SSE para geração |
| `CarouselGenerationProgressModal` | `src/components/generators/` | Modal de progresso com preview |
| `CarouselPreviewCard` | `src/components/creative-generator/` | Preview e ações do carrossel gerado |
| `daily-carousel-generator-stream` | Edge Function | Motor de geração com IA |

---

## Estrutura de Arquivos

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/GeradorCarrosseis.tsx` | Página principal do gerador |

### Arquivos Modificados

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Geradores.tsx` | Adicionar card do Gerador de Carrossel |
| `src/App.tsx` | Adicionar rota `/geradores/carrosseis` |

---

## Implementação

### 1. Página `GeradorCarrosseis.tsx`

Estrutura similar ao `GeradorCriativos.tsx`, com:

**Formulário de Entrada:**
- Seletor de cliente (combobox com busca)
- Tipo de carrossel: Tutorial, Comparação, Bastidores, Lista Curada
- Número de slides (2-10, padrão 8)
- Tema/Orientação (textarea com opção de gerar via IA)
- Referências visuais opcionais

**Fluxo de Geração:**
1. Usuário preenche formulário
2. Clica em "Gerar Carrossel"
3. Abre `CarouselGenerationProgressModal`
4. Streaming mostra progresso em tempo real
5. Ao concluir, exibe resultado com `CarouselPreviewCard`

**Abas (Tabs):**
- "Gerar Novo" - Formulário principal
- "Histórico" - Lista de carrosseis gerados (consulta `carousel_generation_queue`)

### 2. Card na Página de Geradores

Adicionar novo item no array `generators`:

```typescript
{
  id: "carrosseis",
  title: "Gerador de Carrossel",
  description: "Crie carrosseis para Instagram com IA de forma rápida e simplificada",
  icon: Layers,
  color: "teal",
  path: "/geradores/carrosseis",
}
```

### 3. Rota no App.tsx

```typescript
<Route path="/geradores/carrosseis" element={
  <PermissionProtectedRoute requiredPermission="geradores">
    <GeradorCarrosseis />
  </PermissionProtectedRoute>
} />
```

---

## Diferença: Gerador vs Fábrica

| Aspecto | Gerador de Carrossel | Fábrica de Carrosseis |
|---------|---------------------|----------------------|
| **Propósito** | Geração avulsa/on-demand | Geração automática/agendada |
| **Fluxo** | Simplificado, 1 tela | Multi-páginas com dashboard |
| **Agendamento** | Não | Sim (CRON jobs) |
| **Revisão** | Imediata | Fila de aprovação |
| **Motor** | Mesmo (`daily-carousel-generator-stream`) | Mesmo |

---

## Interface do Usuário

**Card de Geração:**
```text
┌────────────────────────────────────────────────────────────────┐
│ 📊 Gerar Carrossel com IA                                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Cliente *                                                      │
│ ┌──────────────────────────────────────────────────┐          │
│ │ Selecione um cliente...                        ▼ │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ Tipo de Carrossel                                             │
│ ○ Tutorial/Passo a Passo  ○ Nós vs. Eles                      │
│ ○ Bastidores              ○ Lista Curada                       │
│                                                                │
│ Número de Slides                                               │
│ [────────●───────────] 8 slides                                │
│                                                                │
│ Tema/Orientação (opcional)                              [✨ IA]│
│ ┌──────────────────────────────────────────────────┐          │
│ │ Descreva o tema do carrossel ou deixe a IA...   │          │
│ │                                                  │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│              [ 🎨 Gerar Carrossel ]                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Hook e Modal Existentes

O `useCarouselGenerationStream` já aceita:
- `clientId`, `companyId`, `userId`
- `carouselType` (opcional - se não informado, a edge function escolhe baseado no schedule)
- `onEvent` callback para eventos de streaming

O `CarouselGenerationProgressModal` mostra:
- Lista de slides à esquerda com status (pendente, gerando, concluído, erro)
- Preview da imagem à direita
- Barra de progresso
- Botão cancelar/fechar

### Edge Function

A edge function `daily-carousel-generator-stream` já:
- Busca dados do cliente
- Gera conteúdo textual via IA (headlines, body, CTAs)
- Gera imagens slide a slide via Gemini
- Salva na tabela `carousel_generation_queue`
- Retorna eventos SSE em tempo real

**Nota:** Pode ser necessário ajustar a edge function para aceitar parâmetros opcionais como `theme` customizado (orientações do usuário) e `slides_count` para sobrescrever o padrão do schedule.

---

## Resumo de Alterações

1. **Criar** `src/pages/GeradorCarrosseis.tsx` - Página do gerador simplificado
2. **Editar** `src/pages/Geradores.tsx` - Adicionar card do novo gerador
3. **Editar** `src/App.tsx` - Adicionar rota protegida
4. **Opcional**: Ajustar edge function para aceitar tema/orientação customizada

---

## Benefícios

- **Reutilização**: Aproveita 100% do motor existente da Fábrica
- **Simplicidade**: Interface direta sem necessidade de configurar agendamentos
- **Consistência**: Mesmo padrão visual e UX dos outros geradores
- **Manutenção**: Código centralizado, correções beneficiam ambos os fluxos
