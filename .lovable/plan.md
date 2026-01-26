
# Plano: Inserir Item Duplicado Automaticamente no Banco Local

## Problema Atual
Quando o usuário duplica uma campanha, conjunto ou criativo, a edge function `duplicate-tree-entity` cria o item no Meta, mas não insere no banco de dados local. O usuário precisa clicar em "Sincronizar" para ver a cópia, o que dá a impressão de que nada foi feito.

## Solução
Modificar a edge function para:
1. Após duplicar no Meta, buscar os dados completos do novo item via Meta API
2. Inserir o novo item no banco de dados local (tabelas `campaigns`, `ad_sets` ou `ads`)
3. Retornar os dados inseridos para o frontend
4. O frontend então faz `invalidateAndRefetch()` para atualizar a lista imediatamente

---

## Arquitetura do Fluxo

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Usuário clica em "Duplicar"                                             │
│     ↓                                                                       │
│  2. Edge Function chama Meta API /copies                                    │
│     ↓                                                                       │
│  3. Meta retorna novo ID (ex: copied_campaign_id)                           │
│     ↓                                                                       │
│  4. Edge Function busca dados completos via GET /{novo-id}                  │
│     ↓                                                                       │
│  5. Edge Function insere no banco local (campaigns/ad_sets/ads)             │
│     ↓                                                                       │
│  6. Edge Function retorna { success: true, data: { ... } }                  │
│     ↓                                                                       │
│  7. Frontend faz invalidateAndRefetch() → Lista atualizada imediatamente!   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Modificações na Edge Function

### `supabase/functions/duplicate-tree-entity/index.ts`

Para cada tipo de entidade, após duplicar:

**Campanha:**
1. Buscar dados via `GET /{copied_campaign_id}?fields=id,name,status,daily_budget,objective,...`
2. Inserir na tabela `campaigns` com todos os campos necessários
3. Os ad sets e ads filhos também serão copiados pelo Meta (deep_copy: true), então precisamos buscá-los e inserir no banco também

**Conjunto de Anúncios (Ad Set):**
1. Buscar dados via `GET /{copied_adset_id}?fields=id,name,status,daily_budget,campaign_id,targeting,...`
2. Inserir na tabela `ad_sets`
3. Buscar ads filhos e inserir na tabela `ads`

**Criativo (Ad):**
1. Já temos o novo ID após criar
2. Buscar dados completos via `GET /{new_ad_id}?fields=...`
3. Inserir na tabela `ads`

---

## Campos Necessários para Inserção

### Tabela `campaigns`
| Campo | Origem |
|-------|--------|
| id | UUID gerado |
| facebook_id | copiedId do Meta |
| name | newName |
| client_id | Parâmetro de entrada |
| user_id | Do JWT |
| company_id | Do cliente |
| status | "paused" (padrão de cópia) |
| platforms | "Facebook Ads" |
| daily_budget | Da API Meta |
| objective | Da API Meta |
| ctr, cpc, cpa, spend, etc | 0 (valores iniciais) |

### Tabela `ad_sets`
| Campo | Origem |
|-------|--------|
| id | UUID gerado |
| facebook_id | copiedId do Meta |
| campaign_id | UUID da campanha pai |
| name | Da API Meta |
| client_id | Parâmetro de entrada |
| user_id | Do JWT |
| company_id | Do cliente |
| status | "paused" |
| daily_budget | Da API Meta |
| targeting | Da API Meta (JSON) |

### Tabela `ads`
| Campo | Origem |
|-------|--------|
| id | UUID gerado |
| facebook_id | copiedId do Meta |
| ad_set_id | UUID do ad set pai |
| campaign_id | UUID da campanha pai |
| name | Da API Meta |
| client_id | Parâmetro de entrada |
| user_id | Do JWT |
| company_id | Do cliente |
| status | "paused" |
| creative_body, creative_title, etc | Da API Meta |

---

## Modificações no Hook `useTreeNodeActions.tsx`

Após receber sucesso da edge function:
1. Chamar `invalidateQueries` para as query keys relevantes
2. O React Query vai refazer as queries e a lista será atualizada

```typescript
// Após sucesso
const queryClient = useQueryClient();
await queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta", clientId] });
await queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-adsets", clientId] });
await queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-ads", clientId] });
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/duplicate-tree-entity/index.ts` | Adicionar lógica de buscar dados do Meta e inserir no banco local |
| `src/hooks/useTreeNodeActions.tsx` | Invalidar queries após sucesso para atualizar lista |

---

## Detalhes Técnicos

### Buscar Dados Completos do Meta API

**Campanha:**
```typescript
GET /{campaign_id}?fields=id,name,status,daily_budget,objective,created_time
```

**Ad Set:**
```typescript
GET /{adset_id}?fields=id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal,bid_strategy
```

**Ad:**
```typescript
GET /{ad_id}?fields=id,name,status,adset_id,creative{id,name,body,title,description,image_url,video_id,object_story_spec}
```

### Inserção no Banco

Usar o cliente Supabase já autenticado na edge function:
```typescript
const { data: inserted, error } = await supabaseClient
  .from("campaigns")
  .insert({
    facebook_id: copiedId,
    client_id: clientId,
    user_id: userId,
    company_id: companyId,
    name: newName,
    status: "paused",
    // ... demais campos
  })
  .select()
  .single();
```

---

## Benefícios

1. O item duplicado aparece imediatamente na lista
2. Não precisa de sincronização manual
3. A UX fica muito mais fluida e responsiva
4. Os dados ficam consistentes entre Meta e banco local
