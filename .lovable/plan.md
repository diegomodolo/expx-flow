
# Plano: Tela de Edição de Campanha - Tree Grid (Visão Hierárquica)

## Objetivo

Criar uma tela de gestão de campanhas avançada que exibe a hierarquia completa **Campanha > Conjunto > Anúncio** em uma única visualização, permitindo edições rápidas inline, painel lateral de detalhes, e indicadores visuais de saúde (semáforos).

---

## Arquitetura da Tela

```text
+--------------------------------------------------------------------------------+
| [< Voltar]  Campanha: "Nome da Campanha"   [Filtro Data] [Filtro Status]       |
+--------------------------------------------------------------------------------+
|  KPIs TOPO: Gasto Total | Conv. | CPA | CTR | ROAS                             |
+--------------------------------------------------------------------------------+
|                                                                                 |
|  TREE GRID (Tabela Hierárquica)                    | PAINEL INSPETOR (Sheet)   |
|  ──────────────────────────────────────────────    |                           |
|  ▼ CAMPANHA A          | ON  | R$100 | ROAS 3.5 🟢 |  [Detalhes do item        |
|    ▼ AD SET 1          | ON  | R$50  | CPA R$4 🟢  |   selecionado]            |
|       ○ Ad 01 [thumb]  | ON  |       | CTR 1.5% 🟢 |                           |
|       ○ Ad 02 [thumb]  | OFF |       | CTR 0.8% 🔴 |  - Orçamento              |
|    ▶ AD SET 2          | ON  | R$50  | CPA R$7 🟡  |  - Segmentação            |
|                                                     |  - Públicos               |
|  ▶ CAMPANHA B          | ON  | R$200 | ROAS 2.0 🟡 |  - Pixel/Eventos          |
|                                                     |                           |
+--------------------------------------------------------------------------------+
```

---

## Componentes a Serem Criados

| Componente | Descrição |
|------------|-----------|
| `CampaignEditorPage.tsx` | Nova página principal para edição (rota: `/clientes/:id/campanhas/:campaignId/editar`) |
| `TreeGridTable.tsx` | Componente de tabela expansível hierárquica |
| `TreeGridRow.tsx` | Linha individual com suporte a expansão e níveis visuais |
| `InlineStatusToggle.tsx` | Switch de status inline (ON/OFF) com chamada API |
| `InlineBudgetInput.tsx` | Input editável de orçamento com Enter para salvar |
| `MetricCell.tsx` | Célula de métrica com cor de semáforo (verde/amarelo/vermelho) |
| `CreativeThumbnail.tsx` | Miniatura com HoverCard para preview completo |
| `InspectorPanel.tsx` | Painel lateral (Sheet) com detalhes do item selecionado |
| `CampaignInspector.tsx` | Conteúdo do painel para Campanhas |
| `AdSetInspector.tsx` | Conteúdo do painel para Conjuntos |
| `AdInspector.tsx` | Conteúdo do painel para Anúncios |
| `KPISummaryBar.tsx` | Barra de KPIs agregados no topo |
| `BudgetProgressCell.tsx` | Barra de progresso de orçamento gasto |

---

## Fluxo de Navegação

1. Usuário está em `/clientes/:id/campanhas`
2. Clica no botão "Editar" ou ícone de uma campanha
3. Navega para `/clientes/:id/campanhas/:campaignId/editar`
4. Vê a campanha expandida com todos ad sets e ads em tree grid
5. Pode editar inline ou abrir painel lateral para edições complexas

---

## Detalhes de Implementação

### 1. Nova Rota e Página

**Arquivo:** `src/pages/cliente/CampaignEditorPage.tsx`

- Recebe `campaignId` via params
- Busca campanha + ad sets + ads usando hooks existentes
- Layout: `ResizablePanelGroup` com tree grid à esquerda e inspetor à direita

### 2. Tree Grid - Estrutura de Dados

```typescript
interface TreeNode {
  id: string;
  type: 'campaign' | 'adset' | 'ad';
  level: number; // 0 = campanha, 1 = adset, 2 = ad
  name: string;
  status: 'active' | 'paused';
  isExpanded: boolean;
  platform: 'meta' | 'google';
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas?: number;
  };
  budget?: {
    type: 'daily' | 'lifetime';
    amount: number;
    spent: number; // para barra de progresso
  };
  // Campos específicos por tipo
  facebookId?: string;
  targeting?: object;
  creativeUrl?: string;
}
```

### 3. Indicadores de Semáforo (Traffic Lights)

Utiliza metas do cliente já existentes no banco:
- `target_cpa` - Meta de CPA
- `target_ctr` - Meta de CTR  
- `target_roas` - Meta de ROAS

**Lógica de cores:**
```typescript
const getHealthColor = (metric: string, value: number, targets: ClientTargets) => {
  switch(metric) {
    case 'cpa':
      if (value <= targets.target_cpa) return 'green';
      if (value <= targets.target_cpa * 1.3) return 'yellow';
      return 'red';
    case 'ctr':
      if (value >= targets.target_ctr) return 'green';
      if (value >= targets.target_ctr * 0.7) return 'yellow';
      return 'red';
    case 'roas':
      if (value >= targets.target_roas) return 'green';
      if (value >= targets.target_roas * 0.8) return 'yellow';
      return 'red';
  }
};
```

### 4. Edição Inline - Status Toggle

**Componente:** `InlineStatusToggle.tsx`

```typescript
interface InlineStatusToggleProps {
  id: string;
  type: 'campaign' | 'adset' | 'ad';
  clientId: string;
  currentStatus: 'active' | 'paused';
  platform: 'meta' | 'google';
  onSuccess: () => void;
}
```

- Usa `Switch` do Radix
- Chama `manage-facebook-campaign` para Meta
- Mostra loading spinner durante request
- Toast de sucesso/erro

### 5. Edição Inline - Orçamento

**Componente:** `InlineBudgetInput.tsx`

```typescript
interface InlineBudgetInputProps {
  id: string;
  type: 'campaign' | 'adset';
  clientId: string;
  currentBudget: number;
  budgetType: 'daily' | 'lifetime';
  platform: 'meta' | 'google';
  onSuccess: () => void;
}
```

- Input transparente que parece texto
- Foco ativa modo edição (borda aparece)
- Enter salva, Escape cancela
- Chama API para atualizar

### 6. Thumbnail com Hover Preview

**Componente:** `CreativeThumbnail.tsx`

```typescript
interface CreativeThumbnailProps {
  imageUrl?: string;
  videoUrl?: string;
  title?: string;
  body?: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
}
```

- Thumbnail 40x40px na tabela
- `HoverCard` mostra:
  - Imagem/vídeo em tamanho maior (300px)
  - Título do criativo
  - Primeiras linhas do copy
  - Badge do tipo

### 7. Painel Inspetor (Sheet)

**Componente:** `InspectorPanel.tsx`

- Abre da direita via `Sheet`
- Largura: 400px
- Conteúdo dinâmico baseado no tipo selecionado
- Seções colapsáveis:
  - **Campanha:** Objetivo, orçamento total, período
  - **Ad Set:** Segmentação (idade, gênero, interesses), públicos, pixel, evento
  - **Ad:** Criativo completo, copy, URL, CTA, métricas de engajamento

### 8. Barra de Progresso de Orçamento

**Componente:** `BudgetProgressCell.tsx`

```typescript
interface BudgetProgressCellProps {
  spent: number;
  budget: number;
  budgetType: 'daily' | 'lifetime';
}
```

- Barra visual usando `Progress` do Radix
- Cores:
  - Verde: < 70% gasto
  - Amarelo: 70-90% gasto
  - Vermelho: > 90% gasto
- Tooltip mostra valores exatos

---

## Hooks Necessários

### useCampaignTree

Novo hook que combina dados de campanhas, ad sets e ads em estrutura hierárquica:

```typescript
const useCampaignTree = (campaignId: string, clientId: string) => {
  // Busca campanha específica
  // Busca ad sets da campanha
  // Busca ads de cada ad set
  // Retorna estrutura TreeNode[]
};
```

### useInlineEdit

Hook para gerenciar edições inline:

```typescript
const useInlineEdit = () => {
  const updateStatus = async (type, id, status) => {...};
  const updateBudget = async (type, id, budget) => {...};
  const updateName = async (type, id, name) => {...};
};
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/clientes/:id/campanhas/:campaignId/editar` |
| `src/pages/cliente/ClienteCampanhas.tsx` | Adicionar botão "Editar" que navega para a nova página |

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/cliente/CampaignEditorPage.tsx` | Página principal |
| `src/components/campaign-editor/TreeGridTable.tsx` | Tabela hierárquica |
| `src/components/campaign-editor/TreeGridRow.tsx` | Linha da tabela |
| `src/components/campaign-editor/InlineStatusToggle.tsx` | Toggle de status |
| `src/components/campaign-editor/InlineBudgetInput.tsx` | Input de orçamento |
| `src/components/campaign-editor/MetricCell.tsx` | Célula com semáforo |
| `src/components/campaign-editor/CreativeThumbnail.tsx` | Miniatura com hover |
| `src/components/campaign-editor/BudgetProgressCell.tsx` | Barra de progresso |
| `src/components/campaign-editor/InspectorPanel.tsx` | Painel lateral |
| `src/components/campaign-editor/CampaignInspector.tsx` | Detalhes campanha |
| `src/components/campaign-editor/AdSetInspector.tsx` | Detalhes ad set |
| `src/components/campaign-editor/AdInspector.tsx` | Detalhes anúncio |
| `src/components/campaign-editor/KPISummaryBar.tsx` | KPIs do topo |
| `src/hooks/useCampaignTree.tsx` | Hook de dados hierárquicos |
| `src/hooks/useInlineEdit.tsx` | Hook de edição inline |

---

## Ordem de Implementação

1. **Estrutura base:** Criar página e rota
2. **Hooks:** `useCampaignTree` para montar hierarquia
3. **TreeGrid:** Tabela expansível básica
4. **Inline Status:** Toggle de ativar/pausar
5. **Semáforos:** Células coloridas por métricas
6. **Thumbnails:** Preview de criativos
7. **Inline Budget:** Edição de orçamento
8. **Inspetor:** Painel lateral com detalhes
9. **Barra de progresso:** Orçamento consumido
10. **KPIs do topo:** Agregados da campanha

---

## Considerações Técnicas

- **Performance:** Usar `useMemo` para estrutura de árvore
- **Otimistic Updates:** Atualizar UI antes da resposta da API
- **Debounce:** Edição de orçamento com debounce de 500ms
- **Persistência de estado:** Manter expansão de nós no localStorage
- **Google Ads:** Edição inline apenas para Meta inicialmente (Google é read-only por limitações da API)
