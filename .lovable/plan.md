
# Plano: Correção do Flash e Dados Desatualizados no Salvamento

## Problema Identificado

Ao salvar alterações em um conjunto de anúncios:
1. **Flash visual**: O refetch de 6 queries simultâneas causa re-renderização massiva
2. **Dados antigos**: O React Query retorna dados do cache antes das queries completarem

## Análise do Fluxo Atual

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuário edita nome e clica "Salvar"                         │
│  2. Edge function atualiza Meta + banco local                   │
│  3. Modal de progresso fecha                                    │
│  4. onSuccess() é chamado → refetchCampaigns()                  │
│  5. 6 queries são disparadas simultaneamente                    │
│  6. React Query retorna dados do cache (stale) primeiro         │
│  7. Tela pisca com dados antigos                                │
│  8. Dados novos eventualmente chegam                            │
└─────────────────────────────────────────────────────────────────┘
```

## Solução Proposta

### Estratégia: Atualização Otimista + Invalidação Correta

Em vez de apenas fazer refetch, vamos:
1. **Invalidar o cache** corretamente para forçar nova busca
2. **Aguardar** a invalidação completar antes de fechar o modal
3. **Usar invalidateQueries** em vez de refetch para garantir dados frescos

---

## Implementação

### Arquivo 1: `src/hooks/useAllCampaignsTree.tsx`

Modificar o hook para expor função de invalidação que aguarda a conclusão:

```typescript
import { useQueryClient } from "@tanstack/react-query";

export function useAllCampaignsTree(options) {
  const queryClient = useQueryClient();
  // ... código existente ...

  // Nova função que invalida e aguarda
  const invalidateAndRefetch = async () => {
    // Invalida todas as queries relacionadas
    await queryClient.invalidateQueries({
      queryKey: ["all-campaigns-tree-meta", clientId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["all-campaigns-tree-meta-adsets", clientId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["all-campaigns-tree-meta-ads", clientId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["all-campaigns-tree-google", clientId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["all-campaigns-tree-google-adgroups", clientId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["all-campaigns-tree-google-ads", clientId],
    });
  };

  return {
    campaigns,
    isLoading,
    totalMetrics,
    targets,
    refetch, // manter para compatibilidade
    invalidateAndRefetch, // nova função async
  };
}
```

### Arquivo 2: `src/pages/cliente/ClienteCampanhas.tsx`

Usar a nova função de invalidação:

```typescript
const { 
  campaigns: allCampaigns, 
  isLoading, 
  totalMetrics, 
  targets,
  refetch: refetchCampaigns,
  invalidateAndRefetch, // nova função
} = useAllCampaignsTree({ ... });

// No UnifiedCampaignModal
<UnifiedCampaignModal
  ...
  onSuccess={async () => {
    await invalidateAndRefetch(); // aguarda invalidação
    refetchClient?.();
  }}
/>
```

### Arquivo 3: `src/hooks/useSaveWithProgress.tsx`

Garantir que o callback de sucesso seja async e aguardado:

```typescript
const execute = useCallback(async (
  metaAction: () => Promise<any>,
  onSuccess?: () => Promise<void> | void // aceitar Promise
): Promise<boolean> => {
  // ...
  
  // Etapa 3: Sincronizando - AGUARDAR a invalidação
  updateStep('syncing', 'active');
  
  if (onSuccess) {
    await onSuccess(); // aguardar a promise
  }
  
  updateStep('syncing', 'complete');
  // ...
}, []);
```

### Arquivo 4: Componentes de Edição

Garantir que o onSuccess é passado corretamente:

```typescript
// AdSetEditContent.tsx
const success = await saveProgress.execute(metaAction, async () => {
  setHasChanges(false);
  if (onSuccess) {
    await onSuccess(); // propagar a promise
  }
});
```

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuário edita nome e clica "Salvar"                         │
│  2. Modal de progresso abre                                     │
│  3. Edge function atualiza Meta + banco local                   │
│  4. Etapa "Sincronizando" - invalidateAndRefetch() é chamado    │
│  5. Todas as queries são invalidadas e refrescadas              │
│  6. AGUARDA até os dados novos estarem disponíveis              │
│  7. Etapa "Concluído" - dados já estão corretos                 │
│  8. Modal fecha                                                 │
│  9. Tela já mostra dados atualizados SEM flash                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAllCampaignsTree.tsx` | Adicionar função `invalidateAndRefetch` que usa `queryClient.invalidateQueries` |
| `src/pages/cliente/ClienteCampanhas.tsx` | Usar `invalidateAndRefetch` em vez de `refetch` no `onSuccess` |
| `src/hooks/useSaveWithProgress.tsx` | Garantir que `onSuccess` é `await`ed corretamente |
| `src/components/campaign-editor/AdSetEditContent.tsx` | Propagar a promise do onSuccess |
| `src/components/campaign-editor/CampaignEditContent.tsx` | Propagar a promise do onSuccess |
| `src/components/campaign-editor/AdEditContent.tsx` | Propagar a promise do onSuccess |

---

## Benefícios

- Dados sempre atualizados ao fechar o modal
- Sem flash visual na tela
- Sincronização real com o banco antes de mostrar "Concluído"
- Feedback visual preciso do que está acontecendo
