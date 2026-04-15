# Carousel Studio — Grid Estilo Instagram no Editor Visual

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar na aba "Editor Visual" de `/geradores/carrosseis` um componente `StudioProjectsGrid` com cards estilo Instagram, filtros por nome e cliente, e exclusão com confirmação.

**Architecture:** Extrair a exibição de projetos do Studio em um componente dedicado `StudioProjectsGrid`, atualizar o hook para join com `clients` e adicionar mutation de delete. O `GeradorCarrosseis.tsx` passa a renderizar apenas `<StudioProjectsGrid companyId={companyId} />` na aba.

**Tech Stack:** React 18 + TypeScript, TanStack React Query, Supabase client, shadcn/ui (AlertDialog, DropdownMenu, Input), lucide-react, `ClientSearchCombobox` existente.

---

## Chunk 1: Hook e Tipos

### Task 1: Atualizar `StudioProject` e `useCarouselStudioProjects`, adicionar `useDeleteStudioProject`

**Files:**

- Modify: `src/components/carousel-studio/types.ts`
- Modify: `src/hooks/useCarouselStudioProject.ts`

- [ ] **Step 1: Adicionar campo `clients` ao tipo `StudioProject`**

Em `src/components/carousel-studio/types.ts`, dentro da interface `StudioProject` (após `thumbnail_url`):

```typescript
  clients?: { id: string; name: string } | null;
```

- [ ] **Step 2: Atualizar select de `useCarouselStudioProjects` para incluir join**

Em `src/hooks/useCarouselStudioProject.ts`, na função `useCarouselStudioProjects`, mudar:

```typescript
// antes
.select("*")
// depois
.select("*, clients(id, name)")
```

- [ ] **Step 3: Adicionar `useDeleteStudioProject` ao fim do arquivo**

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

- [ ] **Step 4: Verificar que TypeScript não reclama**

```bash
npm run build 2>&1 | head -40
```

Esperado: sem erros de tipo nos arquivos modificados.

- [ ] **Step 5: Commit**

```bash
git add src/components/carousel-studio/types.ts src/hooks/useCarouselStudioProject.ts
git commit -m "feat: join clients em useCarouselStudioProjects e adiciona useDeleteStudioProject"
```

---

## Chunk 2: Componente StudioProjectsGrid

### Task 2: Criar `StudioProjectsGrid.tsx`

**Files:**

- Create: `src/components/carousel-studio/StudioProjectsGrid.tsx`

- [ ] **Step 1: Criar o arquivo com imports e estrutura base**

```typescript
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
  Layers,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";
import { useClients } from "@/hooks/useClients";
import {
  useCarouselStudioProjects,
  useDeleteStudioProject,
} from "@/hooks/useCarouselStudioProject";
import { StudioProject } from "@/components/carousel-studio/types";

interface StudioProjectsGridProps {
  companyId: string | undefined;
  onCreateNew: () => void;
}
```

> Nota: `onCreateNew` é callback para abrir o `StudioWizardModal` que fica no pai.

- [ ] **Step 2: Implementar o componente principal com filtros**

```typescript
export function StudioProjectsGrid({
  companyId,
  onCreateNew,
}: StudioProjectsGridProps) {
  const navigate = useNavigate();
  const { data: projects } = useCarouselStudioProjects(companyId);
  const { clients } = useClients();
  const deleteMutation = useDeleteStudioProject();

  const [nameFilter, setNameFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StudioProject | null>(null);

  const clientsForCombobox = useMemo(
    () => clients.map((c) => ({ id: c.id, name: c.name })),
    [clients],
  );

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      const matchName = p.title
        .toLowerCase()
        .includes(nameFilter.toLowerCase());
      const matchClient =
        !clientFilter || clientFilter === "all" || p.client_id === clientFilter;
      return matchName && matchClient;
    });
  }, [projects, nameFilter, clientFilter]);

  const handleDelete = async () => {
    if (!deleteTarget || !companyId) return;
    try {
      await deleteMutation.mutateAsync({
        projectId: deleteTarget.id,
        companyId,
      });
      toast.success("Carrossel excluído");
    } catch {
      toast.error("Erro ao excluir carrossel");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="sm:w-64">
          <ClientSearchCombobox
            clients={clientsForCombobox}
            value={clientFilter}
            onValueChange={setClientFilter}
            includeAllOption={true}
            allOptionLabel="Todos os clientes"
            placeholder="Todos os clientes"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          hasFilter={!!nameFilter || !!clientFilter}
          onCreateNew={onCreateNew}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() =>
                navigate(`/geradores/carrosseis/studio/${project.id}`)
              }
              onDelete={() => setDeleteTarget(project)}
            />
          ))}
        </div>
      )}

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir carrossel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto{" "}
              <strong>{deleteTarget?.title}</strong> será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 3: Implementar `ProjectCard`** (no mesmo arquivo, acima do componente principal)

```typescript
interface ProjectCardProps {
  project: StudioProject;
  onOpen: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const clientName =
    (project.clients as { id: string; name: string } | null)?.name ?? null;
  const styleLabel =
    project.style === "minimalist" ? "Minimalista" : "Profile";

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header estilo Instagram */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Layers className="w-4 h-4 text-muted-foreground" />
        </div>
        <span
          className="flex-1 text-sm font-medium truncate cursor-pointer"
          onClick={onOpen}
        >
          {project.title}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>Abrir editor</DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Imagem — aspect 1:1 */}
      <div
        className="relative w-full aspect-square bg-muted cursor-pointer overflow-hidden"
        onClick={onOpen}
      >
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Layers className="w-10 h-10 opacity-30" />
            <span className="text-xs opacity-50">Rascunho</span>
          </div>
        )}
        {/* Badge slides count */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
          <span>1/{project.slides_count}</span>
          <span className="text-[10px]">▶</span>
        </div>
      </div>

      {/* Rodapé estilo Instagram */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Heart className="w-5 h-5" />
            <MessageCircle className="w-5 h-5" />
            <Send className="w-5 h-5" />
          </div>
          <Bookmark className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {clientName ? (
            <>
              <span className="font-medium text-foreground">{clientName}</span>{" "}
              •{" "}
            </>
          ) : null}
          {styleLabel} • {project.slides_count} slides
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implementar `EmptyState`** (no mesmo arquivo, acima de `ProjectCard`)

```typescript
function EmptyState({
  hasFilter,
  onCreateNew,
}: {
  hasFilter: boolean;
  onCreateNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
      <Layers className="w-12 h-12 opacity-20" />
      {hasFilter ? (
        <p className="text-sm">Nenhum projeto encontrado para esses filtros.</p>
      ) : (
        <>
          <p className="text-sm">Nenhum projeto no Editor Visual ainda.</p>
          <Button variant="outline" size="sm" onClick={onCreateNew}>
            Criar no Editor Visual
          </Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npm run build 2>&1 | head -40
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/carousel-studio/StudioProjectsGrid.tsx
git commit -m "feat: StudioProjectsGrid com cards estilo Instagram, filtros e delete"
```

---

## Chunk 3: Integração na Página

### Task 3: Atualizar `GeradorCarrosseis.tsx`

**Files:**

- Modify: `src/pages/GeradorCarrosseis.tsx`

- [ ] **Step 1: Adicionar import de `StudioProjectsGrid`**

Adicionar com os outros imports de componentes:

```typescript
import { StudioProjectsGrid } from "@/components/carousel-studio/StudioProjectsGrid";
```

- [ ] **Step 2: Remover import `useCarouselStudioProjects` e variável `studioProjects`**

Remover:

```typescript
import {
  useCreateStudioProject,
  useCarouselStudioProjects, // ← remover esta linha
} from "@/hooks/useCarouselStudioProject";
```

E remover a linha:

```typescript
const { data: studioProjects } = useCarouselStudioProjects(
  activeCompany?.company_id,
);
```

- [ ] **Step 3: Substituir o bloco inline da aba "studio" pelo novo componente**

Localizar o `<TabsContent value="studio" ...>` e substituir o bloco de projetos inline (linhas ~758-794 que renderizam `{studioProjects && studioProjects.length > 0 && (...)}`) pelo componente:

```typescript
<TabsContent value="studio" className="mt-6">
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-primary" />
          Editor Visual de Carrossel
        </CardTitle>
        <CardDescription>
          Crie carrosseis com editor visual em tempo real — textos,
          imagens e design completo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => setWizardOpen(true)}
          size="lg"
          className="w-full sm:w-auto"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Criar no Editor Visual
        </Button>
      </CardContent>
    </Card>

    <StudioProjectsGrid
      companyId={companyId}
      onCreateNew={() => setWizardOpen(true)}
    />
  </div>

  <StudioWizardModal
    open={wizardOpen}
    onOpenChange={setWizardOpen}
    onComplete={handleWizardComplete}
    isCreating={createProject.isPending}
  />
</TabsContent>
```

- [ ] **Step 4: Verificar build e lint**

```bash
npm run build 2>&1 | head -60
```

Esperado: build sem erros.

- [ ] **Step 5: Testar manualmente na aba Editor Visual**

1. Abrir `/geradores/carrosseis` e clicar na aba "Editor Visual"
2. Confirmar que os filtros aparecem (busca por nome + dropdown de cliente)
3. Confirmar que projetos existentes aparecem como cards estilo Instagram
4. Confirmar que projetos sem `thumbnail_url` mostram placeholder com ícone Layers + "Rascunho"
5. Confirmar que o badge "1/N" aparece no canto inferior direito da imagem
6. Clicar no card → deve navegar para o editor do projeto
7. Abrir o menu `⋮` → clicar "Excluir" → confirmar que o AlertDialog abre com o nome do projeto
8. Confirmar exclusão → toast "Carrossel excluído" + projeto some da lista
9. Cancelar exclusão → projeto permanece
10. Testar filtro por nome: digitar parte do título → lista filtra em tempo real
11. Testar filtro por cliente: selecionar cliente → exibe só projetos daquele cliente
12. Limpar filtros → volta a exibir todos

- [ ] **Step 6: Commit final**

```bash
git add src/pages/GeradorCarrosseis.tsx
git commit -m "feat: integra StudioProjectsGrid na aba Editor Visual"
```
