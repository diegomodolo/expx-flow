
# Proposta de Enriquecimento do Dashboard TV de Tarefas (/tarefas-tv)

## O que o sistema já possui e pode ser aproveitado

O sistema tem dados ricos disponíveis nas tabelas `tasks`, `task_time_tracking`, `teams` (squads) e `profiles`, além do hook `useSquadDashboard` com métricas completas de produtividade por squad. O dashboard atual exibe KPIs básicos, indicadores de regularidade/qualidade/eficiência, sessões ativas e ranking de colaboradores.

## O que falta e seria muito valioso

### 1. Ranking de Squads (Comparativo em Tempo Real)
O sistema já calcula `productivityScore` por squad no `useSquadDashboard`, mas o dashboard TV não exibe nada sobre squads. Seria a seção mais impactante visualmente para uma TV de operações.

Exibição: Cards horizontais em ranking com barra de score colorida (verde > amarelo > vermelho), nome do squad, membros ativos agora, tarefas em atraso e taxa de conclusão.

### 2. Gráfico de Velocidade de Conclusão (Últimos 14 dias)
O banco já tem `completed_at` nas tarefas. Os dados mostram variação diária real: 22 tarefas em 16/02, 10 em 17/02, 5 em 18/02, 2 em 19/02. Um gráfico de barras com `recharts` (já instalado) mostrando esse ritmo de entrega diária é altamente informativo para equipes.

### 3. KPI de Horas Trabalhadas (Time Tracking Agregado)
A tabela `task_time_tracking` tem `duration_minutes` e `started_at/ended_at`. O sistema registrou 3.336 minutos (~55,6 horas) de trabalho rastreado nos últimos 7 dias em 28 sessões. Adicionar um card "Horas Trabalhadas (7d)" com média por colaborador é um diferencial real.

### 4. Seção "Em Revisão" (status = review)
Atualmente o dashboard ignora tarefas com status `review`. Há 8 tarefas nesse status. Uma coluna ou card para "Aguardando Revisão" aumenta a visibilidade do gargalo mais comum no fluxo de trabalho.

### 5. Alertas Visuais Automáticos (Celebração / Alerta Crítico)
O dashboard CS-TV já tem `CSTVCelebrationOverlay` e `CSTVCriticalAlertOverlay`. Trazer o mesmo padrão para o dashboard de tarefas: quando uma tarefa de alta prioridade é concluída, exibir uma animação de celebração por alguns segundos. Quando uma tarefa de alta prioridade entra em atraso, exibir um alerta pulsante.

---

## Plano de Implementação

### Fase 1 — Novos KPIs e seção "Em Revisão"

**Arquivo: `src/hooks/useTaskTvDashboard.ts`**
- Adicionar busca de tarefas com status `review` na query principal
- Adicionar cálculo de `hoursTrackedLast7Days` (soma de `duration_minutes` dos últimos 7 dias)
- Adicionar `reviewTasksList: TaskItem[]` para o modal de drill-down
- Expandir a interface `TaskTvData` com os novos campos

**Arquivo: `src/pages/TaskTvDashboard.tsx`**
- Adicionar um 5º card KPI "Em Revisão" na linha de KPIs (grid de 5 colunas)
- Adicionar um 5º card KPI "Horas Trabalhadas" na segunda linha ou substituindo uma das métricas menos relevantes
- Adicionar modal para a lista de tarefas em revisão

### Fase 2 — Gráfico de Velocidade de Conclusão (Ritmo Diário)

**Arquivo: `src/hooks/useTaskTvDashboard.ts`**
- Adicionar busca das últimas 14 dias com `GROUP BY DATE(updated_at)` para tarefas concluídas
- Adicionar campo `completionTrend: { day: string; count: number }[]` ao retorno

**Arquivo: `src/pages/TaskTvDashboard.tsx`**
- Adicionar componente `CompletionTrendChart` usando `BarChart` do recharts (já instalado)
- Exibir gráfico de barras verticais com gradiente verde, mostrando o ritmo dos últimos 14 dias
- Estilizado no tema dark do dashboard (fundo transparente, eixos em cinza)

### Fase 3 — Ranking de Squads

**Arquivo: `src/hooks/useTaskTvDashboard.ts`**
- Adicionar busca por `team_id` nas tasks, cruzando com tabela `teams`
- Calcular por squad: `productivityScore`, `activeSessions`, `overdueTasks`, `completionRate`
- Adicionar campo `squadRankings: SquadTvRanking[]` ao retorno

**Arquivo: `src/pages/TaskTvDashboard.tsx`**
- Adicionar seção "Performance por Squad" com cards horizontais em ranking
- Cada card: cor do squad à esquerda, nome, membros executando agora (com ícone pulsante), barra de progresso colorida por score
- Ordenado por `productivityScore` decrescente

### Fase 4 — Alertas Visuais Automáticos

**Arquivo: `src/pages/TaskTvDashboard.tsx`**
- Implementar `useEffect` que observa mudanças em `data.completedTodayList` e detecta novas conclusões de tarefas de alta prioridade
- Exibir overlay de celebração por 5 segundos (animação CSS de confetti simples ou ícone de troféu animado)
- Observar `data.overdueTasksList` para alertas: quando uma tarefa de alta prioridade entra em atraso, exibir banner pulsante vermelho no topo por 8 segundos

---

## Resultado Visual Esperado

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard de Tarefas · Ao Vivo                              10:42:33        │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────────────┤
│ Em Aberto│Em Atraso │Concl. Hoje│Em Revisão│Executando│  Horas Trabalhadas   │
│    12    │    3     │    5     │    8     │    2     │      55.6h / 7d      │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────────────────┤
│  Regularidade 87%  │  Qualidade 92%  │  Eficiência 89%                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Ritmo de Conclusão (14 dias) ─ BarChart                                    │
│  ████ ███ ██ █ ████ ███ ██ ██ ██ ██ ██ ██ ██ ██                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Ranking de Squads            │  Executando Agora  │  Top Performers        │
│  🥇 Squad #02  ████████ 78   │  ● João · Tarefa X │  1. Maria · 94%        │
│  🥈 Squad #01  ██████   62   │  ● Ana · Tarefa Y  │  2. Pedro · 87%        │
│  🥉 Squad #03  ████     41   │                    │  3. Lucas · 82%        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Resumo dos Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useTaskTvDashboard.ts` | Adicionar dados de revisão, horas rastreadas, trend de conclusão e ranking de squads |
| `src/pages/TaskTvDashboard.tsx` | Adicionar novos KPI cards, gráfico de tendência, seção de squads e alertas visuais |

Nenhuma migração de banco de dados é necessária — todos os dados já existem.
