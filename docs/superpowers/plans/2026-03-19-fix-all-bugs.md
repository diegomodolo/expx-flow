# Correção de Bugs — Plano de Implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todas as 30 issues de bug abertas, organizadas por categoria e prioridade.

**Architecture:** Bugs categorizados em 7 grupos. Prioridade por impacto no usuário (bugs reportados manualmente > auto-reported). Fixes são majoritariamente frontend (hooks, components) com algumas validações de dados.

**Tech Stack:** React + TypeScript, Supabase client, Edge Functions (Deno)

---

## Classificação e Priorização

### Grupo A — CRÍTICO: Bugs que quebram funcionalidade do usuário

| Issue            | Título                                      | Causa Raiz                                     |
| ---------------- | ------------------------------------------- | ---------------------------------------------- |
| #194, #195, #202 | "default-todo" UUID inválido                | Placeholder string enviado como UUID ao DB     |
| #204             | Tarefas em aprovação não abrem              | Colunas erradas na query de notificação        |
| #203             | Erro ao enviar tarefa para agente duplicado | `client_id` não copiado na duplicação          |
| #200             | Atividade no limbo                          | Task fica em "progress" sem recovery           |
| #213             | Missing context                             | Mutation dispara antes do parent task carregar |

### Grupo B — ALTO: Erros de DB/query que afetam fluxos

| Issue      | Título                                    | Causa Raiz                                     |
| ---------- | ----------------------------------------- | ---------------------------------------------- |
| #193       | Erro buscar membro da empresa (PGRST116)  | `.single()` retorna erro quando 0 rows         |
| #192       | CS TV dashboard token (PGRST116)          | `.single()` em query que pode ter 0 rows       |
| #205       | cs_tv_displayed_alerts FK violation       | `conversation_id` inexistente inserido         |
| #187       | RLS violation ao criar employee p/ agente | `user_id` do agente não é auth.users válido    |
| #207, #191 | WhatsApp analysis FK violation            | Falta validação de conversation_id no frontend |

### Grupo C — MÉDIO: Edge Function connectivity (transiente)

| Issue      | Título                         | Causa Raiz                  |
| ---------- | ------------------------------ | --------------------------- |
| #219, #185 | Error sending WhatsApp message | Edge Function timeout/crash |
| #214, #196 | useSyncWhatsAppChats erro sync | Edge Function timeout/crash |
| #221       | WhatsApp delete message error  | Edge Function non-2xx       |
| #220       | Error downloading file         | Edge Function non-2xx       |
| #209       | AI generation error            | Edge Function timeout       |
| #208       | Error creating meeting         | Edge Function non-2xx       |
| #206       | Error generating slide image   | Edge Function timeout       |
| #190       | downloadAndCacheMedia failed   | Download externo falhou     |

### Grupo D — BAIXO: DOM/React e acessibilidade

| Issue            | Título                              | Causa Raiz                                  |
| ---------------- | ----------------------------------- | ------------------------------------------- |
| #189             | React is not defined                | Possível import faltando em componente      |
| #201, #188, #184 | insertBefore/removeChild DOM errors | Race condition React/DOM                    |
| #216             | DialogContent sem DialogTitle       | Acessibilidade - possivelmente já corrigido |
| #217             | Upload file size exceeded           | Falta validação de tamanho antes do upload  |
| #186             | 404 rota inexistente                | URL truncada `/t` — não é bug real          |

---

## Chunk 1: Grupo A — Bugs Críticos

### Task 1: Fix "default-todo" UUID (Issues #194, #195, #202)

**Files:**

- Modify: `src/components/tasks/TaskKanban.tsx:266-311`
- Modify: `src/components/tasks/TaskDialog.tsx:333-348, 930`

**Problema:** `DEFAULT_COLUMNS` e `DEFAULT_ETAPAS` usam IDs como `"default-todo"` que não são UUIDs válidos. Quando enviados ao Supabase, o DB rejeita.

- [ ] **Step 1: Gerar UUIDs para DEFAULT_COLUMNS em TaskKanban.tsx**

Substituir os IDs hardcoded por UUIDs fixos (gerados uma vez, constantes):

```typescript
// Substituir "default-todo", "default-progress", "default-review", "default-done"
// por UUIDs constantes:
const DEFAULT_COLUMNS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Pendente",
    color: "#6B7280",
    order_index: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Em Andamento",
    color: "#3B82F6",
    order_index: 1,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Revisão",
    color: "#F59E0B",
    order_index: 2,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Concluído",
    color: "#10B981",
    order_index: 3,
  },
];
```

- [ ] **Step 2: Aplicar a mesma correção em TaskDialog.tsx DEFAULT_ETAPAS**

Mesmos UUIDs constantes para manter consistência.

- [ ] **Step 3: Adicionar guard no handleSave (TaskDialog.tsx ~line 930)**

```typescript
// Antes de enviar, se quadro_column_id começa com "default-" ou "00000000-", setar null
const safeColumnId = formData.quadro_column_id?.startsWith("00000000-")
  ? null
  : formData.quadro_column_id || null;

const taskData = {
  ...otherFields,
  quadro_column_id: safeColumnId,
};
```

- [ ] **Step 4: Adicionar guard no onStatusChange (TaskKanban.tsx)**

Na função que atualiza status por drag-drop, verificar se columnId é um dos defaults antes de enviar:

```typescript
const isDefaultColumn = columnId?.startsWith("00000000-");
updates.quadro_column_id = isDefaultColumn ? null : columnId || null;
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks/TaskKanban.tsx src/components/tasks/TaskDialog.tsx
git commit -m "fix: prevent 'default-todo' non-UUID from being sent to DB (fixes #194, #195, #202)"
```

---

### Task 2: Fix tarefas em aprovação não abrindo (Issue #204)

**Files:**

- Modify: `src/pages/Notificacoes.tsx:238-260`

**Problema:** Query usa colunas que não existem na tabela `tasks` (`type`, `client_id`, `responsible_id`, `tags`, `parent_id`, `created_by`, `custom_fields`, `metadata`).

- [ ] **Step 1: Corrigir colunas no select da query de task**

```typescript
const { data } = await supabase
  .from("tasks")
  .select(
    "id, title, description, status, priority, team_id, responsible_name, responsible_avatar, deadline, progress, user_id, company_id, created_at, updated_at, quadro_column_id, quadro_user_id, etapa",
  )
  .eq("id", item.source_id)
  .single();
```

- [ ] **Step 2: Verificar que o TaskDialog recebe os campos corretos**

Conferir quais props o TaskDialog espera e mapear os dados retornados.

- [ ] **Step 3: Verificar build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Notificacoes.tsx
git commit -m "fix: correct task column names in notification query (fixes #204)"
```

---

### Task 3: Fix duplicação de agente sem client_id (Issue #203)

**Files:**

- Modify: `src/hooks/useIAAgents.tsx:168-179`

**Problema:** `duplicateAgent` não copia `client_id`, causando falha na execução de tarefas.

- [ ] **Step 1: Adicionar client_id na função duplicateAgent**

```typescript
await createAgent({
  agent_name: `${agent.agent_name} (Cópia)`,
  description: agent.description || undefined,
  prompt_base: agent.prompt_base,
  additional_instructions: agent.additional_instructions || undefined,
  model: agent.model,
  client_id: agent.client_id, // ← ADICIONAR
});
```

- [ ] **Step 2: Verificar se há outros campos que deveriam ser copiados**

Checar schema da tabela `ia_agents` e comparar com o que `duplicateAgent` copia.

- [ ] **Step 3: Verificar build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useIAAgents.tsx
git commit -m "fix: copy client_id when duplicating AI agent (fixes #203)"
```

---

### Task 4: Fix "Missing context" em subtasks (Issue #213)

**Files:**

- Modify: `src/hooks/useSubtasks.ts:65, 112`

**Problema:** Mutations disparam antes de `parentTask` carregar, gerando erro genérico "Missing context".

- [ ] **Step 1: Melhorar validação e mensagem de erro**

```typescript
// Em createSubtask mutationFn:
if (!parentTaskId || !companyId || !user)
  throw new Error("Dados de sessão não disponíveis");
if (!parentTask)
  throw new Error("Tarefa pai ainda carregando. Tente novamente.");

// Mesmo padrão em importRoteiro mutationFn
```

- [ ] **Step 2: Adicionar disabled state nos botões que disparam essas mutations**

Nos componentes que usam `createSubtask` e `importRoteiro`, desabilitar botões enquanto `parentTask` é `undefined`.

- [ ] **Step 3: Verificar build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSubtasks.ts
git commit -m "fix: better error handling when parent task not loaded (fixes #213)"
```

---

### Task 5: Investigar atividade no limbo (Issue #200)

**Files:**

- Investigate: `supabase/functions/agent-task-executor/index.ts:129, 278-282, 312-337`
- Modify: `supabase/functions/agent-task-executor/index.ts`

**Problema:** Task fica em `status: "progress"` quando agent-task-executor falha no meio da execução.

- [ ] **Step 1: Analisar o fluxo de recovery no agent-task-executor**

Verificar se todos os caminhos de erro fazem rollback do status da task.

- [ ] **Step 2: Adicionar try/catch global com recovery de status**

```typescript
try {
  // ... lógica do agente
} catch (error) {
  // Garantir que task volta para status anterior
  await supabase
    .from("tasks")
    .update({ status: "todo", etapa: "Pendente" })
    .eq("id", taskId);
  throw error;
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/agent-task-executor/index.ts
git commit -m "fix: ensure task status recovery on agent execution failure (fixes #200)"
```

---

## Chunk 2: Grupo B — Erros de DB/Query

### Task 6: Fix .single() → .maybeSingle() em company member (Issue #193)

**Files:**

- Modify: `src/hooks/useEmployeePermissions.tsx:169-174`

- [ ] **Step 1: Trocar .single() por .maybeSingle()**

```typescript
const { data: member, error: memberError } = await supabase
  .from("company_members")
  .select("role")
  .eq("user_id", user.id)
  .eq("company_id", activeCompany.company_id)
  .maybeSingle(); // ← trocar de .single()
```

- [ ] **Step 2: Tratar caso de member null (sem ser erro)**

Se `member` for null e não houver erro, tratar como usuário sem permissão (não lançar erro).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEmployeePermissions.tsx
git commit -m "fix: use maybeSingle for company member lookup (fixes #193)"
```

---

### Task 7: Fix CS TV dashboard token PGRST116 (Issue #192)

**Files:**

- Modify: `src/hooks/useCsTvDashboardToken.tsx:23-27`
- Modify: `supabase/functions/cs-tv-dashboard-data/index.ts:167-171`

- [ ] **Step 1: Trocar .single() por .maybeSingle() no hook frontend**

```typescript
const { data, error } = await supabase
  .from("companies")
  .select("cs_tv_dashboard_token")
  .eq("id", activeCompany.company_id)
  .maybeSingle(); // ← trocar
```

- [ ] **Step 2: Trocar .single() por .maybeSingle() na Edge Function**

```typescript
const { data: company, error: companyError } = await supabase
  .from("companies")
  .select("id, name")
  .eq("cs_tv_dashboard_token", token)
  .maybeSingle(); // ← trocar
```

- [ ] **Step 3: Tratar caso de company null com mensagem adequada**

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCsTvDashboardToken.tsx supabase/functions/cs-tv-dashboard-data/index.ts
git commit -m "fix: use maybeSingle for CS TV token queries (fixes #192)"
```

---

### Task 8: Fix cs_tv_displayed_alerts FK violation (Issue #205)

**Files:**

- Modify: `src/hooks/useCSTVRealtimeAlerts.tsx:218-228`

- [ ] **Step 1: Adicionar validação de conversation_id antes do insert**

```typescript
// Antes do insert, verificar se conversation_id existe
if (alert.conversation_id) {
  const { data: conv } = await supabase
    .from("whatsapp_conversations")
    .select("id")
    .eq("id", alert.conversation_id)
    .maybeSingle();

  if (!conv) {
    console.warn(
      "Conversation not found, skipping alert display mark:",
      alert.conversation_id,
    );
    return;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCSTVRealtimeAlerts.tsx
git commit -m "fix: validate conversation_id before marking alert as displayed (fixes #205)"
```

---

### Task 9: Fix RLS violation ao criar employee para agente (Issue #187)

**Files:**

- Modify: `src/components/agents/AgentEditContent.tsx:86-100`

**Problema:** `user_id` recebe `agentId` que não é um auth.users UUID válido, violando RLS/FK.

- [ ] **Step 1: Remover user_id do insert ou setar null**

```typescript
const { error } = await supabase.from("employees").insert({
  company_id: activeCompany.company_id,
  name: `🤖 ${agentName}`,
  email: `agent-${agentId}@ai.internal`,
  role: "Agente IA",
  status: "active",
  start_date: new Date().toISOString().split("T")[0],
  // user_id: REMOVIDO — agentId não é auth.users UUID
  ia_agent_id: agentId,
});
```

- [ ] **Step 2: Verificar se RLS policy de employees permite insert sem user_id**

Checar migrations para policies na tabela `employees`.

- [ ] **Step 3: Commit**

```bash
git add src/components/agents/AgentEditContent.tsx
git commit -m "fix: remove invalid user_id when creating AI agent employee (fixes #187)"
```

---

### Task 10: Fix WhatsApp realtime analysis FK (Issues #207, #191)

**Files:**

- Modify: `src/hooks/useWhatsAppRealtimeAnalysis.tsx:167-254`

**Problema:** Falta validação de conversation_id antes do upsert/insert. RLS já foi corrigida via migration, mas frontend ainda não valida.

- [ ] **Step 1: Adicionar validação de conversation_id antes do saveAnalysis**

```typescript
const saveAnalysis = useCallback(async (...) => {
  if (!companyId || !convId) return;

  // Verificar se conversation existe antes de salvar
  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('id', convId)
    .maybeSingle();

  if (!conv) {
    console.warn('[useWhatsAppRealtimeAnalysis] Conversation not found:', convId);
    return;
  }

  // ... resto do save
}, [...]);
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useWhatsAppRealtimeAnalysis.tsx
git commit -m "fix: validate conversation exists before saving analysis (fixes #207, #191)"
```

---

## Chunk 3: Grupo C — Edge Function Connectivity (Melhoria de UX)

### Task 11: Melhorar tratamento de erros de Edge Functions (Issues #219, #185, #214, #196, #221, #220, #209, #208, #206, #190)

**Nota:** Esses erros são majoritariamente transientes (timeout, rede, Supabase infra). A correção é melhorar o UX com retry e mensagens melhores.

**Files:**

- Investigate: Hooks que chamam Edge Functions (`supabase.functions.invoke(...)`)
- Possivelmente criar: `src/lib/edgeFunctionHelper.ts`

- [ ] **Step 1: Identificar todos os hooks que usam supabase.functions.invoke**

```bash
grep -r "functions.invoke" src/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: Criar wrapper com retry automático**

```typescript
// src/lib/invokeWithRetry.ts
export async function invokeWithRetry(
  supabase: SupabaseClient,
  functionName: string,
  options: { body: unknown },
  maxRetries = 2,
) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const { data, error } = await supabase.functions.invoke(
        functionName,
        options,
      );
      if (error) throw error;
      return data;
    } catch (err) {
      lastError = err;
      if (i < maxRetries)
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
}
```

- [ ] **Step 3: Aplicar nos hooks mais críticos (WhatsApp send, AI generation)**

Substituir chamadas diretas pelo wrapper nos hooks que mais geram erros.

- [ ] **Step 4: Melhorar mensagens de toast para o usuário**

Em vez de "Failed to send a request to the Edge Function", mostrar:

- "Erro de conexão. Tentando novamente..."
- "Serviço temporariamente indisponível. Tente novamente em alguns segundos."

- [ ] **Step 5: Commit**

```bash
git add src/lib/invokeWithRetry.ts src/hooks/...
git commit -m "fix: add retry logic and better error messages for Edge Functions (fixes #219, #185, #214, #196, #221, #220, #209, #208, #206, #190)"
```

---

## Chunk 4: Grupo D — DOM/React e UX

### Task 12: Fix "React is not defined" (Issue #189)

**Files:**

- Investigate: Componentes que usam `React.` sem import

- [ ] **Step 1: Buscar por uso de React.createElement ou React.\* sem import**

```bash
grep -rn "React\." src/ --include="*.tsx" --include="*.ts" | grep -v "import React" | grep -v "node_modules"
```

- [ ] **Step 2: Verificar se tsconfig tem `jsx: "react-jsx"`**

Se sim, `import React` não é necessário para JSX, mas `React.ElementType` etc. precisam do import.

- [ ] **Step 3: Adicionar imports faltando**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix: add missing React imports (fixes #189)"
```

---

### Task 13: Fix DOM insertBefore/removeChild errors (Issues #201, #188, #184)

**Nota:** Esses erros são tipicamente causados por race conditions entre React e extensões de browser/third-party scripts. Geralmente não são bugs do app.

- [ ] **Step 1: Adicionar ErrorBoundary global se não existir**

Verificar se já existe um ErrorBoundary que capture esses erros silenciosamente.

- [ ] **Step 2: Se necessário, adicionar filtro no error reporter**

Ignorar erros de `insertBefore`/`removeChild` no auto-reporter pois são de extensões de browser.

- [ ] **Step 3: Commit (se aplicável)**

---

### Task 14: Fix DialogTitle acessibilidade (Issue #216)

- [ ] **Step 1: Buscar DialogContent sem DialogTitle**

```bash
grep -rn "DialogContent" src/ --include="*.tsx" | grep -v "DialogTitle"
```

- [ ] **Step 2: Adicionar DialogTitle (com VisuallyHidden se necessário) nos modais faltantes**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix: add missing DialogTitle for accessibility (fixes #216)"
```

---

### Task 15: Fix upload file size validation (Issue #217)

**Files:**

- Investigate: Upload handlers no WhatsApp/chat

- [ ] **Step 1: Encontrar o handler de upload que gera o erro**

- [ ] **Step 2: Adicionar validação de tamanho ANTES do upload**

```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Supabase default)
if (file.size > MAX_FILE_SIZE) {
  toast.error(
    `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 50MB`,
  );
  return;
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "fix: validate file size before upload (fixes #217)"
```

---

### Task 16: Fechar issues não-acionáveis

- [ ] **Step 1: Fechar Issue #186 (404 rota `/t`)**

Rota truncada, não é bug real. Fechar com comentário explicativo.

- [ ] **Step 2: Fechar Issues #201, #188, #184 (DOM errors) se confirmado que são de extensões**

---

## Ordem de Execução Recomendada

```
Prioridade 1 (Impacto direto no usuário):
  Task 1  → fix default-todo UUID (#194, #195, #202)
  Task 2  → fix tarefas aprovação (#204)
  Task 3  → fix duplicação agente (#203)
  Task 4  → fix missing context (#213)

Prioridade 2 (Erros de DB silenciosos):
  Task 6  → fix .single() company member (#193)
  Task 7  → fix .single() CS TV token (#192)
  Task 8  → fix CS TV alerts FK (#205)
  Task 9  → fix employee RLS (#187)
  Task 10 → fix WhatsApp analysis FK (#207, #191)

Prioridade 3 (Investigação + melhoria UX):
  Task 5  → investigar limbo (#200)
  Task 11 → retry Edge Functions (10 issues)
  Task 12 → React is not defined (#189)

Prioridade 4 (Baixo impacto):
  Task 13 → DOM errors (extensões)
  Task 14 → DialogTitle (#216)
  Task 15 → Upload size (#217)
  Task 16 → Fechar não-acionáveis
```

## Resumo de Impacto

| Prioridade  | Tasks        | Issues Resolvidas | Esforço |
| ----------- | ------------ | ----------------- | ------- |
| 1 - Crítico | 1-4          | 7 issues          | ~30 min |
| 2 - Alto    | 6-10         | 7 issues          | ~30 min |
| 3 - Médio   | 5, 11-12     | 12 issues         | ~45 min |
| 4 - Baixo   | 13-16        | 4 issues          | ~20 min |
| **Total**   | **16 tasks** | **30 issues**     | **~2h** |
