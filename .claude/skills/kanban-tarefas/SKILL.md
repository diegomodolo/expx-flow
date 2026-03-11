# Kanban / Tarefas — Skill de Contexto do Modulo

## Visao Geral

O modulo de Tarefas e o Kanban pessoal de cada colaborador. Diferente do Command Center (visao do lider distribuindo trabalho), aqui o colaborador visualiza e gerencia suas proprias tarefas organizadas em colunas customizaveis. Suporta 5 views: Kanban, Lista, Calendario, Planner e Recorrentes.

**Rota:** `/tarefas` — protegida por `ProtectedRoute` (auth, sem permissao especifica).

### Relacao com Outros Modulos

```
Backlog Center (task_state='backlog')
  → Command Center (task_state='planejamento' → 'execucao', atribui start_date + assigned_user_id + quadro_column_id)
    → Kanban pessoal (/tarefas) — colaborador ve suas tarefas nas colunas do seu quadro
```

Quando o lider atribui uma tarefa no Command Center, ela aparece automaticamente no Kanban do colaborador porque `assignTask` define `quadro_column_id` com a primeira coluna `todo` do quadro do colaborador.

---

## Arquivos-Chave

### Pagina e Views

| Arquivo | Responsabilidade |
|---|---|
| `src/pages/Tarefas.tsx` | (~1273 linhas) Pagina principal. 5 views, filtros, sorting, board selector, alertas, compact mode |
| `src/components/tasks/TaskKanban.tsx` | (~814 linhas) View Kanban: colunas customizaveis, drag-and-drop de cards e colunas, bulk fetch de time tracking/subtasks/members |
| `src/components/tasks/TaskList.tsx` | View lista: tabela agrupada por status |
| `src/components/tasks/TaskDialog.tsx` | Modal de edicao completo: 7 tabs (Principais, Clientes, Equipe, Checklist, Subtarefas, Historico, Time Tracking) + paineis laterais |

### Componentes de Suporte

| Arquivo | Responsabilidade |
|---|---|
| `src/components/tasks/BoardSelector.tsx` | Dropdown para selecionar quadro ("Meu Quadro", "Todos", ou usuario especifico) |
| `src/components/tasks/ColumnSettingsDialog.tsx` | Criar/editar/excluir colunas customizadas (nome, status, cor) |
| `src/components/tasks/TemplateSelector.tsx` | 5 templates pre-configurados (Agencia, Freelancer, Suporte, Producao de Conteudo, Basico) |
| `src/components/tasks/TaskCompletionBlockModal.tsx` | Bloqueia conclusao se subtarefas/checklist pendentes |
| `src/components/tasks/CompletedTasksModal.tsx` | Modal com todas as tarefas concluidas |
| `src/components/tasks/TaskSubtasksTab.tsx` | Gestao de subtarefas (parent_task_id) |
| `src/components/tasks/RecurringTasksManager.tsx` | Gestao de tarefas recorrentes |

### Hooks Principais

| Arquivo | Responsabilidade |
|---|---|
| `src/hooks/useEmployeeBoard.tsx` | Fetch de tarefas do quadro selecionado, filtros de visibilidade, permissoes, realtime |
| `src/hooks/useTasks.tsx` | CRUD de tarefas, optimistic updates, notificacoes Discord |
| `src/hooks/useTaskBoardColumns.tsx` | CRUD de colunas customizadas por usuario, reorder, apply template |
| `src/hooks/useTaskTimeTracking.ts` | Sessoes de time tracking com timer ao vivo |
| `src/hooks/useSubtasks.ts` | Subtarefas (parent_task_id) |
| `src/hooks/useTaskHistory.ts` | Historico/auditoria de mudancas |
| `src/hooks/useTaskStats.tsx` | Estatisticas (total, por status, por prioridade, taxa de conclusao) |

### Dados

| Arquivo | Responsabilidade |
|---|---|
| `src/data/kanbanTemplates.ts` | 5 templates de colunas pre-configurados |

---

## Sistema de Colunas

### Custom vs Default

Cada usuario pode ter colunas customizadas (`task_board_columns`). Se nao tiver, o Kanban usa colunas default:

| Coluna Default | Status | Cor |
|---|---|---|
| Pendente | todo | #6B7280 |
| Em Andamento | progress | #3B82F6 |
| Em Revisao | review | #F59E0B |
| Concluida | done | #10B981 |

### Mapeamento Tarefa → Coluna

1. Se `task.quadro_column_id` esta definido → vai para essa coluna especifica
2. Se nao → match por `task.status` com `column.status`
3. Se nenhuma coluna tem o status → fallback para a primeira coluna

### 8 Status Possiveis

`todo` | `progress` | `review` | `waiting_approval` | `blocked` | `paused` | `done` | `cancelled`

Multiplas colunas podem ter o mesmo status (ex: duas colunas "Em Andamento" com nomes diferentes).

### Colunas Customizadas (task_board_columns)

```
id, user_id, company_id, name, status, color, order_index
```

- **Per-user**: Cada usuario tem suas proprias colunas
- **RLS**: `auth.uid() = user_id` para todas as operacoes
- **Templates**: Aplicar template apaga todas as colunas existentes e insere as do template
- **Reorder**: Atualiza `order_index` de todas as colunas atomicamente

---

## Drag-and-Drop

### Cards entre Colunas

- Move tarefa para nova coluna → atualiza `status` e `quadro_column_id`
- Auto-calcula `progress`: done=100%, review=90%, progress=50%, todo=0%
- Registra no historico de tarefas (`logTaskHistoryEntry`)
- **Click vs Drag**: Usa `didDragRef` para diferenciar (click abre dialog, drag move)

### Reordenacao de Colunas

- Apenas colunas customizadas (nao as default-*)
- Atualiza `order_index` via `reorderColumns` mutation

### Tarefas Ghost

Tarefas com `origin='ghost'` sao **nao-arrastáveis** e exibidas semi-transparentes (opacity 50%).

---

## Ordenacao de Tarefas

### No Hook (useEmployeeBoard)

```typescript
.order("start_date", { ascending: true, nullsFirst: false })
.order("created_at", { ascending: false })
```

1. **`start_date ASC`** — tarefas com horario agendado primeiro, na sequencia de execucao
2. **`nullsFirst: false`** — tarefas sem horario ficam por ultimo
3. **`created_at DESC`** — desempate (mais recentes primeiro)

### Na Pagina (Tarefas.tsx)

Sorting client-side configuravel pelo usuario:
- Campos: `created_at`, `title`, `priority`, `status`, `responsible_name`, `due_date`
- Default: `created_at ASC`

**Importante**: O TaskKanban NAO re-ordena — exibe na ordem que recebe do hook.

---

## Filtros e Visibilidade

### Filtros no Hook (useEmployeeBoard)

1. **Visibilidade**: `visibility_date <= hoje` (ou null) — tarefas agendadas para o futuro nao aparecem
2. **Exclui Historias**: `task_type != 'Historia'` — so subtarefas aparecem no Kanban
3. **Filtra por quadro**: Se tarefa tem `quadro_column_id` de outro usuario, nao aparece

### Filtros na Pagina (Tarefas.tsx)

- Status, prioridade, equipe, responsavel
- Busca textual (titulo)
- Contador de filtros ativos no modo compacto

---

## Coluna "Concluida" (Done)

A coluna de tarefas concluidas tem tratamento especial:
- **Card agregado**: Mostra contagem (ex: "12 tarefas concluidas") em vez de listar todas
- **Click**: Abre `CompletedTasksModal` com lista completa
- **Largura reduzida**: 200px (normal) / 180px (compact)
- **Colunas vazias**: Colapsam para 64px (exceto se drag-over)

---

## Padroes Estabelecidos

### 1. Bulk Data Fetching no TaskKanban

O TaskKanban faz queries em paralelo para enriquecer os cards:

```typescript
// Busca em batch para todas as tarefas visiveis
const taskIds = tasks.map(t => t.id);
const [members, timeTracking, activeSessions, subtaskCounts] = await Promise.all([
  fetchTaskMembers(taskIds),
  fetchTimeTotals(taskIds),
  fetchActiveSessions(taskIds),    // polling a cada 10s
  fetchSubtaskCounts(taskIds),
]);
```

### 2. Compact Mode Persistido

```typescript
const [compactMode, setCompactMode] = useState(() =>
  localStorage.getItem('tasks-compact-mode') === 'true'
);
```

Afeta largura de colunas (240→180px), padding de cards (p-3→p-2), font sizes (sm→xs).

### 3. Task Dialog com Zoom Persistido

O modal de tarefa tem 8 niveis de zoom (640-1536px), salvo por usuario na tabela `user_ui_settings`.

### 4. Optimistic Updates com Invalidacao Ampla

Mutacoes de tarefa invalidam multiplas query keys:
```typescript
['tasks'], ['board-tasks'], ['planner-tasks'], ['task-stats']
```

### 5. Notificacoes Discord

O `useTasks` envia notificacao Discord ao criar tarefa e ao mudar status para review.

---

## Armadilhas e Bugs Resolvidos

### 1. Tarefas no Kanban ordenadas por criacao, nao por horario (USABILIDADE)

**Sintoma**: Tarefas apareciam na ordem de lancamento (`created_at`), nao pelo horario marcado para execucao.

**Causa raiz**: Query em `useEmployeeBoard.tsx` usava `.order("created_at", { ascending: false })`.

**Solucao**: Mudar para ordenar por `start_date ASC` (com `nullsFirst: false`) primeiro, depois `created_at DESC` como desempate. O colaborador agora ve as tarefas na sequencia correta de trabalho.

**Licao**: O `start_date` vem do Command Center quando o lider agenda a tarefa na timeline. E o campo correto para sequencia de execucao.

### 2. quadro_column_id conecta Command Center ao Kanban

Quando `assignTask` no Command Center atribui uma tarefa, ele busca a primeira coluna `todo` do quadro do colaborador e seta `quadro_column_id`. Sem isso, a tarefa apareceria no Kanban pela correspondencia de status, mas poderia cair na coluna errada se o usuario tem colunas customizadas.

### 3. Tarefas de outros quadros aparecem indevidamente

O `useEmployeeBoard` filtra tarefas que tem `quadro_column_id` de outro usuario (outro quadro). Sem esse filtro, ao ver "Todos", tarefas de um usuario apareceriam em colunas erradas no quadro de outro.

---

## Contexto Nao-Obvio

### 1. Historias (task_type='Historia') nao aparecem no Kanban

Historias sao tarefas-pai no Backlog Center. Apenas suas subtarefas (via `parent_task_id`) aparecem no Kanban individual. O filtro esta em `useEmployeeBoard` linha 88.

### 2. visibility_date controla quando a tarefa aparece

Tarefas com `visibility_date` no futuro nao aparecem no Kanban ate a data chegar. Usado para agendar aparicao de tarefas sem afetar o `start_date`.

### 3. Tarefas Ghost (origin='ghost')

Tarefas com `origin='ghost'` sao criadas automaticamente por automacoes/fluxos. Sao exibidas semi-transparentes e NAO podem ser arrastadas.

### 4. Checklist e JSON no campo task.checklist

O checklist e armazenado como JSON array dentro do campo `checklist` da tarefa:
```json
[{"id":"uuid","text":"Item 1","completed":true}, {"id":"uuid","text":"Item 2","completed":false}]
```
Nao e uma tabela separada.

### 5. Templates apagam tudo

Aplicar um template de colunas (`applyTemplate`) **DELETA todas as colunas existentes** do usuario e insere as do template. Nao e merge — e substituicao total.

### 6. Active sessions polling a cada 10s

O TaskKanban faz polling de sessoes ativas de time tracking a cada 10 segundos para atualizar os timers ao vivo nos cards. Usa `refetchInterval: 10000` no useQuery.

### 7. Progress auto-calculado no drag

Ao mover uma tarefa para uma coluna com status diferente, o `progress` e auto-ajustado:
- `done` → 100%
- `review` → 90%
- `progress` → 50%
- `todo` → 0%

### 8. Retry logic para conflito de trigger

O `useTasks` tem logica de retry ao atualizar tarefas — se um trigger de banco modifica a mesma row simultaneamente, causa conflito. O hook retenta a operacao automaticamente.

### 9. 7 tipos de tarefa

`Tarefa` | `Criativo` | `Historia` | `Negocio` | `Reuniao` | `Ticket` | `Backlog`

Cada tipo tem icone proprio no card do Kanban. Historias sao filtradas fora do Kanban (item 1 acima).
