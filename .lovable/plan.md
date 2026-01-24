
# Plano: Sincronizar Conversões de Ad Sets e Ads do Meta

## Problema Identificado

A sincronização atual com o Meta está **intencionalmente zerando** as conversões dos conjuntos de anúncios e criativos para evitar duplicação nos totais dos dashboards. O código atual faz:

```typescript
// Ad Sets (linha 1142)
adSetLeads = 0  // Salva 0 mesmo tendo contado conversões

// Ads (linha 1303)
adLeads = 0  // Não conta nem salva conversões
```

Isso impede que você veja quais conjuntos e criativos estão performando melhor na tela do Tree Grid.

---

## Solução Proposta

Salvar as conversões reais nos ad sets e ads **sem alterar nenhum dashboard existente**. Os dashboards continuarão usando conversões de campanhas como fonte de verdade para totais.

---

## Alterações na Edge Function

**Arquivo:** `supabase/functions/sync-facebook-campaigns/index.ts`

### 1. Ad Sets - Salvar conversões reais

**De (linha ~1138-1143):**
```typescript
const adSetCounted = countConversionsFromActions(adSetCombinedMetrics, campaign.objective, ...)
campaignChildLeads += adSetCounted
adSetLeads = 0  // ❌ Zera as conversões
```

**Para:**
```typescript
const adSetCounted = countConversionsFromActions(adSetCombinedMetrics, campaign.objective, ...)
campaignChildLeads += adSetCounted
adSetLeads = adSetCounted  // ✅ Salva as conversões reais
```

### 2. Ads - Contar e salvar conversões

**De (linha ~1301-1304):**
```typescript
adLeads = 0
console.log('Ad conversions set to 0 (counted at campaign level)', ad.name)
```

**Para:**
```typescript
// Contar conversões do ad
const adCombinedMetrics = [
  ...(Array.isArray(adInsights.actions) ? adInsights.actions : []),
  ...(Array.isArray((adInsights as any).conversions) ? (adInsights as any).conversions : [])
]
adLeads = countConversionsFromActions(adCombinedMetrics, campaign.objective, `${campaign.name} → ${adSet.name} → ${ad.name}`)
console.log('Ad conversions counted:', ad.name, adLeads)
```

---

## O Que NÃO Será Alterado

| Componente | Status |
|------------|--------|
| Dashboard principal de clientes | Sem alteração (usa conversões de campanha) |
| Alertas de CPA | Sem alteração (usa conversões de campanha) |
| Relatórios WhatsApp | Sem alteração (usa conversões de campanha) |
| Cálculo de totais | Sem alteração (soma de campanhas) |
| KPIs agregados | Sem alteração |

---

## Resultado Esperado

Após a sincronização, a tela do Tree Grid mostrará:

```text
▼ Campanha Principal    | Conv: 157 | CPA: R$ 8,91  ← Total da campanha
  ▼ Ad Set 1            | Conv: 125 | CPA: R$ 4,10  ← Conversões do conjunto
    ○ Anúncio A         | Conv: 80  | CPA: R$ 3,50  ← Conversões do criativo
    ○ Anúncio B         | Conv: 45  | CPA: R$ 5,20  ← Conversões do criativo
  ▼ Ad Set 2            | Conv: 11  | CPA: R$ 27,53 ← Conversões do conjunto
    ○ Anúncio C         | Conv: 11  | CPA: R$ 27,53
```

---

## Nota Importante

A **soma das conversões dos ads** pode ser ligeiramente diferente da campanha devido a:
- Janelas de atribuição diferentes
- Conversões cross-device
- Modelos de atribuição do Meta

Isso é normal e esperado. A campanha é sempre a fonte de verdade para totais.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/sync-facebook-campaigns/index.ts` | Salvar conversões reais em ad sets e ads |

---

## Ordem de Implementação

1. Modificar lógica de ad sets para salvar `adSetCounted` ao invés de 0
2. Adicionar contagem de conversões para ads usando `countConversionsFromActions`
3. Atualizar CPA dos ads com base nas conversões reais
4. Deploy da edge function
5. Testar sincronização de uma campanha específica
