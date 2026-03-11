# Indicador de Tarefas Aguardando Aprovacao - Plano de Implementacao

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar icone de maozinha no header com badge numerico e dropdown listando tarefas aguardando aprovacao do usuario.

**Architecture:** Novo hook `useTasksAwaitingApproval` consulta tarefas em review onde o usuario e autorizador. Novo componente `TaskApprovalIndicator` com Popover renderiza a lista. Integrado ao `DashboardHeader` ao lado do sino.

**Tech Stack:** React, TanStack Query, Supabase client, shadcn/ui (Popover, Badge, ScrollArea, Button), Lucide icons

---

## File Structure

| Arquivo | Acao | Responsabilidade |
|---------|------|------------------|
| `src/hooks/useTasksAwaitingApproval.ts` | Criar | Hook que busca tarefas em review onde usuario e autorizador |
| `src/components/tasks/TaskApprovalIndicator.tsx` | Criar | Icone + badge + dropdown com lista de tarefas |
| `src/components/dashboard/DashboardHeader.tsx` | Modificar | Adicionar TaskApprovalIndicator ao lado do NotificationCenter |

---

## Chunk 1: Hook + Componente + Integracao

### Task 1: Hook useTasksAwaitingApproval

**Files:**
- Create: `src/hooks/useTasksAwaitingApproval.ts`

- [ ] **Step 1: Criar o hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useEmployees } from "@/hooks/useEmployees";

export interface TaskAwaitingApproval {
  id: string;
  title: string;
  client_name: string | null;
  submitted_by: string | null;
  updated_at: string;
}

export function useTasksAwaitingApproval() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { employees } = useEmployees();
  const companyId = activeCompany?.company_id;
  const currentEmployee = employees?.find(e => e.user_id === user?.id);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks-awaiting-approval", companyId, currentEmployee?.id],
    queryFn: async () => {
      if (!companyId || !currentEmployee?.id) return [];

      // 1. Get task IDs where current user is authorizer
      const { data: memberRows, error: memberError } = await supabase
        .from("task_members" as unknown)
        .select("task_id")
        .eq("employee_id", currentEmployee.id)
        .eq("role", "authorizer");

      if (memberError) throw memberError;
      if (!memberRows || memberRows.length === 0) return [];

      const taskIds = memberRows.map((r: { task_id: string }) => r.task_id);

      // 2. Get tasks in review status from those IDs
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, client_id, updated_at")
        .eq("company_id", companyId)
        .eq("status", "review")
        .in("id", taskIds)
        .order("updated_at", { ascending: false });

      if (tasksError) throw tasksError;
      if (!tasksData || tasksData.length === 0) return [];

      // 3. Get client names
      const clientIds = [...new Set(tasksData.filter(t => t.client_id).map(t => t.client_id))];
      let clientMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, company_name")
          .in("id", clientIds);
        (clients || []).forEach((c: { id: string; company_name: string }) => {
          clientMap[c.id] = c.company_name;
        });
      }

      // 4. Get who moved to review (responsible member)
      const { data: responsibleRows } = await supabase
        .from("task_members" as unknown)
        .select("task_id, employee_id")
        .in("task_id", taskIds)
        .eq("role", "responsible");

      const responsibleMap: Record<string, string> = {};
      if (responsibleRows && responsibleRows.length > 0) {
        const empIds = [...new Set(responsibleRows.map((r: { employee_id: string }) => r.employee_id))];
        const { data: emps } = await supabase
          .from("employees")
          .select("id, name")
          .in("id", empIds);
        const empNameMap: Record<string, string> = {};
        (emps || []).forEach((e: { id: string; name: string }) => { empNameMap[e.id] = e.name; });
        responsibleRows.forEach((r: { task_id: string; employee_id: string }) => {
          responsibleMap[r.task_id] = empNameMap[r.employee_id] || null;
        });
      }

      return tasksData.map(t => ({
        id: t.id,
        title: t.title,
        client_name: t.client_id ? (clientMap[t.client_id] || null) : null,
        submitted_by: responsibleMap[t.id] || null,
        updated_at: t.updated_at,
      })) as TaskAwaitingApproval[];
    },
    enabled: !!companyId && !!currentEmployee?.id,
    refetchInterval: 30000,
  });

  return { tasks, count: tasks.length, isLoading };
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit src/hooks/useTasksAwaitingApproval.ts 2>&1 | head -20`
Se der erro de import, verificar paths.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTasksAwaitingApproval.ts
git commit -m "feat: hook useTasksAwaitingApproval para buscar tarefas pendentes de aprovacao"
```

---

### Task 2: Componente TaskApprovalIndicator

**Files:**
- Create: `src/components/tasks/TaskApprovalIndicator.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { useState } from "react";
import { Hand, ClipboardCheck, User, Building2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTasksAwaitingApproval, TaskAwaitingApproval } from "@/hooks/useTasksAwaitingApproval";

interface TaskApprovalItemProps {
  task: TaskAwaitingApproval;
  onClick: (taskId: string) => void;
}

function TaskApprovalItem({ task, onClick }: TaskApprovalItemProps) {
  return (
    <button
      onClick={() => onClick(task.id)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
    >
      <div className="mt-0.5 shrink-0 p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">
        <ClipboardCheck className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.client_name && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {task.client_name}
            </span>
          )}
          {task.submitted_by && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.submitted_by}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {formatDistanceToNow(parseISO(task.updated_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    </button>
  );
}

interface TaskApprovalIndicatorProps {
  onOpenTask: (taskId: string) => void;
}

export function TaskApprovalIndicator({ onOpenTask }: TaskApprovalIndicatorProps) {
  const [open, setOpen] = useState(false);
  const { tasks, count } = useTasksAwaitingApproval();

  if (count === 0) return null;

  const handleClick = (taskId: string) => {
    onOpenTask(taskId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-10 h-10 rounded-full hover:bg-muted/60"
          title="Tarefas aguardando sua aprovação"
        >
          <Hand className="h-5 w-5 text-amber-500" />
          <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center text-xs bg-amber-500 hover:bg-amber-500 text-white pointer-events-none">
            {count > 99 ? "99+" : count}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 shadow-lg" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Aguardando sua aprovação</h4>
            <p className="text-xs text-muted-foreground">
              {count} tarefa{count !== 1 ? "s" : ""} para revisar
            </p>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <TaskApprovalItem
                key={task.id}
                task={task}
                onClick={handleClick}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/TaskApprovalIndicator.tsx
git commit -m "feat: componente TaskApprovalIndicator com dropdown de tarefas pendentes"
```

---

### Task 3: Integrar no DashboardHeader

**Files:**
- Modify: `src/components/dashboard/DashboardHeader.tsx`

- [ ] **Step 1: Adicionar imports e estado para TaskDialog**

No topo de `DashboardHeader.tsx`, adicionar imports:

```typescript
import { TaskApprovalIndicator } from "@/components/tasks/TaskApprovalIndicator";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
```

- [ ] **Step 2: Adicionar estado para abrir TaskDialog**

Dentro do componente `DashboardHeader`, apos as declaracoes de estado existentes, adicionar:

```typescript
const queryClient = useQueryClient();
const [approvalTaskOpen, setApprovalTaskOpen] = useState(false);
const [approvalTask, setApprovalTask] = useState<unknown>(null);

const handleOpenApprovalTask = async (taskId: string) => {
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();
  if (data) {
    setApprovalTask(data);
    setApprovalTaskOpen(true);
  }
};

const handleSaveApprovalTask = async (taskData: unknown) => {
  // Noop - aprovacao e feita pelo TaskReviewPanel dentro do dialog
  setApprovalTaskOpen(false);
  setApprovalTask(null);
  queryClient.invalidateQueries({ queryKey: ["tasks-awaiting-approval"] });
};
```

- [ ] **Step 3: Adicionar TaskApprovalIndicator no JSX**

No JSX, logo antes do `<NotificationCenter />` (linha 91), adicionar:

```tsx
{/* Task Approval Indicator */}
<TaskApprovalIndicator onOpenTask={handleOpenApprovalTask} />
```

- [ ] **Step 4: Adicionar TaskDialog no final do JSX**

Antes do fechamento `</header>` (apos o WhatsAppInboxDrawer), adicionar:

```tsx
{/* Task Approval Dialog */}
<TaskDialog
  open={approvalTaskOpen}
  onOpenChange={(open) => {
    setApprovalTaskOpen(open);
    if (!open) {
      setApprovalTask(null);
      queryClient.invalidateQueries({ queryKey: ["tasks-awaiting-approval"] });
    }
  }}
  task={approvalTask}
  onSave={handleSaveApprovalTask}
/>
```

- [ ] **Step 5: Verificar que compila**

Run: `npm run build 2>&1 | tail -20`
Expected: Build sem erros

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardHeader.tsx
git commit -m "feat: integrar indicador de aprovacao de tarefas no header"
```

---

### Task 4: Teste manual e ajustes

- [ ] **Step 1: Rodar dev server**

Run: `npm run dev`

- [ ] **Step 2: Verificar visualmente**

1. Verificar se o icone de maozinha aparece no header (se houver tarefas em review)
2. Clicar no icone e verificar dropdown com lista de tarefas
3. Clicar em uma tarefa e verificar se abre o TaskDialog
4. Verificar que o badge some quando nao ha tarefas em review
5. Verificar visual em tema claro e escuro

- [ ] **Step 3: Commit final se necessario**

```bash
git add -A
git commit -m "fix: ajustes visuais no indicador de aprovacao"
```
