# Calendario Multiusuario — Design Spec

## Objetivo

Criar uma pagina de calendario unificado (`/calendario`) que agrega reunioes (Google Meet), tarefas, deadlines e reunioes de apresentacao numa visualizacao mensal/semanal/diaria. Cada colaborador ve sua propria agenda por default, com sistema de permissoes e compartilhamento para visibilidade entre usuarios.

## Decisoes de Design

| Aspecto                | Decisao                                                    |
| ---------------------- | ---------------------------------------------------------- |
| Visualizacao           | Mes / Semana / Dia com toggle                              |
| Tipos de evento        | Reunioes, Tarefas com data, Deadlines, Apresentacoes       |
| Filtro por colaborador | Sidebar com lista (estilo Google Calendar)                 |
| Criacao de eventos     | Botao "+" flutuante (FAB)                                  |
| Acesso                 | Default para todos (como dashboard/tarefas)                |
| Permissao admin        | `calendario-admin` — ve calendario de qualquer colaborador |
| Compartilhamento       | Individual — usuario compartilha seu calendario com outro  |

## Arquitetura

### Fontes de Dados (tabelas existentes — sem criar tabelas de eventos)

| Fonte         | Tabela                  | Campo de data           | Cor               |
| ------------- | ----------------------- | ----------------------- | ----------------- |
| Reunioes      | `google_meet_meetings`  | `scheduled_at`          | Verde (#4CAF50)   |
| Tarefas       | `tasks`                 | `start_date`            | Azul (#2196F3)    |
| Deadlines     | `tasks`                 | `due_date` / `deadline` | Laranja (#FF9800) |
| Apresentacoes | `presentation_meetings` | `meeting_date`          | Ciano (#00BCD4)   |

### Nova Tabela: `calendar_shares`

```sql
CREATE TABLE public.calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,          -- quem compartilha (auth.uid do dono)
  shared_with_id UUID NOT NULL,    -- quem recebe acesso (auth.uid)
  color TEXT DEFAULT NULL,         -- cor customizada (opcional)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, shared_with_id)
);
```

- RLS: usuario ve shares onde `shared_with_id = auth.uid()` ou `owner_id = auth.uid()`
- GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated

### Nova Permissao: `calendario-admin`

- Adicionar ao enum `menu_item_type`
- Adicionar em `PermissionGroupsSettings.tsx` e `PermissionsSettings.tsx`
- Quem tem essa permissao ve a secao "Todos Colaboradores" na sidebar

## Layout da Pagina

```
┌─────────────────────────────────────────────────────┐
│ DashboardLayout                                      │
│ ┌──────────┬────────────────────────────────────────┐│
│ │ Sidebar  │  Header: [← Marco 2026 →] [Hoje]      ││
│ │          │          [Mes|Semana|Dia]               ││
│ │ Meu Cal. │────────────────────────────────────────││
│ │ ☑ Thulio │  Seg  Ter  Qua  Qui  Sex  Sab  Dom    ││
│ │          │  ┌────┬────┬────┬────┬────┬────┬────┐  ││
│ │ Compart. │  │    │    │    │    │    │    │    │  ││
│ │ ☑ Isabel │  │    │ 10h│ Rev│ DL │ Apr│    │    │  ││
│ │          │  │    │Meet│Cri │Camp│    │    │    │  ││
│ │ Todos*   │  ├────┼────┼────┼────┼────┼────┼────┤  ││
│ │ ☐ Marina │  │    │    │    │    │    │    │    │  ││
│ │ ☐ Lucas  │  └────┴────┴────┴────┴────┴────┴────┘  ││
│ │          │                                    [+]  ││
│ │ Tipos    │                                         ││
│ │ ■ Reun.  │                                         ││
│ │ ■ Taref. │                                         ││
│ │ ■ Dead.  │                                         ││
│ │ ■ Apres. │                                         ││
│ │          │                                         ││
│ │ [Compar- │                                         ││
│ │  tilhar] │                                         ││
│ └──────────┴────────────────────────────────────────┘│
│ * Secao "Todos" so aparece para quem tem             │
│   permissao calendario-admin                         │
└─────────────────────────────────────────────────────┘
```

## Componentes

### Pagina

- `src/pages/Calendario.tsx` — pagina principal com DashboardLayout

### Componentes (src/components/calendar/)

- `CalendarSidebar.tsx` — sidebar com colaboradores, tipos de evento, botao compartilhar
- `CalendarHeader.tsx` — navegacao de mes/semana + toggle de visualizacao
- `CalendarMonthView.tsx` — grade mensal com eventos
- `CalendarWeekView.tsx` — timeline semanal por hora
- `CalendarDayView.tsx` — timeline diaria detalhada
- `CalendarEventChip.tsx` — chip de evento colorido por tipo
- `CalendarFAB.tsx` — botao flutuante "+" com menu (Nova Reuniao / Nova Tarefa)
- `CalendarShareModal.tsx` — modal para compartilhar calendario com outro usuario

### Hooks (src/hooks/)

- `useCalendarEvents.tsx` — hook que agrega dados das 4 fontes (reunioes, tarefas, deadlines, apresentacoes) num formato unificado de eventos
- `useCalendarShares.tsx` — CRUD para `calendar_shares`

### Formato Unificado de Evento

```typescript
interface CalendarEvent {
  id: string;
  type: "meeting" | "task" | "deadline" | "presentation";
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  color: string;
  ownerId: string; // auth.uid do dono do evento
  ownerName: string;
  metadata: {
    // Campos especificos por tipo
    meetingUrl?: string; // reunioes
    taskStatus?: string; // tarefas
    priority?: string; // tarefas
    presentationId?: string; // apresentacoes
  };
}
```

## Fluxo de Dados

1. `useCalendarEvents` recebe: `month/week`, `userIds[]` (colaboradores selecionados na sidebar)
2. Faz 3-4 queries paralelas (reunioes, tarefas, deadlines, apresentacoes) filtradas por data e userIds
3. Normaliza tudo em `CalendarEvent[]`
4. Componente de visualizacao (Month/Week/Day) renderiza os eventos

## Permissoes — Logica da Sidebar

```
sidebar.sections = [
  { label: "Meu Calendario", users: [currentUser], always: true },
  { label: "Compartilhados comigo", users: calendar_shares.where(shared_with_id = me), always: true },
  { label: "Todos Colaboradores", users: employees.all(), requires: "calendario-admin" },
]
```

## Interacoes

| Acao                           | Resultado                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Click no evento                | Abre modal de detalhes (reusa MeetingDetailsModal, modal de tarefa existente, etc.) |
| Click no checkbox da sidebar   | Ativa/desativa visibilidade do calendario daquele colaborador                       |
| Click no toggle Mes/Semana/Dia | Troca visualizacao                                                                  |
| Click em "←" / "→"             | Navega periodo anterior/proximo                                                     |
| Click em "Hoje"                | Volta para data atual                                                               |
| Click no FAB "+"               | Menu com "Nova Reuniao" e "Nova Tarefa"                                             |
| Click "Compartilhar"           | Modal para selecionar colaborador e compartilhar                                    |

## Rota

```tsx
<Route
  path="/calendario"
  element={
    <ProtectedRoute>
      <Calendario />
    </ProtectedRoute>
  }
/>
```

Acesso default (sem permissao especifica). A permissao `calendario-admin` controla apenas a visibilidade da secao "Todos Colaboradores" na sidebar.
