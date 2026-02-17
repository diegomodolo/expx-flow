
# Tela de Gestao de Historias

Nova pagina dedicada para visualizar, filtrar e gerenciar todas as Historias (tarefas-pai com subtarefas) do sistema.

## Funcionalidades

**Filtros e Busca**
- Filtro por Squad (time/equipe)
- Busca por cliente vinculado
- Filtro por status: Abertas / Concluidas / Todas
- Busca por titulo da historia

**Visualizacao**
- Cards de historia mostrando: titulo, cliente(s), squad, progresso (subtarefas concluidas/total), prioridade, prazo
- Indicador visual de progresso (barra ou percentual)
- Badge do squad com cor
- Avatares dos clientes vinculados
- Expansao inline para ver subtarefas de cada historia

**Gestao**
- Clicar na historia abre o TaskDialog existente para edicao completa
- Visualizacao rapida do status de cada subtarefa

## Estrutura de Arquivos

1. **`src/pages/Historias.tsx`** - Pagina principal com layout, filtros e listagem
2. **`src/hooks/useHistorias.ts`** - Hook dedicado para buscar tarefas do tipo "Historia" com joins de clientes, times e contagem de subtarefas
3. **`src/components/historias/HistoriaCard.tsx`** - Componente de card individual da historia
4. **`src/components/historias/HistoriaFilters.tsx`** - Barra de filtros (squad, cliente, status, busca)

## Detalhes Tecnicos

**Hook `useHistorias`:**
- Query no Supabase filtrando `task_type = 'Historia'`
- Join com `teams` para nome/cor do squad
- Join com `clients` via `related_client_id` para nome/avatar do cliente
- Subquery para contar subtarefas totais e concluidas (`parent_task_id = historia.id`)
- Filtros por `team_id`, status (`done` vs aberto), e texto

**Pagina:**
- Usa `DashboardLayout` como todas as outras paginas
- Layout `h-[calc(100vh-130px)]` seguindo o padrao existente
- Grid responsivo de cards
- Scroll area para a listagem

**Rota e Menu:**
- Rota: `/historias`
- Adicionar no sidebar em "Squad" section, entre "Backlog Center" e "Command Center"
- Permissao: `command-center` (mesma dos centros de comando)
- Icone: `BookOpen` do lucide-react (ja usado para historias no BacklogColumn)

**Integracao:**
- Reutiliza o `TaskDialog` existente para edicao
- Nenhuma mudanca no banco de dados necessaria - usa dados ja existentes
- Nao altera nenhuma tela existente (Backlog Center e Command Center permanecem intactos)
