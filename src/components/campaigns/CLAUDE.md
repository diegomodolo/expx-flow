# Campanhas (src/components/campaigns/)

## Visao Geral

14+ arquivos. Gestao de campanhas de marketing multi-plataforma (Facebook, Google, Instagram).

## Arquivos Principais

| Arquivo                         | Funcao                                       |
| ------------------------------- | -------------------------------------------- |
| `CampaignBuilderModal.tsx`      | Modal de criacao de campanha                 |
| `CreateCampaignModal.tsx`       | Modal alternativo de criacao                 |
| `EditCampaignDialog.tsx`        | Dialog de edicao de campanha                 |
| `CampaignBudgetModal.tsx`       | Modal de orcamento                           |
| `CampaignMetricsModal.tsx`      | Modal de metricas                            |
| `CampaignDuplicateModal.tsx`    | Duplicacao de campanha                       |
| `CampaignRenameModal.tsx`       | Renomear campanha                            |
| `CampaignActionsDropdown.tsx`   | Menu de acoes por campanha                   |
| `AdSetBuilderModal.tsx`         | Construtor de conjunto de anuncios           |
| `CreativeBuilderModal.tsx`      | Construtor de criativos                      |
| `PlatformFilter.tsx`            | Filtro por plataforma                        |
| `PlatformBadge.tsx`             | Badge de plataforma (Facebook, Google, etc.) |
| `PlatformComparisonChart.tsx`   | Grafico comparativo entre plataformas        |
| `BudgetProjectionIndicator.tsx` | Indicador de projecao de orcamento           |
| `builder/`                      | Sub-modulo de construcao de campanhas        |

## Padroes Locais

### Campanhas sao multi-plataforma

```typescript
// Campanhas podem pertencer a Facebook, Google Ads, ou ambas
// Usar PlatformBadge para indicar a plataforma
// Filtrar por plataforma com PlatformFilter
```

### Modais seguem pattern consistente

```typescript
// Todos modais usam Dialog do shadcn/ui
// Props tipicas: open, onOpenChange, campaignId, clientId
// Dados carregados via hooks internos ao modal
```

## Regras ao Editar

1. **Multi-plataforma** — Campanhas podem ter dados de Facebook E Google simultaneamente
2. **Client-scoped** — Campanhas pertencem a um client_id; sempre filtrar por cliente
3. **Modais** — Manter pattern de Dialog com open/onOpenChange
4. **Metricas** — Dados de metricas vem de APIs externas via Edge Functions
