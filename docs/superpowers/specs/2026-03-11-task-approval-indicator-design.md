# Indicador de Tarefas Aguardando Aprovacao no Header

## Resumo

Novo icone de "maozinha" (Hand) no DashboardHeader, ao lado do sino de notificacoes, com badge numerico mostrando quantas tarefas aguardam aprovacao do usuario. Ao clicar, abre dropdown listando essas tarefas. Clicar em um item abre o TaskDialog.

## Motivacao

Tarefas aguardando aprovacao ficam misturadas com outras notificacoes no NotificationCenter, dificultando a visibilidade. Um indicador separado e dedicado resolve isso.

## Componentes

### 1. Hook `useTasksAwaitingApproval`

- Query em `tasks` com status `review`, join com `task_members` onde `role = 'authorizer'` e `employee_id` do usuario logado
- Retorna lista com: nome da tarefa, cliente, quem moveu para review
- Refetch a cada 30s + realtime subscription
- Depende de `company_id` (activeCompany.company_id)

### 2. Componente `TaskApprovalIndicator`

- Icone: `Hand` do Lucide
- Badge numerico vermelho igual ao do sino (mesmo estilo visual)
- So aparece se o usuario e autorizador de pelo menos 1 tarefa em review
- Posicao: a esquerda do sino de notificacoes no header

### 3. Dropdown `TaskApprovalDropdown`

- Popover similar ao NotificationCenter
- Header: "Aguardando sua aprovacao"
- Cada item mostra: nome da tarefa, nome do cliente, nome de quem enviou
- Clique no item abre TaskDialog da tarefa
- Estado vazio: "Nenhuma tarefa aguardando aprovacao"

## Escopo

- Sem acoes de aprovar/rejeitar no dropdown (so visualizacao)
- Sem filtros ou abas
- Sem persistencia de "lido/nao lido" (badge conta todas em review)

## Arquivos de Referencia

- Header: `src/components/dashboard/DashboardHeader.tsx`
- Notificacoes (referencia visual): `src/components/notifications/NotificationCenter.tsx`
- Review hook existente: `src/hooks/useTaskReview.ts`
- Task dialog: `src/components/tasks/TaskDialog.tsx`
- Edge function de review: `supabase/functions/process-task-review/index.ts`
- Task members/roles: tabela `task_members` com role='authorizer'
