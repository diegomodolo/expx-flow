
# Plano: Unificar Página de Campanhas com TreeGrid para Todas as Campanhas

## Objetivo

Transformar a página de campanhas (`ClienteCampanhas.tsx`) para exibir todas as campanhas do cliente em formato de TreeGrid (árvore hierárquica), substituindo a lista de tabela atual. Mantendo os controles existentes de projeção de orçamento, sincronização e filtros.

---

## Análise da Situação Atual

### Página de Campanhas (`ClienteCampanhas.tsx`)
- Lista todas as campanhas em tabela simples
- Tem filtros de plataforma (Meta/Google/All)
- Filtro de status (ativas/pausadas/finalizadas)
- Seletor de período para sincronização
- Botão de sincronização para todas as plataformas
- Projeção de orçamento (BudgetProjectionIndicator)
- Modal para criar nova campanha

### Página de Edição (`CampaignEditorPage.tsx`)
- Usa `useCampaignTree` para buscar dados de UMA campanha
- Exibe TreeGridTable com a hierarquia Campanha > Conjunto > Anúncio
- Tem KPISummaryBar com métricas consolidadas
- Modal unificado para editar nós selecionados

### Hook Atual (`useCampaignTree.tsx`)
- Busca dados de apenas UMA campanha por `campaignId`
- Constrói árvore com adsets/ads

---

## Solução Proposta

### Novo Hook: `useAllCampaignsTree`

Criar um novo hook que:
1. Busca TODAS as campanhas do cliente (Meta + Google)
2. Para cada campanha, busca seus conjuntos e anúncios
3. Retorna um array de TreeNodes, um por campanha

### Modificações na UI

#### Manter
- BudgetProjectionIndicator
- Filtros de plataforma e status
- Seletor de período
- Botões de sincronização
- Modal de criar campanha
- KPISummaryBar (agora com métricas totais de todas as campanhas)

#### Substituir
- Tabela simples por componente TreeGridTable modificado
- Receber array de campanhas em vez de uma única

#### Adicionar
- Modal unificado (UnifiedCampaignModal) para editar nós selecionados

---

## Arquitetura da Solução

```text
ClienteCampanhas.tsx
├── Header com título e controles
│   ├── Seletor de período
│   ├── Botão de sincronização
│   ├── Filtro de plataforma
│   ├── Filtro de status
│   └── Botão Nova Campanha
├── BudgetProjectionIndicator
├── KPISummaryBar (métricas totais)
├── TreeGridTableMultiple (novo componente)
│   └── Renderiza múltiplas campanhas como TreeNodes de nível 0
└── UnifiedCampaignModal
```

---

## Implementação Detalhada

### 1. Novo Hook: `useAllCampaignsTree.tsx`

```typescript
interface UseAllCampaignsTreeOptions {
  clientId?: string;
  companyId?: string;
  platform?: 'meta' | 'google' | 'all';
  includeInactive?: boolean;
}

export function useAllCampaignsTree(options) {
  // Buscar campanhas Meta
  const { data: metaCampaigns } = useQuery({...})
  
  // Buscar campanhas Google
  const { data: googleCampaigns } = useQuery({...})
  
  // Buscar todos os ad_sets do cliente
  const { data: allAdSets } = useQuery({...})
  
  // Buscar todos os ads do cliente
  const { data: allAds } = useQuery({...})
  
  // Buscar google_ad_groups e google_ads
  const { data: allGoogleAdGroups } = useQuery({...})
  const { data: allGoogleAds } = useQuery({...})
  
  // Montar árvore para cada campanha
  const treeData = useMemo(() => {
    return [...metaCampaigns, ...googleCampaigns].map(campaign => {
      // Montar TreeNode com children
    })
  }, [...])
  
  // Calcular métricas totais
  const totalMetrics = useMemo(() => {...}, [treeData])
  
  return { treeData, isLoading, totalMetrics, targets }
}
```

### 2. Novo Componente: `MultiCampaignTreeGrid.tsx`

Similar ao TreeGridTable, mas:
- Recebe `campaigns: TreeNode[]` em vez de `campaign: TreeNode`
- Cada campanha é um nó de nível 0 expansível
- Mantém estado de expansão por campanha
- Suporta filtros de plataforma e status

### 3. Modificar: `ClienteCampanhas.tsx`

- Substituir `useUnifiedCampaigns` por `useAllCampaignsTree`
- Substituir tabela por `MultiCampaignTreeGrid`
- Adicionar `UnifiedCampaignModal`
- Adaptar KPISummaryBar para receber métricas totais

### 4. KPISummaryBar Alternativo

Criar variante que receba métricas agregadas:
```typescript
interface AggregatedKPISummaryBarProps {
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpa: number;
  };
  targets: ClientTargets;
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useAllCampaignsTree.tsx` | **Criar** - Hook para buscar todas as campanhas com hierarquia |
| `src/components/campaign-editor/MultiCampaignTreeGrid.tsx` | **Criar** - Componente TreeGrid para múltiplas campanhas |
| `src/pages/cliente/ClienteCampanhas.tsx` | **Modificar** - Substituir tabela por TreeGrid, adicionar modal |
| `src/components/campaign-editor/KPISummaryBar.tsx` | **Modificar** - Adicionar suporte para métricas agregadas |

---

## Fluxo de Dados

```text
1. useAllCampaignsTree busca:
   ├── campaigns (Meta)
   ├── google_campaigns (Google)
   ├── ad_sets (por client_id)
   ├── ads (por ad_set_id)
   ├── google_ad_groups (por client_id)
   └── google_ads (por ad_group_id)

2. Monta TreeNode[] onde cada item é uma campanha:
   └── Campanha (nível 0)
       └── Conjunto (nível 1)
           └── Anúncio (nível 2)

3. MultiCampaignTreeGrid renderiza:
   ├── Header com checkbox "select all"
   └── Linhas para cada campanha e seus filhos (expansível)

4. Filtros aplicados:
   ├── Platform filter -> filtra por campaign.platform
   └── Status filter -> filtra por campaign.status
```

---

## Comportamento da UI

- Campanhas começam **colapsadas** por padrão
- Clique na seta expande para ver conjuntos
- Clique em um nó abre o `UnifiedCampaignModal`
- Checkbox permite seleção múltipla para ações em lote
- Filtros afetam apenas o nível de campanha (filhos seguem o pai)

---

## Considerações de Performance

- Dados buscados por `client_id`, não por campanha individual
- Evita N+1 queries usando batch fetching
- Lazy loading: conjuntos e anúncios carregados em batch, não sob demanda
- React Query faz cache automático

---

## Resultado Final

A página de campanhas terá:
- Mesmos controles de sincronização e filtros atuais
- Projeção de orçamento mantida
- TreeGrid mostrando todas as campanhas com hierarquia expansível
- Cards de KPIs totais no topo
- Modal de edição para qualquer nó selecionado
- Operações em lote (pausar/ativar) via seleção
