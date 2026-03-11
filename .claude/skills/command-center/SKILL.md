# Command Center — Skill de Contexto do Modulo

## Visao Geral

O Command Center e o hub operacional onde lideres de squad distribuem tarefas para colaboradores em uma timeline visual (estilo Gantt). Integra-se ao Backlog Center (onde historias ficam em estado `backlog`) e ao Kanban individual de cada colaborador.

### Fluxo de Estados das Tarefas (task_state)

```
backlog → planejamento → execucao
  (Backlog Center)  (CC Backlog)   (CC Timeline)
```

- **backlog**: Tarefa no Backlog Center. Nao aparece no Command Center.
- **planejamento**: Tarefa no backlog lateral do Command Center (sem `start_date`, sem `assigned_user_id`). Visivel para o lider distribuir.
- **execucao**: Tarefa na timeline, atribuida a um colaborador com `start_date` definido.

### Acoes principais

| Acao | De | Para | Campos alterados |
|---|---|---|---|
| Liberar para lideres | backlog | planejamento | `task_state = 'planejamento'` |
| Arrastar para timeline | planejamento | execucao | `assigned_user_id`, `start_date`, `task_state = 'execucao'`, `quadro_column_id` |
| Devolver ao backlog (CC) | execucao | planejamento | `assigned_user_id = null`, `start_date = null`, `task_state = 'planejamento'` |
| Devolver ao Backlog Center | execucao/planejamento | backlog | `task_state = 'backlog'`, reset total (+ subtarefas) |
| Enviar para amanha | execucao | execucao | `start_date` avanca 1 dia util |
| Reatribuir (cross-row drag) | execucao | execucao | `assigned_user_id`, `responsible_name`, `start_date` |

---

## Arquivos-Chave

### Hook principal

| Arquivo | Responsabilidade |
|---|---|
| `src/hooks/useCommandCenter.ts` | Estado central: fetch de backlogTasks e timelineTasks, assignTask, unassignTask, returnToBacklogCenter, metricas, realtime subscription |

**Detalhes do hook:**
- Queries separadas para backlog (`status=todo`, `start_date IS NULL`, `task_state != 'backlog'`) e timeline (`start_date` no dia selecionado)
- Enriquece tarefas com `clients` via `task_clients` (com fallback para `related_client_id` legado)
- Realtime via canal Supabase com debounce de 2s para nao resetar durante drag-drop
- `assignTask` busca a primeira coluna `todo` do quadro do colaborador (`task_board_columns`) para setar `quadro_column_id`
- Todas as mutacoes usam **optimistic update** com rollback em caso de erro

### Componentes da Timeline

| Arquivo | Responsabilidade |
|---|---|
| `src/pages/SquadCommandCenter.tsx` | Pagina principal. Orquestra DragDropContext, handlers de todas acoes, alterna entre view timeline e backlog |
| `src/components/command-center/WorkloadTimeline.tsx` | Container da timeline: ruler de horarios, controles de zoom, navegacao de data, configuracoes de slot, renderiza TimelineRows |
| `src/components/command-center/TimelineRow.tsx` | Linha de um membro: avatar, slots visuais, ghost preview durante drag, renderiza TimelineTaskCards |
| `src/components/command-center/TimelineTaskCard.tsx` | Card de tarefa na timeline: drag-to-move, resize (esquerda/direita), cross-row drag, context menu |
| `src/components/command-center/TimelineSlot.tsx` | Slot visual individual (ocupado, indisponivel, drag-over) |
| `src/components/command-center/BacklogColumn.tsx` | Coluna lateral de backlog no CC com Droppable/Draggable (react-beautiful-dnd) |
| `src/components/command-center/CommandCenterHeader.tsx` | Metricas do dia (completadas, total, ocupacao, tempo livre) |
| `src/components/command-center/SquadSelector.tsx` | Seletor de squad/equipe |

### Hooks auxiliares

| Arquivo | Responsabilidade |
|---|---|
| `src/hooks/useWorkSchedules.ts` | Horarios de trabalho dos colaboradores (inicio, almoco, fim) |
| `src/hooks/useBacklogCommandCenter.ts` | Hook do Backlog Center (estado backlog, selecao, release) |
| `src/hooks/useTeams.ts` | Lista de squads/equipes com membros |

---

## Padroes Estabelecidos

### 1. Optimistic Updates com Rollback

Todas as mutacoes no Command Center seguem este padrao:

```typescript
const task = timelineTasks.find(t => t.id === taskId);

// 1. Update otimista local
setTimelineTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...changes } : t));

// 2. Persistir no banco
const { error } = await supabase.from("tasks").update(changes).eq("id", taskId);

// 3. Rollback se erro
if (error) {
  if (task) setTimelineTasks(prev => prev.map(t => t.id === taskId ? task : t));
  throw error;
}
```

### 2. Propagacao de Props na Cadeia de Componentes

Para adicionar nova acao no context menu de tarefas, propagar em 4 niveis:

```
SquadCommandCenter (handler + hook)
  → WorkloadTimeline (interface Props + destructure + pass)
    → TimelineRow (interface Props + destructure + pass)
      → TimelineTaskCard (interface Props + destructure + render)
```

**Checklist para nova acao:**
1. Adicionar funcao no `useCommandCenter.ts` e exportar no return
2. Adicionar prop `onNovaAcao` na interface de `TimelineTaskCard.tsx` + context menu item
3. Adicionar prop na interface + signature + pass de `TimelineRow.tsx`
4. Adicionar prop na interface + signature + pass de `WorkloadTimeline.tsx`
5. Criar `handleNovaAcao` callback em `SquadCommandCenter.tsx` e passar ao WorkloadTimeline

### 3. Timeline Settings Persistidas no Banco

As configuracoes da timeline (slotDuration, startHour, endHour) sao salvas na tabela `user_ui_settings` com key `"cc-timeline-settings"` via hook `usePersistedTimelineSettings` dentro de `WorkloadTimeline.tsx`. **NAO usar localStorage para ler essas configs.**

### 4. Drag-and-Drop: Backlog → Timeline

O sistema usa `react-beautiful-dnd` para o drag do backlog, mas o posicionamento exato na timeline usa tracking manual do mouse:

- **Droppable backlog**: `droppableId="backlog"` em `BacklogColumn`
- **Droppable timeline rows**: `droppableId="timeline-{member.id}"` em `TimelineRow`
- **Posicao do drop**: Rastreada via `lastMousePosRef` no pai (`SquadCommandCenter`), calculada no `handleDragEnd` usando data-attributes do DOM

### 5. Drag-to-Move e Resize na Timeline (sem DnD library)

O `TimelineTaskCard` implementa drag e resize **manualmente** (sem react-beautiful-dnd):
- **Move**: mousedown no card → mousemove global → snap to slot → mouseup calcula nova posicao
- **Resize**: mousedown nas bordas → ajusta largura → mouseup calcula novo `ai_estimated_minutes`
- **Cross-row drag**: detecta mudanca de row via `document.elementsFromPoint` + `data-member-user-id`
- **Drop no backlog**: detecta via `data-backlog-column` attribute

### 6. Context Menu

Acoes do botao direito no `TimelineTaskCard`:
- Enviar para amanha (`onSendToNextDay`)
- Devolver ao backlog do CC (`onSendToBacklog`)
- Devolver ao Backlog Center (`onReturnToBacklogCenter`)

---

## Armadilhas e Bugs Resolvidos

### 1. Drop sempre ia para o primeiro horario (CRITICO)

**Sintoma**: Arrastar tarefa do backlog para a timeline sempre posicionava no primeiro horario, ignorando onde o usuario soltou.

**Causa raiz (2 problemas)**:
1. O tracking do mouse era feito via `useEffect` no `WorkloadTimeline` que dependia do state `draggingTask`. Como `setDraggingTask()` e assincrono, o listener so era registrado apos re-render — se o drop ocorria antes, `dropSlotRef.current` ficava `null` e caia no fallback `findNextFreeSlot`.
2. O `handleDragEnd` lia configuracoes de `localStorage.getItem("cc-timeline-settings")` mas as configs sao salvas no banco via `user_ui_settings`. Resultado: sempre usava defaults.

**Solucao**:
- Rastrear mouse diretamente no pai via listener global registrado em `handleDragStart` (sem depender de re-render)
- Ler parametros reais da timeline via `data-attributes` no DOM (`data-slot-width`, `data-slot-duration`, `data-start-hour`)
- O scroll container tem `data-timeline-scroll` para ser encontrado via `document.querySelector`

**Codigo do calculo do slot no drop** (em `handleDragEnd`):
```typescript
const container = document.querySelector('[data-timeline-scroll]') as HTMLElement;
const rect = container.getBoundingClientRect();
const scrollLeft = container.scrollLeft;
const mouseX = lastMousePosRef.current.x - rect.left + scrollLeft - 192; // 192 = w-48 member column
const slot = Math.max(0, Math.floor(mouseX / slotWidth));
const minutesFromDayStart = startHour * 60 + slot * slotDuration;
```

### 2. Devolver ao Backlog vs Devolver ao Backlog Center

**Contexto nao-obvio**: Existem DUAS acoes de "devolver":
- **Devolver ao backlog (CC)**: `unassignTask` — seta `task_state = 'planejamento'`, tarefa volta para a coluna lateral do Command Center
- **Devolver ao Backlog Center**: `returnToBacklogCenter` — seta `task_state = 'backlog'`, tarefa desaparece do CC e volta ao Backlog Center. Tambem reseta todas as subtarefas (`parent_task_id`).

### 3. Member column offset hardcoded

O calculo do slot subtrai `192` pixels (= `w-48` = 12rem) pela coluna de membro. Se o layout mudar, esse valor precisa ser atualizado em:
- `WorkloadTimeline.tsx` (effect de mouse tracking do ghost preview, linha ~185)
- `SquadCommandCenter.tsx` (handleDragEnd, calculo do mouseX)

### 4. Realtime com debounce

O subscription Supabase no `useCommandCenter` usa debounce de 2 segundos para evitar que updates em tempo real resetem o estado durante drag-drop (o que causaria a tarefa "pular" visualmente).

---

## Contexto Nao-Obvio

1. **`task_board_columns`**: Quando uma tarefa e atribuida via Command Center, o `assignTask` busca a primeira coluna do quadro pessoal do colaborador para setar `quadro_column_id`. Isso faz a tarefa aparecer automaticamente no Kanban individual.

2. **Historias vs Subtarefas**: No backlog, tarefas com `parent_task_id = null` sao historias; com `parent_task_id` definido sao subtarefas. O `BacklogColumn` agrupa subtarefas sob a historia-pai com collapse/expand.

3. **Work schedules afetam a timeline**: Horarios de trabalho (`useWorkSchedules`) marcam slots como "indisponiveis" (antes do expediente, almoco, apos expediente) com visual diferenciado.

4. **Ghost preview**: Durante o drag do backlog, um card fantasma aparece na timeline mostrando onde a tarefa sera posicionada. Isso e feito via `mouseSlot` state no `WorkloadTimeline` + `ghostPreview` prop no `TimelineRow`.

5. **Cross-row drag detecta target via DOM**: O `TimelineTaskCard` usa `document.elementsFromPoint()` + `data-member-user-id` attribute para detectar em qual linha o card esta sendo arrastado. Ele temporariamente desativa `pointerEvents` do card para que `elementsFromPoint` enxergue a row abaixo.

6. **ViewDate vs selectedDate**: `viewDate` e o state no hook `useCommandCenter` que controla qual dia esta sendo visualizado. E passado como `selectedDate` para os componentes da timeline. A navegacao de data (setas, calendario) altera `viewDate` via `setViewDate`.
