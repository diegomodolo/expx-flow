
# Plano: Menu de Ações (3 Pontinhos) para Campanhas, Conjuntos e Criativos

## Objetivo

Adicionar um ícone de menu (⋮) na última coluna de cada linha da tabela de campanhas, conjuntos de anúncios e criativos. Ao clicar, abre um dropdown com ações disponíveis, começando pela funcionalidade de **Duplicar**.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│  MultiCampaignTreeGrid                                          │
│  └─> TreeGridRow (campanha, adset, ad)                          │
│       └─> Nova coluna: TreeNodeActionsDropdown                  │
│            └─> Menu com ações (Duplicar, etc.)                  │
│                 └─> DuplicateEntityModal                        │
│                      └─> useTreeNodeActions hook                │
│                           └─> Edge Function (duplicar)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar

### 1. `TreeNodeActionsDropdown.tsx`
Componente do dropdown de ações que será adicionado em cada linha da tabela.

**Props:**
- `node: TreeNode` - O nó (campanha, ad set ou ad)
- `clientId: string` - ID do cliente para as operações
- `onRefresh: () => void` - Callback para atualizar a lista após ação

**Funcionalidades:**
- Ícone de três pontinhos (MoreHorizontal)
- Dropdown com opções contextuais baseadas no tipo do nó
- Para a primeira versão: opção "Duplicar"

### 2. `DuplicateEntityModal.tsx`
Modal genérico para duplicar qualquer entidade (campanha, ad set ou ad).

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `entity: { id: string; name: string; type: 'campaign' | 'adset' | 'ad' }`
- `onDuplicate: (newName: string) => Promise<void>`
- `loading: boolean`

**Características:**
- Título dinâmico: "Duplicar Campanha" / "Duplicar Conjunto" / "Duplicar Criativo"
- Mensagem explicativa adaptada ao tipo
- Campo para nome da nova entidade

### 3. `useTreeNodeActions.tsx`
Hook para centralizar as ações de entidades na árvore.

**Funções:**
- `duplicateEntity(type, id, clientId, facebookId, newName, platform)` - Duplicar qualquer entidade

---

## Edge Function: `duplicate-tree-entity`

Nova edge function para duplicar ad sets e ads (campanhas já funcionam via `manage-facebook-campaign`).

**Endpoints da Meta API:**
- **Ad Set**: `POST /{adset-id}/copies` com `deep_copy: true`
- **Ad**: `POST /{ad-account-id}/ads` com creative_id do original

---

## Modificações em Arquivos Existentes

### `TreeGridRow.tsx`
- Adicionar nova coluna no final com o componente `TreeNodeActionsDropdown`
- Passar `node`, `clientId` e `onRefresh` como props

### `MultiCampaignTreeGrid.tsx`
- Adicionar coluna "Ações" no cabeçalho da tabela (após "Investido")
- Passar `clientId` e `onRefresh` para o `TreeGridRow`

---

## Estrutura do Dropdown por Tipo de Entidade

| Tipo | Ações Disponíveis |
|------|-------------------|
| Campanha | Duplicar |
| Conjunto de Anúncios | Duplicar |
| Criativo | Duplicar |

Futuramente podem ser adicionadas mais ações como Renomear, Pausar/Ativar, Editar Orçamento, etc.

---

## Fluxo de Duplicação

1. Usuário clica no ícone ⋮ na linha
2. Seleciona "Duplicar"
3. Modal abre com nome sugerido: "{nome original} - Cópia"
4. Usuário confirma
5. Requisição vai para edge function
6. Meta API processa a duplicação
7. Toast de sucesso
8. Lista é atualizada (onRefresh)

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/campaign-editor/TreeNodeActionsDropdown.tsx` | Dropdown de ações para cada linha |
| `src/components/campaign-editor/DuplicateEntityModal.tsx` | Modal genérico de duplicação |
| `src/hooks/useTreeNodeActions.tsx` | Hook com ações de duplicar |
| `supabase/functions/duplicate-tree-entity/index.ts` | Edge function para duplicar ad sets e ads |

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/campaign-editor/TreeGridRow.tsx` | Adicionar nova coluna com dropdown de ações |
| `src/components/campaign-editor/MultiCampaignTreeGrid.tsx` | Adicionar cabeçalho "Ações" e passar props extras |

---

## Detalhes Técnicos da Duplicação via Meta API

### Duplicar Ad Set
```typescript
POST https://graph.facebook.com/v20.0/{adset-id}/copies
{
  deep_copy: true,
  status: 'ACTIVE',
  access_token: token
}
```

### Duplicar Ad
```typescript
// Primeiro buscar dados do ad original
GET https://graph.facebook.com/v20.0/{ad-id}?fields=name,adset_id,creative

// Depois criar novo ad
POST https://graph.facebook.com/v20.0/{ad-account-id}/ads
{
  name: "Nome - Cópia",
  adset_id: original.adset_id,
  creative: { creative_id: original.creative.id },
  status: 'ACTIVE',
  access_token: token
}
```

---

## Resultado Esperado

Cada linha da tabela de campanhas terá um ícone de menu (⋮) na última coluna. Ao clicar, um dropdown aparece com a opção "Duplicar". Ao selecionar, um modal permite definir o nome da cópia e confirmar a ação.
