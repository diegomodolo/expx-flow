
# Plano: Sincronizar Pixel e Evento de Conversão do Meta

## Objetivo
Implementar a sincronização correta do **Pixel ID** e **Evento de Conversão** tanto para Conjuntos de Anúncios quanto para Criativos, permitindo visualização e edição dessas configurações na interface.

---

## Análise do Problema

### Situação Atual
- O sistema já busca o campo `promoted_object` do Meta para Ad Sets, mas **não extrai** o `pixel_id` e `custom_event_type` dele
- O sistema já busca `tracking_specs` para Ads, mas **não extrai** o pixel configurado
- As tabelas `ad_sets` e `ads` já têm a coluna `pixel_id`, mas não é populada durante a sincronização
- Falta a coluna `conversion_event` na tabela `ad_sets`

### Como o Meta Organiza os Dados
1. **Ad Set (Conjunto de Anúncios)**:
   - Campo `promoted_object` → contém `pixel_id` e `custom_event_type`
   - Exemplo: `{"pixel_id": "123456", "custom_event_type": "PURCHASE"}`

2. **Ad (Criativo)**:
   - Campo `tracking_specs` → array com configuração de rastreamento
   - Exemplo: `[{"action.type": "offsite_conversion", "fb_pixel": ["123456"]}]`

---

## Implementação

### 1. Migração de Banco de Dados
Adicionar coluna `conversion_event` na tabela `ad_sets`:

```sql
ALTER TABLE ad_sets ADD COLUMN conversion_event TEXT;
```

### 2. Atualizar Sincronização de Ad Sets
Modificar `supabase/functions/sync-facebook-campaigns/index.ts`:

**Antes** (linha ~1150-1176):
```javascript
const adSetData = {
  facebook_id: adSet.id,
  // ... outros campos
  optimization_goal: adSet.optimization_goal || '',
  targeting: JSON.stringify(adSet.targeting || {}),
  // ...
}
```

**Depois**:
```javascript
// Extrair pixel e evento do promoted_object
const promotedObject = adSet.promoted_object || {};
const pixelId = promotedObject.pixel_id || null;
const conversionEvent = promotedObject.custom_event_type || null;

const adSetData = {
  facebook_id: adSet.id,
  // ... outros campos
  optimization_goal: adSet.optimization_goal || '',
  targeting: JSON.stringify(adSet.targeting || {}),
  pixel_id: pixelId,
  conversion_event: conversionEvent,
  // ...
}
```

### 3. Atualizar Sincronização de Ads
Modificar a mesma função para extrair pixel do `tracking_specs`:

```javascript
// Extrair pixel do tracking_specs
let adPixelId = null;
if (ad.tracking_specs && Array.isArray(ad.tracking_specs)) {
  const pixelSpec = ad.tracking_specs.find(
    spec => spec['action.type'] === 'offsite_conversion' && spec.fb_pixel
  );
  if (pixelSpec?.fb_pixel) {
    adPixelId = Array.isArray(pixelSpec.fb_pixel) 
      ? pixelSpec.fb_pixel[0] 
      : pixelSpec.fb_pixel;
  }
}

const adData = {
  // ... outros campos
  pixel_id: adPixelId,
}
```

### 4. Atualizar Hook useCampaignTree
Modificar `src/hooks/useCampaignTree.tsx` para incluir os novos campos no TreeNode:

- Adicionar `conversionEvent?: string` na interface `TreeNode`
- Mapear `pixel_id` e `conversion_event` do Ad Set para o TreeNode

### 5. Atualizar Modal de Edição de Ad Set
Modificar `src/components/campaign-editor/AdSetEditModal.tsx`:

- Inicializar `pixelId` e `conversionEvent` a partir dos dados do node (carregados do banco)
- Remover valores hardcoded vazios e usar os valores sincronizados

### 6. Atualizar Modal de Edição de Ad (Criativo)
Modificar `src/components/campaign-editor/AdEditModal.tsx`:

- Mostrar dois campos de Pixel:
  - **Pixel do Conjunto**: Somente leitura, mostrando o pixel herdado do Ad Set
  - **Pixel do Anúncio**: Editável, para configurar pixel específico no criativo
- Inicializar `pixelId` a partir dos dados sincronizados do banco

### 7. Atualizar Edge Function de Atualização de Ad
Modificar `supabase/functions/update-meta-ad/index.ts`:

- Ao salvar pixel do anúncio, atualizar o `tracking_specs` no Meta
- Formato: `tracking_specs=[{"action.type":"offsite_conversion","fb_pixel":["PIXEL_ID"]}]`

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Adicionar coluna `conversion_event` em `ad_sets` |
| `supabase/functions/sync-facebook-campaigns/index.ts` | Extrair `pixel_id`/`conversion_event` de `promoted_object` e `tracking_specs` |
| `src/integrations/supabase/types.ts` | Adicionar tipagem para `conversion_event` |
| `src/hooks/useCampaignTree.tsx` | Adicionar `conversionEvent` e `pixelId` para Ad Sets |
| `src/components/campaign-editor/AdSetEditModal.tsx` | Inicializar campos com dados sincronizados |
| `src/components/campaign-editor/AdEditModal.tsx` | Mostrar pixel do conjunto + pixel do anúncio |
| `supabase/functions/update-meta-ad/index.ts` | Enviar `tracking_specs` ao Meta ao salvar pixel |

---

## Comportamento Final

### No Modal de Conjunto de Anúncios
- **Pixel de Conversão**: Carrega o valor sincronizado do Meta; ao editar, atualiza o `promoted_object.pixel_id`
- **Evento de Conversão**: Carrega o valor sincronizado do Meta; ao editar, atualiza o `promoted_object.custom_event_type`

### No Modal de Criativo (Anúncio)
- **Pixel do Conjunto** (somente leitura): Mostra o pixel herdado do Ad Set pai
- **Pixel do Anúncio** (editável): Mostra o pixel específico do anúncio; ao editar, atualiza apenas o `tracking_specs` do anúncio

---

## Detalhes Técnicos

### Campos da API do Meta Utilizados

**Para Ad Sets:**
```
fields=id,name,status,...,promoted_object
```
- `promoted_object.pixel_id` → salvar em `ad_sets.pixel_id`
- `promoted_object.custom_event_type` → salvar em `ad_sets.conversion_event`

**Para Ads:**
```
fields=id,name,status,...,tracking_specs
```
- `tracking_specs[].fb_pixel` → salvar em `ads.pixel_id`

### Atualização via API (POST)

**Ad Set (promoted_object):**
```javascript
promoted_object: JSON.stringify({
  pixel_id: "123456",
  custom_event_type: "LEAD"
})
```

**Ad (tracking_specs):**
```javascript
tracking_specs: JSON.stringify([
  {
    "action.type": "offsite_conversion",
    "fb_pixel": ["123456"]
  }
])
```
