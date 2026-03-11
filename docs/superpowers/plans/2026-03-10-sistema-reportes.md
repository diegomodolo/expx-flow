# Sistema de Reportes — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In-app bug/feature reporting page that creates GitHub Issues with correct labels, allowing Claude Code to auto-analyze and implement/refuse, with status visible to the user.

**Architecture:** Hybrid Supabase + GitHub. Reports are stored locally in `user_reports` table for fast listing. Edge Functions create GitHub Issues and fetch status updates on demand. The existing `claude.yml` workflow handles automated analysis.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, TanStack React Query, Supabase (Postgres + Edge Functions + RLS), GitHub REST API.

**Spec:** `docs/superpowers/specs/2026-03-10-sistema-reportes-design.md`

---

## Chunk 1: Database & Backend

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260310120000_user_reports.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Create user_reports table
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  extra_fields JSONB DEFAULT '{}'::jsonb,
  user_name TEXT NOT NULL DEFAULT '',
  github_issue_number INTEGER,
  github_issue_url TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'implementado', 'recusado')),
  claude_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_user_reports_company_id ON public.user_reports(company_id);
CREATE INDEX idx_user_reports_user_id ON public.user_reports(user_id);
CREATE INDEX idx_user_reports_status ON public.user_reports(status);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- SELECT: users see all reports from their company
CREATE POLICY "Users can view reports from their company"
ON public.user_reports
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: users can only insert with their own user_id
CREATE POLICY "Users can create their own reports"
ON public.user_reports
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: only service_role (Edge Functions) can update
-- No user-level UPDATE policy = users cannot update

-- DELETE: not allowed
-- No DELETE policy = users cannot delete

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_reports_updated_at
  BEFORE UPDATE ON public.user_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_reports_updated_at();
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` or apply via Supabase dashboard.
Expected: Table `user_reports` created with RLS policies and indices.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260310120000_user_reports.sql
git commit -m "feat: add user_reports table with RLS for report system"
```

---

### Task 2: Edge Function — create-github-issue

**Files:**
- Create: `supabase/functions/create-github-issue/index.ts`
- Modify: `supabase/config.toml` (add verify_jwt entry)

- [ ] **Step 1: Create the Edge Function**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateReportRequest {
  type: "bug" | "feature";
  title: string;
  description: string;
  extra_fields: Record<string, string>;
  user_name: string;
  company_id: string;
  user_id: string;
}

function buildBugIssueBody(req: CreateReportRequest): string {
  const ef = req.extra_fields;
  let body = `> Reportado por **${req.user_name}** via sistema\n\n`;
  if (ef.url) body += `### URL onde o erro ocorre\n${ef.url}\n\n`;
  body += `### Descrição do bug\n${req.description}\n\n`;
  if (ef.stack_trace) body += `### Stack trace / erro no console\n\`\`\`\n${ef.stack_trace}\n\`\`\`\n\n`;
  if (ef.steps) body += `### Passos para reproduzir\n${ef.steps}\n\n`;
  if (ef.suspected_file) body += `### Arquivo suspeito\n${ef.suspected_file}\n\n`;
  return body;
}

function buildFeatureIssueBody(req: CreateReportRequest): string {
  const ef = req.extra_fields;
  let body = `> Sugerido por **${req.user_name}** via sistema\n\n`;
  body += `### Nome da Feature\n${req.title}\n\n`;
  if (ef.category) body += `### Categoria\n${ef.category}\n\n`;
  body += `### Problema que resolve\n${ef.problem || req.description}\n\n`;
  if (ef.proposal) body += `### Proposta de implementação\n${ef.proposal}\n\n`;
  if (ef.impact) body += `### Impacto estimado\n${ef.impact}\n\n`;
  if (ef.complexity) body += `### Complexidade estimada\n${ef.complexity}\n\n`;
  if (ef.area) body += `### Área do sistema\n${ef.area}\n\n`;
  return body;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const githubPat = Deno.env.get("GITHUB_PAT");
    const repoOwner = Deno.env.get("GITHUB_REPO_OWNER");
    const repoName = Deno.env.get("GITHUB_REPO_NAME");

    if (!githubPat || !repoOwner || !repoName) {
      throw new Error("Configuração do GitHub não encontrada");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: CreateReportRequest = await req.json();
    const { type, title, description, extra_fields, user_name, company_id, user_id } = body;

    // Build issue body based on type
    const issueBody = type === "bug"
      ? buildBugIssueBody(body)
      : buildFeatureIssueBody(body);

    // Define labels - both types get claude-analyze so the workflow picks them up
    const labels = type === "bug"
      ? ["bug", "claude-analyze"]
      : ["feature-suggestion", "claude-analyze"];

    // Create GitHub issue
    const ghResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: type === "bug" ? `[Bug] ${title}` : `[Feature] ${title}`,
          body: issueBody,
          labels,
        }),
      }
    );

    if (!ghResponse.ok) {
      const ghError = await ghResponse.text();
      console.error("GitHub API error:", ghError);
      throw new Error("Não foi possível criar a issue no GitHub");
    }

    const ghData = await ghResponse.json();

    // Save report in Supabase
    const { data: report, error: dbError } = await supabase
      .from("user_reports")
      .insert({
        company_id,
        user_id,
        type,
        title,
        description,
        extra_fields,
        user_name,
        github_issue_number: ghData.number,
        github_issue_url: ghData.html_url,
        status: "aberto",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      throw new Error("Issue criada no GitHub mas erro ao salvar localmente");
    }

    return new Response(
      JSON.stringify({ success: true, data: report }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro ao criar reporte:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
```

- [ ] **Step 2: Add config.toml entry**

Add to `supabase/config.toml`:

```toml
[functions.create-github-issue]
verify_jwt = true
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/create-github-issue/index.ts supabase/config.toml
git commit -m "feat: add create-github-issue edge function"
```

---

### Task 3: Edge Function — fetch-github-issue-status

**Files:**
- Create: `supabase/functions/fetch-github-issue-status/index.ts`
- Modify: `supabase/config.toml` (add verify_jwt entry)

- [ ] **Step 1: Create the Edge Function**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FetchStatusRequest {
  report_id: string;
  github_issue_number: number;
}

function determineStatus(
  issueState: string,
  labels: string[],
  hasClaudeComment: boolean
): string {
  if (issueState === "open") {
    return hasClaudeComment ? "em_analise" : "aberto";
  }
  // Issue is closed
  if (labels.includes("wontfix")) {
    return "recusado";
  }
  // Fallback: closed without wontfix = implemented
  return "implementado";
}

function extractClaudeResponse(comments: any[]): string | null {
  // Look for comments from Claude/bot accounts (github-actions[bot] or similar)
  const claudeComments = comments.filter((c: any) =>
    c.user?.login?.includes("github-actions") ||
    c.user?.login?.includes("claude") ||
    c.user?.type === "Bot"
  );

  if (claudeComments.length === 0) return null;

  // Return the most recent Claude comment
  return claudeComments[claudeComments.length - 1].body;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const githubPat = Deno.env.get("GITHUB_PAT");
    const repoOwner = Deno.env.get("GITHUB_REPO_OWNER");
    const repoName = Deno.env.get("GITHUB_REPO_NAME");

    if (!githubPat || !repoOwner || !repoName) {
      throw new Error("Configuração do GitHub não encontrada");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { report_id, github_issue_number }: FetchStatusRequest = await req.json();

    // Fetch issue from GitHub
    const issueRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${github_issue_number}`,
      {
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!issueRes.ok) {
      // If issue not found, return cached data without error
      if (issueRes.status === 404) {
        const { data: cached } = await supabase
          .from("user_reports")
          .select("*")
          .eq("id", report_id)
          .single();
        return new Response(
          JSON.stringify({ success: true, data: cached, from_cache: true }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw new Error("Não foi possível consultar o GitHub");
    }

    const issueData = await issueRes.json();

    // Fetch comments
    const commentsRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${github_issue_number}/comments`,
      {
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const comments = commentsRes.ok ? await commentsRes.json() : [];

    const labels = (issueData.labels || []).map((l: any) =>
      typeof l === "string" ? l : l.name
    );
    const hasClaudeComment = comments.some(
      (c: any) =>
        c.user?.login?.includes("github-actions") ||
        c.user?.login?.includes("claude") ||
        c.user?.type === "Bot"
    );

    const newStatus = determineStatus(issueData.state, labels, hasClaudeComment);
    const claudeResponse = extractClaudeResponse(comments);

    // Update Supabase record if changed
    const { data: updated, error: updateError } = await supabase
      .from("user_reports")
      .update({
        status: newStatus,
        claude_response: claudeResponse,
      })
      .eq("id", report_id)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      throw new Error("Erro ao atualizar status do reporte");
    }

    return new Response(
      JSON.stringify({ success: true, data: updated }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro ao buscar status:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
```

- [ ] **Step 2: Add config.toml entry**

Add to `supabase/config.toml`:

```toml
[functions.fetch-github-issue-status]
verify_jwt = true
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/fetch-github-issue-status/index.ts supabase/config.toml
git commit -m "feat: add fetch-github-issue-status edge function"
```

---

## Chunk 2: Hooks & Permission System

### Task 4: Permission — Add 'reportes' to MenuItemType

**Files:**
- Modify: `src/hooks/useEmployeePermissions.tsx:6-62` (MenuItemType union)
- Modify: `src/hooks/useEmployeePermissions.tsx:173-182` (allPermissions array)

- [ ] **Step 1: Add 'reportes' to MenuItemType union**

In `src/hooks/useEmployeePermissions.tsx`, add `| 'reportes'` to the `MenuItemType` union type (after `'parametros-performance'` on line ~62):

```typescript
  | 'parametros-performance'
  | 'reportes';
```

- [ ] **Step 2: Add 'reportes' to allPermissions array**

In the owner's `allPermissions` array (~line 182), add `'reportes'` at the end:

```typescript
  'relatorios-marketing', 'skills-ia', 'editar-skills', 'roteiros', 'command-center', 'reportes'
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEmployeePermissions.tsx
git commit -m "feat: add reportes permission to employee permissions"
```

---

### Task 5: Hook — useUserReports

**Files:**
- Create: `src/hooks/useUserReports.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserReport {
  id: string;
  company_id: string;
  user_id: string;
  type: "bug" | "feature";
  title: string;
  description: string;
  extra_fields: Record<string, string>;
  user_name: string;
  github_issue_number: number | null;
  github_issue_url: string | null;
  status: "aberto" | "em_analise" | "implementado" | "recusado";
  claude_response: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserReports(companyId: string | undefined) {
  return useQuery({
    queryKey: ["user-reports", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reports")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserReport[];
    },
    enabled: !!companyId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useUserReports.ts
git commit -m "feat: add useUserReports hook for fetching reports"
```

---

### Task 6: Hook — useCreateReport

**Files:**
- Create: `src/hooks/useCreateReport.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateReportInput {
  type: "bug" | "feature";
  title: string;
  description: string;
  extra_fields: Record<string, string>;
  user_name: string;
  company_id: string;
  user_id: string;
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const { data, error } = await supabase.functions.invoke(
        "create-github-issue",
        { body: input }
      );

      if (error) throw new Error(error.message || "Erro ao criar reporte");
      if (!data?.success) throw new Error(data?.error || "Erro ao criar reporte");

      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-reports", variables.company_id] });
      toast.success("Reporte enviado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível criar o reporte. Tente novamente.");
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCreateReport.ts
git commit -m "feat: add useCreateReport mutation hook"
```

---

### Task 7: Hook — useFetchIssueStatus

**Files:**
- Create: `src/hooks/useFetchIssueStatus.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UserReport } from "@/hooks/useUserReports";

interface FetchStatusInput {
  report_id: string;
  github_issue_number: number;
  company_id: string;
}

export function useFetchIssueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FetchStatusInput) => {
      const { data, error } = await supabase.functions.invoke(
        "fetch-github-issue-status",
        {
          body: {
            report_id: input.report_id,
            github_issue_number: input.github_issue_number,
          },
        }
      );

      if (error) throw new Error(error.message || "Erro ao buscar status");
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar status");

      return data.data as UserReport;
    },
    onSuccess: (updatedReport, variables) => {
      // Update the specific report in the cached list
      queryClient.setQueryData<UserReport[]>(
        ["user-reports", variables.company_id],
        (old) => {
          if (!old) return old;
          return old.map((r) =>
            r.id === updatedReport.id ? updatedReport : r
          );
        }
      );
    },
    onError: () => {
      toast.error("Não foi possível atualizar o status");
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useFetchIssueStatus.ts
git commit -m "feat: add useFetchIssueStatus mutation hook"
```

---

## Chunk 3: Frontend Components

### Task 8: Component — ReportStatusCards

**Files:**
- Create: `src/components/reportes/ReportStatusCards.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { UserReport } from "@/hooks/useUserReports";

interface ReportStatusCardsProps {
  reports: UserReport[];
}

const statusConfig = [
  { key: "aberto", label: "Abertos", color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "em_analise", label: "Em Análise", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { key: "implementado", label: "Implementados", color: "text-green-400", bg: "bg-green-500/10" },
  { key: "recusado", label: "Recusados", color: "text-red-400", bg: "bg-red-500/10" },
] as const;

export function ReportStatusCards({ reports }: ReportStatusCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statusConfig.map(({ key, label, color, bg }) => {
        const count = reports.filter((r) => r.status === key).length;
        return (
          <div
            key={key}
            className={`${bg} rounded-lg p-4 text-center border border-white/5`}
          >
            <div className={`text-2xl font-bold ${color}`}>{count}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reportes/ReportStatusCards.tsx
git commit -m "feat: add ReportStatusCards component"
```

---

### Task 9: Component — ReportDetailAccordion

**Files:**
- Create: `src/components/reportes/ReportDetailAccordion.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect } from "react";
import { Bot, Loader2 } from "lucide-react";
import { useFetchIssueStatus } from "@/hooks/useFetchIssueStatus";
import type { UserReport } from "@/hooks/useUserReports";

interface ReportDetailAccordionProps {
  report: UserReport;
  companyId: string;
  isExpanded: boolean;
}

export function ReportDetailAccordion({
  report,
  companyId,
  isExpanded,
}: ReportDetailAccordionProps) {
  const fetchStatus = useFetchIssueStatus();

  useEffect(() => {
    if (isExpanded && report.github_issue_number) {
      fetchStatus.mutate({
        report_id: report.id,
        github_issue_number: report.github_issue_number,
        company_id: companyId,
      });
    }
  }, [isExpanded, report.id, report.github_issue_number, companyId]);

  if (!isExpanded) return null;

  const ef = report.extra_fields || {};

  return (
    <div className="px-4 pb-4 pt-2 space-y-3 bg-muted/5">
      {/* Descrição */}
      <div>
        <div className="text-xs font-bold text-primary uppercase mb-1">
          Descrição
        </div>
        <div className="text-sm text-muted-foreground bg-background rounded p-3">
          {report.description}
        </div>
      </div>

      {/* Campos extras do Bug */}
      {report.type === "bug" && (
        <>
          {ef.url && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">URL</div>
              <div className="text-sm text-muted-foreground">{ef.url}</div>
            </div>
          )}
          {ef.steps && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Passos para Reproduzir</div>
              <div className="text-sm text-muted-foreground bg-background rounded p-3 whitespace-pre-wrap">{ef.steps}</div>
            </div>
          )}
          {ef.stack_trace && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Stack Trace</div>
              <pre className="text-xs text-muted-foreground bg-background rounded p-3 overflow-x-auto">{ef.stack_trace}</pre>
            </div>
          )}
          {ef.suspected_file && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Arquivo Suspeito</div>
              <div className="text-sm text-muted-foreground font-mono">{ef.suspected_file}</div>
            </div>
          )}
        </>
      )}

      {/* Campos extras do Feature */}
      {report.type === "feature" && (
        <>
          {ef.category && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Categoria</div>
              <div className="text-sm text-muted-foreground">{ef.category}</div>
            </div>
          )}
          {ef.proposal && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Proposta</div>
              <div className="text-sm text-muted-foreground bg-background rounded p-3 whitespace-pre-wrap">{ef.proposal}</div>
            </div>
          )}
          {ef.impact && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Impacto</div>
              <div className="text-sm text-muted-foreground">{ef.impact}</div>
            </div>
          )}
          {ef.complexity && (
            <div>
              <div className="text-xs font-bold text-primary uppercase mb-1">Complexidade</div>
              <div className="text-sm text-muted-foreground">{ef.complexity}</div>
            </div>
          )}
        </>
      )}

      {/* Resposta do Claude */}
      {fetchStatus.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando status...
        </div>
      )}
      {report.claude_response && (
        <div>
          <div className="text-xs font-bold text-primary uppercase mb-1">
            Resposta da Análise
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary">Claude Code</span>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.claude_response}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reportes/ReportDetailAccordion.tsx
git commit -m "feat: add ReportDetailAccordion component"
```

---

### Task 10: Component — ReportList

**Files:**
- Create: `src/components/reportes/ReportList.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportDetailAccordion } from "@/components/reportes/ReportDetailAccordion";
import type { UserReport } from "@/hooks/useUserReports";

interface ReportListProps {
  reports: UserReport[];
  companyId: string;
}

const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  aberto: { label: "Aberto", className: "bg-blue-500 text-white" },
  em_analise: { label: "Em Análise", className: "bg-yellow-500 text-black" },
  implementado: { label: "Implementado", className: "bg-green-500 text-black" },
  recusado: { label: "Recusado", className: "bg-red-500 text-white" },
};

const typeBadgeConfig: Record<string, { label: string; className: string }> = {
  bug: { label: "Bug", className: "bg-red-500 text-white" },
  feature: { label: "Feature", className: "bg-violet-500 text-white" },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD < 30) return `há ${diffD}d`;
  return date.toLocaleDateString("pt-BR");
}

export function ReportList({ reports, companyId }: ReportListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum reporte encontrado.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {reports.map((report) => {
        const isExpanded = expandedId === report.id;
        const typeBadge = typeBadgeConfig[report.type];
        const statusBadge = statusBadgeConfig[report.status];
        const borderColor = report.type === "bug" ? "border-l-red-500" : "border-l-violet-500";

        return (
          <div key={report.id} className="border-b last:border-b-0">
            <button
              onClick={() => setExpandedId(isExpanded ? null : report.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
                isExpanded && "bg-muted/30",
                `border-l-3 ${borderColor}`
              )}
            >
              <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap", typeBadge.className)}>
                {typeBadge.label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{report.title}</div>
                <div className="text-xs text-muted-foreground">
                  {report.user_name} · {formatRelativeDate(report.created_at)}
                </div>
              </div>
              <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap", statusBadge.className)}>
                {statusBadge.label}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            <ReportDetailAccordion
              report={report}
              companyId={companyId}
              isExpanded={isExpanded}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reportes/ReportList.tsx
git commit -m "feat: add ReportList component with accordion"
```

---

### Task 11: Component — NewReportDialog

**Files:**
- Create: `src/components/reportes/NewReportDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useCreateReport } from "@/hooks/useCreateReport";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";

const bugSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  url: z.string().optional(),
  steps: z.string().optional(),
  stack_trace: z.string().optional(),
  suspected_file: z.string().optional(),
});

const featureSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  problem: z.string().min(1, "Problema é obrigatório"),
  proposal: z.string().min(1, "Proposta é obrigatória"),
  impact: z.string().min(1, "Impacto é obrigatório"),
  complexity: z.string().min(1, "Complexidade é obrigatória"),
  area: z.string().optional(),
});

type BugFormData = z.infer<typeof bugSchema>;
type FeatureFormData = z.infer<typeof featureSchema>;

interface NewReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = ["Competitiva", "Automação", "IA / Agentes", "Integração", "UX / Interface"];
const IMPACTS = ["Crítico", "Alto", "Médio", "Baixo"];
const COMPLEXITIES = ["Simples", "Média", "Complexa"];
const AREAS = [
  "Dashboard", "Campanhas", "Clientes", "CRM", "Geradores",
  "Tarefas", "Relatórios", "Configurações", "WhatsApp", "Outro",
];

export function NewReportDialog({ open, onOpenChange }: NewReportDialogProps) {
  const [type, setType] = useState<"bug" | "feature">("bug");
  const createReport = useCreateReport();
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const bugForm = useForm<BugFormData>({
    resolver: zodResolver(bugSchema),
    defaultValues: { title: "", description: "", url: "", steps: "", stack_trace: "", suspected_file: "" },
  });

  const featureForm = useForm<FeatureFormData>({
    resolver: zodResolver(featureSchema),
    defaultValues: { title: "", category: "", problem: "", proposal: "", impact: "", complexity: "", area: "" },
  });

  const handleSubmit = async () => {
    if (!user || !activeCompany) return;

    if (type === "bug") {
      const valid = await bugForm.trigger();
      if (!valid) return;
      const values = bugForm.getValues();
      createReport.mutate(
        {
          type: "bug",
          title: values.title,
          description: values.description,
          extra_fields: {
            ...(values.url && { url: values.url }),
            ...(values.steps && { steps: values.steps }),
            ...(values.stack_trace && { stack_trace: values.stack_trace }),
            ...(values.suspected_file && { suspected_file: values.suspected_file }),
          },
          user_name: user.user_metadata?.full_name || user.email || "Usuário",
          company_id: activeCompany.id,
          user_id: user.id,
        },
        {
          onSuccess: () => {
            bugForm.reset();
            onOpenChange(false);
          },
        }
      );
    } else {
      const valid = await featureForm.trigger();
      if (!valid) return;
      const values = featureForm.getValues();
      createReport.mutate(
        {
          type: "feature",
          title: values.title,
          description: values.problem,
          extra_fields: {
            category: values.category,
            problem: values.problem,
            proposal: values.proposal,
            impact: values.impact,
            complexity: values.complexity,
            ...(values.area && { area: values.area }),
          },
          user_name: user.user_metadata?.full_name || user.email || "Usuário",
          company_id: activeCompany.id,
          user_id: user.id,
        },
        {
          onSuccess: () => {
            featureForm.reset();
            onOpenChange(false);
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Reporte</DialogTitle>
        </DialogHeader>

        {/* Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setType("bug")}
            className={cn(
              "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
              type === "bug"
                ? "bg-red-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Bug
          </button>
          <button
            type="button"
            onClick={() => setType("feature")}
            className={cn(
              "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
              type === "feature"
                ? "bg-violet-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Feature
          </button>
        </div>

        {/* Bug Form */}
        {type === "bug" && (
          <Form {...bugForm}>
            <form className="space-y-4">
              <FormField control={bugForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl><Input placeholder="Descreva o problema em poucas palavras..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL onde ocorreu (opcional)</FormLabel>
                  <FormControl><Input placeholder="Ex: /campanhas/editar/123" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea placeholder="O que aconteceu? O que esperava que acontecesse?" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="steps" render={({ field }) => (
                <FormItem>
                  <FormLabel>Passos para reproduzir (opcional)</FormLabel>
                  <FormControl><Textarea placeholder="1. Acessar a página X&#10;2. Clicar no botão Y&#10;3. ..." rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="stack_trace" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stack trace / erro no console (opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Cole o erro aqui..." rows={2} className="font-mono text-xs" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="suspected_file" render={({ field }) => (
                <FormItem>
                  <FormLabel>Arquivo suspeito (opcional)</FormLabel>
                  <FormControl><Input placeholder="src/pages/Dashboard.tsx" className="font-mono text-xs" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        )}

        {/* Feature Form */}
        {type === "feature" && (
          <Form {...featureForm}>
            <form className="space-y-4">
              <FormField control={featureForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Feature</FormLabel>
                  <FormControl><Input placeholder="Nome da funcionalidade..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={featureForm.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={featureForm.control} name="problem" render={({ field }) => (
                <FormItem>
                  <FormLabel>Problema que resolve</FormLabel>
                  <FormControl><Textarea placeholder="Qual problema ou necessidade essa feature resolve?" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={featureForm.control} name="proposal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposta de implementação</FormLabel>
                  <FormControl><Textarea placeholder="Como você imagina que deveria funcionar?" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={featureForm.control} name="impact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impacto estimado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {IMPACTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={featureForm.control} name="complexity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complexidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {COMPLEXITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={featureForm.control} name="area" render={({ field }) => (
                <FormItem>
                  <FormLabel>Área do sistema (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        )}

        <Button
          onClick={handleSubmit}
          disabled={createReport.isPending}
          className="w-full mt-2"
        >
          {createReport.isPending ? "Enviando..." : "Enviar Reporte"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reportes/NewReportDialog.tsx
git commit -m "feat: add NewReportDialog component with bug/feature forms"
```

---

### Task 12: Component — ReportesPage (main container)

**Files:**
- Create: `src/components/reportes/ReportesPage.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserReports } from "@/hooks/useUserReports";
import { useCompany } from "@/contexts/CompanyContext";
import { ReportStatusCards } from "@/components/reportes/ReportStatusCards";
import { ReportList } from "@/components/reportes/ReportList";
import { NewReportDialog } from "@/components/reportes/NewReportDialog";

type TabFilter = "todos" | "bug" | "feature";

export function ReportesPage() {
  const { activeCompany } = useCompany();
  const { data: reports = [], isLoading } = useUserReports(activeCompany?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>("todos");

  const filteredReports =
    activeTab === "todos"
      ? reports
      : reports.filter((r) => r.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Reporte bugs e sugira novas funcionalidades
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Reporte
        </Button>
      </div>

      {/* Status Cards */}
      <ReportStatusCards reports={reports} />

      {/* Tabs + List */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="bug">Bugs</TabsTrigger>
          <TabsTrigger value="feature">Features</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando reportes...
        </div>
      ) : (
        <ReportList
          reports={filteredReports}
          companyId={activeCompany?.id || ""}
        />
      )}

      {/* New Report Dialog */}
      <NewReportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reportes/ReportesPage.tsx
git commit -m "feat: add ReportesPage main container component"
```

---

## Chunk 4: Integration (Page, Route, Sidebar)

### Task 13: Page — Reportes.tsx

**Files:**
- Create: `src/pages/Reportes.tsx`

- [ ] **Step 1: Create the page wrapper**

```tsx
import { ReportesPage } from "@/components/reportes/ReportesPage";

const Reportes = () => {
  return <ReportesPage />;
};

export default Reportes;
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Reportes.tsx
git commit -m "feat: add Reportes page"
```

---

### Task 14: Route — Add to App.tsx

**Files:**
- Modify: `src/App.tsx` (add import + route)

- [ ] **Step 1: Add page import**

Add with the other page imports (around line ~164):

```typescript
import Reportes from "./pages/Reportes";
```

- [ ] **Step 2: Add route**

Add inside the protected routes section (after the Alertas route or near Configurações):

```tsx
<Route path="/reportes" element={
  <PermissionProtectedRoute requiredPermission="reportes">
    <Reportes />
  </PermissionProtectedRoute>
} />
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /reportes route with permission guard"
```

---

### Task 15: Sidebar — Add menu item to DashboardSidebar

**Files:**
- Modify: `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1: Add icon import**

Add `MessageSquareWarning` to the lucide-react import at line ~2-44:

```typescript
import {
  // ... existing icons ...
  MessageSquareWarning,
} from "lucide-react";
```

- [ ] **Step 2: Add menu item to Sistema category**

In the "Sistema" category (around line 196-204), add the new item before `.sort()`:

```typescript
{
  title: "Sistema",
  icon: Settings,
  items: [
    { title: "Alertas", url: "/alertas", icon: Bell, permission: "alertas" as MenuItemType },
    { title: "Configurações", url: "/configuracoes", icon: Settings, permission: "configuracoes" as MenuItemType },
    { title: "Reportes", url: "/reportes", icon: MessageSquareWarning, permission: "reportes" as MenuItemType },
  ].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
},
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat: add Reportes menu item to sidebar Sistema category"
```

---

### Task 16: Final Verification

- [ ] **Step 1: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to reportes files.

- [ ] **Step 2: Verify the app runs**

Run: `npm run dev`
Expected: App starts, navigate to `/reportes`, page renders with empty state.

- [ ] **Step 3: Final commit with all fixes (if any)**

If any type errors or issues were found in verification, fix and commit:

```bash
git add -A
git commit -m "fix: resolve any remaining type/build issues for reportes"
```
