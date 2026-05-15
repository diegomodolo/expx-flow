# User Activity Logs — Plano de Implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gravar logs detalhados de uso dos usuários (navegação, ações, sessões, funcionalidades) e exibi-los para owners da empresa via UI em Configurações.

**Architecture:** Uma tabela `user_activity_logs` no Supabase captura todos os eventos. Um `ActivityLoggerProvider` no frontend intercepta navegações via React Router e os expõe via context. Um hook `useActivityLogger` permite que qualquer componente registre ações manuais. A página de visualização fica em `/configuracoes/logs-atividade`, acessível apenas para owners.

**Tech Stack:** React 18, TypeScript, React Router v6, TanStack React Query, Supabase (PostgreSQL + RLS), shadcn/ui, Tailwind CSS.

---

## Mapeamento de Arquivos

| Arquivo                                                     | Tipo      | Responsabilidade                                               |
| ----------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| `supabase/migrations/20260515010000_user_activity_logs.sql` | Criar     | Tabela, índices, RLS, GRANT                                    |
| `src/lib/activityLogger.ts`                                 | Criar     | sessionId, função core de insert no Supabase (sem deps React)  |
| `src/contexts/ActivityLoggerContext.tsx`                    | Criar     | Context + Provider: intercepta rotas, sessões, expõe logAction |
| `src/hooks/useActivityLogger.ts`                            | Criar     | Hook público para componentes logarem ações                    |
| `src/hooks/useUserActivityLogs.ts`                          | Criar     | Busca logs com filtros para a UI de owners                     |
| `src/pages/configuracoes/LogsAtividadesUsuarios.tsx`        | Criar     | Página de visualização com tabela, filtros e stats             |
| `src/components/settings/SettingsLayout.tsx`                | Modificar | Adicionar "Logs de Atividade" na nav de configurações          |
| `src/pages/Configuracoes.tsx`                               | Modificar | Adicionar rota `/configuracoes/logs-atividade`                 |
| `src/App.tsx`                                               | Modificar | Envolver rotas protegidas com `ActivityLoggerProvider`         |
| `src/hooks/useAuth.tsx`                                     | Modificar | Chamar `logSessionEvent` no sign-in e sign-out                 |

---

## Chunk 1: Backend — Tabela e RLS

### Task 1: Migration `user_activity_logs`

**Files:**

- Create: `supabase/migrations/20260515010000_user_activity_logs.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260515010000_user_activity_logs.sql

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL,
  session_id    TEXT        NOT NULL,                      -- UUID gerado no frontend por sessão
  event_type    TEXT        NOT NULL                       -- 'page_view' | 'action' | 'login' | 'logout'
                CHECK (event_type IN ('page_view', 'action', 'login', 'logout')),
  page_path     TEXT,                                      -- rota atual ex: /campanhas/123
  page_title    TEXT,                                      -- nome legível ex: "Campanha Verão"
  module        TEXT,                                      -- ex: 'Campanhas', 'Clientes', 'IA'
  action_name   TEXT,                                      -- ex: 'criar_campanha', 'exportar_relatorio'
  entity_type   TEXT,                                      -- ex: 'campaign', 'client', 'task'
  entity_id     UUID,
  metadata      JSONB       DEFAULT '{}',
  duration_ms   INTEGER,                                   -- tempo na página em ms (page_view)
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para queries comuns
CREATE INDEX idx_user_activity_logs_company_created
  ON public.user_activity_logs (company_id, created_at DESC);

CREATE INDEX idx_user_activity_logs_company_user
  ON public.user_activity_logs (company_id, user_id, created_at DESC);

CREATE INDEX idx_user_activity_logs_event_type
  ON public.user_activity_logs (company_id, event_type, created_at DESC);

-- RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Qualquer membro autenticado pode inserir logs para sua própria empresa
CREATE POLICY "members_insert_activity_logs"
  ON public.user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Apenas owners podem ler os logs da empresa
CREATE POLICY "owners_select_activity_logs"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- GRANT obrigatório (sem isso frontend recebe array vazio sem erro)
GRANT SELECT, INSERT ON public.user_activity_logs TO authenticated;
```

- [ ] **Step 2: Aplicar migration no Supabase**

```bash
# Via MCP Supabase ou CLI local:
supabase db push
# OU via MCP: mcp__plugin_supabase_supabase__apply_migration
```

Verificar: a tabela aparece no dashboard com RLS ativo e 0 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260515010000_user_activity_logs.sql
git commit -m "feat: add user_activity_logs table with RLS"
```

---

## Chunk 2: Core do Logger (sem React)

### Task 2: `src/lib/activityLogger.ts`

**Files:**

- Create: `src/lib/activityLogger.ts`

Este módulo é puro TypeScript — sem hooks, sem context. Ele gerencia o `sessionId` e faz o insert direto no Supabase. Assim pode ser chamado de qualquer lugar, inclusive fora de componentes React.

- [ ] **Step 1: Criar o módulo core**

```typescript
// src/lib/activityLogger.ts
import { supabase } from "@/integrations/supabase/client";

// sessionId persiste durante o ciclo de vida da aba (resets no reload)
let _sessionId: string | null = null;

export function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = crypto.randomUUID();
  }
  return _sessionId;
}

export function resetSessionId(): void {
  _sessionId = crypto.randomUUID();
}

export interface ActivityLogPayload {
  company_id: string;
  user_id: string;
  event_type: "page_view" | "action" | "login" | "logout";
  page_path?: string;
  page_title?: string;
  module?: string;
  action_name?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  duration_ms?: number;
}

// Fire-and-forget: nunca propaga erros para a UI
export async function insertActivityLog(
  payload: ActivityLogPayload,
): Promise<void> {
  try {
    await supabase.from("user_activity_logs").insert({
      ...payload,
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
    });
  } catch {
    // silencioso — logs nunca devem quebrar a UI
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/activityLogger.ts
git commit -m "feat: add core activityLogger module (fire-and-forget)"
```

---

## Chunk 3: Context e Provider React

### Task 3: `src/contexts/ActivityLoggerContext.tsx`

**Files:**

- Create: `src/contexts/ActivityLoggerContext.tsx`

O Provider:

1. Observa mudanças de rota via `useLocation()` e loga page_view com duração
2. Observa mudanças de autenticação e loga login/logout
3. Expõe `logAction` para componentes filhos

- [ ] **Step 1: Criar o mapeamento de rotas para módulos**

```typescript
// src/contexts/ActivityLoggerContext.tsx
import {
  createContext, useContext, useEffect, useRef, ReactNode
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import {
  insertActivityLog,
  resetSessionId,
  ActivityLogPayload,
} from "@/lib/activityLogger";

// Mapeamento de prefixo de rota → nome legível do módulo
const ROUTE_MODULE_MAP: [string, string][] = [
  ["/dashboard-trafego", "Dashboard de Tráfego"],
  ["/dashboard-orcamento", "Dashboard de Orçamento"],
  ["/dashboard", "Dashboard"],
  ["/clientes", "Clientes"],
  ["/campanhas-unificadas", "Campanhas Unificadas"],
  ["/campanhas", "Campanhas"],
  ["/ia/agents", "Agentes IA"],
  ["/ia/squads", "Agentes IA"],
  ["/ia", "Inteligência Artificial"],
  ["/relatorios", "Relatórios"],
  ["/tarefas", "Tarefas"],
  ["/colaboradores", "Colaboradores"],
  ["/squad", "Squad"],
  ["/geradores/carrosseis", "Fábrica de Carrosseis"],
  ["/geradores/criativos", "Fábrica de Criativos"],
  ["/geradores/conteudo", "Gerador de Conteúdo"],
  ["/geradores", "Geradores"],
  ["/automacoes", "Automações"],
  ["/lead-intelligence", "Lead Intelligence"],
  ["/notificacoes", "Notificações"],
  ["/configuracoes", "Configurações"],
  ["/perfil", "Perfil"],
];

export function resolveModule(pathname: string): string {
  for (const [prefix, module] of ROUTE_MODULE_MAP) {
    if (pathname.startsWith(prefix)) return module;
  }
  return "Outro";
}

// ---

interface ActivityLoggerContextValue {
  logAction: (
    actionName: string,
    options?: {
      module?: string;
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    }
  ) => void;
}

const ActivityLoggerContext = createContext<ActivityLoggerContextValue | undefined>(
  undefined
);

export function ActivityLoggerProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  // Refs para ter acesso ao valor atual dentro de closures sem re-render
  const prevUserRef = useRef<string | null>(null);
  const companyIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const pageEntryTimeRef = useRef<number>(Date.now());
  const prevPathRef = useRef<string>("");

  // Atualiza refs sempre que user/company muda
  useEffect(() => {
    companyIdRef.current = activeCompany?.company_id ?? null;
    userIdRef.current = user?.id ?? null;
  }, [user, activeCompany]);

  // Detecta login e logout
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const prevUserId = prevUserRef.current;

    if (prevUserId === currentUserId) return;
    prevUserRef.current = currentUserId;

    if (!activeCompany?.company_id) return;

    if (currentUserId && !prevUserId) {
      // Login: usuário acabou de entrar
      resetSessionId();
      insertActivityLog({
        company_id: activeCompany.company_id,
        user_id: currentUserId,
        event_type: "login",
        module: "Sistema",
      });
    } else if (!currentUserId && prevUserId) {
      // Logout: usuário saiu — usa refs pois context já pode estar limpo
      if (companyIdRef.current) {
        insertActivityLog({
          company_id: companyIdRef.current,
          user_id: prevUserId,
          event_type: "logout",
          module: "Sistema",
        });
      }
    }
  }, [user, activeCompany]);

  // Detecta navegação entre páginas
  useEffect(() => {
    const now = Date.now();
    const companyId = companyIdRef.current;
    const userId = userIdRef.current;
    const prevPath = prevPathRef.current;

    // Loga duração na página anterior (se houver e tiver contexto)
    if (prevPath && companyId && userId) {
      const duration = now - pageEntryTimeRef.current;
      insertActivityLog({
        company_id: companyId,
        user_id: userId,
        event_type: "page_view",
        page_path: prevPath,
        module: resolveModule(prevPath),
        duration_ms: duration,
      });
    }

    pageEntryTimeRef.current = now;
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  const logAction = (
    actionName: string,
    options?: {
      module?: string;
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    const companyId = companyIdRef.current;
    const userId = userIdRef.current;
    if (!companyId || !userId) return;

    insertActivityLog({
      company_id: companyId,
      user_id: userId,
      event_type: "action",
      page_path: location.pathname,
      module: options?.module ?? resolveModule(location.pathname),
      action_name: actionName,
      entity_type: options?.entityType,
      entity_id: options?.entityId,
      metadata: options?.metadata,
    });
  };

  return (
    <ActivityLoggerContext.Provider value={{ logAction }}>
      {children}
    </ActivityLoggerContext.Provider>
  );
}

export function useActivityLoggerContext() {
  const ctx = useContext(ActivityLoggerContext);
  if (!ctx) throw new Error("useActivityLoggerContext must be used within ActivityLoggerProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/ActivityLoggerContext.tsx
git commit -m "feat: add ActivityLoggerProvider with page tracking and session events"
```

---

### Task 4: `src/hooks/useActivityLogger.ts` — hook público

**Files:**

- Create: `src/hooks/useActivityLogger.ts`

Hook simples que re-exporta `logAction` do context. Componentes importam apenas este hook.

- [ ] **Step 1: Criar o hook**

```typescript
// src/hooks/useActivityLogger.ts
export { useActivityLoggerContext as useActivityLogger } from "@/contexts/ActivityLoggerContext";
```

- [ ] **Step 2: Verificar que pode ser importado**

Em qualquer componente dentro de `ActivityLoggerProvider`:

```typescript
import { useActivityLogger } from "@/hooks/useActivityLogger";
const { logAction } = useActivityLogger();
// logAction("criar_campanha", { entityType: "campaign", entityId: "..." })
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useActivityLogger.ts
git commit -m "feat: add useActivityLogger hook"
```

---

### Task 5: Integrar Provider no App.tsx

**Files:**

- Modify: `src/App.tsx`

O `ActivityLoggerProvider` deve ficar dentro de `BrowserRouter` (pois usa `useLocation`), `AuthProvider` e `CompanyProvider` (pois precisa de user e company).

- [ ] **Step 1: Localizar onde ficam os providers em App.tsx**

Ler as primeiras 300 linhas de `src/App.tsx` para encontrar onde ficam os providers de contexto (AuthProvider, CompanyProvider).

- [ ] **Step 2: Adicionar o import e envolver o conteúdo**

Encontrar a estrutura de providers existente e adicionar:

```tsx
// No início do arquivo
import { ActivityLoggerProvider } from "@/contexts/ActivityLoggerContext";

// Na JSX, dentro de AuthProvider e CompanyProvider:
<ActivityLoggerProvider>
  {/* ... rotas protegidas ... */}
</ActivityLoggerProvider>;
```

**Atenção:** O provider deve ficar apenas em torno das rotas autenticadas, não das rotas públicas (dashboards públicos, CRM público, etc.). Verificar onde está o `ProtectedRoute` e envolver a partir daí.

- [ ] **Step 3: Verificar no browser**

Navegar entre páginas e verificar no Supabase Table Editor se os logs estão sendo inseridos na tabela `user_activity_logs`.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wrap protected routes with ActivityLoggerProvider"
```

---

## Chunk 4: Visualização para Owners

### Task 6: Hook `useUserActivityLogs.ts`

**Files:**

- Create: `src/hooks/useUserActivityLogs.ts`

- [ ] **Step 1: Criar o hook com filtros e paginação**

```typescript
// src/hooks/useUserActivityLogs.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface ActivityLogFilters {
  userId?: string; // filtrar por colaborador específico
  eventType?: string; // 'page_view' | 'action' | 'login' | 'logout' | undefined (todos)
  module?: string; // filtrar por módulo
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  limit?: number;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  session_id: string;
  event_type: string;
  page_path: string | null;
  page_title: string | null;
  module: string | null;
  action_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
}

export function useUserActivityLogs(filters: ActivityLogFilters = {}) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const limit = filters.limit ?? 100;

  return useQuery({
    queryKey: ["user-activity-logs", companyId, filters],
    queryFn: async (): Promise<ActivityLogEntry[]> => {
      let query = supabase
        .from("user_activity_logs")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filters.userId) query = query.eq("user_id", filters.userId);
      if (filters.eventType) query = query.eq("event_type", filters.eventType);
      if (filters.module) query = query.eq("module", filters.module);
      if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
      if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ActivityLogEntry[];
    },
    enabled: !!companyId,
    staleTime: 30_000, // 30s de cache
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useUserActivityLogs.ts
git commit -m "feat: add useUserActivityLogs hook with filters"
```

---

### Task 7: Página `LogsAtividadesUsuarios.tsx`

**Files:**

- Create: `src/pages/configuracoes/LogsAtividadesUsuarios.tsx`

- [ ] **Step 1: Criar a estrutura da página com filtros e tabela**

```tsx
// src/pages/configuracoes/LogsAtividadesUsuarios.tsx
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  Filter,
  LogIn,
  LogOut,
  MousePointer,
  Eye,
} from "lucide-react";
import {
  useUserActivityLogs,
  ActivityLogFilters,
} from "@/hooks/useUserActivityLogs";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const EVENT_LABELS: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  page_view: {
    label: "Página",
    icon: <Eye className="h-3 w-3" />,
    variant: "secondary",
  },
  action: {
    label: "Ação",
    icon: <MousePointer className="h-3 w-3" />,
    variant: "default",
  },
  login: {
    label: "Login",
    icon: <LogIn className="h-3 w-3" />,
    variant: "outline",
  },
  logout: {
    label: "Logout",
    icon: <LogOut className="h-3 w-3" />,
    variant: "outline",
  },
};

export function LogsAtividadesUsuarios() {
  const { activeCompany } = useCompany();
  const [filters, setFilters] = useState<ActivityLogFilters>({ limit: 200 });

  const { data: logs = [], isLoading } = useUserActivityLogs(filters);
  const { data: employees = [] } = useEmployees(activeCompany?.company_id);

  // Stats rápidas dos logs atuais
  const stats = {
    total: logs.length,
    logins: logs.filter((l) => l.event_type === "login").length,
    acoes: logs.filter((l) => l.event_type === "action").length,
    paginasMaisVisitadas: (() => {
      const count: Record<string, number> = {};
      logs
        .filter((l) => l.event_type === "page_view")
        .forEach((l) => {
          if (l.module) count[l.module] = (count[l.module] ?? 0) + 1;
        });
      return Object.entries(count)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    })(),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Logs de Atividade</h2>
        <p className="text-sm text-muted-foreground">
          Histórico de uso da plataforma pelos colaboradores
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Logins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.logins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ações Registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.acoes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        <Select
          value={filters.userId ?? "todos"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, userId: v === "todos" ? undefined : v }))
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os colaboradores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os colaboradores</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.user_id} value={e.user_id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.eventType ?? "todos"}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              eventType: v === "todos" ? undefined : v,
            }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="page_view">Páginas</SelectItem>
            <SelectItem value="action">Ações</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-40"
          onChange={(e) =>
            setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))
          }
          placeholder="De"
        />
        <Input
          type="date"
          className="w-40"
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              dateTo: e.target.value ? e.target.value + "T23:59:59" : undefined,
            }))
          }
          placeholder="Até"
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Detalhe</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum log encontrado para os filtros selecionados
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const employee = employees.find(
                    (e) => e.user_id === log.user_id,
                  );
                  const evt = EVENT_LABELS[log.event_type] ?? {
                    label: log.event_type,
                    icon: <Activity className="h-3 w-3" />,
                    variant: "secondary" as const,
                  };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {employee?.name ?? log.user_id.slice(0, 8) + "..."}
                      </TableCell>
                      <TableCell>
                        <Badge variant={evt.variant} className="gap-1 text-xs">
                          {evt.icon} {evt.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.module ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.action_name ?? log.page_path ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.duration_ms
                          ? `${Math.round(log.duration_ms / 1000)}s`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default LogsAtividadesUsuarios;
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/configuracoes/LogsAtividadesUsuarios.tsx
git commit -m "feat: add LogsAtividadesUsuarios settings page"
```

---

### Task 8: Integrar na SettingsLayout e rota em Configuracoes.tsx

**Files:**

- Modify: `src/components/settings/SettingsLayout.tsx`
- Modify: `src/pages/Configuracoes.tsx`

- [ ] **Step 1: Adicionar item na nav do SettingsLayout**

Em `src/components/settings/SettingsLayout.tsx`, adicionar ao array `settingsNavItems`:

```typescript
// Adicionar import
import { Activity } from "lucide-react";

// Adicionar no array settingsNavItems (antes de "Integrações"):
{
  title: "Logs de Atividade",
  href: "/configuracoes/logs-atividade",
  icon: Activity,
  description: "Histórico de uso dos colaboradores",
},
```

- [ ] **Step 2: Adicionar rota em Configuracoes.tsx**

Em `src/pages/Configuracoes.tsx`, adicionar import e rota:

```typescript
import { LogsAtividadesUsuarios } from "@/pages/configuracoes/LogsAtividadesUsuarios";

// Dentro do <Routes>:
<Route path="logs-atividade" element={<LogsAtividadesUsuarios />} />
```

- [ ] **Step 3: Verificar no browser**

Acessar `/configuracoes/logs-atividade`. A página deve:

- Aparecer na sidebar de settings
- Mostrar a tabela (vazia inicialmente)
- Após navegar em outras páginas e voltar, mostrar os logs registrados

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/SettingsLayout.tsx src/pages/Configuracoes.tsx
git commit -m "feat: add logs-atividade route and settings nav item"
```

---

## Chunk 5: Verificação Final

### Task 9: Smoke test completo

- [ ] **Step 1: Verificar logs de navegação**

1. Fazer login na plataforma
2. Navegar por 3-4 páginas diferentes
3. Acessar `/configuracoes/logs-atividade`
4. Verificar que os logs aparecem com: tipo "Página", módulo correto, duração

- [ ] **Step 2: Verificar logs de login/logout**

1. Fazer logout
2. Fazer login novamente
3. Verificar na tabela de logs os eventos 'logout' e 'login'

- [ ] **Step 3: Verificar RLS**

Acessar com um usuário colaborador (não-owner) e confirmar que a query retorna 0 rows (ou erro de permissão) — a página pode mostrar vazio para colaboradores.

- [ ] **Step 4: Verificar performance**

Abrir DevTools → Network e confirmar que os inserts de log acontecem em background sem bloquear navegação.

- [ ] **Step 5: Commit final se tudo OK**

```bash
git add -A
git commit -m "feat: complete user activity logging system"
```

---

## Notas de Implementação

### Sobre `useEmployees`

Se o hook `useEmployees` não existir com essa assinatura, procurar o hook correto que busca colaboradores por `company_id`. Alternativa: fazer a join manualmente na query do hook `useUserActivityLogs`:

```typescript
// Alternativa: join com employees na query
const { data: logsWithEmployees } = useQuery({
  queryKey: ["user-activity-logs-with-employees", companyId, filters],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("user_activity_logs")
      .select("*, employees!user_activity_logs_user_id_fkey(name, avatar)")
      ...
  }
})
```

### Sobre `logAction` em componentes críticos

Após o sistema base funcionar, podem ser adicionados `logAction` manualmente nos hooks de mutação mais importantes:

```typescript
// Exemplo em useCampaigns.ts
const { logAction } = useActivityLogger();
// Na mutação de criar campanha:
logAction("criar_campanha", { entityType: "campaign", entityId: data.id });
```

Isso é **opcional** — o tracking automático de páginas já cobre a maioria dos casos.

### Não fazer

- Não adicionar `logAction` em todos os hooks agora — seria prematuro e difícil de manter
- Não bloquear a UI esperando o resultado do log (sempre fire-and-forget)
- Não adicionar DELETE/UPDATE policies — logs são imutáveis
