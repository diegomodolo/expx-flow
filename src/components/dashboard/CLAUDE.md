# Dashboard (src/components/dashboard/)

## Visao Geral

23 arquivos. Layout principal da aplicacao e componentes do dashboard home.

## Arquivos Principais

| Arquivo                                                          | Funcao                                            |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| `DashboardLayout.tsx`                                            | Layout principal: sidebar + header + content area |
| `DashboardSidebar.tsx`                                           | Navegacao lateral com menu de permissoes          |
| `DashboardHeader.tsx`                                            | Header com busca, notificacoes, perfil            |
| `Dashboard.tsx`                                                  | Componente principal do dashboard home            |
| `UniversalCommandBar.tsx`                                        | Barra de comando universal (Cmd+K)                |
| `UnifiedMetricsCards.tsx`                                        | Cards de metricas unificadas                      |
| `MetricsCard.tsx`                                                | Card individual de metrica                        |
| `StatusCard.tsx`                                                 | Card de status                                    |
| `ActivityFeed.tsx` / `ActivityFeedItem.tsx`                      | Feed de atividades recentes                       |
| `QuickActions.tsx`                                               | Acoes rapidas                                     |
| `AccountHealthRadar.tsx`                                         | Radar de saude da conta                           |
| `TopCampaignsCard.tsx`                                           | Top campanhas                                     |
| `FeaturedCampaignsCard.tsx`                                      | Campanhas em destaque                             |
| `RecentCreativesCard.tsx`                                        | Criativos recentes                                |
| `AlertsCard.tsx` / `ActiveAlertsCard.tsx`                        | Alertas do sistema                                |
| `WeekCalendarCard.tsx`                                           | Calendario semanal                                |
| `DailyFocusCard.tsx` / `DailyRoutinePanel.tsx` / `MyDayCard.tsx` | Cards do dia                                      |
| `TeamHighlights.tsx` / `TeamNotesCard.tsx`                       | Destaques e notas da equipe                       |
| `BudgetProjectionIndicator.tsx`                                  | Projecao de orcamento (se existir aqui)           |

## Padroes Locais

### DashboardLayout envolve todas as rotas protegidas

```typescript
// Em App.tsx, rotas protegidas sao renderizadas dentro de DashboardLayout
// O layout fornece: sidebar colapsavel, header fixo, area de conteudo com padding
```

### Cards seguem pattern consistente

```typescript
// Todos os cards usam shadcn Card + metricas de hooks
<Card>
  <CardHeader><CardTitle>Titulo</CardTitle></CardHeader>
  <CardContent>{/* dados */}</CardContent>
</Card>
```

## Regras ao Editar

1. **DashboardLayout** — Nao alterar estrutura do layout sem verificar impacto em todas as rotas
2. **DashboardSidebar** — Menu items sao filtrados por permissao; manter sincronizado com `useEmployeePermissions`
3. **Cards** — Manter responsividade com grid Tailwind (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
4. **UniversalCommandBar** — Atalho Cmd+K; cuidado ao adicionar comandos novos
