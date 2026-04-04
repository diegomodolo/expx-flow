# Fix Auto-Bugs GitHub — Plano de Implementacao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os 53 auto-bugs capturados pelo sistema, agrupados em 7 tasks independentes.

**Architecture:** Fixes isolados em hooks React, componentes e Edge Functions Deno. Cada task produz 1 commit. Tasks de Edge Function precisam de deploy ao final.

**Tech Stack:** React 18 + TypeScript, Supabase Edge Functions (Deno), PostgreSQL

---

## Mapa de Arquivos

| Arquivo                                                 | Task   | O que muda                                         |
| ------------------------------------------------------- | ------ | -------------------------------------------------- |
| `src/hooks/useWhatsAppInstances.tsx:341`                | Task 1 | `assigned_at` → `created_at`                       |
| `src/hooks/useFacebookPages.tsx:50,72`                  | Task 2 | `name` → `page_name`, remover colunas inexistentes |
| `src/components/agents/AgentEditContent.tsx:113`        | Task 3 | `user_id: null` → `user_id: user.id`               |
| `supabase/functions/analyze-youtube-channel/index.ts:5` | Task 4 | Validar `YOUTUBE_API_KEY` + deploy                 |
| `supabase/functions/google-meet-create/index.ts:172`    | Task 5 | Fix timezone offset + deploy                       |
| `src/hooks/useWhatsAppAIChatMessages.tsx:131-142`       | Task 6 | `insert` → `upsert` com ON CONFLICT                |
| `src/pages/Perfil.tsx` (ou similar)                     | Task 7 | `DialogTitle` visually-hidden                      |

---

### Task 1: Fix #304 — `assigned_at` inexistente em whatsapp_instance_users

**Issues:** #304
**Files:**

- Modify: `src/hooks/useWhatsAppInstances.tsx:341`

A coluna `assigned_at` não existe na tabela `whatsapp_instance_users`. A coluna correta é `created_at`.

- [ ] **Step 1: Ler o arquivo para confirmar o contexto**

```bash
# Linha 339-346 de src/hooks/useWhatsAppInstances.tsx
```

Confirmar que a linha 341 tem:

```typescript
.select("id, instance_id, user_id, assigned_at")
```

- [ ] **Step 2: Corrigir a coluna**

Em `src/hooks/useWhatsAppInstances.tsx` linha 341, trocar:

```typescript
.select("id, instance_id, user_id, assigned_at")
```

Por:

```typescript
.select("id, instance_id, user_id, created_at")
```

- [ ] **Step 3: Verificar se há interface TypeScript usando `assigned_at`**

Buscar no arquivo por `assigned_at` — se existir interface `WhatsAppInstanceUser` com esse campo, renomear para `created_at`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWhatsAppInstances.tsx
git commit -m "fix: corrigir coluna assigned_at para created_at em whatsapp_instance_users (#304)"
```

---

### Task 2: Fix #267 #261 — colunas inexistentes em facebook_pages

**Issues:** #267, #261
**Files:**

- Modify: `src/hooks/useFacebookPages.tsx:50,72`

A tabela `facebook_pages` não tem colunas `name`, `picture_url`, `connected_at`, `token_expires_at`, `is_token_valid`. O nome correto da coluna é `page_name`.

- [ ] **Step 1: Corrigir fetchPages (linha 50)**

Em `src/hooks/useFacebookPages.tsx` linha 50, trocar:

```typescript
.select('id, page_id, name, picture_url, is_active, connected_at, token_expires_at, is_token_valid, company_id')
```

Por:

```typescript
.select('id, page_id, page_name, is_active, company_id, integration_id, created_at, updated_at')
```

- [ ] **Step 2: Corrigir fetchInstagramAccounts (linha 72)**

Em `src/hooks/useFacebookPages.tsx` linha 72, trocar:

```typescript
facebook_page: facebook_pages(id, page_id, name, picture_url, is_active);
```

Por:

```typescript
facebook_page: facebook_pages(id, page_id, page_name, is_active);
```

- [ ] **Step 3: Verificar interface FacebookPage no mesmo arquivo**

A interface no topo do arquivo (linha ~6-18) já usa `page_name: string` — verificar se está correto. Se algum campo removido estiver na interface, remover também.

- [ ] **Step 4: Buscar outros usos de `facebook_pages.name` ou `.name` no projeto**

```bash
grep -rn "facebook_page.*\.name\b" src/ --include="*.tsx" --include="*.ts"
```

Se encontrar outros arquivos acessando `.name` em um objeto `facebook_page`, trocar para `.page_name`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFacebookPages.tsx
git commit -m "fix: corrigir colunas inexistentes nas queries de facebook_pages (#267 #261)"
```

---

### Task 3: Fix #307 — `user_id: null` viola NOT NULL em employees

**Issues:** #307
**Files:**

- Modify: `src/components/agents/AgentEditContent.tsx:113`

Ao criar um employee para representar um agente IA colaborador, `user_id: null` é passado mas a coluna é `NOT NULL`. Fix: usar o `user_id` do usuário autenticado atual.

- [ ] **Step 1: Ler o contexto da função**

Ler `src/components/agents/AgentEditContent.tsx` linhas 95-120 para entender o fluxo. A função já chama `supabase.auth.getUser()` ou tem acesso ao `user` via `useAuth()`.

- [ ] **Step 2: Verificar se useAuth já está importado**

Buscar no arquivo se já existe:

```typescript
const { user } = useAuth();
```

ou

```typescript
import { useAuth } from "@/hooks/useAuth";
```

- [ ] **Step 3: Corrigir o insert**

Em `src/components/agents/AgentEditContent.tsx` linha 113, trocar:

```typescript
user_id: null,
```

Por (se `user` já está disponível via hook):

```typescript
user_id: user?.id || (await supabase.auth.getUser()).data.user?.id,
```

Se `user` não está disponível no escopo, buscar o user de forma async antes do insert:

```typescript
const { data: { user: currentUser } } = await supabase.auth.getUser();
// ...
user_id: currentUser?.id,
```

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/AgentEditContent.tsx
git commit -m "fix: usar user_id do usuario autenticado ao criar employee de agente IA (#307)"
```

---

### Task 4: Fix #371-375 — YouTube Content Lab: YOUTUBE_API_KEY sem validação

**Issues:** #371, #372, #373, #374, #375
**Files:**

- Modify: `supabase/functions/analyze-youtube-channel/index.ts:5`

A variável `youtubeApiKey` é obtida via `Deno.env.get("YOUTUBE_API_KEY")!` mas não é validada antes de uso. Se a key não estiver configurada, as chamadas à API do YouTube falham silenciosamente com 400/403.

- [ ] **Step 1: Ler o início do arquivo**

Ler `supabase/functions/analyze-youtube-channel/index.ts` linhas 1-20 para ver onde `youtubeApiKey` é declarada.

- [ ] **Step 2: Adicionar validação após a declaração da key**

Após a linha 5 (`const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY")!;`), adicionar:

```typescript
if (!youtubeApiKey) {
  console.error("YOUTUBE_API_KEY not configured in Supabase secrets");
}
```

- [ ] **Step 3: Adicionar erro cedo no handler se a key estiver ausente**

Dentro do `serve(async (req) => {`, logo após o OPTIONS check, adicionar:

```typescript
if (!youtubeApiKey) {
  return new Response(
    JSON.stringify({
      success: false,
      error:
        "YOUTUBE_API_KEY não configurada. Configure em Supabase Dashboard > Edge Functions > Secrets.",
    }),
    {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
```

- [ ] **Step 4: Deploy**

```bash
supabase functions deploy analyze-youtube-channel
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/analyze-youtube-channel/index.ts
git commit -m "fix: validar YOUTUBE_API_KEY e retornar 503 descritivo quando ausente (#371)"
```

---

### Task 5: Fix #349 #340 — Google Meet: bug no cálculo de timezone

**Issues:** #349, #340
**Files:**

- Modify: `supabase/functions/google-meet-create/index.ts:172`

O cálculo de conversão de horário local para UTC está invertido. O `timezoneOffset` do browser é positivo para fusos oeste (ex: UTC-3 = +180 min). Para converter local → UTC, deve-se **subtrair** o offset, não somar.

Exemplo: 14h local em UTC-3 → `14:00 - (-180min)` = incorreto. Correto: `new Date("2024-03-04T14:30")` já interpreta como UTC pelo JS, então basta construir a data com os componentes locais corretamente.

- [ ] **Step 1: Ler o contexto completo do cálculo**

Ler `supabase/functions/google-meet-create/index.ts` linhas 163-182.

O código atual:

```typescript
const localDate = new Date(scheduledAt); // "YYYY-MM-DDTHH:mm" — parseado como UTC pelo JS
const utcDate = new Date(localDate.getTime() + offset * 60 * 1000); // ERRADO: soma em vez de subtrair
```

- [ ] **Step 2: Corrigir o cálculo**

Substituir as linhas 163-182 por:

```typescript
// Convert scheduledAt from local time to UTC using the timezone offset
let scheduledAtUTC: string | null = null;
if (scheduledAt) {
  // scheduledAt comes as "YYYY-MM-DDTHH:mm" (local time from browser)
  // timezoneOffset is getTimezoneOffset() in minutes: positive for zones WEST of UTC
  // UTC-3 (Brasilia) → offset = 180
  // To convert local to UTC: UTC = local + offset minutes
  // BUT new Date("YYYY-MM-DDTHH:mm") without 'Z' is parsed as LOCAL time in modern browsers
  // but as UTC in Deno/Node. So we treat it as local and apply the offset correctly.
  const offset = timezoneOffset || 0;
  // Parse as if it were UTC, then subtract the offset to get actual UTC
  const parsedAsUTC = new Date(scheduledAt + "Z"); // force UTC parse
  // parsedAsUTC is the local time treated as UTC; to get real UTC, subtract offset
  const utcDate = new Date(parsedAsUTC.getTime() - offset * 60 * 1000);
  scheduledAtUTC = utcDate.toISOString();
  console.log(
    "Scheduled at (local):",
    scheduledAt,
    "Offset (min):",
    offset,
    "UTC:",
    scheduledAtUTC,
  );
}
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy google-meet-create
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/google-meet-create/index.ts
git commit -m "fix: corrigir calculo de timezone ao criar reuniao Google Meet (#349 #340)"
```

---

### Task 6: Fix #275 — Duplicate key em whatsapp_ai_chat_messages

**Issues:** #275, #322 (relacionado)
**Files:**

- Modify: `src/hooks/useWhatsAppAIChatMessages.tsx:131-142`

A tabela `whatsapp_ai_chat_messages` tem um unique index `idx_whatsapp_ai_chat_unique_analysis` em `(conversation_id, md5(content))` para mensagens de role `analysis`. Quando a análise é acionada múltiplas vezes com o mesmo conteúdo, a constraint viola. Fix: usar `upsert` com `ignoreDuplicates: true` para mensagens de análise.

- [ ] **Step 1: Ler o addMessageMutation**

Ler `src/hooks/useWhatsAppAIChatMessages.tsx` linhas 118-152 para ver o insert atual.

- [ ] **Step 2: Modificar o insert para usar upsert quando role = 'analysis'**

Em `src/hooks/useWhatsAppAIChatMessages.tsx` linhas 131-142, trocar o insert condicional:

```typescript
// Antes:
const { data, error } = await supabase
  .from("whatsapp_ai_chat_messages")
  .insert({
    conversation_id: conversationId,
    company_id: companyId,
    user_id: user.id,
    role: message.role,
    content: message.content,
    source_message_id: message.sourceMessageId || null,
  })
  .select()
  .single();

if (error) throw error;
```

Por:

```typescript
// Para mensagens de análise, usar upsert para evitar duplicate key
const isAnalysis = message.role === "analysis";
const { data, error } = await supabase
  .from("whatsapp_ai_chat_messages")
  [isAnalysis ? "upsert" : "insert"](
    {
      conversation_id: conversationId,
      company_id: companyId,
      user_id: user.id,
      role: message.role,
      content: message.content,
      source_message_id: message.sourceMessageId || null,
    },
    isAnalysis ? { ignoreDuplicates: true } : undefined,
  )
  .select()
  .single();

if (error) throw error;
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWhatsAppAIChatMessages.tsx
git commit -m "fix: usar upsert com ignoreDuplicates para evitar duplicate key em analysis messages (#275)"
```

---

### Task 7: Fix #317 — DialogContent sem DialogTitle (acessibilidade)

**Issues:** #317
**Files:**

- Modify: arquivo de perfil — buscar o Dialog sem título

O erro é: `DialogContent requires a DialogTitle for accessibility`. Acontece em `/perfil`.

- [ ] **Step 1: Localizar o Dialog sem título**

```bash
grep -rn "DialogContent" src/pages/Perfil.tsx src/components/profile/ --include="*.tsx" --include="*.ts" 2>/dev/null | head -20
grep -rn "DialogContent" src/ --include="*.tsx" -l | xargs grep -l "perfil\|profile\|Perfil" 2>/dev/null | head -5
```

- [ ] **Step 2: Adicionar VisuallyHidden DialogTitle**

Em cada `DialogContent` que não tem `DialogTitle` explícito no arquivo encontrado, adicionar logo como primeiro filho:

```tsx
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DialogTitle } from "@/components/ui/dialog";

// Dentro do DialogContent:
<VisuallyHidden>
  <DialogTitle>Diálogo</DialogTitle>
</VisuallyHidden>;
```

Usar um título descritivo se possível (ex: "Editar perfil", "Alterar senha", etc.).

- [ ] **Step 3: Commit**

```bash
git add <arquivos modificados>
git commit -m "fix: adicionar DialogTitle para acessibilidade em dialogs do perfil (#317)"
```

---

## Ordem de Execução Recomendada

Tasks independentes — podem rodar em paralelo:

- **Task 1** (assigned_at) + **Task 2** (facebook_pages) + **Task 3** (employees user_id)
- **Task 4** (YouTube key) + **Task 5** (Google Meet timezone)
- **Task 6** (duplicate key) + **Task 7** (dialog title)

## Issues NÃO implementadas (observações)

- **#302** RLS em channels: requer investigação mais profunda do `is_company_member()` — possível problema de timing no primeiro acesso
- **Auth lock (12 issues)**: limitação do Supabase JS client — não tem fix de código simples; mitigado com o singleton atual
- **WhatsApp AI #348, #314, #300, #289**: depende de configuração de `OPENROUTER_API_KEY` na tabela `ai_api_keys` — não é bug de código, é configuração por empresa
- **#298** HTTP 400 no upload: provavelmente arquivo com formato inválido — já tem validação de tamanho (fix #352), validação de tipo já existe
