

## Plano: Integrar Shotstack para Substituir Modal.com no Pipeline de Clipes Virais

### Resumo

Substituir o serviço externo Modal.com (que nunca respondeu) pelo Shotstack, usando a **Ingest API** para transcrever o video e a **Edit API** para cortar os clipes. O fluxo usara a OpenAI (ja configurada) para analisar a transcricao e identificar os melhores momentos virais.

---

### Novo Fluxo de Processamento

```text
+------------------+     +-------------------+     +------------------+
| 1. create-clip-  |     | 2. shotstack-     |     | 3. shotstack-    |
|    job            |---->|    webhook         |---->|    webhook       |
| (cria job +       |     | (recebe VTT,       |     | (recebe clips    |
|  envia p/ Ingest) |     |  analisa c/ OpenAI,|     |  renderizados,   |
|                   |     |  envia p/ Edit API)|     |  salva no DB)    |
+------------------+     +-------------------+     +------------------+
```

1. **create-clip-job** (modificada): Cria o job no DB e envia o video para a Shotstack Ingest API com transcricao VTT + callback
2. **shotstack-webhook** (nova): Recebe callbacks da Ingest (transcricao pronta) e Edit API (clips renderizados). Quando a transcricao chega, usa OpenAI para analisar e envia os cortes para a Edit API. Quando os renders chegam, salva os clipes no banco.

---

### Etapas de Implementacao

#### Etapa 1: Configurar Secret
- Adicionar `SHOTSTACK_API_KEY` como secret do projeto (necessario para autenticacao nas APIs)

#### Etapa 2: Criar Edge Function `shotstack-webhook`
Nova edge function que:
- Recebe POST de callback do Shotstack (tipo `ingest` ou `edit`)
- **Quando tipo = ingest** (transcricao pronta):
  - Busca o VTT da URL retornada
  - Envia a transcricao para OpenAI pedindo os N melhores momentos virais (com start/end seconds, titulo, tipo, score, justificativa)
  - Para cada momento identificado, envia um render para a Edit API (trim do video original com start/length)
  - Atualiza progresso do job no DB
- **Quando tipo = edit** (clip renderizado):
  - Salva o clip na tabela `clips` com a URL publica, titulo, score, etc.
  - Quando todos os clips de um job estiverem prontos, marca o job como `done`
- Configurar `verify_jwt = false` no config.toml (webhook publico, validado por secret no body/header)

#### Etapa 3: Modificar Edge Function `create-clip-job`
- Remover a chamada ao `PROCESSING_SERVICE_URL` (Modal.com)
- Adicionar logica para enviar o video para a **Shotstack Ingest API**:
  - Se `inputUrl` fornecido: POST para `https://api.shotstack.io/ingest/v1/sources` com a URL + `outputs.transcription.format: "vtt"`
  - Se `inputStoragePath` fornecido: gerar signed URL do Supabase Storage e enviar como URL
  - Incluir `callback` apontando para a edge function `shotstack-webhook`
  - Incluir metadata com `jobId` para rastrear o callback
- Atualizar progresso: "Enviando video para transcricao..."

#### Etapa 4: Adicionar colunas na tabela `clip_jobs` (migracao SQL)
- `shotstack_source_id` (text, nullable) - ID do source no Ingest API
- `shotstack_render_ids` (text[], nullable) - IDs dos renders no Edit API
- `total_expected_clips` (int, nullable) - para saber quando todos os clips chegaram

#### Etapa 5: Ajustar o frontend (minimo)
- Nenhuma alteracao necessaria no frontend. O hook `useClipGenerator` ja escuta via Realtime as atualizacoes do `clip_jobs` e insercoes em `clips`. O fluxo permanece identico para o usuario.

---

### Detalhes Tecnicos

**Shotstack Ingest API - POST /ingest/v1/sources**
```json
{
  "url": "https://video-url.mp4",
  "outputs": {
    "transcription": { "format": "vtt" }
  },
  "callback": "https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/shotstack-webhook?secret=XXX&jobId=YYY"
}
```

**Shotstack Edit API - POST /edit/v1/render**
```json
{
  "timeline": {
    "tracks": [{
      "clips": [{
        "asset": { "type": "video", "src": "shotstack-source-url", "trim": 30 },
        "start": 0,
        "length": 45
      }]
    }]
  },
  "output": {
    "format": "mp4",
    "resolution": "hd",
    "aspectRatio": "9:16"
  },
  "callback": "https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/shotstack-webhook?secret=XXX&jobId=YYY&clipIndex=0"
}
```

**Analise com OpenAI** (mesmo padrao ja usado no projeto):
- Enviar transcricao VTT + prompt solicitando N momentos virais
- Resposta esperada: array de `{ title, clip_type, virality_score, reason, start_seconds, end_seconds }`

**Seguranca do Webhook**:
- Validar um `secret` nos query params do callback (comparar com `SHOTSTACK_API_KEY` ou um hash dedicado)

### Arquivos Impactados
| Arquivo | Acao |
|---|---|
| `supabase/functions/shotstack-webhook/index.ts` | Criar (novo) |
| `supabase/functions/create-clip-job/index.ts` | Modificar |
| `supabase/config.toml` | Adicionar config do webhook |
| Migracao SQL | Adicionar colunas em `clip_jobs` |

