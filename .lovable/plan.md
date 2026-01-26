
# Plano: Sincronização Automática e Estado "Sincronizando..." Após Duplicação

## Problema Identificado

Após analisar o código, identifiquei que:

1. **Duplicação funciona corretamente**: A edge function insere o item no banco local com `last_synced_at = null`
2. **Badge "Não sincronizado" aparece**: O campo `needsSync` detecta corretamente itens não sincronizados
3. **Sincronização manual existe mas badge persiste**: O sistema sincroniza mas parece que o campo `last_synced_at` não está sendo atualizado na UI após sincronização
4. **Falta sincronização automática**: Após duplicar, não há tentativa automática de sincronizar

## Solução Proposta

### Fluxo Completo

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 1. Usuário clica "Duplicar"                                          │
│    ↓                                                                 │
│ 2. Edge Function cria no Meta + insere no banco (last_synced_at=null)│
│    ↓                                                                 │
│ 3. Frontend recebe sucesso, item aparece com badge "Não sincronizado"│
│    ↓                                                                 │
│ 4. AGUARDA 10 SEGUNDOS (para Meta processar deep_copy)              │
│    ↓                                                                 │
│ 5. Item muda para "Sincronizando..." (badge azul, loading spinner)  │
│    ↓                                                                 │
│ 6. Tenta sincronizar (tentativa 1/3)                                │
│    ├─ Sucesso? → Atualiza last_synced_at, badge desaparece          │
│    └─ Falhou? → Aguarda 5 segundos, tenta novamente                 │
│        ├─ Tentativa 2/3 → Aguarda 5 segundos                        │
│        └─ Tentativa 3/3 → Se falhar, mantém "Não sincronizado"      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Arquitetura da Mudança

### 1. Adicionar Campo `isSyncing` ao TreeNode

**Interface:** `src/hooks/useCampaignTree.tsx`

```typescript
export interface TreeNode {
  // ... campos existentes
  needsSync?: boolean;      // true quando last_synced_at é null
  isSyncing?: boolean;      // NEW: true durante sincronização automática
}
```

### 2. Estado Global de Sincronização

**Hook:** `src/hooks/useTreeNodeActions.tsx`

Precisamos de um estado que rastreie quais itens estão sendo sincronizados automaticamente:

```typescript
const [syncingItems, setSyncingItems] = useState<Set<string>>(new Set());
```

Este estado será usado para marcar `isSyncing: true` nos itens correspondentes na árvore.

### 3. Lógica de Auto-Sincronização com Retry

**Hook:** `src/hooks/useTreeNodeActions.tsx`

Modificar `duplicateEntity` para incluir:

```typescript
const duplicateEntity = async (params: DuplicateEntityParams) => {
  // ... lógica de duplicação existente ...
  
  if (data?.success) {
    toast.success("Duplicado com sucesso!");
    await queryClient.invalidateQueries(...);
    
    // NOVA LÓGICA: Auto-sincronização após delay
    const newEntityFacebookId = data.data.copiedId;
    const newEntityId = data.data.insertedCampaign?.id || 
                       data.data.insertedAdSet?.id || 
                       data.data.insertedAd?.id;
    
    if (newEntityFacebookId && newEntityId) {
      // Marcar como sincronizando
      setSyncingItems(prev => new Set(prev).add(newEntityId));
      
      // Aguardar 10 segundos para o Meta processar deep_copy
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Tentar sincronizar (até 3 tentativas)
      const maxAttempts = 3;
      let attempt = 0;
      let success = false;
      
      while (attempt < maxAttempts && !success) {
        attempt++;
        console.log(`Auto-sync attempt ${attempt}/${maxAttempts}`);
        
        try {
          const syncResult = await syncEntity({
            type: params.type,
            id: newEntityId,
            clientId: params.clientId,
            facebookId: newEntityFacebookId,
          });
          
          success = syncResult;
          
          if (!success && attempt < maxAttempts) {
            // Aguardar 5 segundos antes de próxima tentativa
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (error) {
          console.error(`Auto-sync attempt ${attempt} failed:`, error);
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      // Remover do estado de sincronização
      setSyncingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(newEntityId);
        return newSet;
      });
      
      if (!success) {
        toast.warning("Sincronização automática falhou. Clique em 'Sincronizar' manualmente.");
      }
    }
  }
};
```

### 4. Modificar `syncEntity` para Retornar Sucesso

**Hook:** `src/hooks/useTreeNodeActions.tsx`

```typescript
const syncEntity = async (params: SyncEntityParams): Promise<boolean> => {
  // ... lógica existente ...
  
  // Retornar true se sucesso, false se falhou
  return success; // do pollJob()
};
```

### 5. Propagar `syncingItems` para a Árvore

**Hook:** `src/hooks/useAllCampaignsTree.tsx`

Precisamos aceitar `syncingItems` como parâmetro e marcar os itens correspondentes:

```typescript
export interface UseAllCampaignsTreeOptions {
  clientId?: string;
  companyId?: string;
  platform?: "meta" | "google" | "all";
  includeInactive?: boolean;
  syncingItems?: Set<string>; // NEW
}

// Ao construir cada TreeNode:
const campaignNode: TreeNode = {
  // ... campos existentes
  needsSync: !campaign.last_synced_at,
  isSyncing: syncingItems?.has(campaign.id), // NEW
};
```

### 6. UI: Mostrar Estado "Sincronizando..."

**Componente:** `src/components/campaign-editor/TreeGridRow.tsx`

```typescript
{/* Sync/syncing badge */}
{node.isSyncing ? (
  <Badge 
    variant="outline" 
    className="ml-2 text-xs text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-400 shrink-0"
  >
    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
    Sincronizando...
  </Badge>
) : node.needsSync ? (
  <Badge 
    variant="outline" 
    className="ml-2 text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400 shrink-0"
  >
    <AlertCircle className="w-3 h-3 mr-1" />
    Não sincronizado
  </Badge>
) : null}
```

---

## Problema da Persistência do Badge

Após investigar o código, identifiquei que a sincronização pode estar falhando em atualizar o `last_synced_at`. Vou verificar a edge function `sync-facebook-campaigns`:

### Possível Causa

A edge function `sync-facebook-campaigns` pode não estar atualizando o campo `last_synced_at` dos itens sincronizados. Precisamos garantir que:

1. Ao sincronizar uma campanha, o campo `campaigns.last_synced_at` seja atualizado
2. Ao sincronizar ad sets, o campo `ad_sets.last_synced_at` seja atualizado
3. Ao sincronizar ads, o campo `ads.last_synced_at` seja atualizado

**Nota:** Preciso verificar o código da edge function `sync-facebook-campaigns` para confirmar se ela está atualizando `last_synced_at`. Se não estiver, essa será a causa raiz do badge persistente.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useCampaignTree.tsx` | Adicionar campo `isSyncing?: boolean` na interface TreeNode |
| `src/hooks/useAllCampaignsTree.tsx` | Aceitar `syncingItems` e popular `isSyncing` nos nós |
| `src/hooks/useTreeNodeActions.tsx` | Adicionar lógica de auto-sincronização com retry após duplicar |
| `src/components/campaign-editor/TreeGridRow.tsx` | Mostrar badge "Sincronizando..." quando `isSyncing` |
| `src/components/campaign-editor/TreeNodeActionsDropdown.tsx` | Passar `syncingItems` do contexto |
| `supabase/functions/sync-facebook-campaigns/index.ts` | **VERIFICAR**: Garantir que atualiza `last_synced_at` |

---

## Fluxo de Comunicação Entre Componentes

```text
┌─────────────────────────────────────────────────────────────┐
│ MultiCampaignTreeGrid (página principal)                    │
│ ├─ Gerencia estado syncingItems: Set<string>                │
│ ├─ Passa para useAllCampaignsTree(syncingItems)             │
│ └─ Passa para TreeNodeActionsDropdown(setSyncingItems)      │
└─────────────────────────────────────────────────────────────┘
         │                                  │
         ▼                                  ▼
┌─────────────────────┐          ┌──────────────────────┐
│ useAllCampaignsTree │          │ useTreeNodeActions   │
│ ├─ Marca isSyncing  │          │ ├─ duplicateEntity   │
│ └─ nos TreeNodes    │          │ └─ Auto-sincroniza   │
└─────────────────────┘          └──────────────────────┘
         │
         ▼
┌─────────────────────┐
│ TreeGridRow         │
│ └─ Badge dinâmico   │
│    ├─ Sincronizando │
│    └─ Não sincroniz │
└─────────────────────┘
```

---

## Ponto Crítico: Timing da Auto-Sincronização

Por que aguardar 10 segundos antes de sincronizar?

**Problema:** Quando duplicamos uma campanha com `deep_copy: true`, o Meta API:
1. Retorna imediatamente o ID da campanha copiada
2. Mas continua processando ad sets e ads em background
3. Se sincronizarmos muito cedo, os filhos podem não estar prontos

**Solução:** 
- Aguardar 10 segundos após duplicar
- Fazer 3 tentativas com 5 segundos entre cada
- Total: até 30 segundos de espera (10 inicial + 3x5 entre tentativas)

Isso garante alta taxa de sucesso sem travar a UI.

---

## Melhorias de UX

1. **Badge Azul "Sincronizando..."**
   - Cor azul (não amarela) para indicar processo ativo
   - Spinner animado para feedback visual
   - Texto claro do que está acontecendo

2. **Controles Desabilitados Durante Sincronização**
   ```typescript
   disabled={node.platform === "google" || node.needsSync || node.isSyncing}
   ```

3. **Toast Informativo**
   - "Duplicado com sucesso! Sincronizando automaticamente..."
   - "Sincronizado com sucesso!"
   - "Sincronização automática falhou. Clique em 'Sincronizar' manualmente."

---

## Edge Cases e Tratamento de Erros

1. **Usuário fecha a página durante auto-sync**
   - Estado `syncingItems` se perde
   - Item fica com `needsSync: true`
   - Solução: Usuário clica em "Sincronizar" manualmente

2. **Meta API indisponível**
   - Retry com backoff exponencial
   - Após 3 tentativas, mostra warning
   - Item permanece não sincronizado

3. **Múltiplas duplicações simultâneas**
   - Cada item tem seu próprio ID em `syncingItems`
   - Sincronizações ocorrem em paralelo
   - Cada uma com seu próprio retry logic

---

## Performance e Otimização

**Preocupação:** Auto-sincronização consome recursos da API do Meta.

**Mitigação:**
- Apenas sincroniza o item duplicado (não toda a conta)
- Usa `campaignFacebookId` específico para sincronizar apenas aquela campanha
- Retry máximo de 3 tentativas evita loops infinitos
- Polling do sync_job é eficiente (max 15 tentativas x 2s = 30s)

---

## Testabilidade

Para testar a implementação:

1. **Duplicar Campanha**
   - Verificar badge "Não sincronizado" aparece imediatamente
   - Após 10s, verificar badge muda para "Sincronizando..."
   - Após sincronização, verificar badge desaparece

2. **Duplicar Ad Set**
   - Mesmo comportamento, mas sincroniza via campanha pai

3. **Duplicar Ad**
   - Mesmo comportamento, sincroniza via campanha pai

4. **Sincronização Manual**
   - Clicar no menu de ações → Sincronizar
   - Verificar badge muda para "Sincronizando..."
   - Verificar badge desaparece após sucesso

---

## Próximos Passos Após Aprovação

1. **Verificar edge function `sync-facebook-campaigns`**
   - Confirmar que atualiza `last_synced_at`
   - Se não atualizar, adicionar essa lógica

2. **Implementar mudanças na ordem:**
   - Interface TreeNode (`isSyncing`)
   - Hook useTreeNodeActions (auto-sync logic)
   - Hook useAllCampaignsTree (propagar `syncingItems`)
   - Componente TreeGridRow (badge dinâmico)
   - Componente MultiCampaignTreeGrid (gerenciar estado)

3. **Testar fluxo completo**
   - Duplicação + Auto-sync
   - Retry logic
   - UI feedback

