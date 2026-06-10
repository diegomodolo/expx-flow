---
name: pageheader
description: "Use ao trabalhar no header da aplicacao (DashboardHeader): busca universal, badges de indicadores, acoes rapidas e menu do usuario"
---

# PageHeader (DashboardHeader) — Skill de Contexto do Modulo

## Visao Geral

O header principal da aplicacao. Presente em todas as paginas protegidas via `DashboardLayout`. Contem busca universal, indicadores com badges, acoes rapidas e menu do usuario. Nao existe um componente chamado "PageHeader" — o componente real e `DashboardHeader`.

**Arquivo principal:** `src/components/dashboard/DashboardHeader.tsx` (~234 linhas)

**Renderizado por:** `DashboardLayout.tsx` — automaticamente incluido em todas as rotas protegidas.

---

## Layout do Header (da esquerda para direita)

```
[UniversalCommandBar (Cmd+K)] .............. [Aprovacao] [Notificacoes] [Workspace] [WhatsApp?] [Tema] [Empresa] [Avatar+Menu]
```

| Posicao   | Componente              | Condicional?       | Descricao                                               |
| --------- | ----------------------- | ------------------ | ------------------------------------------------------- |
| Esquerda  | `UniversalCommandBar`   | Nao                | Barra de busca universal (atalho Cmd+K)                 |
| Direita 1 | `TaskApprovalIndicator` | Sim (count > 0)    | Maozinha ambar com badge — tarefas aguardando aprovacao |
| Direita 2 | `NotificationCenter`    | Nao                | Sino com badge vermelho — notificacoes unificadas       |
| Direita 3 | Workspace button        | Nao                | Icone FileText → navega para `/workspace`               |
| Direita 4 | WhatsApp button         | Sim (hasInstances) | Icone verde → abre WhatsAppInboxDrawer                  |
| Direita 5 | Theme toggle            | Sim (mounted)      | Sun/Moon → alterna tema claro/escuro                    |
| Direita 6 | `CompanySelector`       | Nao                | Dropdown de selecao de empresa                          |
| Direita 7 | User dropdown           | Nao                | Avatar + nome + menu (Perfil, Sair)                     |

---

## Arquivos-Chave

### Header Principal

| Arquivo                                            | Responsabilidade                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/components/dashboard/DashboardHeader.tsx`     | Componente do header. Orquestra todos os indicadores, botoes e menus            |
| `src/components/dashboard/DashboardLayout.tsx`     | Layout que renderiza o header + sidebar + content area                          |
| `src/components/dashboard/UniversalCommandBar.tsx` | Barra de comando Cmd+K. Busca clientes, menu, tarefas ativas, membros da equipe |

### Sistema de Notificacoes

| Arquivo                                               | Responsabilidade                                                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/notifications/NotificationCenter.tsx` | (~267 linhas) Sino com Popover. Merge de `user_notifications` + `internal_notifications`, ordenado por data. Cada tipo tem icone e cor proprios                         |
| `src/hooks/useUserNotifications.tsx`                  | (~146 linhas) Hook unificado: busca user_notifications (limit 50) + internal_notifications (unread, limit 20). Refetch 15s + realtime subscription via postgres_changes |
| `src/components/comm-hub/NotificationBell.tsx`        | Versao alternativa/legada do sino (NAO usada no header principal — o header usa NotificationCenter)                                                                     |

### Indicador de Aprovacao de Tarefas

| Arquivo                                          | Responsabilidade                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/components/tasks/TaskApprovalIndicator.tsx` | Icone Hand ambar com badge. Popover com lista de tarefas em review onde usuario e autorizador                         |
| `src/hooks/useTasksAwaitingApproval.ts`          | Hook: busca task_members (role=authorizer) → tasks (status=review) → enriquece com cliente e responsavel. Refetch 30s |

### Outros Componentes no Header

| Arquivo                                           | Responsabilidade                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/components/company/CompanySelector.tsx`      | Dropdown para trocar empresa ativa (persiste em localStorage via CompanyContext)        |
| `src/components/whatsapp/WhatsAppInboxDrawer.tsx` | Drawer lateral com inbox do WhatsApp. Abre via botao no header                          |
| `src/hooks/useUserWhatsAppInstances.tsx`          | Verifica se usuario tem instancias WhatsApp atribuidas (controla visibilidade do botao) |

---

## Padrao para Adicionar Indicadores no Header

### Anatomia de um indicador (badge + Popover)

Todos os indicadores no header seguem o mesmo padrao visual:

```tsx
// 1. Botao trigger: ghost, icon, 10x10 rounded-full
<Button
  variant="ghost"
  size="icon"
  className="relative w-10 h-10 rounded-full hover:bg-muted/60"
  title="Descricao"
>
  <Icone className="h-5 w-5 text-muted-foreground" />

  {/* 2. Badge: absolute posicionado, com cap em 99+ */}
  {count > 0 && (
    <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center text-xs bg-[cor] hover:bg-[cor] pointer-events-none">
      {count > 99 ? "99+" : count}
    </Badge>
  )}
</Button>
```

```tsx
// 3. Popover: w-[380px], sem padding, sideOffset=8
<PopoverContent align="end" className="w-[380px] p-0 shadow-lg" sideOffset={8}>
  {/* Header com titulo + subtitulo */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
    <h4 className="text-sm font-semibold">Titulo</h4>
  </div>

  {/* Lista scrollavel */}
  <ScrollArea className="max-h-[420px]">
    <div className="divide-y divide-border">
      {items.map(item => <Item ... />)}
    </div>
  </ScrollArea>
</PopoverContent>
```

### Item de lista no dropdown

```tsx
// Padrao de item clicavel
<button className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors">
  {/* Icone circular */}
  <div className="mt-0.5 shrink-0 p-1.5 rounded-full bg-muted text-[cor]">
    <Icone className="w-3.5 h-3.5" />
  </div>
  {/* Conteudo */}
  <div className="flex-1 min-w-0">
    <p className="text-sm line-clamp-1">{titulo}</p>
    <p className="text-xs text-muted-foreground">{subtitulo}</p>
    <span className="text-[10px] text-muted-foreground mt-1 block">
      {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
    </span>
  </div>
</button>
```

### Checklist para adicionar novo indicador

1. Criar hook em `src/hooks/use[Entidade].ts` com query + refetchInterval
2. Criar componente em `src/components/[modulo]/[Nome]Indicator.tsx` seguindo o padrao Popover acima
3. Se indicador precisa abrir Dialog ao clicar: gerenciar estado (open + data) no DashboardHeader
4. Adicionar no JSX do DashboardHeader na posicao correta dentro do `flex items-center gap-2`
5. Se condicional: retornar `null` quando count === 0

---

## Sistema de Notificacoes — Detalhes

### Duas fontes de notificacao unificadas

O `NotificationCenter` merge duas tabelas em uma lista unica ordenada por data:

| Tabela                   | Tipo                                                                            | Persistencia                                      |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `user_notifications`     | Notificacoes de negocio (task_review, task_assigned, ad_pending_approval, etc.) | Persistem — marcadas como lidas mas nao deletadas |
| `internal_notifications` | Notificacoes de chat/mensagens                                                  | Persistem — marcadas como lidas                   |

**IMPORTANTE**: Ambas tabelas NAO estao nos tipos auto-gerados. Usar `"user_notifications" as unknown` e `"internal_notifications" as unknown`.

### Tipos de notificacao e icones

| Tipo                  | Icone         | Cor                   |
| --------------------- | ------------- | --------------------- |
| `task_review`         | ClipboardList | text-primary          |
| `task_assigned`       | User          | text-primary          |
| `ad_pending_approval` | Megaphone     | text-warning          |
| `lead_disqualified`   | AlertTriangle | text-destructive      |
| `creative_pending`    | Sparkles      | text-warning          |
| `client_alert`        | AlertTriangle | text-destructive      |
| `campaign_alert`      | Zap           | text-warning          |
| `message_mention`     | MessageSquare | text-primary          |
| `message_channel`     | MessageSquare | text-muted-foreground |
| `system`              | Bell          | text-muted-foreground |

### Realtime

O `useUserNotifications` tem subscription realtime via `postgres_changes` (INSERT e UPDATE) na tabela `user_notifications`, filtrado por `user_id`. Alem disso, faz polling a cada 15s como fallback.

---

## Abrindo Dialogs a partir do Header

Quando um indicador no header precisa abrir um Dialog (ex: TaskDialog), o padrao e:

1. **Estado no DashboardHeader**: `[dialogOpen, setDialogOpen]` + `[dialogData, setDialogData]`
2. **Handler async**: Fetch dados completos do Supabase antes de abrir o dialog
3. **onOpenChange**: Ao fechar, limpar estado e invalidar queries relevantes
4. **Dialog renderizado no header**: Apos os drawers, antes do `</header>`

```tsx
// Padrao no DashboardHeader
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

// No JSX (final do header)
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
/>;
```

---

## Armadilhas e Contexto Nao-Obvio

### 1. NAO existe componente "PageHeader"

O nome interno e `DashboardHeader`. Usuarios podem chamar de "PageHeader" coloquialmente, mas o componente real esta em `src/components/dashboard/DashboardHeader.tsx`.

### 2. Tabelas de notificacao sem tipos gerados

`user_notifications` e `internal_notifications` NAO estao no types.ts auto-gerado. Sempre usar cast `as unknown` nas queries Supabase.

### 3. NotificationBell vs NotificationCenter

Existem DOIS componentes de sino:

- `src/components/notifications/NotificationCenter.tsx` — **ESTE e o usado no header**
- `src/components/comm-hub/NotificationBell.tsx` — versao alternativa/legada, NAO usada no header principal

Nao confundir. Ao modificar notificacoes do header, editar `NotificationCenter.tsx`.

### 4. Ordem dos elementos no header importa

Os indicadores aparecem na ordem em que estao no JSX. A ordem visual atual e:
`TaskApprovalIndicator → NotificationCenter → Workspace → WhatsApp → Theme → Company → User`

Ao adicionar novo indicador, escolher a posicao cuidadosamente — indicadores mais urgentes ficam mais a esquerda (mais visiveis).

### 5. Botoes condicionais

- WhatsApp: so aparece se `useUserWhatsAppInstances().hasInstances === true`
- TaskApprovalIndicator: retorna `null` se count === 0
- Theme toggle: espera `mounted === true` para evitar hydration mismatch

### 6. Drawers e Dialogs renderizados no header

O header renderiza componentes que abrem por cima do conteudo:

- `WhatsAppInboxDrawer` — drawer lateral
- `TaskDialog` — dialog modal para aprovacao de tarefas

Esses componentes ficam no JSX do header apos o layout principal, antes do `</header>`.

### 7. Tema via next-themes

O toggle de tema usa `useTheme()` do `next-themes` (apesar do projeto nao ser Next.js). Funciona porque o provider esta configurado no root.

### 8. Badge cores por contexto

- **Vermelho** (`bg-destructive`): Notificacoes gerais (sino)
- **Ambar** (`bg-amber-500`): Aprovacoes pendentes (maozinha)
- Ao criar novo badge, escolher cor que represente o nivel de urgencia/contexto

### 9. Invalidacao de cache ao fechar dialogs

Ao fechar um dialog aberto pelo header, SEMPRE invalidar as queries relevantes no `onOpenChange` para atualizar badges/contadores. Exemplo: ao fechar TaskDialog de aprovacao, invalidar `tasks-awaiting-approval`.
