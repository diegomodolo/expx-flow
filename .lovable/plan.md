
# Plano: Corrigir Resolução de Imagens na Sincronização do Meta

## Problema Identificado

Alguns criativos estão sendo salvos com imagens em baixa resolução (64x64 pixels) porque:

1. **Falha no método primário**: A função `fetchFullImageFromStory` falha com status 400 porque usa User Access Token em vez de Page Access Token
2. **Fallback incompleto**: A função `fetchImageFromHash` não está sendo acionada corretamente para todos os casos

### Diferença nas URLs

| Criativo | Resolução | Parâmetro na URL |
|----------|-----------|------------------|
| Criativo 01 | Boa | Sem `stp=...p64x64...` |
| Criativo 03 | Ruim | Com `stp=c0.5000x0.5000f_dst-emg0_p64x64_q75_tt6` |

---

## Solução Proposta

### 1. Modificar a lógica de extração de `image_hash`

Atualmente o código busca `creative.image_hash`, mas o hash também pode estar em `linkData.image_hash` ou `object_story_spec.link_data.image_hash`. Vamos expandir a busca.

### 2. Priorizar busca via `image_hash` antes de usar URL direta

Em vez de usar a URL de thumbnail como fallback inicial, vamos inverter a lógica:
- Primeiro tentar buscar imagem via `image_hash` (sempre retorna alta resolução)
- Se não tiver `image_hash`, tentar via `effective_object_story_id`
- Só usar `image_url` direto como último recurso

### 3. Adicionar logs detalhados para debug

Incluir logs que mostrem:
- Se o `image_hash` foi encontrado e de onde
- O resultado da chamada à API de imagens
- Qual estratégia foi usada no final

---

## Alterações Técnicas

### Arquivo: `supabase/functions/sync-facebook-campaigns/index.ts`

#### Modificação 1: Função `extractMediaUrls`

```typescript
const extractMediaUrls = async (creative: any, objectStory: any) => {
  let imageUrl = ''
  
  // 1. Buscar image_hash de múltiplas fontes possíveis
  const imageHash = creative.image_hash || 
                    linkData?.image_hash || 
                    creative.object_story_spec?.link_data?.image_hash
  
  // 2. PRIMEIRO: tentar buscar via image_hash (melhor qualidade garantida)
  if (imageHash) {
    console.log(`Attempting to fetch high-res image via hash: ${imageHash}`)
    const fullImage = await fetchImageFromHash(imageHash, accountId)
    if (fullImage) {
      imageUrl = fullImage
      console.log('SUCCESS: Using full image from image_hash')
    } else {
      console.log('FAILED: Could not fetch image from hash')
    }
  }
  
  // 3. SEGUNDO: se não conseguiu via hash, tentar via story_id
  if (!imageUrl && creative.effective_object_story_id && !creative.video_id) {
    console.log(`Attempting to fetch image via story_id: ${creative.effective_object_story_id}`)
    const fullPicture = await fetchFullImageFromStory(creative.effective_object_story_id)
    if (fullPicture) {
      imageUrl = fullPicture
      console.log('SUCCESS: Using full_picture from story')
    }
  }
  
  // 4. TERCEIRO: fallback para URLs diretas (podem ser baixa resolução)
  if (!imageUrl) {
    imageUrl = creative.image_url || 
               linkData?.picture || 
               linkData?.image_url || 
               creative.thumbnail_url || 
               ''
    
    // Se a URL ainda contém p64x64, logar warning
    if (imageUrl.includes('p64x64') || imageUrl.includes('p75x75')) {
      console.warn(`WARNING: Using low-res fallback image for ad. Hash: ${imageHash || 'none'}`)
    }
  }
  
  // ... resto do código para vídeo
}
```

#### Modificação 2: Melhorar função `fetchImageFromHash`

Adicionar tratamento de erro mais robusto e logs detalhados:

```typescript
const fetchImageFromHash = async (imageHash: string, accountId: string): Promise<string> => {
  if (!imageHash || !accountId) {
    console.log('fetchImageFromHash: missing imageHash or accountId')
    return ''
  }
  
  try {
    // A API usa o formato act_ACCOUNTID
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`
    const url = `https://graph.facebook.com/v20.0/${formattedAccountId}/adimages?hashes=["${imageHash}"]&fields=url_128,url&access_token=${accessToken}`
    
    console.log(`Fetching image from hash: ${imageHash} for account: ${formattedAccountId}`)
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Failed to fetch image for hash ${imageHash}: status ${response.status}, error: ${errorText}`)
      return ''
    }
    
    const data = await response.json()
    console.log('Image hash API response:', JSON.stringify(data))
    
    const imageData = data.data?.[0]
    const fullUrl = imageData?.url || imageData?.url_128 || ''
    
    console.log(`Image hash result - full URL found: ${fullUrl ? 'yes' : 'no'}`)
    return fullUrl
  } catch (error) {
    console.error(`Error fetching image for hash ${imageHash}:`, error)
    return ''
  }
}
```

---

## Fluxo Após Correção

```text
+------------------+
|  Início do Ad    |
+--------+---------+
         |
         v
+--------+---------+
| Tem image_hash?  |
+--------+---------+
    |           |
   SIM         NÃO
    |           |
    v           |
+--------+      |
| Buscar |      |
| via    |      |
| /adimages      |
+--------+      |
    |           |
    v           v
+--------+---------+
| Conseguiu URL?   |
+--------+---------+
    |           |
   SIM         NÃO
    |           |
    v           v
+--------+  +--------+---------+
| USAR   |  | Tem story_id?   |
| (alta) |  +--------+---------+
+--------+      |           |
               SIM         NÃO
                |           |
                v           v
           +--------+  +--------+
           | Buscar |  | Usar   |
           | via    |  | URL    |
           | story  |  | direta |
           +--------+  +--------+
```

---

## Resultado Esperado

Após a correção e ressincronização:
- **Todos os criativos com `image_hash`** terão imagens em alta resolução
- O sistema priorizará sempre a fonte de maior qualidade
- Logs detalhados permitirão identificar casos problemáticos

---

## Próximos Passos

1. Implementar as alterações na Edge Function
2. Fazer deploy da função atualizada
3. Ressincronizar a campanha clicando em "Atualizar"
4. Verificar se as imagens estão em alta resolução
