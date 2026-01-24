
# Plano: Modal de Edição de Campanha

## Objetivo
Criar um modal de edição de campanha (`CampaignEditModal`) seguindo o mesmo padrão visual dos modais existentes de Conjunto de Anúncios (`AdSetEditModal`) e Criativo (`AdEditModal`), substituindo o painel lateral (`InspectorPanel`) que atualmente abre ao clicar em uma campanha.

---

## Análise Atual

### Comportamento Existente
- Ao clicar em uma **campanha** no TreeGrid → abre `InspectorPanel` (Sheet lateral)
- Ao clicar em um **conjunto de anúncios** → abre `AdSetEditModal` (Dialog modal)
- Ao clicar em um **criativo** → abre `AdEditModal` (Dialog modal)

### Infraestrutura Disponível
- Edge function `manage-facebook-campaign` já suporta: toggle status, rename, budget, duplicate
- Tabela `campaigns` contém: name, status, objective, daily_budget, lifetime_budget, facebook_id, métricas

---

## Implementação

### 1. Criar Componente `CampaignEditModal`

**Arquivo**: `src/components/campaign-editor/CampaignEditModal.tsx`

**Estrutura do Modal** (seguindo o padrão existente):

```text
┌─────────────────────────────────────────────────────────────┐
│  [Target Icon] Editar Campanha         [Status: Ativo] [ON] │
│  [META]                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐        │
│  │Invest│Impres│ CTR  │Conv. │Conj. │Ativos│Pausad│        │
│  │R$XXX │ XXX  │X.XX% │ XXX  │  XX  │  XX  │  XX  │        │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘        │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ CONFIGURAÇÕES       │  │ ORÇAMENTO           │          │
│  │                     │  │                     │          │
│  │ Nome da Campanha *  │  │ Tipo: [Diário ▼]    │          │
│  │ [_______________]   │  │                     │          │
│  │                     │  │ Valor (R$)          │          │
│  │ Objetivo            │  │ [____________]      │          │
│  │ [Conversões ▼]      │  │                     │          │
│  │ (somente leitura)   │  │                     │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                   [Cancelar] [💾 Salvar]    │
└─────────────────────────────────────────────────────────────┘
```

**Campos Editáveis**:
- **Nome**: Input text, obrigatório
- **Status**: Switch no header (Ativo/Pausado)
- **Orçamento**: Tipo (diário/vitalício) + Valor

**Campos Somente Leitura**:
- **Objetivo**: Exibido mas não editável (não pode ser alterado no Meta após criação)

**Métricas** (cards no topo):
- Investimento, Impressões, CTR, Conversões
- Quantidade de Conjuntos de Anúncios, Ativos, Pausados

### 2. Atualizar `CampaignEditorPage`

**Arquivo**: `src/pages/cliente/CampaignEditorPage.tsx`

**Mudanças**:
1. Adicionar state para o modal de campanha:
   ```typescript
   const [campaignModalOpen, setCampaignModalOpen] = useState(false);
   ```

2. Modificar `handleSelectNode` para abrir o modal correto:
   ```typescript
   if (node.type === 'campaign') {
     setCampaignModalOpen(true);  // Ao invés de setInspectorOpen(true)
   } else if (node.type === 'adset') {
     setAdSetModalOpen(true);
   } else if (node.type === 'ad') {
     setAdModalOpen(true);
   }
   ```

3. Adicionar o componente `CampaignEditModal` no JSX

4. Remover ou manter o `InspectorPanel` apenas para uso futuro (opcional)

### 3. Lógica de Salvamento

**Reutilizar edge function existente**: `manage-facebook-campaign`

```typescript
const handleSave = async () => {
  // Atualizar nome
  if (editName !== node.name) {
    await supabase.functions.invoke('manage-facebook-campaign', {
      body: {
        campaignId: node.id,
        clientId,
        action: 'rename',
        name: editName
      }
    });
  }

  // Atualizar status
  if (editStatus !== currentStatus) {
    await supabase.functions.invoke('manage-facebook-campaign', {
      body: {
        campaignId: node.id,
        clientId,
        action: 'toggle',
        status: editStatus
      }
    });
  }

  // Atualizar orçamento
  if (budgetChanged) {
    await supabase.functions.invoke('manage-facebook-campaign', {
      body: {
        campaignId: node.id,
        clientId,
        action: 'budget',
        budgetType,
        amount: parseFloat(editBudget) * 100 // Em centavos
      }
    });
  }
};
```

---

## Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/campaign-editor/CampaignEditModal.tsx` | **Criar** | Novo componente modal para edição de campanhas |
| `src/pages/cliente/CampaignEditorPage.tsx` | **Modificar** | Adicionar state e lógica para abrir o novo modal |

---

## Detalhes Técnicos

### Props do CampaignEditModal
```typescript
interface CampaignEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: TreeNode | null;
  clientId: string;
  companyId?: string;
  onSuccess?: () => void;
}
```

### Campos do Node (Campanha)
Baseado no `TreeNode` e tabela `campaigns`:
- `id`: UUID da campanha
- `name`: Nome da campanha
- `status`: 'active' | 'paused' | 'finished'
- `objective`: Objetivo (CONVERSIONS, TRAFFIC, etc.)
- `budget.type`: 'daily' | 'lifetime'
- `budget.amount`: Valor do orçamento
- `budget.spent`: Gasto atual
- `metrics`: Métricas de performance
- `facebookId`: ID no Meta
- `children`: Array de conjuntos de anúncios

### Objetivo (Somente Leitura)
O objetivo da campanha não pode ser alterado no Meta após a criação. Será exibido como um Select desabilitado com os valores:
- CONVERSIONS → "Conversões"
- TRAFFIC → "Tráfego"
- LEAD_GENERATION → "Geração de Leads"
- MESSAGES → "Mensagens"
- ENGAGEMENT → "Engajamento"
- APP_INSTALLS → "Instalações de App"

---

## Comportamento Final

### Antes
1. Usuário clica em campanha
2. Abre painel lateral (Sheet) com tabs Métricas/Configurações
3. Edição limitada, experiência diferente dos outros níveis

### Depois
1. Usuário clica em campanha
2. Abre modal centralizado (Dialog) similar ao de Conjuntos e Criativos
3. Métricas em cards no topo
4. Layout duas colunas: Configurações | Orçamento
5. Status no header com Switch
6. Experiência consistente em toda a hierarquia
