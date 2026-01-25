
# Plano: Modal Unificado de Edição de Campanha

## Objetivo
Criar um modal unificado que centraliza a edição de Campanhas, Conjuntos de Anúncios e Criativos em uma única interface. O modal terá um painel de navegação à esquerda (TreeList) e um painel de conteúdo dinâmico à direita, permitindo navegar pela hierarquia sem fechar o modal.

---

## Estrutura do Modal

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  [Target] Editar Estrutura da Campanha                           [X]      │
├────────────────┬───────────────────────────────────────────────────────────┤
│                │                                                           │
│  NAVEGAÇÃO     │   CONTEÚDO DINÂMICO                                       │
│  (TreeList)    │                                                           │
│                │   ┌─────────────────────────────────────────────────────┐ │
│  ▼ Campanha    │   │ Cabeçalho com Métricas                             │ │
│    ▼ Conjunto1 │   │                                                     │ │
│      • Anúnc1  │   │ Formulário de edição do item selecionado           │ │
│      • Anúnc2  │   │ (CampaignContent / AdSetContent / AdContent)       │ │
│    ▼ Conjunto2 │   │                                                     │ │
│      • Anúnc3  │   │                                                     │ │
│                │   │                                                     │ │
│                │   └─────────────────────────────────────────────────────┘ │
│                │                                                           │
├────────────────┴───────────────────────────────────────────────────────────┤
│                                                [Cancelar] [💾 Salvar]      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar

### 1. `UnifiedCampaignModal.tsx` (Componente Principal)
Container do modal unificado com layout de duas colunas:
- **Lado Esquerdo (25%)**: TreeList navegável mostrando a hierarquia
- **Lado Direito (75%)**: Conteúdo dinâmico baseado no item selecionado

### 2. `CampaignTreeNav.tsx` (Navegação em Árvore)
Versão simplificada do TreeGrid para navegação:
- Exibe apenas ícone, nome e status de cada nó
- Indicador visual do item selecionado
- Expansão/colapso de nós pai
- Sem métricas (mantém interface limpa)

### 3. Componentes de Conteúdo (Refatoração)
Extrair o conteúdo interno dos modais existentes para componentes reutilizáveis:
- `CampaignEditContent.tsx`: Conteúdo atual do CampaignEditModal
- `AdSetEditContent.tsx`: Conteúdo atual do AdSetEditModal  
- `AdEditContent.tsx`: Conteúdo atual do AdEditModal

---

## Fluxo de Funcionamento

1. **Abertura do Modal**
   - Usuário clica em qualquer item (campanha, conjunto ou criativo) na TreeGridTable
   - Modal abre com o item clicado já selecionado no TreeList
   - Conteúdo correspondente é exibido à direita

2. **Navegação Interna**
   - Usuário pode clicar em outros itens no TreeList
   - O conteúdo à direita atualiza dinamicamente
   - O item selecionado fica destacado visualmente

3. **Salvamento**
   - Cada alteração é salva individualmente ao clicar em "Salvar"
   - Após salvar, permanece no modal para continuar editando outros itens
   - Botão "Fechar" encerra o modal

---

## Implementação

### Passo 1: Criar Componentes de Conteúdo Reutilizáveis

Extrair a lógica interna dos modais atuais para componentes separados que recebem props ao invés de gerenciar seu próprio estado de abertura/fechamento.

**Antes** (CampaignEditModal.tsx):
```typescript
export function CampaignEditModal({ isOpen, onClose, node, ... }) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        {/* Todo o conteúdo aqui */}
      </DialogContent>
    </Dialog>
  )
}
```

**Depois** (CampaignEditContent.tsx):
```typescript
export function CampaignEditContent({ node, clientId, onSuccess }) {
  // Apenas o conteúdo interno, sem Dialog wrapper
  return (
    <div className="space-y-6">
      {/* Métricas, formulário, etc */}
    </div>
  )
}
```

### Passo 2: Criar TreeList de Navegação

```typescript
interface CampaignTreeNavProps {
  tree: TreeNode;
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNode) => void;
}

export function CampaignTreeNav({ tree, selectedNodeId, onSelectNode }: CampaignTreeNavProps) {
  // Renderiza árvore navegável com expansão/colapso
}
```

### Passo 3: Criar Modal Unificado

```typescript
interface UnifiedCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignTree: TreeNode | null;
  initialSelectedNode: TreeNode | null;
  clientId: string;
  companyId?: string;
  onSuccess?: () => void;
}

export function UnifiedCampaignModal({ ... }) {
  const [selectedNode, setSelectedNode] = useState(initialSelectedNode);

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <div className="flex h-full">
          {/* Sidebar com TreeNav */}
          <div className="w-1/4 border-r">
            <CampaignTreeNav
              tree={campaignTree}
              selectedNodeId={selectedNode?.id}
              onSelectNode={setSelectedNode}
            />
          </div>

          {/* Conteúdo dinâmico */}
          <div className="w-3/4 overflow-auto">
            {selectedNode?.type === 'campaign' && (
              <CampaignEditContent node={selectedNode} ... />
            )}
            {selectedNode?.type === 'adset' && (
              <AdSetEditContent node={selectedNode} ... />
            )}
            {selectedNode?.type === 'ad' && (
              <AdEditContent node={selectedNode} ... />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Passo 4: Atualizar CampaignEditorPage

Substituir os três modais separados pelo modal unificado:

```typescript
// Antes (3 modais separados)
<CampaignEditModal isOpen={campaignModalOpen} ... />
<AdSetEditModal isOpen={adSetModalOpen} ... />
<AdEditModal isOpen={adModalOpen} ... />

// Depois (1 modal unificado)
<UnifiedCampaignModal
  isOpen={unifiedModalOpen}
  onClose={() => setUnifiedModalOpen(false)}
  campaignTree={treeData}
  initialSelectedNode={selectedNode}
  clientId={client?.id || ''}
  onSuccess={invalidateQueries}
/>
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/campaign-editor/UnifiedCampaignModal.tsx` | **Criar** | Modal principal com layout de duas colunas |
| `src/components/campaign-editor/CampaignTreeNav.tsx` | **Criar** | Componente de navegação em árvore |
| `src/components/campaign-editor/CampaignEditContent.tsx` | **Criar** | Conteúdo extraído do CampaignEditModal |
| `src/components/campaign-editor/AdSetEditContent.tsx` | **Criar** | Conteúdo extraído do AdSetEditModal |
| `src/components/campaign-editor/AdEditContent.tsx` | **Criar** | Conteúdo extraído do AdEditModal |
| `src/pages/cliente/CampaignEditorPage.tsx` | **Modificar** | Usar UnifiedCampaignModal ao invés dos 3 modais |

---

## Detalhes de UI/UX

### TreeList (Navegação)
- Largura: 280px fixo
- Ícones por tipo: Target (campanha), Layers (conjunto), Image (anúncio)
- Status: Badge colorido (verde=ativo, cinza=pausado)
- Hover: Background sutil
- Selecionado: Background primário com texto branco

### Área de Conteúdo
- Scroll independente da navegação
- Mantém todos os elementos atuais dos modais
- Botão Salvar fixo no rodapé do conteúdo

### Dimensões do Modal
- Largura: max-w-6xl (1152px)
- Altura: max-h-[90vh]
- Proporção: 25% navegação / 75% conteúdo

---

## Comportamento ao Navegar

1. **Mudanças não salvas**: Ao trocar de item, verificar se há mudanças pendentes
   - Se sim: Perguntar "Deseja salvar antes de continuar?"
   - Opções: "Salvar", "Descartar", "Cancelar"

2. **Feedback visual**: 
   - Item selecionado destacado na árvore
   - Indicador de carregamento durante transições

3. **Persistência de estado**:
   - Manter nós expandidos ao navegar
   - Manter scroll position da árvore
