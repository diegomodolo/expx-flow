# Expx Flow - Plataforma de Automacao de Marketing e Gestao de Trafego

## Visao Geral

Expx Flow e uma plataforma SaaS de automacao de marketing e gestao de trafego (idioma Portugues). Gerencia campanhas em Facebook, Instagram, Google Ads, WhatsApp, YouTube e mais. Inclui CRM, gestao de tarefas, agentes IA, e dashboards de performance. Construido com Lovable (lovable.dev).

## Stack Tecnologico

- **Frontend:** React 18 + TypeScript, Vite (SWC)
- **UI:** Tailwind CSS + shadcn/ui + Radix UI + Mantine
- **Roteamento:** React Router DOM v6 com route guards por permissao
- **Forms:** React Hook Form + Zod
- **Data Fetching:** TanStack React Query + Supabase client
- **Estado Global:** React Context (`CompanyContext`, `CRMAuthContext`, `CSSquadFilterContext`, `SyncingItemsContext`)
- **Backend:** Supabase (PostgreSQL, Edge Functions em Deno/TS, Auth, Realtime)
- **Charts:** Recharts, Chart.js
- **Export:** jsPDF, pptxgenjs, xlsx, html2canvas
- **Deploy:** Lovable (frontend), Supabase (edge functions + DB)

## Comandos

```bash
npm install        # Instalar dependencias
npm run dev        # Dev server (porta 8080)
npm run build      # Build producao
npm run lint       # ESLint
npm run preview    # Preview build
```

Edge Functions: `supabase functions deploy <nome-funcao>` ou via Lovable.

## Estrutura do Projeto

```
src/
├── pages/              # ~114 paginas (componentes de rota)
├── components/         # ~74 modulos organizados por feature
│   ├── ui/             # shadcn/ui primitivos (nao editar diretamente)
│   ├── dashboard/      # Dashboard principal e layout
│   ├── campaigns/      # Gestao de campanhas
│   ├── google/         # Integracao Google Ads
│   ├── whatsapp/       # Modulo WhatsApp
│   ├── ai-chat/        # Chat IA
│   ├── agents/         # Agentes IA
│   ├── crm/            # Modulo CRM
│   ├── reports/        # Relatorios
│   └── ...             # +65 outros modulos
├── hooks/              # ~236 hooks (data fetching + logica de negocio)
├── contexts/           # 4 Context providers
├── integrations/supabase/  # Cliente Supabase + tipos auto-gerados
└── lib/                # Utilities (cn(), utils)
supabase/
├── functions/          # ~215 Edge Functions (Deno runtime)
├── migrations/         # ~490 migrations PostgreSQL
└── config.toml         # Config de funcoes (JWT verification)
```

## Arquitetura de Rotas (`App.tsx`)

### Publicas (sem autenticacao)

- `/`, `/auth` — Landing e autenticacao
- `/auth/callback`, `/google-ads/callback`, `/google-meet/callback` — OAuth callbacks
- `/dashboard-publico/:token`, `/tv/:token`, `/social-tv/:token`, `/radar-tv/:token`, `/cs-tv/:token` — Dashboards publicos via token
- `/crm/:token/*` — CRM publico, `/apresentacao/:token`, `/resultados/:token` — Apresentacoes

### Protegidas (autenticacao obrigatoria)

- `/dashboard`, `/dashboard-trafego`, `/dashboard-orcamento` — Dashboards
- `/tarefas`, `/fluxos`, `/mapas-mentais`, `/rotinas` — Gestao de tarefas
- `/automacoes`, `/automatizadores/*` — Automacoes
- `/lead-intelligence/*` — Inteligencia de leads
- `/cs/*` — Customer Success (layout proprio: CSLayout)
- `/perfil/*`, `/configuracoes/*` — Perfil e configuracoes

### Protegidas por permissao (`PermissionProtectedRoute`)

| Permissao       | Rotas                                                       |
| --------------- | ----------------------------------------------------------- |
| `ia`            | `/ia` (chat IA)                                             |
| `agentes-ia`    | `/ia/agents`, `/ia/squads`                                  |
| `clientes`      | `/clientes`, `/clientes/:id/*`                              |
| `campanhas`     | `/campanhas`, `/campanhas/:id`, `/campanhas-unificadas`     |
| `geradores`     | `/geradores/*` (campanhas, conteudo, criativos, carrosseis) |
| `colaboradores` | `/colaboradores`, `/colaboradores/cargas-horarias`          |
| `squad`         | `/squad`, `/squad-dashboard`, `/reunioes`                   |
| `relatorios`    | `/relatorios/*` (~15 sub-relatorios)                        |
| `whatsapp`      | `/notificacoes/whatsapp`                                    |
| `configuracoes` | `/configuracoes/*`                                          |

## Sistema de Autenticacao

- **Provider:** Supabase Auth
- **Hook principal:** `useAuth()` em `src/hooks/useAuth.tsx` — expoe `user`, `session`, `loading`, `signIn()`, `signUp()`, `signOut()`
- **Permissoes:** `useEmployeePermissions()` em `src/hooks/useEmployeePermissions.tsx` — 56 permissoes individuais
- **Roles:** Owner (acesso total) | Colaborador (permissoes individuais + grupos de permissao)
- **Route guards:** `ProtectedRoute` (auth apenas) + `PermissionProtectedRoute` (auth + permissao especifica)
- **CRM Auth:** Sistema separado via `CRMAuthContext` com workspace isolation
- **Company Context:** `CompanyContext` gerencia empresa ativa (persistido em localStorage)

### Hierarquia de permissoes

```
Owner (company_members.role = 'owner') → Acesso total (bypass todas permissoes)
Colaborador → Permissoes individuais (employee_permissions) + Grupos (permission_groups)
Default sempre acessivel: 'dashboard', 'tarefas'
```

## Modelo de Dados

### Hierarquia principal

```
companies → clients → campaigns → ads/ad_sets
                   └→ google_campaigns → google_ad_groups → google_ads
                   └→ facebook_integrations → meta_pixels
                   └→ crm_workspaces → crm_leads/crm_deals/crm_contacts
companies → company_members/employees → teams/team_members
companies → tasks → task_board_columns/task_time_tracking
companies → whatsapp_instances → whatsapp_conversations → whatsapp_messages
```

### Tabelas-chave

| Tabela                                          | Descricao                                 |
| ----------------------------------------------- | ----------------------------------------- |
| `companies`                                     | Empresas (tenant principal)               |
| `clients`                                       | Clientes das empresas                     |
| `campaigns`                                     | Campanhas de marketing (multi-plataforma) |
| `employees` / `company_members`                 | Colaboradores e membros                   |
| `employee_permissions` / `permission_groups`    | Sistema de permissoes                     |
| `crm_workspaces` / `crm_leads` / `crm_deals`    | Modulo CRM                                |
| `whatsapp_instances` / `whatsapp_conversations` | Modulo WhatsApp                           |
| `tasks` / `task_board_columns`                  | Gestao de tarefas                         |
| `content_plans` / `content_plan_posts`          | Planejamento de conteudo                  |

## Padroes e Convencoes

### Codigo

- **Path alias:** `@` → `./src`. Sempre usar `@/` imports
- **Data fetching:** Hooks em `hooks/` usando `useQuery`/`useMutation` com Supabase. Nomes: `use<Entidade><Acao>`
- **Idioma:** App em Portugues. UI text, nomes de rotas, toasts em PT-BR
- **Tipos:** Auto-gerados em `src/integrations/supabase/types.ts` (nao editar manualmente)

### Estilo

- Tailwind utility classes com design system Google Material-inspired
- `cn()` de `@/lib/utils` para classes condicionais
- Tema definido em `tailwind.config.ts`

### Componentes

- Feature components em `components/<feature>/`, compostos de shadcn/ui primitivos
- Novos primitivos: `npx shadcn-ui@latest add <componente>`
- Toasts via Sonner (`toast.success()`, `toast.error()`)
- Forms: React Hook Form + Zod schemas

### Edge Functions (Deno)

```typescript
// Boilerplate padrao
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // ... logica
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

### Hook pattern (useQuery)

```typescript
export function useEntidades(companyId: string | undefined) {
  return useQuery({
    queryKey: ["entidades", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabela")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}
```

## Variaveis de Ambiente

```
VITE_SUPABASE_URL          # URL do projeto Supabase
VITE_SUPABASE_ANON_KEY     # Chave anonima do Supabase
```

Edge Functions usam `Deno.env.get()` para: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

## Observacoes Importantes

- `src/integrations/supabase/types.ts` e **auto-gerado** — nao editar manualmente
- Edge Functions com `verify_jwt = false` em `config.toml` sao webhooks/agendados (sem auth)
- `components/ui/` sao primitivos shadcn — usar CLI para adicionar novos
- O projeto usa Lovable para deploy do frontend — commits vao direto para producao
- Migrations em `supabase/migrations/` sao sequenciais e incrementais

## Sub-agentes Especializados (.claude/agents/)

| Agente   | Arquivo       | Quando usar                                   |
| -------- | ------------- | --------------------------------------------- |
| Frontend | `frontend.md` | Componentes, estilo, data fetching, routing   |
| Backend  | `backend.md`  | Edge Functions, migrations, RLS, Deno         |
| Auth     | `auth.md`     | Autenticacao, permissoes, roles, route guards |
| Testing  | `testing.md`  | Infraestrutura de testes, mocks, patterns     |

## Skills (Slash Commands — .claude/skills/)

| Comando          | Descricao                                   |
| ---------------- | ------------------------------------------- |
| `/new-page`      | Scaffold de nova pagina com routing e guard |
| `/new-component` | Componente com convencoes do projeto        |
| `/write-test`    | Teste com mocks e providers                 |

## CLAUDE.md por Diretorio

| Diretorio                   | Conteudo                                                |
| --------------------------- | ------------------------------------------------------- |
| `src/components/dashboard/` | Layout, sidebar, header, patterns de dashboard          |
| `src/components/campaigns/` | Gestao de campanhas, integracao Facebook/Google         |
| `supabase/functions/`       | Categorias de funcoes, boilerplate, CORS, auth patterns |
