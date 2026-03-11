# OpenRouter AI Gateway — Design Spec

## Objetivo

Centralizar todas as chamadas de IA do sistema através do OpenRouter, permitindo que o administrador configure qual modelo LLM será usado em cada uma das ~66 funções de IA do sistema, com fallback configurável por função.

## Decisões de Design

- **Abordagem individual:** Cada função tem seu próprio seletor de modelo (sem agrupamento)
- **API key configurável pela UI:** Admin insere a chave do OpenRouter na interface
- **Lista de modelos via API + favoritos:** Busca em tempo real do OpenRouter com filtros e favoritos
- **Sub-rota em configurações:** `/configuracoes/ia` dentro do SettingsLayout existente
- **Nova permissão:** `configurar-ia` para controlar acesso
- **Fallback configurável:** Cada função pode ter modelo principal + fallback
- **Gateway centralizado:** Módulo `_shared/ai-gateway.ts` que todas as Edge Functions usam

---

## Modelo de Dados

### Tabela `ai_model_configs`

Armazena a configuração de modelo por função, por empresa.

| Coluna         | Tipo                              | Descrição                                         |
| -------------- | --------------------------------- | ------------------------------------------------- |
| id             | uuid PK default gen_random_uuid() | -                                                 |
| company_id     | uuid FK → companies NOT NULL      | Empresa                                           |
| function_name  | text NOT NULL                     | Identificador da Edge Function (ex: "ai-chat")    |
| primary_model  | text NOT NULL                     | ID do modelo no OpenRouter (ex: "openai/gpt-4.1") |
| fallback_model | text                              | Modelo de fallback (opcional)                     |
| is_active      | boolean default true              | Se a configuração está ativa                      |
| created_at     | timestamptz default now()         | -                                                 |
| updated_at     | timestamptz default now()         | -                                                 |

- **UNIQUE(company_id, function_name)** — Uma config por função por empresa
- **RLS:** Apenas membros da empresa podem ler/editar. Usar `get_user_company_ids()` SECURITY DEFINER.
- **GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated**
- **Trigger:** `set_updated_at()` para atualizar `updated_at` automaticamente em UPDATEs

### Tabela `ai_favorite_models`

Modelos favoritados pela empresa para aparecerem no topo do seletor.

| Coluna     | Tipo                              | Descrição                                                    |
| ---------- | --------------------------------- | ------------------------------------------------------------ |
| id         | uuid PK default gen_random_uuid() | -                                                            |
| company_id | uuid FK → companies NOT NULL      | Empresa                                                      |
| model_id   | text NOT NULL                     | ID do modelo no OpenRouter (ex: "anthropic/claude-sonnet-4") |
| created_at | timestamptz default now()         | -                                                            |

- **UNIQUE(company_id, model_id)**
- **RLS + GRANT** como acima

### Tabela `ai_api_keys`

API key do OpenRouter configurada pelo admin. Somente owners e usuários com permissão `configurar-ia` podem ler/editar.

| Coluna             | Tipo                                | Descrição           |
| ------------------ | ----------------------------------- | ------------------- |
| id                 | uuid PK default gen_random_uuid()   | -                   |
| company_id         | uuid FK → companies UNIQUE NOT NULL | Uma key por empresa |
| openrouter_api_key | text NOT NULL                       | Chave da API        |
| created_at         | timestamptz default now()           | -                   |
| updated_at         | timestamptz default now()           | -                   |

- **RLS restritiva:** SELECT/INSERT/UPDATE apenas para owners da empresa (via `company_members.role = 'owner'`). Colaboradores comuns NÃO podem ler a chave — apenas a Edge Function (que usa SERVICE_ROLE_KEY) lê a chave para fazer chamadas.
- **GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated**
- **Trigger:** `set_updated_at()` para atualizar `updated_at` automaticamente
- **Frontend:** O campo de API key mostra apenas `••••••últimos4chars` para quem já salvou. O valor completo nunca é retornado ao frontend após salvar.

### Modelo padrão global

Quando não houver config para uma função, o gateway usa `google/gemini-2.5-flash` como modelo padrão. Definido como constante no código do gateway.

---

## AI Gateway (`_shared/ai-gateway.ts`)

Módulo compartilhado importado por todas as Edge Functions.

### Interface pública

```typescript
interface CallAIOptions {
  functionName: string; // identificador da Edge Function
  companyId?: string; // se não fornecido, usa modelo padrão
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number; // default: 1500 — enviado como max_tokens ao OpenRouter
  temperature?: number; // default: 0.7
  responseFormat?: { type: "json_object" | "text" }; // para funções que precisam de JSON estruturado
  messages?: Array<{ role: string; content: unknown }>; // override completo de messages (para casos complexos)
}

interface CallAIResponse {
  content: string;
  model: string;
  provider: "openrouter";
}

async function callAI(options: CallAIOptions): Promise<CallAIResponse>;
```

### Métodos adicionais

```typescript
// Para modelos com suporte a vision (enviar imagens)
async function callAIVision(
  options: CallAIOptions & {
    images: string[]; // Array de URLs de imagem
  },
): Promise<CallAIResponse>;
```

**Fora do escopo do gateway:**

- Geração de imagem (DALL-E) — mantém chamada direta, sem equivalente universal no OpenRouter
- Transcrição de áudio (Whisper) — API específica sem equivalente no OpenRouter

### Fluxo interno

1. Busca config em `ai_model_configs` para (`company_id` + `function_name`)
2. Se não encontrar, usa modelo padrão (`google/gemini-2.5-flash`)
3. Busca API key em `ai_api_keys` para a empresa; se não tiver, usa env var `OPENROUTER_API_KEY`
4. Monta request: usa `max_tokens` (padrão OpenRouter), inclui `response_format` se fornecido
5. Se `messages` for fornecido, usa diretamente; senão, monta a partir de `systemPrompt` + `userPrompt`
6. Chama `https://openrouter.ai/api/v1/chat/completions` com o modelo configurado
7. Se falhar (status != 2xx) e houver `fallback_model`, repete com o fallback
8. Se fallback também falhar, lança erro
9. Log: registra no console `functionName`, modelo usado, latência e status (para observabilidade)
10. Cache de config em memória por 1 minuto (TTL curto para refletir mudanças rapidamente)

### Observabilidade

O gateway loga em cada chamada:

- `functionName`, `companyId`, modelo usado, latência (ms), status (success/fallback/error)
- Em caso de fallback: motivo da falha do modelo principal

---

## Frontend

### Sub-rota `/configuracoes/ia`

Implementada como sub-rota dentro do `Configuracoes.tsx` existente (mesmo padrão de `empresa`, `notificacoes`, `planos`). Adicionar entrada "Inteligência Artificial" no menu lateral do `SettingsLayout`.

**Header:**

- Título "Configurações de IA"
- Campo para API key do OpenRouter (input password + mostrar/ocultar + salvar)
- Aviso: após salvar, o campo mostra apenas `••••••últimos4chars`

**Lista de funções** — Tabela com todas as funções agrupadas visualmente por categoria:

| Categoria            | Funções                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chat & Agentes       | ai-chat, ia-agent-chat, dm-agent-responder, telegram-agent-webhook, refine-script-chat, content-plan-chat, whatsapp-ai-assistant                                                                                                                                         |
| Geração de Conteúdo  | generate-content-ai, generate-instagram-auto-post, generate-wordpress-auto-post, generate-creative-texts, generate-creative-variations, generate-creative-suggestions, generate-element, generate-groupops-template, generate-skill-ai, generate-research-themes         |
| Análise              | analyze-competitor-insights, generate-campaign-analysis, analyze-creative-caption, analyze-url-content, analyze-carousel-slides, score-generated-ad, generate-campaign-presentation-analysis, scrape-competitor-ads, youtube-posting-behavior-report                     |
| Campanhas            | generate-campaign-strategy, generate-campaign-recommendation, generate-ai-campaign, generate-ai-campaign-image, generate-campaign-creatives, generate-client-briefing, generate-creative-context, generate-visual-creative                                               |
| Vídeo & YouTube      | generate-video-script, generate-video-suggestions, generate-youtube-description, generate-youtube-titles, transcribe-youtube-video, generate-youtube-thumbnail, generate-presentation-slides, generate-slide-image                                                       |
| Imagens & Carrosséis | generate-image-ai, regenerate-carousel-images, daily-carousel-generator, daily-carousel-generator-stream, daily-ad-generator, daily-creative-generator, validate-image-text                                                                                              |
| Utilitários          | translate-text, validate-text-grammar, validate-portuguese, organize-tasks-with-ai, prioritize-notification, extract-image-text, sync-release-notes, google-meet-process-summary, prospect-google-leads, shotstack-webhook, squad-orchestrator, generate-weekly-insights |

Cada linha mostra:

- Nome amigável da função (PT-BR)
- Modelo principal atual (ou "Padrão" se não configurado)
- Modelo de fallback (ou "Nenhum")
- Botão "Configurar"

**Modal de seleção de modelo:**

- Dois seletores: "Modelo Principal" e "Modelo de Fallback"
- Campo de busca no topo
- Filtros por provider (OpenAI, Google, Anthropic, Meta, Mistral...) e por tipo (chat, code, vision)
- Modelos favoritos no topo com estrela
- Botão favoritar/desfavoritar em cada modelo
- Cada modelo exibe: nome, provider, preço input/output por token, context window
- Botões "Salvar" e "Cancelar"

**Aviso de cache:**

- Exibir nota discreta: "Alterações podem levar até 1 minuto para entrar em vigor em todas as funções."

### Hooks

| Hook                    | Responsabilidade                                                      |
| ----------------------- | --------------------------------------------------------------------- |
| `useAIModelConfigs()`   | CRUD das configs por empresa (useQuery + useMutation)                 |
| `useAIFavoriteModels()` | Gerenciar modelos favoritos                                           |
| `useOpenRouterModels()` | Buscar lista de modelos da API do OpenRouter                          |
| `useAIApiKey()`         | Salvar/buscar API key do OpenRouter (retorna apenas versão mascarada) |

### Edge Function auxiliar

`get-openrouter-models` — Proxy para `https://openrouter.ai/api/v1/models`. Não expõe a API key no frontend. Retorna lista filtrada com: id, nome, provider, preço (input/output), context window. Requer JWT (`verify_jwt = true` no `config.toml`).

---

## Permissão

- Nova permissão: `configurar-ia`
- Adicionar ao enum `menu_item_type` no banco (`ALTER TYPE menu_item_type ADD VALUE 'configurar-ia'`)
- Adicionar em `PermissionGroupsSettings.tsx` e `PermissionsSettings.tsx`
- Owners têm acesso automático (bypass de permissões)
- Rota protegida com `PermissionProtectedRoute`

---

## Migração das Edge Functions

### Estratégia

Todas as ~66 funções migram para usar `callAI()` do gateway. Migração em lotes por categoria.

### Mudanças por função

1. Remove imports de API key (`OPENAI_API_KEY`, `OPENROUTER_API_KEY`)
2. Remove `fetch("https://api.openai.com/...")` e `fetch("https://openrouter.ai/...")`
3. Adiciona `import { callAI } from "../_shared/ai-gateway.ts"`
4. Substitui pela chamada `callAI({ functionName, companyId, systemPrompt, userPrompt, ... })`
5. Se a função usa `response_format: { type: "json_object" }`, passar `responseFormat` ao gateway

### Tratamento de `companyId`

- Funções que recebem `companyId` no body: passam direto ao gateway
- Webhooks/tarefas agendadas sem `companyId`: gateway usa modelo padrão global

### Funções fora do gateway

- Geração de imagem (DALL-E) — mantém chamada direta
- Transcrição de áudio (Whisper) — mantém chamada direta

### Ordem de migração

1. Chat & Agentes (7 funções)
2. Análise (9 funções)
3. Geração de Conteúdo (10 funções)
4. Campanhas (8 funções)
5. Vídeo & YouTube (8 funções)
6. Imagens & Carrosséis (7 funções)
7. Utilitários (12 funções)

### config.toml

Adicionar entrada para a nova Edge Function:

```toml
[functions.get-openrouter-models]
verify_jwt = true
```
