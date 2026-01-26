
# Plano: Correção da Sincronização de Campanhas Meta

## Problemas Identificados

Ao sincronizar campanhas do Meta, o usuário reportou 3 problemas:

1. **Progresso sempre em 0%**: O campo `progress` na tabela `sync_jobs` nunca é atualizado durante a sincronização porque a função `updateJobProgress` existe mas nunca é chamada
2. **Campanhas somem durante sincronização**: A edge function deleta TODOS os dados antes de inserir novamente, causando flash visual na UI
3. **Campanhas excluídas no Meta desaparecem**: Quando uma campanha é excluída no Meta, ela é simplesmente removida do banco sem histórico

---

## Solução Proposta

### Parte 1: Atualização do Progresso em Tempo Real

Modificar a edge function para chamar `updateJobProgress` durante cada etapa do processamento.

**Arquivo**: `supabase/functions/sync-facebook-campaigns/index.ts`

```text
┌─────────────────────────────────────────────────────────────────┐
│  FLUXO COM PROGRESSO                                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Buscar campanhas do Meta                                    │
│     → updateJobProgress({ campaigns: { total: N, current: 0 }}) │
│  2. Para cada campanha:                                         │
│     → updateJobProgress({ campaigns: { current: i+1 }})         │
│  3. Para cada ad set:                                           │
│     → updateJobProgress({ adsets: { current: j+1 }})            │
│  4. Para cada ad:                                               │
│     → updateJobProgress({ ads: { current: k+1 }})               │
└─────────────────────────────────────────────────────────────────┘
```

### Parte 2: Eliminar Delete + Reinsert (Upsert Strategy)

Substituir a lógica de "deletar tudo e reinserir" por uma estratégia de **upsert + soft delete**:

**Fluxo Atual (problemático):**
```text
1. DELETE FROM campaigns WHERE client_id = X
2. DELETE FROM ad_sets WHERE client_id = X  
3. DELETE FROM ads WHERE client_id = X
4. INSERT novos dados
→ UI fica vazia durante processamento
```

**Fluxo Proposto:**
```text
1. Marcar todas as campanhas com sync_batch_id = novo UUID
2. Para cada campanha do Meta:
   - UPSERT (insert ou update se já existe)
   - Atualizar sync_batch_id para o novo
3. Após processamento:
   - Campanhas com sync_batch_id antigo = não existem mais no Meta
   - Marcar como status = 'deleted' ao invés de deletar
→ UI mantém dados visíveis durante todo o processo
```

### Parte 3: Adicionar Status "Excluída" (deleted)

Adicionar um novo valor ao enum `campaign_status` para preservar histórico.

**Migration SQL:**
```sql
-- Adicionar 'deleted' ao enum campaign_status
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'deleted';

-- Adicionar campo para controle de sincronização
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Campos similares para ad_sets e ads
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE ads ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
```

---

## Implementação Detalhada

### Arquivo 1: Edge Function `sync-facebook-campaigns/index.ts`

**Mudanças principais:**

1. Remover blocos DELETE que limpam dados antes da sincronização
2. Usar UPSERT em vez de INSERT para todas as entidades
3. Adicionar campo `last_synced_at` em cada upsert
4. Após processar tudo, marcar itens não sincronizados como `deleted`
5. Chamar `updateJobProgress` em cada iteração

```typescript
// Exemplo de progresso durante processamento
const totalCampaigns = campaigns.length;
await updateJobProgress(supabase, jobId, {
  campaigns: { current: 0, total: totalCampaigns },
  adsets: { current: 0, total: 0 },
  ads: { current: 0, total: 0 },
  current_entity: 'Iniciando...'
});

for (let i = 0; i < campaigns.length; i++) {
  const campaign = campaigns[i];
  
  await updateJobProgress(supabase, jobId, {
    campaigns: { current: i + 1, total: totalCampaigns },
    adsets: { current: 0, total: 0 },
    ads: { current: 0, total: 0 },
    current_entity: campaign.name
  });
  
  // ... processar campanha com UPSERT ...
}

// Após processar tudo, marcar como deleted os que não foram sincronizados
const syncTimestamp = new Date().toISOString();
await supabase
  .from('campaigns')
  .update({ status: 'deleted', deleted_at: syncTimestamp })
  .eq('client_id', clientId)
  .lt('last_synced_at', syncTimestamp)
  .neq('status', 'deleted');
```

### Arquivo 2: Hook `useAllCampaignsTree.tsx`

Filtrar campanhas com status `deleted` na query:

```typescript
// Na query de campanhas, excluir as deletadas
.neq('status', 'deleted')
```

### Arquivo 3: Hook `useSyncJobStatus.tsx`

Adicionar realtime subscription para progresso mais fluido:

```typescript
// Usar channel subscription para atualização instantânea
const channel = supabase
  .channel(`sync-job-${jobId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'sync_jobs',
    filter: `id=eq.${jobId}`
  }, (payload) => {
    setJob(payload.new as SyncJob);
  })
  .subscribe();
```

### Arquivo 4: UI de Progresso na Página de Campanhas

Adicionar indicador visual de progresso durante sincronização:

```typescript
// Em ClienteCampanhas.tsx
const { job, progressPercentage, isProcessing } = useSyncJobStatus(currentJobId);

// Mostrar barra de progresso quando sincronizando
{isProcessing && (
  <div className="flex items-center gap-2">
    <Progress value={progressPercentage} className="w-32 h-2" />
    <span className="text-sm text-muted-foreground">
      {progressPercentage}% - {job?.progress?.current_entity || 'Processando...'}
    </span>
  </div>
)}
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/sync-facebook-campaigns/index.ts` | Remover DELETEs, usar UPSERT, adicionar updateJobProgress, marcar como deleted |
| `src/hooks/useAllCampaignsTree.tsx` | Filtrar status = 'deleted' das queries |
| `src/hooks/useSyncJobStatus.tsx` | Adicionar realtime subscription para progresso |
| `src/pages/cliente/ClienteCampanhas.tsx` | Guardar jobId e mostrar progresso visual |
| Migration SQL | Adicionar 'deleted' ao enum e campos last_synced_at/deleted_at |

---

## Benefícios

- **Progresso visível**: Usuário vê exatamente o que está sendo sincronizado
- **Sem flash na UI**: Dados permanecem visíveis durante sincronização
- **Histórico preservado**: Campanhas excluídas no Meta ficam marcadas como 'deleted' em vez de desaparecer
- **Dados sempre atualizados**: UPSERT garante que os dados mais recentes são refletidos
- **Auditoria**: Campo `deleted_at` permite rastrear quando campanha foi removida do Meta
