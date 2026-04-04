# Fix GitHub Bugs - Plano de Implementacao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 6 bugs reportados no GitHub (issues #363, #356, #341, #350, #352, #366)

**Architecture:** Fixes independentes em frontend e edge functions. Cada bug e uma task isolada com commit proprio.

**Tech Stack:** React/TypeScript, Supabase Edge Functions (Deno), PostgreSQL

---

## Bugs por Prioridade

| #   | Issue                                       | Severidade | Tipo                     |
| --- | ------------------------------------------- | ---------- | ------------------------ |
| 1   | #356 - Cadastro de usuarios sem email/senha | Alta       | Edge Function            |
| 2   | #363 - Backlog nao carrega conteudo         | Alta       | Frontend                 |
| 3   | #350 - Date invalida "" no planejamento     | Media      | Frontend                 |
| 4   | #352 - Upload excede tamanho maximo         | Media      | Frontend                 |
| 5   | #366 - WhatsApp audio download falha        | Media      | Edge Function + Frontend |
| 6   | #341 - Agentes IA nao executam tarefas      | Alta       | ExpxAgents (outro repo)  |

> **Nota:** Issue #341 pertence ao repo ExpxAgents_2 (server/scheduler). Sera documentada mas nao implementada neste plano.

---

### Task 1: Fix #356 — Cadastro de novos usuarios (email + senha)

**Problema:** `email_confirm: false` impede login por senha. Se `RESEND_API_KEY` nao existe, email nao envia e nao da erro.

**Files:**

- Modify: `supabase/functions/invite-with-magic-link/index.ts:59` — mudar `email_confirm` para `true`
- Modify: `supabase/functions/invite-with-magic-link/index.ts:113` — adicionar erro quando RESEND_API_KEY ausente

- [ ] **Step 1: Alterar email_confirm para true**

Em `supabase/functions/invite-with-magic-link/index.ts` linha 59, mudar:

```typescript
email_confirm: false, // Não confirmar automaticamente
```

Para:

```typescript
email_confirm: true, // Confirmar email automaticamente para permitir login por senha
```

- [ ] **Step 2: Adicionar fallback e warning quando RESEND_API_KEY ausente**

Em `supabase/functions/invite-with-magic-link/index.ts` linha 113, antes do `if (resendApiKey)`, adicionar log de warning:

```typescript
if (!resendApiKey) {
  console.warn(
    "RESEND_API_KEY not configured - email will not be sent to user",
  );
}
```

- [ ] **Step 3: Deploy da edge function**

```bash
supabase functions deploy invite-with-magic-link
```

- [ ] **Step 4: Testar criando um novo colaborador**

Acessar /colaboradores, criar novo usuario, verificar que:

1. Email de convite e enviado
2. Senha temporaria funciona para login

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/invite-with-magic-link/index.ts
git commit -m "fix: confirmar email automaticamente ao criar usuario (#356)"
```

---

### Task 2: Fix #363 — Backlog Command Center nao carrega

**Problema:** Query invalidation usa queryKey incompleta (sem company_id), causando cache stale. Tambem falta loading state quando activeCompany ainda nao carregou.

**Files:**

- Modify: `src/hooks/useBacklogCommandCenter.ts` — corrigir invalidateQueries

- [ ] **Step 1: Identificar todas as invalidacoes incorretas**

Buscar `invalidateQueries` em `src/hooks/useBacklogCommandCenter.ts`. As invalidacoes usam queryKey parcial sem `company_id`:

```typescript
queryClient.invalidateQueries({ queryKey: ["backlog-center-tasks"] });
```

- [ ] **Step 2: Corrigir invalidacoes para incluir company_id**

Em cada chamada de `invalidateQueries`, garantir que o queryKey inclua `activeCompany?.company_id`:

```typescript
queryClient.invalidateQueries({
  queryKey: ["backlog-center-tasks", activeCompany?.company_id],
});
queryClient.invalidateQueries({
  queryKey: ["backlog-center-activity", activeCompany?.company_id],
});
```

- [ ] **Step 3: Verificar se pagina exibe loading enquanto activeCompany carrega**

Em `src/pages/BacklogCommandCenter.tsx`, verificar se existe loading state. Se nao, adicionar:

```typescript
if (!activeCompany?.company_id) {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 4: Testar**

Acessar /backlog-command-center e verificar que:

1. Loading aparece brevemente
2. Conteudo carrega corretamente
3. Apos mover tarefas, dados atualizam

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBacklogCommandCenter.ts src/pages/BacklogCommandCenter.tsx
git commit -m "fix: corrigir carregamento do Backlog Command Center (#363)"
```

---

### Task 3: Fix #350 — Date invalida "" no planejamento de conteudo

**Problema:** Input date envia string vazia "" ao Supabase quando usuario limpa o campo. PostgreSQL rejeita "" para tipo DATE.

**Files:**

- Modify: `src/components/content-planner/ContentPlanPostCard.tsx:1834-1836`

- [ ] **Step 1: Corrigir onChange do campo de data**

Em `src/components/content-planner/ContentPlanPostCard.tsx` linha 1834-1836, mudar:

```typescript
onChange={(e) =>
  onUpdate({ scheduled_date: e.target.value })
}
```

Para:

```typescript
onChange={(e) =>
  onUpdate({ scheduled_date: e.target.value || null })
}
```

- [ ] **Step 2: Verificar se existem outros campos de data com mesmo problema**

Buscar por `type="date"` no mesmo arquivo e aplicar o mesmo fix (`|| null`) em todos os onChange handlers que enviam para o banco.

- [ ] **Step 3: Testar**

Acessar /geradores/planejamento-conteudo, limpar um campo de data, verificar que nao ocorre erro 22007.

- [ ] **Step 4: Commit**

```bash
git add src/components/content-planner/ContentPlanPostCard.tsx
git commit -m "fix: enviar null ao inves de string vazia para campos date (#350)"
```

---

### Task 4: Fix #352 — Upload excede tamanho maximo

**Problema:** Upload de imagem no ContentPlanPostCard nao valida tamanho do arquivo antes de enviar ao Supabase Storage. O componente `image-uploader.tsx` tem validacao, mas os uploads diretos no card nao.

**Files:**

- Modify: `src/components/content-planner/ContentPlanPostCard.tsx:625-654` e `1995-2024`

- [ ] **Step 1: Adicionar validacao de tamanho no primeiro upload handler**

Em `src/components/content-planner/ContentPlanPostCard.tsx` ~linha 625-654, antes do `supabase.storage.upload()`, adicionar:

```typescript
const MAX_FILE_SIZE_MB = 5;
if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
  toast.error(`Arquivo muito grande. Maximo permitido: ${MAX_FILE_SIZE_MB}MB`);
  return;
}
```

- [ ] **Step 2: Adicionar mesma validacao no segundo upload handler**

Em ~linha 1995-2024, adicionar a mesma validacao de tamanho antes do upload.

- [ ] **Step 3: Testar**

Tentar fazer upload de arquivo >5MB no planejamento de conteudo. Deve mostrar toast de erro e nao tentar upload.

- [ ] **Step 4: Commit**

```bash
git add src/components/content-planner/ContentPlanPostCard.tsx
git commit -m "fix: validar tamanho maximo de upload antes de enviar (#352)"
```

---

### Task 5: Fix #366 — WhatsApp audio download falha

**Problema:** `downloadAndCacheMedia()` retorna null sem detalhe do erro. Edge function `download-whatsapp-media` pode falhar por response format inconsistente do UazapiGO (`fileURL` vs `fileUrl`).

**Files:**

- Modify: `src/hooks/useWhatsAppMediaCache.ts` — melhorar error handling
- Modify: `supabase/functions/download-whatsapp-media/index.ts` — normalizar campo de resposta
- Modify: `src/components/whatsapp/WhatsAppAudioPlayer.tsx` — melhorar mensagem de erro

- [ ] **Step 1: Normalizar campos de resposta no edge function**

Em `supabase/functions/download-whatsapp-media/index.ts`, na parte que processa a resposta do UazapiGO, garantir que aceita ambos formatos:

```typescript
const fileUrl =
  responseData.fileURL || responseData.fileUrl || responseData.file_url;
const base64 =
  responseData.base64Data || responseData.base64 || responseData.data;
```

- [ ] **Step 2: Adicionar log detalhado no edge function**

Antes de retornar erro, logar a resposta completa do UazapiGO para debug:

```typescript
console.error(
  "UazapiGO response format unexpected:",
  JSON.stringify(responseData),
);
```

- [ ] **Step 3: Melhorar error handling no hook**

Em `src/hooks/useWhatsAppMediaCache.ts`, quando a resposta falha, incluir status code e mensagem no erro:

```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error(
    `[WhatsApp Media] Download failed: ${response.status} - ${errorText}`,
  );
  return null;
}
```

- [ ] **Step 4: Deploy edge function**

```bash
supabase functions deploy download-whatsapp-media
```

- [ ] **Step 5: Testar**

Abrir conversa WhatsApp com audio, verificar que audio carrega e toca.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useWhatsAppMediaCache.ts supabase/functions/download-whatsapp-media/index.ts src/components/whatsapp/WhatsAppAudioPlayer.tsx
git commit -m "fix: melhorar download de audio WhatsApp e normalizar response (#366)"
```

---

### Task 6: (Documentacao) #341 — Agentes IA nao executam tarefas

**Problema:** No repo ExpxAgents_2, o `job-runner.ts` executa o squad inteiro como uma unica conversa. Nao itera por step/agente individualmente. Tasks do kanban sao criadas mas agentes individuais nao sao invocados.

**Arquivos no ExpxAgents_2:**

- `server/src/scheduler/job-runner.ts:169-303` — execucao monolitica
- `server/src/bridge/chat-handler.ts:114-215` — mesma issue
- `server/src/services/pipeline-task-service.ts` — tracking correto mas nao usado

> **Acao:** Este bug requer investigacao e fix no repo ExpxAgents_2. Nao sera implementado neste plano. Abrir uma sessao separada para este repo.

---

## Ordem de Execucao Recomendada

1. **Task 3** (date fix) — rapido, 1 linha
2. **Task 4** (upload validation) — rapido, 2 pontos
3. **Task 2** (backlog) — medio, query invalidation
4. **Task 1** (cadastro usuarios) — medio, edge function + deploy
5. **Task 5** (whatsapp audio) — medio, edge function + frontend
6. **Task 6** (agentes IA) — separado, outro repo
