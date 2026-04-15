# Design: Aba Editor Visual — Carrossel Studio

**Data:** 2026-04-15  
**Rota:** `/geradores/carrosseis` → aba "Editor Visual"  
**Módulo:** Carousel Studio (`src/components/carousel-studio/`)

---

## Contexto

A aba "Editor Visual" em `/geradores/carrosseis` exibe projetos do Carousel Studio como cards simples com thumbnail pequena. O usuário precisa de:

1. **Thumbnail estilo Instagram** — simular como o carrossel aparece no feed (primeira imagem em card no formato de post)
2. **Excluir carrossel** — com tela de confirmação antes de deletar
3. **Filtros** — por nome (texto) e por cliente (dropdown com busca)

---

## Decisão de Arquitetura

**Extrair `StudioProjectsGrid`** — componente dedicado em `src/components/carousel-studio/StudioProjectsGrid.tsx` que encapsula filtros, grid de cards e lógica de delete. O `GeradorCarrosseis.tsx` apenas renderiza `<StudioProjectsGrid companyId={companyId} />` na aba.

Motivo: `GeradorCarrosseis.tsx` já tem ~870 linhas; isolar a grid mantém o arquivo principal legível.

---

## Dados

### Hook — `useCarouselStudioProjects`

Mudar `select("*")` para `select("*, clients(id, name)")` para trazer o nome do cliente via join sem query adicional.

Tipo atualizado em `StudioProject`:

```typescript
clients?: { id: string; name: string } | null;
```

### Novo Mutation — `useDeleteStudioProject`

Arquivo: `src/hooks/useCarouselStudioProject.ts`

```typescript
export function useDeleteStudioProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
    }: {
      projectId: string;
      companyId: string;
    }) => {
      const { error } = await supabase
        .from("carousel_studio_projects")
        .delete()
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-projects", companyId],
      });
    },
  });
}
```

---

## Componente: `StudioProjectsGrid`

**Arquivo:** `src/components/carousel-studio/StudioProjectsGrid.tsx`

**Props:** `{ companyId: string | undefined }`

### Filtros

Barra acima da grid com dois controles:

- **Input de texto** — filtra `title` por substring (case-insensitive, frontend)
- **`ClientSearchCombobox`** — lista clientes da empresa com busca interna; opção "Todos os clientes" reseta filtro

Filtragem 100% no frontend via `useMemo` sobre os projetos já carregados.

### Card Estilo Instagram

```
┌─────────────────────────┐
│ ○  Nome do Projeto   [⋮]│  ← header: avatar placeholder + título + DropdownMenu
├─────────────────────────┤
│                         │
│   [thumbnail_url]       │  ← aspect-ratio 1:1, object-cover
│   (placeholder cinza    │     sem thumbnail → ícone Layers + badge "Rascunho"
│    com ícone Layers)    │
│                    1/N▸ │  ← badge "1/5" no canto inferior direito
├─────────────────────────┤
│ ♡  ✉  ↗   ✈            │  ← ícones decorativos (Heart, MessageCircle, Send, Bookmark)
│ Cliente: [nome]         │  ← nome do cliente ou "Sem cliente"
│ Minimalista • 5 slides  │  ← estilo + contagem
└─────────────────────────┘
```

- Clicar no card → navega para `/geradores/carrosseis/studio/:id`
- `[⋮]` → `DropdownMenu` com "Abrir editor" e "Excluir"
- Badge "1/N" usa `slides_count` do projeto

### Delete com Confirmação

- "Excluir" no menu abre `AlertDialog` (shadcn/ui)
- Título: "Excluir carrossel?"
- Descrição: `Esta ação não pode ser desfeita. O projeto **[nome]** será removido permanentemente.`
- Botões: "Cancelar" | "Excluir" (variant destructive)
- Após confirmar: chama `useDeleteStudioProject`, toast de sucesso "Carrossel excluído"

### Estado Vazio

- Sem projetos (sem filtro): mensagem + botão "Criar no Editor Visual" (abre wizard)
- Sem projetos (com filtro ativo): "Nenhum projeto encontrado para esses filtros"

### Grid

```
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
```

---

## Mudanças em `GeradorCarrosseis.tsx`

1. Remover o bloco `{studioProjects && studioProjects.length > 0 && (...)}` da aba "studio"
2. Remover import de `useCarouselStudioProjects` (passa a ser usado internamente no componente)
3. Importar e renderizar `<StudioProjectsGrid companyId={companyId} />`
4. O card "Criar no Editor Visual" permanece acima da grid (como está hoje)
5. `StudioWizardModal` permanece na aba (necessário para o wizard)

---

## Arquivos Modificados/Criados

| Arquivo                                                 | Ação                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/hooks/useCarouselStudioProject.ts`                 | Adicionar `useDeleteStudioProject`; alterar select do `useCarouselStudioProjects` para join clients |
| `src/components/carousel-studio/StudioProjectsGrid.tsx` | Criar — componente principal desta feature                                                          |
| `src/pages/GeradorCarrosseis.tsx`                       | Substituir bloco inline da aba studio por `<StudioProjectsGrid />`                                  |
