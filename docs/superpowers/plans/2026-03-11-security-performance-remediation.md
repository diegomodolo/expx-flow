# Plano de Remediacao de Seguranca e Performance

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todas as vulnerabilidades de seguranca e problemas de performance identificados na auditoria completa do projeto Expx Flow.

**Architecture:** Correcoes organizadas por prioridade (CRITICAL > HIGH > MEDIUM > LOW) e por dominio (RLS/SQL, Edge Functions, Frontend Security, Performance). Cada task e independente e pode ser executada isoladamente.

**Tech Stack:** PostgreSQL (migrations), Deno (Edge Functions), React + TypeScript (frontend)

---

## Chunk 0: Correcoes CRITICAL URGENTES (RCE - Remote Code Execution)

### Task 0A: Bloquear execucao de codigo arbitrario sem autenticacao

**Files:**

- Modify: `supabase/config.toml`

`execute-skill`, `deploy-skill-function`, `test-skill-execution` e `generate-skill-ai` tem `verify_jwt = false` e permitem execucao de codigo arbitrario via `new Function()` e `dynamic import()`. Qualquer pessoa na internet pode executar codigo no servidor.

- [ ] **Step 1: Ativar JWT verification em config.toml**

```toml
[functions.execute-skill]
verify_jwt = true

[functions.deploy-skill-function]
verify_jwt = true

[functions.test-skill-execution]
verify_jwt = true

[functions.generate-skill-ai]
verify_jwt = true
```

- [ ] **Step 2: Adicionar verificacao de ownership nas edge functions**

Em cada funcao, apos autenticacao, verificar que o usuario pertence a empresa dona da skill:

```typescript
// Extrair user do JWT
const authHeader = req.headers.get("Authorization");
const {
  data: { user },
} = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));

// Verificar ownership
const { data: skill } = await supabase
  .from("ia_agent_skills")
  .select("company_id")
  .eq("id", skillId)
  .single();

const { data: membership } = await supabase
  .from("company_members")
  .select("id")
  .eq("user_id", user.id)
  .eq("company_id", skill.company_id)
  .single();

if (!membership) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 403,
  });
}
```

- [ ] **Step 3: Deploy das funcoes atualizadas**

```bash
supabase functions deploy execute-skill
supabase functions deploy deploy-skill-function
supabase functions deploy test-skill-execution
supabase functions deploy generate-skill-ai
```

- [ ] **Step 4: Commit**

```bash
git add supabase/config.toml supabase/functions/execute-skill/ supabase/functions/deploy-skill-function/ supabase/functions/test-skill-execution/ supabase/functions/generate-skill-ai/
git commit -m "fix(security): CRITICAL - bloquear RCE em skill functions sem autenticacao"
```

---

### Task 0B: Corrigir ia_agent_skills RLS - cross-tenant access

**Files:**

- Create: `supabase/migrations/20260312099999_fix_ia_agent_skills_rls.sql`

Policies de `ia_agent_skills` usam apenas `auth.role() = 'authenticated'` sem filtro de company_id. Qualquer usuario autenticado pode ler/modificar/deletar skills de qualquer empresa.

- [ ] **Step 1: Criar migration**

```sql
-- Fix: ia_agent_skills policies allow cross-tenant access
-- Current: auth.role() = 'authenticated' (no company filtering)

DROP POLICY IF EXISTS "Authenticated users can view skills" ON public.ia_agent_skills;
DROP POLICY IF EXISTS "Authenticated users can create skills" ON public.ia_agent_skills;
DROP POLICY IF EXISTS "Authenticated users can update skills" ON public.ia_agent_skills;
DROP POLICY IF EXISTS "Authenticated users can delete skills" ON public.ia_agent_skills;

CREATE POLICY "Users can view skills from their company"
  ON public.ia_agent_skills FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can create skills for their company"
  ON public.ia_agent_skills FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update skills from their company"
  ON public.ia_agent_skills FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete skills from their company"
  ON public.ia_agent_skills FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
```

- [ ] **Step 2: Aplicar e testar**
- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312099999_fix_ia_agent_skills_rls.sql
git commit -m "fix(security): CRITICAL - corrigir cross-tenant access em ia_agent_skills"
```

---

### Task 0C: Auditar e corrigir verify_jwt = false em funcoes sensiveis

**Files:**

- Modify: `supabase/config.toml`

64 edge functions tem `verify_jwt = false`. Alem das skill functions (Task 0A), estas tambem sao sensiveis:

- `send-instagram-message` — envio de mensagens sem auth
- `delete-tree-entity` — delecao de dados sem auth
- `duplicate-tree-entity` — duplicacao de dados sem auth
- `archive-whatsapp-chat` — modificacao de dados sem auth

- [ ] **Step 1: Ativar JWT nas funcoes sensiveis**

```toml
[functions.send-instagram-message]
verify_jwt = true

[functions.delete-tree-entity]
verify_jwt = true

[functions.duplicate-tree-entity]
verify_jwt = true

[functions.archive-whatsapp-chat]
verify_jwt = true
```

> **NOTA:** Verificar se alguma dessas funcoes e chamada por webhook externo antes de ativar JWT. Se for, manter `verify_jwt = false` mas adicionar validacao de secret/signature no codigo.

- [ ] **Step 2: Testar funcionalidades afetadas**
- [ ] **Step 3: Commit**

```bash
git add supabase/config.toml
git commit -m "fix(security): ativar JWT em edge functions sensiveis"
```

---

## Chunk 1: Correcoes CRITICAL de Seguranca

### Task 1: Corrigir RLS policies com subqueries aninhadas em tabelas protegidas

**Files:**

- Create: `supabase/migrations/20260312100000_fix_nested_rls_policies.sql`

As seguintes tabelas usam `SELECT company_id FROM public.employees WHERE user_id = auth.uid()` nas policies RLS, mas `employees` tem RLS ativado, causando falha silenciosa (0 rows retornados):

- `ia_agent_squads`
- `ia_agent_squad_members`
- `ia_agent_squad_flows`
- `ia_agent_squad_executions`
- `ia_agent_squad_execution_steps`
- `discord_config`

- [ ] **Step 1: Criar migration para corrigir policies**

```sql
-- Fix RLS policies that subquery employees table (has RLS enabled)
-- Replace with get_user_company_ids() SECURITY DEFINER function

-- ia_agent_squads
DROP POLICY IF EXISTS "Users can view squads from their company" ON public.ia_agent_squads;
CREATE POLICY "Users can view squads from their company"
  ON public.ia_agent_squads FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can insert squads for their company" ON public.ia_agent_squads;
CREATE POLICY "Users can insert squads for their company"
  ON public.ia_agent_squads FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can update squads from their company" ON public.ia_agent_squads;
CREATE POLICY "Users can update squads from their company"
  ON public.ia_agent_squads FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can delete squads from their company" ON public.ia_agent_squads;
CREATE POLICY "Users can delete squads from their company"
  ON public.ia_agent_squads FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

-- ia_agent_squad_members (uses squad -> company chain)
DROP POLICY IF EXISTS "Users can view squad members from their company" ON public.ia_agent_squad_members;
CREATE POLICY "Users can view squad members from their company"
  ON public.ia_agent_squad_members FOR SELECT
  USING (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can insert squad members for their company" ON public.ia_agent_squad_members;
CREATE POLICY "Users can insert squad members for their company"
  ON public.ia_agent_squad_members FOR INSERT
  WITH CHECK (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can update squad members from their company" ON public.ia_agent_squad_members;
CREATE POLICY "Users can update squad members from their company"
  ON public.ia_agent_squad_members FOR UPDATE
  USING (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can delete squad members from their company" ON public.ia_agent_squad_members;
CREATE POLICY "Users can delete squad members from their company"
  ON public.ia_agent_squad_members FOR DELETE
  USING (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

-- ia_agent_squad_flows
DROP POLICY IF EXISTS "Users can view squad flows from their company" ON public.ia_agent_squad_flows;
CREATE POLICY "Users can view squad flows from their company"
  ON public.ia_agent_squad_flows FOR SELECT
  USING (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can insert squad flows for their company" ON public.ia_agent_squad_flows;
CREATE POLICY "Users can insert squad flows for their company"
  ON public.ia_agent_squad_flows FOR INSERT
  WITH CHECK (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can update squad flows from their company" ON public.ia_agent_squad_flows;
CREATE POLICY "Users can update squad flows from their company"
  ON public.ia_agent_squad_flows FOR UPDATE
  USING (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can delete squad flows from their company" ON public.ia_agent_squad_flows;
CREATE POLICY "Users can delete squad flows from their company"
  ON public.ia_agent_squad_flows FOR DELETE
  USING (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

-- ia_agent_squad_executions
DROP POLICY IF EXISTS "Users can view squad executions from their company" ON public.ia_agent_squad_executions;
CREATE POLICY "Users can view squad executions from their company"
  ON public.ia_agent_squad_executions FOR SELECT
  USING (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can insert squad executions for their company" ON public.ia_agent_squad_executions;
CREATE POLICY "Users can insert squad executions for their company"
  ON public.ia_agent_squad_executions FOR INSERT
  WITH CHECK (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can update squad executions from their company" ON public.ia_agent_squad_executions;
CREATE POLICY "Users can update squad executions from their company"
  ON public.ia_agent_squad_executions FOR UPDATE
  USING (squad_id IN (
    SELECT id FROM public.ia_agent_squads
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

-- ia_agent_squad_execution_steps
DROP POLICY IF EXISTS "Users can view squad execution steps from their company" ON public.ia_agent_squad_execution_steps;
CREATE POLICY "Users can view squad execution steps from their company"
  ON public.ia_agent_squad_execution_steps FOR SELECT
  USING (execution_id IN (
    SELECT id FROM public.ia_agent_squad_executions
    WHERE squad_id IN (
      SELECT id FROM public.ia_agent_squads
      WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
    )
  ));

DROP POLICY IF EXISTS "Users can insert squad execution steps" ON public.ia_agent_squad_execution_steps;
CREATE POLICY "Users can insert squad execution steps"
  ON public.ia_agent_squad_execution_steps FOR INSERT
  WITH CHECK (execution_id IN (
    SELECT id FROM public.ia_agent_squad_executions
    WHERE squad_id IN (
      SELECT id FROM public.ia_agent_squads
      WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
    )
  ));

-- discord_config
DROP POLICY IF EXISTS "Users can view discord config from their company" ON public.discord_config;
CREATE POLICY "Users can view discord config from their company"
  ON public.discord_config FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can insert discord config for their company" ON public.discord_config;
CREATE POLICY "Users can insert discord config for their company"
  ON public.discord_config FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can update discord config from their company" ON public.discord_config;
CREATE POLICY "Users can update discord config from their company"
  ON public.discord_config FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can delete discord config from their company" ON public.discord_config;
CREATE POLICY "Users can delete discord config from their company"
  ON public.discord_config FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
```

- [ ] **Step 2: Aplicar migration**

Run: `supabase db push` ou executar SQL diretamente no Supabase Dashboard.

- [ ] **Step 3: Testar acesso**

Verificar no frontend que squads, executions e discord_config carregam dados corretamente.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260312100000_fix_nested_rls_policies.sql
git commit -m "fix(security): corrigir RLS policies com subqueries aninhadas em tabelas protegidas"
```

---

### Task 2: Corrigir policy FOR ALL USING (true) em ia_agent_telegram_conversations

**Files:**

- Create: `supabase/migrations/20260312100001_fix_telegram_conversations_rls.sql`

A policy atual permite que QUALQUER usuario autenticado leia/modifique conversas de telegram de TODAS as empresas.

- [ ] **Step 1: Criar migration**

```sql
-- Fix: ia_agent_telegram_conversations has FOR ALL USING (true) policy
-- This allows any authenticated user to access ALL telegram conversations across companies

DROP POLICY IF EXISTS "Service role can manage telegram conversations" ON public.ia_agent_telegram_conversations;

-- Replace with company-scoped policies
CREATE POLICY "Users can view telegram conversations from their company"
  ON public.ia_agent_telegram_conversations FOR SELECT
  USING (agent_id IN (
    SELECT id FROM public.ia_agents
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

CREATE POLICY "Users can insert telegram conversations for their company"
  ON public.ia_agent_telegram_conversations FOR INSERT
  WITH CHECK (agent_id IN (
    SELECT id FROM public.ia_agents
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

CREATE POLICY "Users can update telegram conversations from their company"
  ON public.ia_agent_telegram_conversations FOR UPDATE
  USING (agent_id IN (
    SELECT id FROM public.ia_agents
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

CREATE POLICY "Users can delete telegram conversations from their company"
  ON public.ia_agent_telegram_conversations FOR DELETE
  USING (agent_id IN (
    SELECT id FROM public.ia_agents
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));
```

- [ ] **Step 2: Aplicar migration e testar**
- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312100001_fix_telegram_conversations_rls.sql
git commit -m "fix(security): corrigir policy FOR ALL USING (true) em telegram conversations"
```

---

### Task 3: Corrigir cross-company data exposure em internal_polls

**Files:**

- Create: `supabase/migrations/20260312100002_fix_polls_rls.sql`

`internal_polls` e `internal_poll_votes` usam `USING (true)` - qualquer usuario ve polls de TODAS as empresas.

- [ ] **Step 1: Criar migration**

```sql
-- Fix: internal_polls and internal_poll_votes have USING (true) SELECT policies
-- This allows cross-company data exposure

DROP POLICY IF EXISTS "Polls are readable" ON public.internal_polls;
CREATE POLICY "Users can view polls from their company channels"
  ON public.internal_polls FOR SELECT
  USING (channel_id IN (
    SELECT id FROM public.internal_channels
    WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
  ));

DROP POLICY IF EXISTS "Poll votes are readable" ON public.internal_poll_votes;
CREATE POLICY "Users can view poll votes from their company"
  ON public.internal_poll_votes FOR SELECT
  USING (poll_id IN (
    SELECT id FROM public.internal_polls
    WHERE channel_id IN (
      SELECT id FROM public.internal_channels
      WHERE company_id IN (SELECT get_user_company_ids(auth.uid()))
    )
  ));
```

- [ ] **Step 2: Aplicar e testar**
- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312100002_fix_polls_rls.sql
git commit -m "fix(security): corrigir cross-company data exposure em polls"
```

---

### Task 4: Remover secrets hardcoded de trigger functions

**Files:**

- Create: `supabase/migrations/20260312100003_remove_hardcoded_secrets.sql`

`trigger_dm_agent_responder()` contem URL do Supabase e anon_key hardcoded.

- [ ] **Step 1: Criar migration**

```sql
-- Fix: Remove hardcoded supabase URL and anon_key from trigger function
-- Use current_setting() instead

CREATE OR REPLACE FUNCTION public.trigger_dm_agent_responder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  anon_key text;
BEGIN
  -- Use Vault or current_setting instead of hardcoded values
  supabase_url := current_setting('app.settings.supabase_url', true);
  anon_key := current_setting('app.settings.supabase_anon_key', true);

  IF supabase_url IS NULL THEN
    supabase_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1);
  END IF;

  IF anon_key IS NULL THEN
    anon_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1);
  END IF;

  -- Call the edge function
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/dm-agent-responder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'conversationId', NEW.id,
      'agentId', NEW.agent_id
    )
  );

  RETURN NEW;
END;
$$;
```

> **NOTA:** Antes de aplicar, verificar se `vault.decrypted_secrets` esta configurado com `supabase_url` e `supabase_anon_key`. Caso contrario, usar `current_setting` com valores configurados no postgresql.conf.

- [ ] **Step 2: Configurar secrets no Vault**
- [ ] **Step 3: Aplicar e testar**
- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260312100003_remove_hardcoded_secrets.sql
git commit -m "fix(security): remover secrets hardcoded de trigger functions"
```

---

## Chunk 2: Correcoes CRITICAL de Performance

### Task 5: Implementar React.lazy() para code splitting em App.tsx

**Files:**

- Modify: `src/App.tsx`

Todas as 174 paginas sao importadas estaticamente, resultando em bundle inicial de varios MB.

- [ ] **Step 1: Converter imports para React.lazy()**

Substituir todos os imports estaticos de paginas por `React.lazy()`:

```typescript
// ANTES:
import DashboardPage from "./pages/DashboardPage";

// DEPOIS:
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
```

- [ ] **Step 2: Envolver routes com Suspense**

```typescript
import { Suspense, lazy } from "react";

// No JSX, envolver o Routes:
<Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
  <Routes>
    {/* ... */}
  </Routes>
</Suspense>
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Verificar que o output mostra multiplos chunks em vez de um bundle monolitico.

- [ ] **Step 4: Testar navegacao no dev server**

Run: `npm run dev`
Navegar entre paginas e verificar que carregam corretamente.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "perf: implementar code splitting com React.lazy para todas as paginas"
```

---

### Task 6: Configurar staleTime padrao no QueryClient

**Files:**

- Modify: `src/App.tsx`

QueryClient criado sem defaults — staleTime: 0 causa refetch em todo mount.

- [ ] **Step 1: Adicionar defaults ao QueryClient**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos
      gcTime: 1000 * 60 * 10, // 10 minutos
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

- [ ] **Step 2: Testar que dados ainda atualizam apos acoes do usuario**

Verificar que `invalidateQueries` apos mutations continua funcionando.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "perf: configurar staleTime e gcTime padrao no QueryClient"
```

---

## Chunk 3: Correcoes HIGH de Seguranca — GRANTs Faltantes

### Task 7: Adicionar GRANTs faltantes em 28+ tabelas

**Files:**

- Create: `supabase/migrations/20260312100004_add_missing_grants.sql`

28+ tabelas tem RLS ativado e policies definidas, mas estao sem GRANT TO authenticated — frontend recebe arrays vazios sem erro.

- [ ] **Step 1: Criar migration com todos os GRANTs**

```sql
-- Add missing GRANTs for tables that have RLS but no GRANT to authenticated
-- Without GRANT, frontend receives empty arrays with no error

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_time_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_template_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_usage_defaults TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_flows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mind_maps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_polls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_poll_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_read_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_chat_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_hand_raises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_meet_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_meet_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_meet_integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_outputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_review_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_automation_flows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_keyword_triggers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_automation_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_content_labs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ui_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_message_mentions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clip_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_categorias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_classificacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_creative_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_client_contact_persons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_agent_squads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_agent_squad_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_agent_squad_flows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_agent_squad_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_agent_squad_execution_steps TO authenticated;

-- release_notes should be read-only for authenticated users
GRANT SELECT ON public.release_notes TO authenticated;
```

- [ ] **Step 2: Aplicar migration**
- [ ] **Step 3: Testar que dados carregam no frontend** (especialmente tarefas, canais internos, notificacoes)
- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260312100004_add_missing_grants.sql
git commit -m "fix(security): adicionar GRANTs faltantes em 40+ tabelas"
```

---

### Task 8: Corrigir clips INSERT policy sem restricao de company

**Files:**

- Create: `supabase/migrations/20260312100005_fix_clips_insert_policy.sql`

- [ ] **Step 1: Criar migration**

```sql
-- Fix: clips INSERT policy uses WITH CHECK (true) without restricting to service_role
DROP POLICY IF EXISTS "Service role can insert clips" ON public.clips;
CREATE POLICY "Service role can insert clips"
  ON public.clips FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add user-facing INSERT policy with company check
CREATE POLICY "Users can insert clips for their company"
  ON public.clips FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));
```

- [ ] **Step 2: Aplicar e testar**
- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312100005_fix_clips_insert_policy.sql
git commit -m "fix(security): restringir INSERT policy de clips por company"
```

---

## Chunk 4: Correcoes HIGH de Performance

### Task 9: Refatorar useClients para usar useQuery

**Files:**

- Modify: `src/hooks/useClients.tsx`

Hook usado em 52 componentes com `useState/useEffect` — cada consumer cria fetch independente.

- [ ] **Step 1: Refatorar para useQuery**

Substituir o pattern `useState` + `useEffect` + `fetchClients()` por `useQuery`:

```typescript
export function useClients(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: clients = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: async () => {
      // ... existing fetch logic
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2,
  });

  const refreshClients = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["clients", companyId] });
  }, [queryClient, companyId]);

  // ... mutations using useMutation + invalidateQueries
}
```

- [ ] **Step 2: Atualizar mutations para usar useMutation + invalidateQueries**
- [ ] **Step 3: Verificar que todos 52 consumers continuam funcionando**
- [ ] **Step 4: Commit**

```bash
git add src/hooks/useClients.tsx
git commit -m "perf: refatorar useClients para useQuery com cache automatico"
```

---

### Task 10: Adicionar selecao explicita de colunas nos hooks mais pesados

**Files:**

- Modify: `src/hooks/useClients.tsx`
- Modify: `src/hooks/useAllCampaignsTree.tsx`
- Modify: `src/hooks/useDashboardData.tsx`
- Modify: `src/hooks/useCSCockpitData.tsx`

160+ queries usam `SELECT *` desnecessariamente.

- [ ] **Step 1: Mapear colunas necessarias para cada hook**

Para cada hook, verificar quais campos sao realmente utilizados pelos consumers.

- [ ] **Step 2: Substituir `.select("*")` por colunas explicitas**

Exemplo:

```typescript
// ANTES:
.select("*")

// DEPOIS:
.select("id, name, avatar, status, company_id, created_at")
```

- [ ] **Step 3: Testar que nenhum componente quebrou por falta de campo**
- [ ] **Step 4: Commit**

```bash
git add src/hooks/useClients.tsx src/hooks/useAllCampaignsTree.tsx src/hooks/useDashboardData.tsx src/hooks/useCSCockpitData.tsx
git commit -m "perf: substituir SELECT * por colunas explicitas nos hooks mais pesados"
```

---

### Task 11: Paralelizar queries sequenciais em useDashboardData

**Files:**

- Modify: `src/hooks/useDashboardData.tsx`

5 queries sequenciais com `await` que poderiam rodar em paralelo.

- [ ] **Step 1: Refatorar para useQuery + Promise.all**

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["dashboard-data", companyId, dateRange],
  queryFn: async () => {
    const [
      currentCampaigns,
      previousCampaigns,
      currentGoogle,
      previousGoogle,
      clientsData,
    ] = await Promise.all([
      supabase.from("campaigns").select("...").eq("company_id", companyId),
      supabase.from("campaigns").select("...").eq("company_id", companyId),
      supabase.from("google_campaigns").select("..."),
      supabase.from("google_campaigns").select("..."),
      supabase.from("clients").select("id, name, avatar, status"),
    ]);
    // ... process data
  },
  enabled: !!companyId,
});
```

- [ ] **Step 2: Testar dashboard com dados reais**
- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDashboardData.tsx
git commit -m "perf: paralelizar queries sequenciais em useDashboardData"
```

---

## Chunk 5: Correcoes MEDIUM de Seguranca

### Task 12: Corrigir policies que fazem subquery em company_members (fragil)

**Files:**

- Create: `supabase/migrations/20260312100006_fix_company_members_subqueries.sql`

15+ tabelas usam `SELECT company_id FROM public.company_members WHERE user_id = auth.uid()` — fragil pois `company_members` tem RLS.

- [ ] **Step 1: Identificar todas as policies afetadas**

Buscar em todas as migrations por policies que referenciam `company_members` diretamente.

- [ ] **Step 2: Criar migration substituindo por get_user_company_ids()**

```sql
-- Replace company_members subqueries with get_user_company_ids() in:
-- task_time_tracking, checklist_templates, task_history, clip_jobs, clips,
-- calendar_shares, user_reports, google_meet_integrations, etc.

-- Exemplo para cada tabela:
-- DROP POLICY IF EXISTS "..." ON public.<tabela>;
-- CREATE POLICY "..." ON public.<tabela> FOR SELECT
--   USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
```

> **NOTA:** Esta task requer levantamento detalhado de cada policy. Executar `grep -r "company_members" supabase/migrations/` para listar todas.

- [ ] **Step 3: Aplicar e testar**
- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260312100006_fix_company_members_subqueries.sql
git commit -m "fix(security): substituir subqueries em company_members por get_user_company_ids()"
```

---

### Task 13: Adicionar search_path em funcoes SECURITY DEFINER

**Files:**

- Create: `supabase/migrations/20260312100007_fix_security_definer_search_path.sql`

Funcoes SECURITY DEFINER sem `SET search_path = public` sao vulneraveis a search_path manipulation.

- [ ] **Step 1: Identificar funcoes afetadas**

```bash
grep -r "SECURITY DEFINER" supabase/migrations/ | grep -v "search_path"
```

- [ ] **Step 2: Criar migration adicionando search_path**

```sql
-- Add SET search_path = public to SECURITY DEFINER functions missing it
ALTER FUNCTION public.auto_progress_historia_on_subtask_done()
  SET search_path = public;

ALTER FUNCTION public.set_updated_at()
  SECURITY DEFINER
  SET search_path = public;
-- ... outras funcoes identificadas
```

- [ ] **Step 3: Aplicar e testar**
- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260312100007_fix_security_definer_search_path.sql
git commit -m "fix(security): adicionar search_path em funcoes SECURITY DEFINER"
```

---

## Chunk 6: Correcoes MEDIUM de Performance

### Task 14: Adicionar paginacao em useWhatsAppMessages

**Files:**

- Modify: `src/hooks/useWhatsAppMessages.tsx`

Busca TODAS as mensagens sem `.limit()` — conversas longas ficam lentas.

- [ ] **Step 1: Adicionar limite e paginacao**

```typescript
const PAGE_SIZE = 50;

// Na query:
.select("*")
.eq("conversation_id", conversationId)
.order("created_at", { ascending: false })
.limit(PAGE_SIZE)
```

- [ ] **Step 2: Implementar "carregar mais" no componente**
- [ ] **Step 3: Testar com conversa longa**
- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWhatsAppMessages.tsx
git commit -m "perf: adicionar paginacao em useWhatsAppMessages"
```

---

### Task 15: Reduzir polling agressivo em hooks de notificacao

**Files:**

- Modify: `src/hooks/useUserNotifications.tsx`
- Modify: `src/hooks/useTasksAwaitingApproval.ts`
- Modify: `src/hooks/useChannelUnread.ts`

5+ queries polling a cada 15-30s geram 12-20 requests/minuto por usuario.

- [ ] **Step 1: Aumentar intervalos e adicionar refetchIntervalInBackground: false**

```typescript
// useUserNotifications.tsx
refetchInterval: 60_000,  // 60s (era 15s)
refetchIntervalInBackground: false,

// useTasksAwaitingApproval.ts
refetchInterval: 60_000,  // 60s (era 15s)
refetchIntervalInBackground: false,

// useChannelUnread.ts
refetchInterval: 60_000,  // 60s (era 30s)
refetchIntervalInBackground: false,
```

- [ ] **Step 2: Verificar que notificacoes ainda aparecem em tempo aceitavel**
- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUserNotifications.tsx src/hooks/useTasksAwaitingApproval.ts src/hooks/useChannelUnread.ts
git commit -m "perf: reduzir polling agressivo em hooks de notificacao"
```

---

### Task 16: Paralelizar queries em useCSCockpitData

**Files:**

- Modify: `src/hooks/useCSCockpitData.tsx`

5+ queries sequenciais dentro de um unico `queryFn`.

- [ ] **Step 1: Usar Promise.all para queries independentes**

```typescript
const [campaigns, milestones, qbrReports, contacts] = await Promise.all([
  supabase.from("campaigns").select("...").in("client_id", clientIds),
  supabase.from("milestones").select("...").in("client_id", clientIds),
  supabase.from("qbr_reports").select("...").in("client_id", clientIds),
  supabase
    .from("whatsapp_contacts")
    .select("...")
    .in("company_id", [companyId]),
]);
```

- [ ] **Step 2: Testar dashboard CS**
- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCSCockpitData.tsx
git commit -m "perf: paralelizar queries sequenciais em useCSCockpitData"
```

---

### Task 17: Adicionar React.memo em componentes de lista

**Files:**

- Modify: `src/components/tasks/` (Kanban cards)
- Modify: `src/components/dashboard/DashboardSidebar.tsx` (sidebar items)

Apenas 5 componentes usam React.memo no projeto inteiro.

- [ ] **Step 1: Identificar componentes de item de lista mais renderizados**

Priorizar: Kanban cards, sidebar items, tabelas de clientes.

- [ ] **Step 2: Envolver com React.memo**

```typescript
export const KanbanCard = React.memo(function KanbanCard({ task }: Props) {
  // ... existing component
});
```

- [ ] **Step 3: Memoizar callbacks com useCallback nos pais**
- [ ] **Step 4: Testar que drag-and-drop do Kanban continua funcionando**
- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/ src/components/dashboard/DashboardSidebar.tsx
git commit -m "perf: adicionar React.memo em componentes de lista criticos"
```

---

### Task 18: Memoizar value do CompanyContext

**Files:**

- Modify: `src/contexts/CompanyContext.tsx`

Value object recriado a cada render, causando re-render em todos consumers.

- [ ] **Step 1: Envolver value com useMemo e callbacks com useCallback**

```typescript
const setActiveCompanyMemo = useCallback(
  (company) => {
    // ... existing logic
  },
  [deps],
);

const value = useMemo(
  () => ({
    activeCompany,
    companies,
    setActiveCompany: setActiveCompanyMemo,
    createCompany: createCompanyMemo,
    updateCompany: updateCompanyMemo,
    refreshCompanies: refreshCompaniesMemo,
    isLoading,
  }),
  [activeCompany, companies, isLoading, ...memoizedCallbacks],
);
```

- [ ] **Step 2: Testar troca de empresa e CRUD**
- [ ] **Step 3: Commit**

```bash
git add src/contexts/CompanyContext.tsx
git commit -m "perf: memoizar value do CompanyContext para evitar re-renders"
```

---

## Chunk 7: Correcoes HIGH de Performance (adicional)

### Task 19: Remover import \* as LucideIcons (importa 1400+ icones)

**Files:**

- Modify: `src/pages/Roteiros.tsx`
- Modify: `src/pages/RoteiroDetalhe.tsx`
- Modify: `src/components/roteiros/IconPicker.tsx`

`import * as LucideIcons from 'lucide-react'` importa todos os ~1400 icones (~200KB+ minified) no bundle.

- [ ] **Step 1: Substituir por importacao dinamica no IconPicker**

```typescript
// IconPicker.tsx - usar dynamic import
const iconNames = ["Home", "Star", "Heart", "Settings", ...]; // lista curada

// Ou lazy import:
const loadIcon = async (name: string) => {
  const mod = await import('lucide-react');
  return mod[name];
};
```

- [ ] **Step 2: Nos Roteiros, importar apenas icones usados**

```typescript
// ANTES:
import * as LucideIcons from "lucide-react";

// DEPOIS:
import { Play, Pause, FileText, Video } from "lucide-react";
```

- [ ] **Step 3: Verificar que IconPicker continua funcionando**
- [ ] **Step 4: Commit**

```bash
git add src/pages/Roteiros.tsx src/pages/RoteiroDetalhe.tsx src/components/roteiros/IconPicker.tsx
git commit -m "perf: remover import * de lucide-react (~200KB)"
```

---

### Task 20: Adicionar index em campaigns.company_id

**Files:**

- Create: `supabase/migrations/20260312100008_add_campaigns_company_id_index.sql`

Tabela `campaigns` nao tem index em `company_id` apesar de ser o filtro principal em quase toda query.

- [ ] **Step 1: Criar migration**

```sql
-- campaigns table is missing company_id index despite being the primary filter
-- google_campaigns already has this index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_company_id
  ON public.campaigns (company_id);

-- Also add index on clients.company_id if missing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_company_id
  ON public.clients (company_id);
```

- [ ] **Step 2: Aplicar migration**
- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312100008_add_campaigns_company_id_index.sql
git commit -m "perf: adicionar index em campaigns.company_id e clients.company_id"
```

---

### Task 21: Reduzir polling ultra-agressivo (5s e 10s)

**Files:**

- Modify: `src/components/internal-channels/HandRaiseButton.tsx`
- Modify: `src/components/tasks/my-day/MyDayPanel.tsx`
- Modify: `src/components/tasks/TaskKanban.tsx`

HandRaiseButton poll a cada 5s, MyDayPanel e TaskKanban a cada 10s.

- [ ] **Step 1: Aumentar intervalos**

```typescript
// HandRaiseButton.tsx: 5s -> 30s
refetchInterval: 30_000,
refetchIntervalInBackground: false,

// MyDayPanel.tsx: 10s -> 60s
refetchInterval: 60_000,
refetchIntervalInBackground: false,

// TaskKanban.tsx: 10s -> 30s
refetchInterval: 30_000,
refetchIntervalInBackground: false,
```

- [ ] **Step 2: Testar funcionalidades afetadas**
- [ ] **Step 3: Commit**

```bash
git add src/components/internal-channels/HandRaiseButton.tsx src/components/tasks/my-day/MyDayPanel.tsx src/components/tasks/TaskKanban.tsx
git commit -m "perf: reduzir polling ultra-agressivo (5s/10s -> 30s/60s)"
```

---

### Task 22: Refatorar useEmployeePermissions para useQuery

**Files:**

- Modify: `src/hooks/useEmployeePermissions.tsx`

Hook roda em TODA pagina (route guards) com `useState/useEffect` sem cache. Cada navegacao refaz as queries de permissao.

- [ ] **Step 1: Refatorar para useQuery com staleTime alto**

```typescript
const { data: permissions } = useQuery({
  queryKey: ["employee-permissions", userId, companyId],
  queryFn: async () => {
    // ... existing fetch logic
  },
  enabled: !!userId && !!companyId,
  staleTime: 1000 * 60 * 5, // 5 minutos - permissoes mudam raramente
  gcTime: 1000 * 60 * 30, // 30 minutos
});
```

- [ ] **Step 2: Testar navegacao entre paginas protegidas**
- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEmployeePermissions.tsx
git commit -m "perf: refatorar useEmployeePermissions para useQuery com cache"
```

---

## Resumo Consolidado

### Achados por Dominio e Severidade

| Dominio           | CRITICAL | HIGH   | MEDIUM | LOW    | Total  |
| ----------------- | -------- | ------ | ------ | ------ | ------ |
| RLS / SQL         | 3        | 6      | 6      | 3      | 18     |
| Edge Functions    | 7        | 7      | 8      | 8      | 30     |
| Frontend Security | 0        | 2      | 7      | 3      | 12     |
| Performance       | 4        | 10     | 6      | 3      | 23     |
| **Total**         | **14**   | **25** | **27** | **17** | **83** |

### Prioridade de Execucao

| Prioridade          | Tasks       | Impacto                                                           |
| ------------------- | ----------- | ----------------------------------------------------------------- |
| **P0 (EMERGENCIA)** | 0A-0C       | **RCE sem autenticacao**, cross-tenant skill access, JWT faltando |
| P0 (Imediato)       | 1-4         | Dados inacessiveis, leak cross-company, secrets expostos          |
| P1 (Urgente)        | 5-8         | Bundle 5x menor, 50-70% menos API calls, 40+ tabelas acessiveis   |
| P2 (Importante)     | 9-13, 19-22 | Cache de dados, colunas otimizadas, RLS robusto, indexes, imports |
| P3 (Melhoria)       | 14-18       | Paginacao, polling otimizado, re-renders reduzidos                |

### Issues NAO cobertos neste plano (requerem plano separado)

**Edge Functions (da auditoria separada):**

- RCE potencial via `execute-skill` (aceita code arbitrario)
- Sessoes CRM sem expiracao
- 15+ endpoints sem JWT verification que deveriam ter
- Falta de rate limiting em funcoes publicas
- Falta de validacao de webhook signatures (WhatsApp, Stripe, etc.)
- Error messages expondo stack traces

**Frontend (da auditoria separada):**

- XSS potencial em WeeklyReportTab (dangerouslySetInnerHTML)
- SuperAdmin guard fraco (verificacao client-side)
- 12 rotas faltando PermissionProtectedRoute
- Sessao CRM sem expiracao no frontend
- `facebook_integrations` SELECT \* expoe `access_token` no browser
- `whatsapp_instances` SELECT \* expoe `uazapi_token` no browser

**SQL / RLS adicional (requer investigacao):**

- `super_admins` tem policy circular auto-referenciante
- `ai_api_keys` armazena chaves em texto plano (considerar pgcrypto)
- String interpolation em queries GAQL do Google Ads (risco de injection)
- 254 tabelas potencialmente sem GRANT (verificar quais ja tem via defaults do Supabase)

**Performance adicional (requer investigacao):**

- 100+ Edge Functions com `for(...) { await ... }` que poderiam usar Promise.all/batching
- Import pesado de XLSX (~400KB), @xyflow, @blocknote, @monaco-editor, pptxgenjs sem lazy load
- Nenhum uso de list virtualization (react-window / @tanstack/virtual) para listas grandes
- Hooks com realtime subscription + polling redundante ao mesmo tempo

> Estes itens devem ser tratados em planos separados focados em cada dominio.
