# AI Gateway (OpenRouter) — Skill de Contexto do Modulo

## Visao Geral

O AI Gateway centraliza todas as chamadas de IA do sistema via OpenRouter. Permite que o admin configure qual modelo LLM usar em cada funcao de IA (~66 funcoes), com fallback configuravel por funcao e API key por empresa.

**Rota:** `/configuracoes/ia` — protegida por `PermissionProtectedRoute` com permissao `configurar-ia`.

**Modelo padrao global:** `google/gemini-2.5-flash` (quando nenhuma config existe para a funcao).

### Modelo de Dados

```
ai_model_configs (config de modelo por funcao por empresa)
  - UNIQUE(company_id, function_name)
  - RLS via get_user_company_ids() — todos membros da empresa

ai_favorite_models (modelos favoritados pela empresa)
  - UNIQUE(company_id, model_id)
  - RLS via get_user_company_ids()

ai_api_keys (chave OpenRouter por empresa — apenas owners)
  - UNIQUE(company_id)
  - RLS via is_company_owner() SECURITY DEFINER
```

---

## Arquivos-Chave

### Backend — Edge Functions

| Arquivo                                             | Responsabilidade                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `supabase/functions/_shared/ai-gateway.ts`          | Modulo central. Exporta `callAI()` e `callAIVision()`. Resolve config do banco (modelo + API key), cache 1min, primary + fallback, logging |
| `supabase/functions/get-openrouter-models/index.ts` | Proxy para `https://openrouter.ai/api/v1/models`. Valida pertencimento a empresa via JWT. Retorna lista filtrada de modelos                |

### Frontend — Hooks

| Arquivo                             | Responsabilidade                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useAIModelConfigs.tsx`   | CRUD de configs por empresa. Query key: `['ai-model-configs', companyId]`. Upsert com onConflict, delete por function_name |
| `src/hooks/useAIFavoriteModels.tsx` | Toggle favoritos. Query key: `['ai-favorite-models', companyId]`. Retorna array de model_id strings                        |
| `src/hooks/useOpenRouterModels.tsx` | Busca modelos via Edge Function. Query key: `['openrouter-models', companyId]`. staleTime: 10min                           |
| `src/hooks/useAIApiKey.tsx`         | Salvar/verificar API key. Query key: `['ai-api-key', companyId]`. NAO retorna a chave completa — apenas indica se existe   |

### Frontend — Componentes

| Arquivo                                             | Responsabilidade                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/components/settings/ai/aiModelFunctions.ts`    | Catalogo de ~66 funcoes IA com label PT-BR e categoria. Array `AI_FUNCTIONS` + `AI_FUNCTION_CATEGORIES` |
| `src/components/settings/ai/ModelSelectorModal.tsx` | Modal de selecao de modelo. Busca, filtro por provider, favoritos no topo, preco e context window       |
| `src/components/settings/ai/AISettings.tsx`         | Pagina principal. Card de API key + lista de funcoes por categoria com botoes Modelo/Fallback           |

### Integracao de Rota

| Arquivo                                      | Mudanca                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `src/pages/Configuracoes.tsx`                | `<Route path="ia" element={<AISettings />} />`                         |
| `src/components/settings/SettingsLayout.tsx` | Item "Inteligencia Artificial" com icone `Brain` no `settingsNavItems` |

### Permissao

| Arquivo                                                | Mudanca                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `src/hooks/useEmployeePermissions.tsx`                 | `"configurar-ia"` no type `MenuItemType` + array `allPermissions` |
| `src/components/settings/PermissionGroupsSettings.tsx` | Item na categoria "Inteligencia Artificial"                       |
| `src/components/settings/PermissionsSettings.tsx`      | Item com descricao na categoria "Inteligencia Artificial"         |

### Migrations

| Arquivo                                                              | Conteudo                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `supabase/migrations/20260311200000_create_ai_gateway_tables.sql`    | 3 tabelas, RLS, GRANTs, triggers set_updated_at                                      |
| `supabase/migrations/20260311200001_fix_ai_gateway_rls_and_enum.sql` | Funcao `is_company_owner()` SECURITY DEFINER, recriar policies, enum `configurar-ia` |

---

## Arquitetura do Gateway

### Fluxo de uma chamada `callAI()`

```
Edge Function chama callAI({ functionName, companyId, systemPrompt, userPrompt })
  │
  ├─ resolveConfig(functionName, companyId)
  │   ├─ Sem companyId? → modelo padrao (gemini-2.5-flash) + env OPENROUTER_API_KEY
  │   ├─ Cache hit (< 1min)? → retorna cached config
  │   └─ Cache miss? → query ai_model_configs + ai_api_keys via SERVICE_ROLE_KEY
  │
  ├─ callOpenRouter(primaryModel, messages, ...)
  │   ├─ Sucesso? → log + retorna { content, model, provider: "openrouter" }
  │   └─ Falha? → tenta fallbackModel (se configurado)
  │       ├─ Sucesso? → log + retorna com fallback
  │       └─ Falha? → throw error
  │
  └─ Log: [AI Gateway] functionName | model=X | Xms | success/fallback/error
```

### Interface publica

```typescript
interface CallAIOptions {
  functionName: string; // identificador da Edge Function
  companyId?: string; // se nao fornecido, usa modelo padrao
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number; // default: 1500
  temperature?: number; // default: 0.7
  responseFormat?: { type: "json_object" | "text" };
  messages?: Array<{ role: string; content: unknown }>; // override de messages
}

interface CallAIResponse {
  content: string;
  model: string;
  provider: "openrouter";
}

// Para imagens (vision input)
interface CallAIVisionOptions extends CallAIOptions {
  images: string[]; // URLs de imagem
}
```

---

## Padroes Estabelecidos

### Como migrar uma Edge Function para o gateway

```typescript
// 1. Adicionar import
import { callAI } from "../_shared/ai-gateway.ts";

// 2. Substituir o fetch direto
// ANTES:
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ model: "gpt-4o", messages, max_tokens: 1500 }),
});
const data = await response.json();
const text = data.choices[0].message.content;

// DEPOIS:
const result = await callAI({
  functionName: "nome-da-funcao",
  companyId, // se disponivel
  systemPrompt,
  userPrompt,
  maxTokens: 1500,
});
const text = result.content;

// 3. Remover variaveis de API key nao usadas
// Remover: const apiKey = Deno.env.get("OPENAI_API_KEY");
```

### Como adicionar uma nova funcao IA ao catalogo

1. Adicionar entrada em `src/components/settings/ai/aiModelFunctions.ts`:

```typescript
{ functionName: "nome-da-edge-function", label: "Nome Amigavel PT-BR", category: "Categoria" },
```

2. Na Edge Function, usar `callAI({ functionName: "nome-da-edge-function", ... })`

### Categorias disponiveis

Chat & Agentes | Geracao de Conteudo | Analise | Campanhas | Video & YouTube | Imagens & Carrosseis | Utilitarios

---

## Armadilhas e Bugs Encontrados

### 1. RLS nested em ai_api_keys (CRITICO)

**Problema:** Policies de `ai_api_keys` faziam subquery em `company_members` (que tem RLS). Isso falhava silenciosamente — owners nunca conseguiam ver suas API keys.

**Solucao:** Criada funcao `is_company_owner(p_user_id, p_company_id)` com SECURITY DEFINER. Policies usam essa funcao.

**Regra geral:** NUNCA fazer subquery em tabela com RLS dentro de policy. Sempre usar funcao SECURITY DEFINER.

### 2. API key exposta no frontend

**Problema:** Hook buscava `openrouter_api_key` completa e mascava no client-side. A chave ficava visivel no network e no React Query cache.

**Solucao:** Hook busca apenas `select("id")` para verificar se existe. Exibe mascara estatica `"••••••••••"`. A chave completa so e lida pelo SERVICE_ROLE_KEY nas Edge Functions.

### 3. generate-image-ai quebrava com o gateway

**Problema:** Funcao usa `modalities: ["image", "text"]` (geracao de imagem Gemini). O gateway nao suporta esse parametro — a resposta vinha sem imagem.

**Solucao:** Revertido para fetch direto. Funcoes que usam `modalities` NAO devem usar o gateway.

### 4. get-openrouter-models sem validacao de empresa

**Problema:** Qualquer usuario autenticado podia passar `companyId` de outra empresa e usar a API key alheia.

**Solucao:** Adicionada validacao de pertencimento via `company_members` antes de buscar a API key.

### 5. Enum nao existia no banco

**Problema:** O valor `configurar-ia` precisa existir no enum `menu_item_type` ANTES do frontend usar. Sem isso, inserir permissao falha com constraint violation.

**Solucao:** `ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'configurar-ia'` na migration.

---

## Limitacoes Atuais (NAO migradas para o gateway)

### Funcoes com Tool Calling (7)

O gateway NAO suporta `tools`/`tool_choice` no request body. Essas funcoes manteem fetch direto para as chamadas com tool calling:

- `ia-agent-chat` (loop principal de agentes)
- `squad-orchestrator` (loop de agentes)
- `telegram-agent-webhook` (loop de agentes)
- `score-generated-ad` (tool: `score_ad`)
- `prioritize-notification` (tool: `classify_notification`)
- `generate-skill-ai` (tool: `generate_skill`)
- `generate-groupops-template` (tool: `generate_poll`/`generate_message`)

**Para resolver:** Adicionar parametro `tools` e `toolChoice` ao `CallAIOptions` e passa-los ao body do OpenRouter.

### Funcoes de Geracao de Imagem

Funcoes que usam `modalities: ["image", "text"]` (Gemini image gen) manteem fetch direto:

- `generate-image-ai`
- `daily-ad-generator` (chamadas de imagem)
- `daily-carousel-generator` / `daily-carousel-generator-stream` (chamadas de imagem)
- `daily-creative-generator` (chamadas de imagem)

**Para resolver:** Criar `callAIImage()` no gateway que suporte `modalities` e retorne a resposta raw (com inline base64).

### Fora do Escopo

- **DALL-E** (geracao de imagem OpenAI) — API diferente, sem equivalente no OpenRouter
- **Whisper** (transcricao de audio) — API especifica, sem equivalente no OpenRouter

---

## Contexto Nao-Obvio

### Cache do gateway e por processo

O cache em `configCache` (Map) vive no escopo do processo da Edge Function. No Supabase Edge Functions (Deno Deploy), processos podem ser reciclados a qualquer momento. O cache e efetivo para chamadas sequenciais dentro da mesma execucao, mas nao persiste entre invocacoes diferentes.

### Muitas funcoes tem multiplas chamadas LLM

Funcoes como `generate-wordpress-auto-post` (5 calls), `daily-ad-generator` (7+ calls), `generate-instagram-auto-post` (5 calls) fazem multiplas chamadas LLM sequenciais. Cada uma precisa de um `callAI()` separado — todas com o mesmo `functionName` (configuracao de modelo se aplica a todas as chamadas da funcao).

### Funcoes sem companyId

Webhooks e tarefas agendadas (ex: `sync-release-notes`, `shotstack-webhook`) podem nao ter `companyId` no contexto. Nesses casos, o gateway usa o modelo padrao global e a env var `OPENROUTER_API_KEY`.

### Dual-path em generate-creative-suggestions

Essa funcao tinha um path antigo (OpenAI) e um novo (OpenRouter) com fallback entre eles. Foi unificado em um unico `callAI()`.

### Response do OpenRouter para vision/imagens

Funcoes que enviam imagens para analise (nao geracao) usam `callAIVision()` que monta um array de `image_url` content items. Funciona normalmente com o chat/completions endpoint. Ja funcoes que GERAM imagens precisam de `modalities: ["image", "text"]` que o gateway nao suporta.
