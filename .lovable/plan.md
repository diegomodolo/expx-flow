

# Plano: God Mode - Colunas de Diagnóstico + Seleção em Massa

Este plano implementa as duas melhorias sugeridas para transformar a tela do Editor de Campanhas na "melhor tela de gestão de tráfego do mundo".

---

## Resumo das Melhorias

| Funcionalidade | Benefício |
|----------------|-----------|
| **Colunas CPM e CPC** | Permite diagnosticar rapidamente a causa de um CPA alto (leilão caro vs. anúncio ineficiente) |
| **Seleção em Massa** | Pausar/ativar múltiplos anúncios de uma só vez, economizando tempo de gestão |

---

## Parte 1: Colunas de Diagnóstico (CPM e CPC)

### 1.1 Atualizar Interface de Métricas
**Arquivo:** `src/hooks/useCampaignTree.tsx`

Adicionar CPM às métricas do TreeNode:
- Estender `TreeNodeMetrics` com campo `cpm: number`
- Mapear `cpm` de ad_sets e ads (já existem no banco de dados)
- Para campanhas, calcular CPM: `(spend / impressions) * 1000`

### 1.2 Adicionar Targets de CPM
**Arquivo:** `src/hooks/useCampaignTree.tsx`

Atualizar `ClientTargets` para incluir:
- `target_cpm: number` (já existe na tabela `client_metric_benchmarks`)

### 1.3 Atualizar Cores de Saúde
**Arquivo:** `src/hooks/useCampaignTree.tsx`

Adicionar lógica de cores para CPM na função `getHealthColor`:
- Verde: CPM menor ou igual ao target
- Amarelo: CPM até 30% acima do target
- Vermelho: CPM mais de 30% acima do target

### 1.4 Adicionar Colunas na Tabela
**Arquivo:** `src/components/campaign-editor/TreeGridTable.tsx`

Adicionar duas novas colunas no header entre "Conv." e "Investido":
- **CPM** (w-[8%])
- **CPC** (w-[8%])

Ajustar larguras das outras colunas para acomodar (reduzir Nome de 35% para 30%).

### 1.5 Renderizar Métricas nas Linhas
**Arquivo:** `src/components/campaign-editor/TreeGridRow.tsx`

Adicionar duas novas células `<td>` com MetricCell:
- CPM: prefixo "R$", 2 decimais
- CPC: prefixo "R$", 2 decimais (já existe no node.metrics)

---

## Parte 2: Seleção em Massa (Bulk Actions)

### 2.1 Gerenciar Estado de Seleção
**Arquivo:** `src/components/campaign-editor/TreeGridTable.tsx`

Adicionar:
- State: `selectedNodes: Set<string>` para IDs selecionados
- Funções: `toggleSelection(id)`, `selectAll()`, `clearSelection()`
- Passar callbacks para TreeGridRow

### 2.2 Adicionar Checkbox nas Linhas
**Arquivo:** `src/components/campaign-editor/TreeGridRow.tsx`

Adicionar nova props:
- `isSelected: boolean`
- `onToggleSelect: () => void`

Inserir checkbox à esquerda do botão de expansão:
- Usar componente `Checkbox` do shadcn/ui
- Espaçamento adequado com hierarquia visual mantida

### 2.3 Adicionar Coluna de Checkbox no Header
**Arquivo:** `src/components/campaign-editor/TreeGridTable.tsx`

Adicionar primeira coluna com:
- Checkbox "selecionar todos" visíveis
- Estado "indeterminate" quando alguns estão selecionados

### 2.4 Criar Barra de Ações Flutuante
**Arquivo:** `src/components/campaign-editor/BulkActionsBar.tsx` (novo)

Componente sticky que aparece quando há itens selecionados:

```text
+--------------------------------------------------------------+
| [x] 5 selecionados  [Pausar Selecionados] [Ativar Selecionados] [Limpar] |
+--------------------------------------------------------------+
```

Botões:
- **Pausar Selecionados**: Ícone Pause, cor vermelha
- **Ativar Selecionados**: Ícone Play, cor verde
- **Limpar**: Limpa seleção

### 2.5 Lógica de Ações em Massa
**Arquivo:** `src/hooks/useInlineEdit.tsx`

Adicionar nova função:
```
bulkUpdateStatus(
  nodes: Array<{type, id, clientId, facebookId, platform}>,
  newStatus: "active" | "paused"
)
```

Esta função:
1. Itera sobre os nós selecionados
2. Chama a API do Meta para cada um (em paralelo com Promise.all)
3. Atualiza o banco local
4. Mostra toast de sucesso/erro agregado

### 2.6 Integrar na Página Principal
**Arquivo:** `src/pages/cliente/CampaignEditorPage.tsx`

- Passar estado de seleção para TreeGridTable
- Renderizar BulkActionsBar acima da tabela quando houver seleção
- Conectar ações aos handlers do useInlineEdit

---

## Estrutura de Arquivos

```text
src/
├── components/campaign-editor/
│   ├── TreeGridTable.tsx      (modificar: checkbox header + estado)
│   ├── TreeGridRow.tsx        (modificar: checkbox + CPM/CPC cells)
│   ├── BulkActionsBar.tsx     (novo: barra de ações em massa)
│   └── MetricCell.tsx         (sem alteração)
├── hooks/
│   ├── useCampaignTree.tsx    (modificar: CPM + targets)
│   └── useInlineEdit.tsx      (modificar: bulkUpdateStatus)
└── pages/cliente/
    └── CampaignEditorPage.tsx (modificar: integrar bulk actions)
```

---

## Detalhes Técnicos

### Novo Layout das Colunas

| Coluna | Largura Antes | Largura Depois |
|--------|---------------|----------------|
| Checkbox | - | w-[3%] |
| Nome | w-[35%] | w-[27%] |
| Status | w-[8%] | w-[7%] |
| Orçamento | w-[15%] | w-[13%] |
| CTR | w-[8%] | w-[7%] |
| CPA | w-[10%] | w-[8%] |
| **CPM** | - | w-[7%] |
| **CPC** | - | w-[7%] |
| Conv. | w-[8%] | w-[7%] |
| Investido | w-[16%] | w-[14%] |

### Modelo de Dados CPM

O CPM já está disponível nas tabelas:
- `ads.cpm` - sincronizado do Meta
- `ad_sets.cpm` - sincronizado do Meta
- `campaigns` - calcular: `(spend / impressions) * 1000`

O target_cpm já existe em `client_metric_benchmarks.target_cpm`.

### Fluxo da Seleção em Massa

```text
1. Usuário clica checkbox de um anúncio
   └─> toggleSelection(nodeId) adiciona/remove do Set

2. Quando Set.size > 0
   └─> BulkActionsBar aparece (fixed/sticky)

3. Usuário clica "Pausar Selecionados"
   └─> bulkUpdateStatus() é chamado
       ├─> Para cada node: manage-facebook-campaign (action: toggle)
       └─> Atualiza DB local

4. Ao concluir
   └─> clearSelection() + invalidateQueries()
```

---

## Resumo de Alterações

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `useCampaignTree.tsx` | Modificar | Adicionar CPM às métricas e targets |
| `TreeGridTable.tsx` | Modificar | Checkbox header, novas colunas CPM/CPC, estado de seleção |
| `TreeGridRow.tsx` | Modificar | Checkbox por linha, células CPM/CPC |
| `BulkActionsBar.tsx` | Criar | Barra flutuante de ações em massa |
| `useInlineEdit.tsx` | Modificar | Função bulkUpdateStatus |
| `CampaignEditorPage.tsx` | Modificar | Integrar BulkActionsBar |

