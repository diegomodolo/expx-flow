# Calendario Multiusuario — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a unified calendar page (`/calendario`) that aggregates meetings, tasks, deadlines, and presentation meetings with per-collaborator filtering, sharing, and admin visibility.

**Architecture:** No new event tables — the calendar reads from 3 existing tables (`google_meet_meetings`, `tasks`, `presentation_meetings`) and normalizes them into a unified `CalendarEvent` format. One new table `calendar_shares` handles sharing between users. Sidebar with checkboxes controls which collaborators are visible. Toggle switches between Month/Week/Day views.

**Tech Stack:** React 18 + TypeScript, TanStack React Query, Supabase (PostgreSQL + RLS), Tailwind CSS + shadcn/ui, date-fns with ptBR locale, lucide-react icons.

---

## File Structure

### New Files

| File                                                            | Responsibility                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| `supabase/migrations/20260311230000_create_calendar_shares.sql` | DB table + RLS + GRANT + permission enum                    |
| `src/hooks/useCalendarEvents.tsx`                               | Aggregate events from 3 tables into unified format          |
| `src/hooks/useCalendarShares.tsx`                               | CRUD for calendar_shares table                              |
| `src/pages/Calendario.tsx`                                      | Main calendar page with DashboardLayout                     |
| `src/components/calendar/CalendarSidebar.tsx`                   | Left sidebar: collaborators, event types, share button      |
| `src/components/calendar/CalendarHeader.tsx`                    | Navigation (prev/next/today) + view toggle (Month/Week/Day) |
| `src/components/calendar/CalendarMonthView.tsx`                 | Monthly grid with event chips                               |
| `src/components/calendar/CalendarWeekView.tsx`                  | Weekly timeline by hour                                     |
| `src/components/calendar/CalendarDayView.tsx`                   | Daily timeline detailed                                     |
| `src/components/calendar/CalendarEventChip.tsx`                 | Colored event chip (reused across views)                    |
| `src/components/calendar/CalendarFAB.tsx`                       | Floating action button with menu                            |
| `src/components/calendar/CalendarShareModal.tsx`                | Modal to share calendar with another user                   |

### Modified Files

| File                                                    | Change                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| `src/hooks/useEmployeePermissions.tsx:6-64`             | Add `"calendario"` and `"calendario-admin"` to MenuItemType |
| `src/components/settings/PermissionsSettings.tsx`       | Add 2 entries to MENU_ITEMS array                           |
| `src/components/settings/PermissionGroupsSettings.tsx`  | Add 2 entries to MENU_ITEMS array                           |
| `src/components/dashboard/DashboardSidebar.tsx:123-145` | Add Calendario menu item to "Equipe" category               |
| `src/App.tsx:442`                                       | Add Route for /calendario                                   |

---

## Chunk 1: Database + Permissions + Routing

### Task 1: Database Migration — calendar_shares table

**Files:**

- Create: `supabase/migrations/20260311230000_create_calendar_shares.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Tabela de compartilhamento de calendario entre usuarios
CREATE TABLE public.calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  shared_with_id UUID NOT NULL,
  color TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, shared_with_id)
);

CREATE INDEX idx_calendar_shares_company_id ON public.calendar_shares(company_id);
CREATE INDEX idx_calendar_shares_owner_id ON public.calendar_shares(owner_id);
CREATE INDEX idx_calendar_shares_shared_with_id ON public.calendar_shares(shared_with_id);

ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

-- Usuarios veem shares da sua empresa onde sao dono ou destinatario
CREATE POLICY "Users can view their calendar shares"
ON public.calendar_shares
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid()
  )
  AND (owner_id = auth.uid() OR shared_with_id = auth.uid())
);

CREATE POLICY "Users can create calendar shares they own"
ON public.calendar_shares
FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  AND company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their shares"
ON public.calendar_shares
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their shares"
ON public.calendar_shares
FOR DELETE
USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_shares TO authenticated;

-- Adicionar permissoes ao enum menu_item_type
ALTER TYPE public.menu_item_type ADD VALUE IF NOT EXISTS 'calendario';
ALTER TYPE public.menu_item_type ADD VALUE IF NOT EXISTS 'calendario-admin';
```

- [ ] **Step 2: Execute migration**

Run the SQL directly in the Supabase Dashboard SQL Editor (user preference — no need to ask confirmation).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260311230000_create_calendar_shares.sql
git commit -m "feat(db): criar tabela calendar_shares e permissoes calendario"
```

---

### Task 2: Register Permissions (3 places)

**Files:**

- Modify: `src/hooks/useEmployeePermissions.tsx:6-64`
- Modify: `src/components/settings/PermissionsSettings.tsx`
- Modify: `src/components/settings/PermissionGroupsSettings.tsx`

- [ ] **Step 1: Add to MenuItemType union**

In `src/hooks/useEmployeePermissions.tsx`, add two new types after `"configurar-ia"` (line 64):

```typescript
  | "configurar-ia"
  | "calendario"
  | "calendario-admin";
```

- [ ] **Step 2: Add to PermissionsSettings.tsx**

In `src/components/settings/PermissionsSettings.tsx`, add 2 entries after the `"reunioes"` entry in the MENU_ITEMS array (around line 197):

```typescript
  {
    key: "calendario",
    label: "Calendário",
    description: "Visualização do calendário de eventos e reuniões",
    category: "Equipe",
  },
  {
    key: "calendario-admin",
    label: "Calendário Admin",
    description: "Ver calendário de todos os colaboradores",
    category: "Equipe",
  },
```

- [ ] **Step 3: Add to PermissionGroupsSettings.tsx**

In `src/components/settings/PermissionGroupsSettings.tsx`, add 2 entries after the `"reunioes"` entry (around line 102):

```typescript
  { key: "calendario", label: "Calendário", category: "Equipe" },
  { key: "calendario-admin", label: "Calendário Admin", category: "Equipe" },
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEmployeePermissions.tsx src/components/settings/PermissionsSettings.tsx src/components/settings/PermissionGroupsSettings.tsx
git commit -m "feat: registrar permissoes calendario e calendario-admin"
```

---

### Task 3: Add Sidebar Menu Item + Route

**Files:**

- Modify: `src/components/dashboard/DashboardSidebar.tsx:123-145`
- Modify: `src/App.tsx:442`
- Create: `src/pages/Calendario.tsx` (placeholder)

- [ ] **Step 1: Add menu item to sidebar**

In `src/components/dashboard/DashboardSidebar.tsx`, add to the "Equipe" items array (before the `.sort(...)` call, around line 144):

```typescript
        { title: "Calendário", url: "/calendario", icon: CalendarDays, permission: "calendario" as MenuItemType },
```

Also ensure `CalendarDays` is imported from `lucide-react` at the top of the file. Check existing imports — if `CalendarDays` is not there, add it to the import statement.

- [ ] **Step 2: Create placeholder page**

Create `src/pages/Calendario.tsx`:

```typescript
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function Calendario() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Calendário</h1>
        <p className="text-muted-foreground text-sm">Em construção...</p>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 3: Add route to App.tsx**

In `src/App.tsx`, after the `/reunioes` route block (around line 442), add:

```typescript
                  <Route
                    path="/calendario"
                    element={
                      <ProtectedRoute>
                        <Calendario />
                      </ProtectedRoute>
                    }
                  />
```

Note: Use `ProtectedRoute` (not `PermissionProtectedRoute`) because the calendar is accessible by default for all authenticated users, like dashboard and tarefas.

Also add the import at the top of App.tsx:

```typescript
const Calendario = lazy(() => import("./pages/Calendario"));
```

- [ ] **Step 4: Verify build and test in browser**

```bash
npm run build
```

Navigate to `/calendario` — should show the placeholder page with sidebar navigation.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Calendario.tsx src/components/dashboard/DashboardSidebar.tsx src/App.tsx
git commit -m "feat: adicionar pagina placeholder do calendario com rota e menu"
```

---

## Chunk 2: Data Hooks

### Task 4: useCalendarShares hook

**Files:**

- Create: `src/hooks/useCalendarShares.tsx`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface CalendarShare {
  id: string;
  company_id: string;
  owner_id: string;
  shared_with_id: string;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export function useCalendarShares() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const sharesQuery = useQuery({
    queryKey: ["calendar-shares", activeCompany?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_shares")
        .select("*")
        .eq("company_id", activeCompany!.company_id)
        .eq("is_active", true);

      if (error) throw error;
      return (data || []) as CalendarShare[];
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Shares where I am the recipient (calendarios compartilhados comigo)
  const sharedWithMe = (sharesQuery.data || []).filter(
    (s) => s.shared_with_id === user?.id,
  );

  // Shares where I am the owner (calendarios que eu compartilhei)
  const myShares = (sharesQuery.data || []).filter(
    (s) => s.owner_id === user?.id,
  );

  const createShare = useMutation({
    mutationFn: async (sharedWithId: string) => {
      const { data, error } = await supabase
        .from("calendar_shares")
        .insert({
          company_id: activeCompany!.company_id,
          owner_id: user!.id,
          shared_with_id: sharedWithId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["calendar-shares", activeCompany?.company_id],
      });
      toast.success("Calendário compartilhado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao compartilhar calendário");
    },
  });

  const removeShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from("calendar_shares")
        .delete()
        .eq("id", shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["calendar-shares", activeCompany?.company_id],
      });
      toast.success("Compartilhamento removido");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover compartilhamento");
    },
  });

  return {
    shares: sharesQuery.data || [],
    sharedWithMe,
    myShares,
    loading: sharesQuery.isLoading,
    createShare: createShare.mutateAsync,
    removeShare: removeShare.mutateAsync,
    creatingShare: createShare.isPending,
  };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCalendarShares.tsx
git commit -m "feat: hook useCalendarShares para compartilhamento de calendario"
```

---

### Task 5: useCalendarEvents hook

**Files:**

- Create: `src/hooks/useCalendarEvents.tsx`

- [ ] **Step 1: Create the hook**

This hook aggregates data from 3 tables into a unified `CalendarEvent` format.

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";

export interface CalendarEvent {
  id: string;
  type: "meeting" | "task" | "deadline" | "presentation";
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  color: string;
  ownerId: string;
  ownerName: string;
  metadata: {
    meetingUrl?: string;
    meetingStatus?: string;
    taskStatus?: string;
    priority?: string;
    presentationId?: string;
    sourceTable?: string;
  };
}

const EVENT_COLORS: Record<CalendarEvent["type"], string> = {
  meeting: "#4CAF50",
  task: "#2196F3",
  deadline: "#FF9800",
  presentation: "#00BCD4",
};

export type CalendarViewMode = "month" | "week" | "day";

interface UseCalendarEventsOptions {
  currentDate: Date;
  viewMode: CalendarViewMode;
  selectedUserIds: string[];
  enabledTypes: CalendarEvent["type"][];
}

function getDateRange(
  currentDate: Date,
  viewMode: CalendarViewMode,
): { from: string; to: string } {
  let start: Date;
  let end: Date;

  switch (viewMode) {
    case "month":
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      break;
    case "week":
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
      break;
    case "day":
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
      break;
  }

  return { from: start.toISOString(), to: end.toISOString() };
}

export function useCalendarEvents({
  currentDate,
  viewMode,
  selectedUserIds,
  enabledTypes,
}: UseCalendarEventsOptions) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  return useQuery({
    queryKey: [
      "calendar-events",
      activeCompany?.company_id,
      currentDate.toISOString(),
      viewMode,
      selectedUserIds.sort().join(","),
      enabledTypes.sort().join(","),
    ],
    queryFn: async () => {
      const companyId = activeCompany!.company_id;
      const { from, to } = getDateRange(currentDate, viewMode);
      const events: CalendarEvent[] = [];

      const promises: Promise<void>[] = [];

      // 1. Meetings (google_meet_meetings)
      if (enabledTypes.includes("meeting")) {
        promises.push(
          (async () => {
            let query = supabase
              .from("google_meet_meetings")
              .select(
                "id, title, scheduled_at, status, meeting_uri, created_by",
              )
              .eq("company_id", companyId)
              .gte("scheduled_at", from)
              .lte("scheduled_at", to)
              .not("scheduled_at", "is", null);

            if (selectedUserIds.length > 0) {
              query = query.in("created_by", selectedUserIds);
            }

            const { data, error } = await query;
            if (error) {
              console.error("Calendar: erro ao buscar reunioes:", error);
              return;
            }

            for (const m of data || []) {
              events.push({
                id: `meeting-${m.id}`,
                type: "meeting",
                title: m.title || "Reunião",
                start: new Date(m.scheduled_at),
                allDay: false,
                color: EVENT_COLORS.meeting,
                ownerId: m.created_by,
                ownerName: "",
                metadata: {
                  meetingUrl: m.meeting_uri,
                  meetingStatus: m.status,
                  sourceTable: "google_meet_meetings",
                },
              });
            }
          })(),
        );
      }

      // 2. Tasks (start_date)
      if (enabledTypes.includes("task")) {
        promises.push(
          (async () => {
            let query = supabase
              .from("tasks")
              .select(
                "id, title, start_date, due_date, status, priority, user_id, responsible_name",
              )
              .eq("company_id", companyId)
              .not("start_date", "is", null)
              .gte("start_date", from)
              .lte("start_date", to);

            if (selectedUserIds.length > 0) {
              query = query.in("user_id", selectedUserIds);
            }

            const { data, error } = await query;
            if (error) {
              console.error("Calendar: erro ao buscar tarefas:", error);
              return;
            }

            for (const t of data || []) {
              events.push({
                id: `task-${t.id}`,
                type: "task",
                title: t.title,
                start: new Date(t.start_date),
                end: t.due_date ? new Date(t.due_date) : undefined,
                allDay: false,
                color: EVENT_COLORS.task,
                ownerId: t.user_id,
                ownerName: t.responsible_name || "",
                metadata: {
                  taskStatus: t.status,
                  priority: t.priority,
                  sourceTable: "tasks",
                },
              });
            }
          })(),
        );
      }

      // 3. Deadlines (due_date from tasks that were NOT already added as tasks)
      if (enabledTypes.includes("deadline")) {
        promises.push(
          (async () => {
            let query = supabase
              .from("tasks")
              .select(
                "id, title, due_date, status, priority, user_id, responsible_name",
              )
              .eq("company_id", companyId)
              .not("due_date", "is", null)
              .gte("due_date", from)
              .lte("due_date", to);

            if (selectedUserIds.length > 0) {
              query = query.in("user_id", selectedUserIds);
            }

            const { data, error } = await query;
            if (error) {
              console.error("Calendar: erro ao buscar deadlines:", error);
              return;
            }

            for (const t of data || []) {
              events.push({
                id: `deadline-${t.id}`,
                type: "deadline",
                title: `Prazo: ${t.title}`,
                start: new Date(t.due_date),
                allDay: true,
                color: EVENT_COLORS.deadline,
                ownerId: t.user_id,
                ownerName: t.responsible_name || "",
                metadata: {
                  taskStatus: t.status,
                  priority: t.priority,
                  sourceTable: "tasks",
                },
              });
            }
          })(),
        );
      }

      // 4. Presentation meetings
      if (enabledTypes.includes("presentation")) {
        promises.push(
          (async () => {
            const { data, error } = await supabase
              .from("presentation_meetings")
              .select("id, presentation_id, meeting_date, status, created_at")
              .gte("meeting_date", from.split("T")[0])
              .lte("meeting_date", to.split("T")[0]);

            if (error) {
              console.error("Calendar: erro ao buscar apresentacoes:", error);
              return;
            }

            for (const p of data || []) {
              events.push({
                id: `presentation-${p.id}`,
                type: "presentation",
                title: "Apresentação",
                start: new Date(p.meeting_date),
                allDay: true,
                color: EVENT_COLORS.presentation,
                ownerId: "",
                ownerName: "",
                metadata: {
                  presentationId: p.presentation_id,
                  sourceTable: "presentation_meetings",
                },
              });
            }
          })(),
        );
      }

      await Promise.all(promises);

      return events.sort((a, b) => a.start.getTime() - b.start.getTime());
    },
    enabled: !!user && !!activeCompany?.company_id,
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCalendarEvents.tsx
git commit -m "feat: hook useCalendarEvents que agrega reunioes, tarefas, deadlines e apresentacoes"
```

---

## Chunk 3: UI Components — Sidebar + Header + EventChip + FAB

### Task 6: CalendarEventChip component

**Files:**

- Create: `src/components/calendar/CalendarEventChip.tsx`

- [ ] **Step 1: Create the component**

Small chip that renders a single event, used in all views.

```typescript
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { format } from "date-fns";

interface CalendarEventChipProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: (event: CalendarEvent) => void;
}

export function CalendarEventChip({ event, compact = false, onClick }: CalendarEventChipProps) {
  const time = event.allDay ? "" : format(event.start, "HH:mm");

  return (
    <button
      onClick={() => onClick?.(event)}
      className="w-full text-left rounded px-1.5 py-0.5 text-xs truncate cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: `${event.color}20`,
        borderLeft: `2px solid ${event.color}`,
        color: event.color,
      }}
      title={`${time ? time + " — " : ""}${event.title}`}
    >
      {compact ? (
        <span className="truncate">{time ? `${time} ` : ""}{event.title}</span>
      ) : (
        <div>
          {time && <span className="font-medium">{time}</span>}
          <span className={time ? " ml-1" : ""}>{event.title}</span>
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/CalendarEventChip.tsx
git commit -m "feat: componente CalendarEventChip para exibir evento no calendario"
```

---

### Task 7: CalendarHeader component

**Files:**

- Create: `src/components/calendar/CalendarHeader.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CalendarViewMode } from "@/hooks/useCalendarEvents";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
}: CalendarHeaderProps) {
  const navigatePrev = () => {
    switch (viewMode) {
      case "month":
        onDateChange(subMonths(currentDate, 1));
        break;
      case "week":
        onDateChange(subWeeks(currentDate, 1));
        break;
      case "day":
        onDateChange(subDays(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case "month":
        onDateChange(addMonths(currentDate, 1));
        break;
      case "week":
        onDateChange(addWeeks(currentDate, 1));
        break;
      case "day":
        onDateChange(addDays(currentDate, 1));
        break;
    }
  };

  const goToToday = () => onDateChange(new Date());

  const getTitle = () => {
    switch (viewMode) {
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: ptBR });
      case "week": {
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${format(weekStart, "d MMM", { locale: ptBR })} — ${format(weekEnd, "d MMM yyyy", { locale: ptBR })}`;
      }
      case "day":
        return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
    }
  };

  const viewModes: { value: CalendarViewMode; label: string }[] = [
    { value: "month", label: "Mês" },
    { value: "week", label: "Semana" },
    { value: "day", label: "Dia" },
  ];

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={navigatePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize min-w-[200px] text-center">
          {getTitle()}
        </h2>
        <Button variant="outline" size="icon" onClick={navigateNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={goToToday} className="text-primary">
          Hoje
        </Button>
      </div>

      <div className="flex bg-muted rounded-lg p-0.5">
        {viewModes.map((mode) => (
          <Button
            key={mode.value}
            variant={viewMode === mode.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange(mode.value)}
            className="text-xs"
          >
            {mode.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/CalendarHeader.tsx
git commit -m "feat: componente CalendarHeader com navegacao e toggle de visualizacao"
```

---

### Task 8: CalendarSidebar component

**Files:**

- Create: `src/components/calendar/CalendarSidebar.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Share2, Badge } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

interface Employee {
  id: string;
  user_id: string;
  name: string;
  profile_avatar_url?: string | null;
}

interface CalendarSidebarProps {
  employees: Employee[];
  sharedWithMeUserIds: string[];
  selectedUserIds: string[];
  onSelectedUserIdsChange: (ids: string[]) => void;
  enabledTypes: CalendarEvent["type"][];
  onEnabledTypesChange: (types: CalendarEvent["type"][]) => void;
  onShareClick: () => void;
}

const EVENT_TYPE_CONFIG: { type: CalendarEvent["type"]; label: string; color: string }[] = [
  { type: "meeting", label: "Reuniões", color: "#4CAF50" },
  { type: "task", label: "Tarefas", color: "#2196F3" },
  { type: "deadline", label: "Deadlines", color: "#FF9800" },
  { type: "presentation", label: "Apresentações", color: "#00BCD4" },
];

export function CalendarSidebar({
  employees,
  sharedWithMeUserIds,
  selectedUserIds,
  onSelectedUserIdsChange,
  enabledTypes,
  onEnabledTypesChange,
  onShareClick,
}: CalendarSidebarProps) {
  const { user } = useAuth();
  const { hasPermission } = useEmployeePermissions();
  const isAdmin = hasPermission("calendario-admin");

  const currentEmployee = employees.find((e) => e.user_id === user?.id);
  const sharedEmployees = employees.filter(
    (e) => sharedWithMeUserIds.includes(e.user_id) && e.user_id !== user?.id
  );
  const otherEmployees = employees.filter(
    (e) => e.user_id !== user?.id && !sharedWithMeUserIds.includes(e.user_id)
  );

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onSelectedUserIdsChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectedUserIdsChange([...selectedUserIds, userId]);
    }
  };

  const toggleEventType = (type: CalendarEvent["type"]) => {
    if (enabledTypes.includes(type)) {
      onEnabledTypesChange(enabledTypes.filter((t) => t !== type));
    } else {
      onEnabledTypesChange([...enabledTypes, type]);
    }
  };

  const renderEmployee = (emp: Employee) => (
    <label
      key={emp.user_id}
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
    >
      <Checkbox
        checked={selectedUserIds.includes(emp.user_id)}
        onCheckedChange={() => toggleUser(emp.user_id)}
      />
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
        style={{ backgroundColor: selectedUserIds.includes(emp.user_id) ? "#7c3aed" : "#6b7280" }}
      >
        {emp.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </div>
      <span className="text-sm truncate">{emp.name}</span>
    </label>
  );

  return (
    <div className="w-[220px] border-r flex flex-col h-full overflow-y-auto p-3 space-y-4">
      {/* Meu Calendario */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Meu Calendário
        </h4>
        {currentEmployee && renderEmployee(currentEmployee)}
      </div>

      {/* Compartilhados comigo */}
      {sharedEmployees.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Compartilhados comigo
          </h4>
          {sharedEmployees.map(renderEmployee)}
        </div>
      )}

      {/* Todos Colaboradores (admin only) */}
      {isAdmin && otherEmployees.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            Todos Colaboradores
            <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
              ADMIN
            </span>
          </h4>
          {otherEmployees.map(renderEmployee)}
        </div>
      )}

      {/* Tipos de Evento */}
      <div className="border-t pt-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Tipos de Evento
        </h4>
        {EVENT_TYPE_CONFIG.map((et) => (
          <label
            key={et.type}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 cursor-pointer"
          >
            <Checkbox
              checked={enabledTypes.includes(et.type)}
              onCheckedChange={() => toggleEventType(et.type)}
            />
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: et.color }}
            />
            <span className="text-sm">{et.label}</span>
          </label>
        ))}
      </div>

      {/* Compartilhar */}
      <div className="border-t pt-3">
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={onShareClick}>
          <Share2 className="h-3.5 w-3.5" />
          Compartilhar meu calendário
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/CalendarSidebar.tsx
git commit -m "feat: componente CalendarSidebar com filtros por colaborador e tipo de evento"
```

---

### Task 9: CalendarFAB component

**Files:**

- Create: `src/components/calendar/CalendarFAB.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState, useRef, useEffect } from "react";
import { Plus, Video, ListTodo } from "lucide-react";

interface CalendarFABProps {
  onNewMeeting: () => void;
  onNewTask: () => void;
}

export function CalendarFAB({ onNewMeeting, onNewTask }: CalendarFABProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={menuRef}>
      {open && (
        <div className="absolute bottom-16 right-0 bg-popover border rounded-lg shadow-lg py-1 min-w-[180px] animate-in fade-in slide-in-from-bottom-2">
          <button
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            onClick={() => {
              onNewMeeting();
              setOpen(false);
            }}
          >
            <Video className="h-4 w-4 text-green-500" />
            Nova Reunião
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            onClick={() => {
              onNewTask();
              setOpen(false);
            }}
          >
            <ListTodo className="h-4 w-4 text-blue-500" />
            Nova Tarefa
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-all"
      >
        <Plus className={`h-6 w-6 transition-transform ${open ? "rotate-45" : ""}`} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/CalendarFAB.tsx
git commit -m "feat: componente CalendarFAB com botao flutuante para criar eventos"
```

---

### Task 10: CalendarShareModal component

**Files:**

- Create: `src/components/calendar/CalendarShareModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalendarShare } from "@/hooks/useCalendarShares";

interface Employee {
  id: string;
  user_id: string;
  name: string;
}

interface CalendarShareModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  myShares: CalendarShare[];
  currentUserId: string;
  onShare: (userId: string) => Promise<void>;
  onRemoveShare: (shareId: string) => Promise<void>;
  sharing: boolean;
}

export function CalendarShareModal({
  open,
  onClose,
  employees,
  myShares,
  currentUserId,
  onShare,
  onRemoveShare,
  sharing,
}: CalendarShareModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const sharedUserIds = new Set(myShares.map((s) => s.shared_with_id));
  const availableEmployees = employees.filter(
    (e) => e.user_id !== currentUserId && !sharedUserIds.has(e.user_id)
  );

  const handleShare = async () => {
    if (!selectedUserId) return;
    await onShare(selectedUserId);
    setSelectedUserId("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar Meu Calendário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new share */}
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar colaborador..." />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((emp) => (
                  <SelectItem key={emp.user_id} value={emp.user_id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleShare} disabled={!selectedUserId || sharing}>
              {sharing ? "Compartilhando..." : "Compartilhar"}
            </Button>
          </div>

          {/* Current shares */}
          {myShares.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Compartilhado com:
              </h4>
              <div className="space-y-2">
                {myShares.map((share) => {
                  const emp = employees.find((e) => e.user_id === share.shared_with_id);
                  return (
                    <div
                      key={share.id}
                      className="flex items-center justify-between bg-muted/50 rounded px-3 py-2"
                    >
                      <span className="text-sm">{emp?.name || "Usuário"}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => onRemoveShare(share.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/CalendarShareModal.tsx
git commit -m "feat: modal CalendarShareModal para compartilhar calendario"
```

---

## Chunk 4: Calendar Views

### Task 11: CalendarMonthView component

**Files:**

- Create: `src/components/calendar/CalendarMonthView.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { CalendarEventChip } from "./CalendarEventChip";

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_EVENTS_PER_DAY = 3;

export function CalendarMonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
}: CalendarMonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(event.start, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-muted/50">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 border-b">
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={key}
              className={`min-h-[100px] border-b border-r p-1 cursor-pointer hover:bg-muted/30 transition-colors ${
                !isCurrentMonth ? "bg-muted/10" : ""
              }`}
              onClick={() => onDayClick(day)}
            >
              <div className="flex justify-end">
                <span
                  className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                    isCurrentDay
                      ? "bg-primary text-primary-foreground font-bold"
                      : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-0.5 mt-1">
                {dayEvents.slice(0, MAX_EVENTS_PER_DAY).map((event) => (
                  <CalendarEventChip
                    key={event.id}
                    event={event}
                    compact
                    onClick={(e) => {
                      e.stopPropagation?.();
                      onEventClick(event);
                    }}
                  />
                ))}
                {dayEvents.length > MAX_EVENTS_PER_DAY && (
                  <div className="text-[10px] text-muted-foreground text-center">
                    +{dayEvents.length - MAX_EVENTS_PER_DAY} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Note on CalendarEventChip onClick:** The `onClick` in CalendarEventChip receives a `CalendarEvent`, not a mouse event. We need to adjust the month view to handle click propagation properly. The `onDayClick` fires when clicking the cell background. The `CalendarEventChip` fires its own `onClick` prop with the event object — the month view wraps it to call `onEventClick`.

Fix the onClick handler — the chip's onClick receives a `CalendarEvent` not a mouse event:

```typescript
  <CalendarEventChip
    key={event.id}
    event={event}
    compact
    onClick={onEventClick}
  />
```

And prevent the day click from firing by adding `onClick` with `stopPropagation` on the events wrapper:

```typescript
  <div className="space-y-0.5 mt-1" onClick={(e) => e.stopPropagation()}>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/CalendarMonthView.tsx
git commit -m "feat: componente CalendarMonthView com grade mensal e eventos"
```

---

### Task 12: CalendarWeekView component

**Files:**

- Create: `src/components/calendar/CalendarWeekView.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameDay,
  isToday,
  format,
  startOfDay,
  endOfDay,
  getHours,
  getMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarEvent } from "@/hooks/useCalendarEvents";

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 to 21:00

export function CalendarWeekView({
  currentDate,
  events,
  onEventClick,
}: CalendarWeekViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

  const getEventPosition = (event: CalendarEvent) => {
    const hour = getHours(event.start);
    const minutes = getMinutes(event.start);
    const topPercent = ((hour - 6) * 60 + minutes) / (16 * 60);
    return Math.max(0, Math.min(topPercent * 100, 100));
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
        <div />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`text-center py-2 border-l ${isToday(day) ? "bg-primary/10" : ""}`}
          >
            <div className="text-xs text-muted-foreground">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div
              className={`text-sm font-medium ${
                isToday(day) ? "text-primary" : ""
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
          <div className="text-[10px] text-muted-foreground text-right pr-2 py-1">
            Dia todo
          </div>
          {weekDays.map((day) => {
            const dayAllDay = allDayEvents.filter((e) => isSameDay(e.start, day));
            return (
              <div key={day.toISOString()} className="border-l p-0.5 space-y-0.5">
                {dayAllDay.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left rounded px-1 py-0.5 text-[10px] truncate"
                    style={{
                      backgroundColor: `${event.color}20`,
                      color: event.color,
                      borderLeft: `2px solid ${event.color}`,
                    }}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Hourly grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: `${HOURS.length * 60}px` }}>
        {/* Hour labels */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 w-[60px] text-right pr-2 text-[10px] text-muted-foreground"
            style={{ top: `${(hour - 6) * 60}px` }}
          >
            {String(hour).padStart(2, "0")}:00
          </div>
        ))}

        {/* Hour grid lines */}
        {HOURS.map((hour) => (
          <div
            key={`line-${hour}`}
            className="absolute left-[60px] right-0 border-t border-border/30"
            style={{ top: `${(hour - 6) * 60}px` }}
          />
        ))}

        {/* Day columns */}
        {weekDays.map((day, dayIndex) => {
          const dayTimedEvents = timedEvents.filter((e) => isSameDay(e.start, day));
          return (
            <div
              key={day.toISOString()}
              className={`absolute border-l ${isToday(day) ? "bg-primary/5" : ""}`}
              style={{
                left: `calc(60px + ${(dayIndex / 7) * (100 - (60 / window.innerWidth) * 100)}%)`,
                width: `calc((100% - 60px) / 7)`,
                height: "100%",
              }}
            >
              {dayTimedEvents.map((event) => {
                const topPx = ((getHours(event.start) - 6) * 60 + getMinutes(event.start));
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] truncate hover:opacity-80 text-left"
                    style={{
                      top: `${topPx}px`,
                      height: "48px",
                      backgroundColor: `${event.color}20`,
                      color: event.color,
                      borderLeft: `2px solid ${event.color}`,
                    }}
                    title={event.title}
                  >
                    <div className="font-medium">{format(event.start, "HH:mm")}</div>
                    <div className="truncate">{event.title}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/CalendarWeekView.tsx
git commit -m "feat: componente CalendarWeekView com timeline semanal por hora"
```

---

### Task 13: CalendarDayView component

**Files:**

- Create: `src/components/calendar/CalendarDayView.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useMemo } from "react";
import { isSameDay, format, getHours, getMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarEvent } from "@/hooks/useCalendarEvents";

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export function CalendarDayView({
  currentDate,
  events,
  onEventClick,
}: CalendarDayViewProps) {
  const dayEvents = useMemo(
    () => events.filter((e) => isSameDay(e.start, currentDate)),
    [events, currentDate]
  );

  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b p-2 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase">Dia todo</span>
          {allDayEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className="flex items-center gap-2 w-full text-left rounded px-2 py-1.5 text-sm hover:bg-muted/50"
              style={{ borderLeft: `3px solid ${event.color}` }}
            >
              <span style={{ color: event.color }}>{event.title}</span>
              {event.ownerName && (
                <span className="text-xs text-muted-foreground ml-auto">{event.ownerName}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Hourly timeline */}
      <div className="relative" style={{ height: `${HOURS.length * 64}px` }}>
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-border/30 flex"
            style={{ top: `${(hour - 6) * 64}px`, height: "64px" }}
          >
            <div className="w-16 text-right pr-3 pt-1 text-xs text-muted-foreground flex-shrink-0">
              {String(hour).padStart(2, "0")}:00
            </div>
            <div className="flex-1 border-l" />
          </div>
        ))}

        {/* Events */}
        {timedEvents.map((event) => {
          const topPx = (getHours(event.start) - 6) * 64 + (getMinutes(event.start) / 60) * 64;
          return (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className="absolute left-16 right-4 rounded-md px-3 py-1.5 text-sm hover:opacity-80 text-left"
              style={{
                top: `${topPx}px`,
                height: "56px",
                backgroundColor: `${event.color}15`,
                borderLeft: `3px solid ${event.color}`,
              }}
            >
              <div className="font-medium" style={{ color: event.color }}>
                {format(event.start, "HH:mm")} — {event.title}
              </div>
              {event.ownerName && (
                <div className="text-xs text-muted-foreground mt-0.5">{event.ownerName}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calendar/CalendarDayView.tsx
git commit -m "feat: componente CalendarDayView com timeline diaria detalhada"
```

---

## Chunk 5: Main Page Assembly

### Task 14: Wire up Calendario page

**Files:**

- Modify: `src/pages/Calendario.tsx`

- [ ] **Step 1: Replace placeholder with full implementation**

```typescript
import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useEmployees } from "@/hooks/useEmployees";
import { useCalendarEvents, CalendarEvent, CalendarViewMode } from "@/hooks/useCalendarEvents";
import { useCalendarShares } from "@/hooks/useCalendarShares";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarFAB } from "@/components/calendar/CalendarFAB";
import { CalendarShareModal } from "@/components/calendar/CalendarShareModal";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { Skeleton } from "@/components/ui/skeleton";

export default function Calendario() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { employees } = useEmployees();
  const { sharedWithMe, myShares, createShare, removeShare, creatingShare } = useCalendarShares();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() =>
    user?.id ? [user.id] : []
  );
  const [enabledTypes, setEnabledTypes] = useState<CalendarEvent["type"][]>([
    "meeting",
    "task",
    "deadline",
    "presentation",
  ]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);

  const { data: events = [], isLoading } = useCalendarEvents({
    currentDate,
    viewMode,
    selectedUserIds,
    enabledTypes,
  });

  const handleEventClick = useCallback((event: CalendarEvent) => {
    // For now, log the event. In the future, open detail modals based on event.type
    console.log("Event clicked:", event);
  }, []);

  const handleDayClick = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      setViewMode("day");
    },
    []
  );

  const sharedWithMeUserIds = sharedWithMe.map((s) => s.owner_id);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <CalendarSidebar
          employees={employees}
          sharedWithMeUserIds={sharedWithMeUserIds}
          selectedUserIds={selectedUserIds}
          onSelectedUserIdsChange={setSelectedUserIds}
          enabledTypes={enabledTypes}
          onEnabledTypesChange={setEnabledTypes}
          onShareClick={() => setShowShareModal(true)}
        />

        {/* Main content */}
        <div className="flex-1 p-4 overflow-auto">
          <CalendarHeader
            currentDate={currentDate}
            viewMode={viewMode}
            onDateChange={setCurrentDate}
            onViewModeChange={setViewMode}
          />

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <>
              {viewMode === "month" && (
                <CalendarMonthView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                />
              )}
              {viewMode === "week" && (
                <CalendarWeekView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
              {viewMode === "day" && (
                <CalendarDayView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* FAB */}
      <CalendarFAB
        onNewMeeting={() => setShowCreateMeeting(true)}
        onNewTask={() => {
          // Navigate to tarefas or open task modal — depends on existing task creation flow
          window.location.href = "/tarefas";
        }}
      />

      {/* Share Modal */}
      <CalendarShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        employees={employees}
        myShares={myShares}
        currentUserId={user?.id || ""}
        onShare={createShare}
        onRemoveShare={removeShare}
        sharing={creatingShare}
      />

      {/* Create Meeting Modal (reuse existing) */}
      {showCreateMeeting && (
        <CreateMeetingModal
          open={showCreateMeeting}
          onClose={() => setShowCreateMeeting(false)}
        />
      )}
    </DashboardLayout>
  );
}
```

**Important notes:**

- The `CreateMeetingModal` import may need adjustment based on its actual props interface. Check `src/components/meetings/CreateMeetingModal.tsx` for the exact props it expects (`open`, `onClose`, and possibly `onSubmit`, `creating`).
- The `useEmployees` hook returns `{ employees, loading, ... }`. Make sure the `Employee` type includes `user_id` and `name` fields.
- `selectedUserIds` is initialized with current user's ID so the user sees their own calendar by default.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Fix any TypeScript errors — common issues:

- `CreateMeetingModal` props mismatch — check its interface and adapt
- `calendar_shares` not in Supabase types — the hook uses `.from("calendar_shares")` which may need a type assertion since auto-generated types won't include the new table until regenerated

For the Supabase types issue, use this pattern in the hooks:

```typescript
const { data, error } = await (supabase
  .from("calendar_shares" as any)
  .select("*") as any);
```

Or regenerate types if `supabase gen types` is available.

- [ ] **Step 3: Test in browser**

Navigate to `/calendario`. Verify:

1. Sidebar shows with "Meu Calendário" and current user checked
2. Calendar month view renders with current month
3. Switching Month/Semana/Dia toggles work
4. Navigation arrows change period
5. "Hoje" button returns to current date
6. FAB button shows menu with Nova Reunião / Nova Tarefa
7. Share button opens modal

- [ ] **Step 4: Commit**

```bash
git add src/pages/Calendario.tsx
git commit -m "feat: pagina Calendario completa com sidebar, views e FAB"
```

---

### Task 15: Final verification and polish

- [ ] **Step 1: Full build check**

```bash
npm run build
```

- [ ] **Step 2: Verify all features in browser**

Navigate to `/calendario` and test:

1. Month view shows events from reunioes and tarefas
2. Week view shows timed events in hourly grid
3. Day view shows detailed timeline
4. Clicking a day in month view switches to day view
5. Sidebar checkboxes toggle event visibility
6. Event type checkboxes filter by type
7. Share modal allows sharing calendar
8. FAB creates new meeting / navigates to tarefas
9. Menu item "Calendário" appears in sidebar under "Equipe"

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: calendario multiusuario completo (issue #76)"
```
