
# Plano: Exibir Vídeos do Meta no Modal de Edição

## Problema Identificado

Quando um criativo de vídeo é sincronizado do Meta, a URL salva é:
```
https://www.facebook.com/4016411271904854
```

Isso é apenas uma **página web do Facebook**, não uma URL de vídeo reproduzível. Por isso, o player de vídeo não consegue carregar o conteúdo.

---

## Causa Raiz

No arquivo `sync-facebook-campaigns/index.ts`, linhas 1269-1271:

```typescript
const videoUrl = creative.video_id 
  ? `https://www.facebook.com/${creative.video_id}` 
  : (linkData.video_id ? `https://www.facebook.com/${linkData.video_id}` : '')
```

Esta lógica apenas monta uma URL de página, não busca a URL real do vídeo.

---

## Solução

Quando um `video_id` é detectado, fazer uma chamada adicional à API do Meta para obter a **URL real do vídeo** (campo `source`):

```
GET https://graph.facebook.com/v20.0/{video_id}?fields=source,picture&access_token=...
```

Resposta esperada:
```json
{
  "source": "https://video.xx.fbcdn.net/.../video.mp4",
  "picture": "https://scontent.xx.fbcdn.net/.../thumbnail.jpg",
  "id": "4016411271904854"
}
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/sync-facebook-campaigns/index.ts` | Adicionar chamada para buscar URL real do vídeo |

---

## Detalhes Técnicos

### 1. Criar função helper para buscar URL do vídeo

Adicionar função que recebe o `video_id` e `accessToken`, e retorna a `source` URL:

```typescript
async function fetchVideoSourceUrl(videoId: string, accessToken: string): Promise<{ sourceUrl: string; thumbnailUrl: string }> {
  try {
    const url = `https://graph.facebook.com/v20.0/${videoId}?fields=source,picture&access_token=${accessToken}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`Failed to fetch video source for ${videoId}:`, response.status);
      return { sourceUrl: '', thumbnailUrl: '' };
    }
    
    const data = await response.json();
    return {
      sourceUrl: data.source || '',
      thumbnailUrl: data.picture || ''
    };
  } catch (error) {
    console.error(`Error fetching video source for ${videoId}:`, error);
    return { sourceUrl: '', thumbnailUrl: '' };
  }
}
```

### 2. Modificar extração de mídia

Atualizar a função `extractMediaUrls` para usar a nova função:

```typescript
const extractMediaUrls = async (creative: any, objectStory: any, accessToken: string) => {
  const imageUrl = creative.image_url || 
                   linkData.picture || 
                   linkData.image_url || 
                   creative.thumbnail_url || 
                   '';
  
  let videoUrl = '';
  let thumbnailUrl = '';
  
  // Get video_id from multiple possible locations
  const videoId = creative.video_id || linkData.video_id || objectStory.video_data?.video_id;
  
  if (videoId) {
    console.log(`Fetching video source URL for video_id: ${videoId}`);
    const videoData = await fetchVideoSourceUrl(videoId, accessToken);
    videoUrl = videoData.sourceUrl;
    thumbnailUrl = videoData.thumbnailUrl || creative.thumbnail_url || '';
  }
  
  console.log('Extracted URLs - Image:', imageUrl, 'Video:', videoUrl);
  return { imageUrl: imageUrl || thumbnailUrl, videoUrl };
}
```

### 3. Tornar a chamada assíncrona

Como a função agora é `async`, ajustar a chamada:

```typescript
const { imageUrl, videoUrl } = await extractMediaUrls(creative, objectStory, accessToken);
```

---

## Considerações de Performance

A chamada adicional à API do Meta para cada vídeo pode aumentar o tempo de sincronização. Para mitigar:

1. **Apenas para vídeos**: A chamada só acontece quando `video_id` está presente
2. **Processamento sequencial**: Vídeos são processados um por vez dentro do loop existente
3. **Fallback gracioso**: Se a chamada falhar, continua sem o vídeo (não quebra a sincronização)

---

## Resultado Esperado

Após a sincronização:

| Antes | Depois |
|-------|--------|
| `https://www.facebook.com/4016411271904854` | `https://video.xx.fbcdn.net/.../video.mp4` |

O vídeo será exibido corretamente no modal de edição usando o player HTML5 nativo.

---

## Limitações

- As URLs `source` do Meta podem expirar após algumas horas/dias
- Se a URL expirar, será necessário re-sincronizar para obter uma nova URL válida
- Vídeos muito antigos podem não ter a URL disponível

---

## Passos de Implementação

1. Adicionar função `fetchVideoSourceUrl` no edge function
2. Modificar `extractMediaUrls` para ser assíncrona
3. Atualizar a chamada para usar `await`
4. Deploy e testar com sincronização
