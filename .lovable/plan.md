
# Plano: Indicador Visual de Sincronização e Botão Sincronizar Individual

## Contexto

Quando um item é duplicado, ele é inserido no banco de dados local mas o campo `last_synced_at` fica como `null`. Isso indica que o item ainda não foi sincronizado completamente com o Meta.

O usuário solicitou:
1. Mostrar visualmente que um item não foi sincronizado (cor apagada, badge, etc.)
2. Bloquear edição enquanto não sincronizado
3. Adicionar botão "Sincronizar" no menu de ações (3 pontinhos)

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TreeNode                                                                    │
│  ├─ Novo campo: needsSync (boolean) - derivado de !last_synced_at           │
│  │                                                                           │
│  TreeGridRow                                                                 │
│  ├─ Nome com opacidade reduzida se needsSync                                 │
│  ├─ Badge "Não sincronizado" ao lado do nome                                 │
│  ├─ Toggle de status DESABILITADO se needsSync                               │
│  ├─ Input de orçamento DESABILITADO se needsSync                             │
│  │                                                                           │
│  TreeNodeActionsDropdown                                                     │
│  ├─ Novo item: "Sincronizar" (RefreshCw icon)                                │
│  │                                                                           │
│  useTreeNodeActions                                                          │
│  └─ Nova função: syncEntity()                                                │
│      └─ Chama sync-facebook-campaigns com parâmetros específicos             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Modificações

### 1. Interface `TreeNode` - Adicionar campo `needsSync`

**Arquivo:** `src/hooks/useCampaignTree.tsx`

Adicionar novo campo opcional à interface:
```typescript
export interface TreeNode {
  // ... campos existentes
  needsSync?: boolean; // true quando last_synced_at é null
}
```

### 2. Hook `useAllCampaignsTree.tsx` - Popular campo `needsSync`

**Arquivo:** `src/hooks/useAllCampaignsTree.tsx`

Ao construir cada nó da árvore, verificar se `last_synced_at` é `null`:
```typescript
// Para campaigns
needsSync: !campaign.last_synced_at,

// Para ad sets
needsSync: !adset.last_synced_at,

// Para ads
needsSync: !ad.last_synced_at,
```

### 3. Componente `TreeGridRow.tsx` - Indicação Visual

**Arquivo:** `src/components/campaign-editor/TreeGridRow.tsx`

Modificações:
- Nome com opacidade reduzida (`opacity-50`) se `needsSync`
- Badge "Aguardando sincronização" com ícone de alerta
- Toggle de status desabilitado se `needsSync`
- Input de orçamento desabilitado se `needsSync`

```typescript
{/* Nome com badge de sincronização */}
<span className={cn(
  "truncate text-sm",
  node.needsSync && "opacity-50"
)}>
  {node.name}
</span>

{node.needsSync && (
  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
    <AlertCircle className="w-3 h-3 mr-1" />
    Não sincronizado
  </Badge>
)}

{/* Status toggle desabilitado */}
<InlineStatusToggle
  disabled={node.platform === "google" || node.needsSync}
  // ...
/>

{/* Budget input desabilitado */}
<InlineBudgetInput
  disabled={node.platform === "google" || node.needsSync}
  // ...
/>
```

### 4. Componente `TreeNodeActionsDropdown.tsx` - Botão Sincronizar

**Arquivo:** `src/components/campaign-editor/TreeNodeActionsDropdown.tsx`

Adicionar novo item no menu dropdown:
```typescript
<DropdownMenuItem onClick={() => handleSync()}>
  <RefreshCw className="h-4 w-4 mr-2" />
  Sincronizar {getEntityLabel()}
</DropdownMenuItem>
```

A opção "Sincronizar" aparece:
- Sempre visível para itens Meta (permitindo sincronização manual a qualquer momento)
- Destacada visualmente quando `needsSync` é true

### 5. Hook `useTreeNodeActions.tsx` - Função de Sincronização

**Arquivo:** `src/hooks/useTreeNodeActions.tsx`

Adicionar nova função `syncEntity`:
```typescript
interface SyncEntityParams {
  type: "campaign" | "adset" | "ad";
  id: string;
  clientId: string;
  facebookId: string;
}

const syncEntity = async (params: SyncEntityParams) => {
  // Chama a edge function sync-facebook-campaigns com parâmetros específicos
  const { data, error } = await supabase.functions.invoke("sync-facebook-campaigns", {
    body: {
      clientId: params.clientId,
      campaignFacebookId: params.facebookId, // Para campanha
      // Para ad set ou ad, precisamos identificar a campanha pai
      syncCampaigns: params.type === "campaign",
      syncAdSets: params.type === "adset" || params.type === "campaign",
      syncAds: params.type === "ad" || params.type === "adset" || params.type === "campaign",
    },
  });
  
  // Atualizar last_synced_at localmente após sucesso
  // Invalidar queries para atualizar UI
};
```

### 6. Edge Function Existente - Já Suporta Sincronização Individual

A edge function `sync-facebook-campaigns` já aceita o parâmetro `campaignFacebookId` para sincronizar apenas uma campanha específica. Para ad sets e ads, a sincronização ocorre como parte da campanha pai.

---

## Fluxo de Sincronização Individual

```text
1. Usuário clica nos 3 pontinhos de um item não sincronizado
2. Seleciona "Sincronizar"
3. Sistema busca o facebook_id do item
4. Para campanhas: chama sync-facebook-campaigns com campaignFacebookId
5. Para ad sets/ads: busca a campanha pai e sincroniza ela
6. Edge function busca dados atualizados do Meta
7. Atualiza last_synced_at no banco
8. Invalida queries do React Query
9. UI atualiza mostrando item sem badge de sincronização
10. Controles de edição são liberados
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useCampaignTree.tsx` | Adicionar campo `needsSync` à interface TreeNode |
| `src/hooks/useAllCampaignsTree.tsx` | Popular `needsSync` baseado em `last_synced_at` |
| `src/components/campaign-editor/TreeGridRow.tsx` | Adicionar indicação visual e desabilitar controles |
| `src/components/campaign-editor/TreeNodeActionsDropdown.tsx` | Adicionar botão "Sincronizar" |
| `src/hooks/useTreeNodeActions.tsx` | Adicionar função `syncEntity` |

---

## Detalhes de Implementação Visual

### Badge "Não sincronizado"
- Cor: Amber/amarelo (indica atenção, não erro)
- Ícone: AlertCircle pequeno
- Texto: "Não sincronizado"
- Posição: Ao lado do nome do item

### Estilo para itens não sincronizados
- Nome com opacidade 50%
- Métricas com opacidade 50%
- Controles (toggle, input) desabilitados visualmente

### Menu de ações
- Opção "Sincronizar" sempre visível para itens Meta
- Ícone: RefreshCw (seta circular)
- Quando clicado, mostra loading state

---

## Resultado Esperado

1. Ao duplicar um item, ele aparece na lista com:
   - Nome levemente apagado (opacity-50)
   - Badge amarelo "Não sincronizado"
   - Toggle de status e input de orçamento desabilitados
   
2. No menu de 3 pontinhos:
   - Opção "Sincronizar [Campanha/Conjunto/Criativo]"
   
3. Ao clicar em Sincronizar:
   - Loading state no botão
   - Sistema busca dados completos do Meta
   - Atualiza `last_synced_at` no banco
   - Remove badge e libera controles de edição
   - Toast de sucesso
