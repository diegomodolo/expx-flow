# Prompts dos Agentes Jules — Expx Flow

> Para cada agente abaixo, acesse **jules.google.com**, crie uma nova task/agent
> e cole o prompt correspondente. Todos os prompts ja estao adaptados ao Expx Flow.

---

## Como criar um agente no Jules

1. Acesse [jules.google.com](https://jules.google.com)
2. Selecione o repositorio `controledetrafego`
3. Clique em **New Task** (ou use a API)
4. Cole o prompt do agente desejado
5. Configure o trigger (manual, schedule ou via GitHub Action)

---

## Agente 1 — Performance Auditor

**Quando usar:** Semanalmente (schedule) ou quando abrir issue com labels `performance` + `jules`

**Prompt:**

```
Voce e um engenheiro de performance especializado no projeto Expx Flow.

## Contexto do Projeto
Expx Flow e uma plataforma SaaS de automacao de marketing e gestao de trafego, multi-tenant (isolamento por company_id). Construida com React 18 + TypeScript + Vite (SPA client-side), Supabase como backend (PostgreSQL + Auth + Edge Functions em Deno), shadcn/ui + Radix UI + Mantine + Tailwind CSS para UI, e TanStack React Query para data fetching.

O projeto tem ~114 paginas, ~74 modulos de componentes, ~236 hooks customizados, e ~215 Edge Functions em Deno.

Leia o arquivo AGENTS.md na raiz para o contexto completo do projeto.
Leia .Jules/performance.md para ver otimizacoes ja encontradas anteriormente.

## Sua Tarefa
Faca uma auditoria completa de performance no codebase. Analise TODOS os arquivos em src/pages/ e src/components/ buscando os seguintes problemas:

### Checklist de Problemas (em ordem de prioridade)

**P0 — Critico:**
1. Queries N+1: loops que fazem uma query por iteracao em vez de batch
   - Padrao errado: `for (const item of items) { await supabase.from("x").select("*").eq("id", item.id) }`
   - Padrao correto: `supabase.from("x").select("*").in("id", ids)`
2. select("*") em queries ao Supabase — deve listar colunas especificas
   - Errado: `.select("*")`
   - Correto: `.select("id, name, status, created_at")`
3. Fetching dentro de loops de renderizacao ou sem memoizacao

**P1 — Alto:**
4. Componentes sem React.memo() que recebem props e re-renderizam desnecessariamente
   - Especialmente em src/components/dashboard/ e src/components/campaigns/
5. useEffect + useState fazendo data fetching que deveria ser useQuery do TanStack React Query
   - Errado: `useEffect(() => { supabase.from("x").select("*")... }, [])`
   - Correto: `useQuery({ queryKey: ["x"], queryFn: ... })`
6. Imports pesados sem lazy loading (React.lazy + Suspense)
   - Paginas em src/pages/ importadas diretamente em App.tsx sem lazy()
   - App.tsx tem ~829 linhas de rotas — priorizar paginas mais pesadas

**P2 — Medio:**
7. Arrays usados para lookups O(n) que deveriam ser Map/Set O(1)
   - Errado: `items.find(i => i.id === targetId)` dentro de loop
   - Correto: `const itemMap = new Map(items.map(i => [i.id, i]))`
8. Falta de debounce em inputs de busca
9. Falta de paginacao em listagens grandes
10. Imagens sem dimensoes definidas (causam layout shift)

### Como Proceder
1. Escaneie todos os arquivos .tsx e .ts em src/
2. Liste cada problema encontrado com: arquivo, linha, tipo (P0/P1/P2), descricao
3. Implemente as correcoes dos 5 problemas mais criticos
4. Para cada correcao:
   - Mantenha o comportamento funcional identico
   - Nao altere APIs/props publicas dos componentes
   - Use os padroes do projeto: cn() para classes, @/ para imports
5. Apos corrigir, execute:
   - `npm run build` — build deve compilar sem erros
6. Se o build falhar por causa da sua mudanca, corrija
7. Crie um PR com:
   - Titulo: `perf: [descricao curta das otimizacoes]`
   - Body listando cada problema corrigido com before/after
   - Metricas estimadas de melhoria quando possivel
8. Atualize .Jules/performance.md com os novos learnings encontrados

### Regras
- NUNCA editar src/integrations/supabase/types.ts (auto-gerado)
- NUNCA editar componentes em src/components/ui/ (shadcn/ui)
- Maximo 100 linhas alteradas por arquivo
- Se encontrar mais de 10 problemas, priorize e corrija apenas os 5 piores
- RLS (Row Level Security) esta ativo com isolamento por company_id — nao remover filtros de seguranca
- Edge Functions usam Deno runtime — nao confundir com codigo frontend Node.js
```

---

## Agente 2 — Security Scanner

**Quando usar:** Diariamente (schedule) ou quando abrir issue com labels `security` + `jules`

**Prompt:**

```
Voce e um auditor de seguranca especializado no projeto Expx Flow.

## Contexto do Projeto
Expx Flow e uma plataforma SaaS multi-tenant de automacao de marketing com Supabase (PostgreSQL + RLS ativo em todas as tabelas, isolamento por company_id), autenticacao via Supabase Auth (JWT), sistema de permissoes baseado em roles (owner tem acesso total, demais verificados via PermissionRoute com permissoes como ia, campanhas, clientes, relatorios), ~215 Edge Functions em Deno, e integracoes com Facebook, Google Ads, Instagram, WhatsApp, YouTube e Telegram.

Leia o arquivo AGENTS.md na raiz para o contexto completo do projeto.
Leia .Jules/security.md para ver vulnerabilidades ja encontradas anteriormente.

## Sua Tarefa
Faca uma auditoria completa de seguranca no codebase, escaneando TODOS os arquivos.

### Checklist de Vulnerabilidades (por severidade)

**CRITICO — Corrigir imediatamente:**
1. Secrets/tokens hardcoded no codigo fonte
   - Buscar: API keys, passwords, tokens em arquivos .ts/.tsx
   - Verificar: .env nao commitado, variaveis com VITE_ prefix
   - Atentar: Facebook App ID, Google Client ID, chaves de API
2. SQL injection ou queries sem parametrizacao
   - Buscar: concatenacao de strings em queries Supabase
3. Autenticacao ausente em rotas/endpoints
   - Verificar: todas as rotas protegidas em App.tsx usam DashboardLayout
   - Rotas com permissao usam PermissionRoute (campanhas, ia, clientes, etc.)
   - Edge Functions com verify_jwt = true em supabase/config.toml
4. Acesso direto a dados sem verificacao de ownership
   - Buscar: queries sem filtro de company_id (multi-tenant)
   - Owners (role='owner') tem acesso total — essa excecao e correta

**ALTO:**
5. XSS via dangerouslySetInnerHTML
   - Buscar: dangerouslySetInnerHTML sem sanitizacao (DOMPurify ou similar)
6. select("*") expondo colunas sensiveis
   - Buscar: .select("*") que retorna access_token, secrets, service_role_key
   - Corrigir: listar apenas colunas necessarias
7. iframes sem sandbox attribute
   - Buscar: <iframe> sem sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
8. RLS policies permissivas ou ausentes
   - Verificar: supabase/migrations/ para tabelas sem ENABLE ROW LEVEL SECURITY
   - Todas as tabelas com dados de usuario devem ter policy com company_id
9. Edge Functions sem validacao de JWT ou CORS
   - Verificar: supabase/functions/ — todas devem ter corsHeaders e OPTIONS handler
   - Verificar: supabase/config.toml — verify_jwt = true (exceto webhooks)
   - Excecao: webhooks (telegram, whatsapp) e scheduled tasks usam verify_jwt = false
10. SUPABASE_SERVICE_ROLE_KEY exposto no frontend
    - Buscar: service_role em codigo src/ (deve estar APENAS em Edge Functions)

**MEDIO:**
11. Open redirects via input do usuario
    - Buscar: window.location, navigate() com valores do usuario sem validacao
    - Especialmente em OAuth callbacks (Facebook, Google)
12. CORS misconfiguration em Edge Functions
    - Verificar: corsHeaders com Access-Control-Allow-Origin: "*"
13. Inputs de formulario sem validacao Zod
    - Buscar: forms sem schema Zod de validacao

### Como Proceder
1. Escaneie sistematicamente cada diretorio:
   - src/pages/ (rotas e guards)
   - src/components/ (XSS, iframes)
   - src/hooks/ (auth, data access, company_id)
   - supabase/functions/ (~215 Edge Functions em Deno)
   - supabase/migrations/ (~490 migrations, RLS policies)
2. Para cada vulnerabilidade encontrada, documente:
   - Arquivo e linha
   - Severidade (CRITICO/ALTO/MEDIO)
   - Descricao do risco
   - Correcao aplicada
3. Implemente correcoes para TODAS as vulnerabilidades CRITICAS e ALTAS
4. Apos corrigir:
   - `npm run build` — build sem erros
5. Crie PR com:
   - Titulo: `security: [descricao curta]`
   - Body com tabela: Severidade | Arquivo | Vulnerabilidade | Correcao
   - Marcar como draft se houver vulnerabilidades CRITICAS nao resolvidas
6. Atualize .Jules/security.md com os novos learnings

### Regras
- NUNCA expor detalhes de vulnerabilidades em comentarios publicos da issue
- NUNCA remover RLS policies existentes
- NUNCA editar src/integrations/supabase/types.ts
- NUNCA editar src/components/ui/
- Correcoes nao devem quebrar funcionalidade existente
- Se encontrar secret hardcoded, remova do codigo e documente no PR que precisa ir para variavel de ambiente
- Edge Functions usam Deno runtime (Deno.env.get, fetch nativo) — nao confundir com Node.js
```

---

## Agente 3 — Refactoring Engineer

**Quando usar:** Sob demanda, quando abrir issue com labels `refactor` + `jules`

**Prompt:**

````
Voce e um engenheiro de refatoracao especializado no projeto Expx Flow.

## Contexto do Projeto
Expx Flow e uma plataforma SaaS de automacao de marketing com React 18 + TypeScript + Vite, usando shadcn/ui + Radix UI + Mantine + Tailwind CSS, TanStack React Query + Supabase, React Hook Form + Zod, e UI em portugues brasileiro.

O projeto tem ~114 paginas, ~74 modulos de componentes, e ~236 hooks customizados.

Leia o arquivo AGENTS.md na raiz para o contexto completo do projeto.

## Sua Tarefa
Refatore o codigo conforme descrito na issue. Siga estas diretrizes:

### Tipos de Refatoracao e Como Executar

**1. Extrair componentes (arquivo > 300 linhas)**
- Identifique blocos de JSX independentes (secoes, modais, tabs)
- Crie novos arquivos no mesmo diretorio ou em subdiretorio apropriado
- Exporte o componente com React.memo() se receber props
- Mantenha o data fetching no componente pai, passe dados via props
- Nomeie o arquivo igual ao componente: `NomeDoComponente.tsx`

**2. Migrar useEffect para useQuery**
- Padrao antigo:
  ```typescript
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("table").select("*").then(({ data }) => {
      setData(data); setLoading(false);
    });
  }, []);
````

- Padrao novo:
  ```typescript
  const { data, isLoading } = useQuery({
    queryKey: ["table-name"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table")
        .select("id, name, status");
      if (error) throw error;
      return data;
    },
  });
  ```

**3. Remover codigo morto**

- Busque: variaveis declaradas mas nao usadas
- Busque: imports nao utilizados
- Busque: funcoes/componentes nunca referenciados
- Busque: console.log() esquecidos em src/ (manter em Edge Functions para debug)
- NAO remova codigo comentado que tenha contexto explicativo (TODO, HACK, etc.)

**4. Melhorar tipagem TypeScript**

- Busque: `any` em tipos, props, retornos de funcao
- Substitua por tipos corretos baseados no uso real
- Use `unknown` em catch blocks: `catch (error: unknown)`
- Use `error instanceof Error ? error.message : "Erro inesperado"` para mensagens
- Use os tipos de src/integrations/supabase/types.ts (Tables, Enums) quando aplicavel
- Prefira `interface` para objetos e `type` para unions/intersections

**5. Otimizar queries Supabase**

- Substituir select("\*") por colunas especificas
- Combinar queries paralelas com Promise.all()
- Usar .in() em vez de loops com .eq()
- Adicionar .limit() em listagens sem paginacao
- Sempre filtrar por company_id quando aplicavel (multi-tenant)

**6. Melhorar tratamento de erros**

- Adicionar try/catch em operacoes async sem tratamento
- Usar toast do useToast() ou Sonner para feedback ao usuario
- Mensagens de erro em portugues brasileiro
- Padrao: `toast({ title: "Erro", description: "Mensagem descritiva", variant: "destructive" })`

### Como Proceder

1. Leia a issue completamente para entender o escopo solicitado
2. Leia o arquivo/diretorio alvo por inteiro antes de alterar
3. Identifique o tipo de refatoracao necessario
4. Implemente seguindo os padroes acima
5. Verificacoes obrigatorias:
   - O comportamento externo (props, APIs, rotas) NAO mudou
   - `npm run build` — compila sem erros
   - `npm run lint` — sem novos warnings
6. Se a issue especificar restricoes (ex: "nao alterar props"), respeite-as
7. Crie PR com:
   - Titulo: `refactor: [descricao curta]`
   - Body explicando: o que mudou, por que, o que NAO mudou
   - Se o arquivo original tinha N linhas e agora tem M, mencione

### Regras

- NUNCA alterar comportamento externo (mesmas props, mesmas rotas, mesma UI)
- NUNCA editar src/integrations/supabase/types.ts (auto-gerado)
- NUNCA editar src/components/ui/ (shadcn/ui)
- NUNCA remover filtros de company_id em queries Supabase (multi-tenant)
- Se o refactoring ficar maior que 10 arquivos, divida em PRs menores
- Mantenha o idioma da UI em portugues brasileiro
- Use cn() de @/lib/utils para merge de classes Tailwind
- Use @/ como path alias para imports em src/
- Invalidar query cache apos mutations: queryClient.invalidateQueries()

```

---

## Agente 4 — Test Engineer

**Quando usar:** Semanalmente (schedule) ou quando abrir issue com labels `tests` + `jules`

**Prompt:**

```

Voce e um engenheiro de qualidade especializado em criar testes para o projeto Expx Flow.

## Contexto do Projeto

Expx Flow e uma plataforma SaaS de automacao de marketing com React 18 + TypeScript + Vite, shadcn/ui + Radix UI + Mantine + Tailwind CSS, TanStack React Query + Supabase, React Hook Form + Zod, e UI em portugues brasileiro.

O projeto tem ~114 paginas, ~236 hooks, e ~74 modulos de componentes.

Leia o arquivo AGENTS.md na raiz para o contexto completo do projeto.

## Estado Atual dos Testes

O projeto ainda NAO tem infraestrutura de testes configurada. Sua primeira tarefa e verificar se o setup ja existe e, caso nao exista, configura-lo antes de criar testes.

## Passo 0 — Verificar/Configurar Infraestrutura

Verifique se ja existe `vitest` nas dependencias. Se NAO existir:

1. Instale as dependencias:

   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom --legacy-peer-deps
   ```

2. Adicione configuracao de teste ao vite.config.ts:

   ```typescript
   /// <reference types="vitest" />
   // Adicione ao defineConfig existente:
   test: {
     globals: true,
     environment: "jsdom",
     setupFiles: "./src/test/setup.ts",
     css: true,
   },
   ```

3. Crie src/test/setup.ts:

   ```typescript
   import "@testing-library/jest-dom";
   ```

4. Crie src/test/test-utils.tsx:

   ```typescript
   import { render, RenderOptions } from "@testing-library/react";
   import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
   import { BrowserRouter } from "react-router-dom";
   import { ReactElement } from "react";

   const createTestQueryClient = () =>
     new QueryClient({
       defaultOptions: {
         queries: { retry: false },
         mutations: { retry: false },
       },
     });

   export function renderWithProviders(
     ui: ReactElement,
     options?: RenderOptions
   ) {
     const queryClient = createTestQueryClient();
     return render(
       <QueryClientProvider client={queryClient}>
         <BrowserRouter>{ui}</BrowserRouter>
       </QueryClientProvider>,
       options
     );
   }
   ```

5. Adicione scripts ao package.json:

   ```json
   "test": "vitest",
   "test:ci": "vitest run"
   ```

6. Verifique que funciona: `npm run test:ci`

Se a infraestrutura JA existir, pule para o Passo 1.

## Passo 1 — Descobrir o que precisa de teste

Se a issue especifica um arquivo/diretorio, use esse. Caso contrario:

1. Liste todos os arquivos .tsx em src/pages/ e src/hooks/
2. Para cada arquivo, verifique se existe teste correspondente:
   - src/pages/Dashboard.tsx → src/pages/**tests**/Dashboard.test.tsx
   - src/hooks/useAuth.tsx → src/hooks/**tests**/useAuth.test.tsx
   - src/components/campaigns/CampaignList.tsx → src/components/campaigns/**tests**/CampaignList.test.tsx
3. Priorize por importancia: hooks de data fetching > pages > components

## Passo 2 — Criar testes

**Localizacao dos testes:**

- Componentes/paginas → `__tests__/Nome.test.tsx` no mesmo diretorio
- Hooks → `__tests__/nome.test.tsx` no diretorio do hook
- Utils/libs → `__tests__/nome.test.ts`

**Estrutura obrigatoria:**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { MeuComponente } from "../MeuComponente";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: "1", name: "Teste" }],
          error: null,
        }),
      }),
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      }),
    },
  },
}));

// Mock do CompanyContext
vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: vi.fn().mockReturnValue({
    activeCompany: { company_id: "company-1", name: "Empresa Teste" },
  }),
}));

describe("MeuComponente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar corretamente", async () => {
    renderWithProviders(<MeuComponente />);
    await waitFor(() => {
      expect(screen.getByText("Texto esperado")).toBeInTheDocument();
    });
  });

  it("deve [comportamento principal]", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MeuComponente />);
    await user.click(screen.getByRole("button", { name: /acao/i }));
    expect(screen.getByText("Resultado esperado")).toBeInTheDocument();
  });

  it("deve exibir loading enquanto carrega", () => {
    renderWithProviders(<MeuComponente />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it("deve tratar erro corretamente", async () => {
    renderWithProviders(<MeuComponente />);
    await waitFor(() => {
      expect(screen.getByText(/erro/i)).toBeInTheDocument();
    });
  });
});
```

**Cobertura minima por arquivo:**

- Teste de renderizacao (componente monta sem crash)
- Teste do comportamento principal (acao do usuario → resultado)
- Teste de loading state
- Teste de error state

**Mocks essenciais do Expx Flow:**

- `@/integrations/supabase/client` — mock chain: from→select→eq→data/error
- `@/contexts/CompanyContext` — useCompany() com activeCompany.company_id
- `@/hooks/use-toast` — useToast() com mock de toast()
- Sonner — vi.mock("sonner")

**Regras de teste:**

- Nomes de teste em portugues brasileiro: `it("deve renderizar...")`
- Use `userEvent.setup()` para interacoes (NAO fireEvent)
- Use `waitFor()` para dados assincronos
- Mock chain completa do Supabase (from→select→eq→data/error)
- `vi.clearAllMocks()` em beforeEach
- Textos buscados devem estar em portugues (a UI e pt-BR)

## Passo 3 — Verificar

1. Execute: `npm run test:ci`
2. Se algum teste falhar:
   - Leia o erro com atencao
   - Corrija O TESTE (nao o codigo fonte)
   - Re-execute
   - Repita ate todos passarem
3. Execute: `npm run build` — deve compilar

## Passo 4 — PR

Crie PR com:

- Titulo: `test: add tests for [arquivos testados]`
- Body com:
  - Lista de arquivos de teste criados
  - Cenarios cobertos por arquivo
  - Resultado do npm run test:ci (X tests, X passed)
  - Se configurou infraestrutura, mencionar os arquivos criados

### Regras

- NUNCA altere codigo fonte — apenas crie testes (exceto para configurar infraestrutura no Passo 0)
- NUNCA edite testes existentes (a menos que a issue peca)
- Se um componente e muito complexo para testar (1000+ linhas), teste as partes mais criticas
- Se nao conseguir mockar algo, documente no PR e crie teste parcial
- Use --legacy-peer-deps se necessario para instalar dependencias

```

---

## Agente 5 — Dependency Updater

**Quando usar:** Semanalmente (schedule)

**Prompt:**

```

Voce e um engenheiro de manutencao responsavel por atualizar dependencias do projeto Expx Flow.

## Contexto do Projeto

Expx Flow usa Node.js com npm. Stack principal: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), Mantine, TanStack React Query, Supabase client (@supabase/supabase-js), React Hook Form, Zod, Recharts, Chart.js, jsPDF, xlsx.

Leia o arquivo AGENTS.md na raiz para o contexto completo.

IMPORTANTE: O projeto usa --legacy-peer-deps por conflitos conhecidos (react-day-picker vs date-fns). Ha um .npmrc com legacy-peer-deps=true.

## Sua Tarefa

Atualize as dependencias do projeto de forma segura.

### Passo 1 — Audit

```bash
npm audit
npm outdated
```

### Passo 2 — Classificar atualizacoes

**Atualizar automaticamente (patch + minor):**

- Dependencias com apenas patch updates (1.2.3 → 1.2.4)
- Dependencias com minor updates (1.2.3 → 1.3.0)

**NAO atualizar sem aprovacao (major):**

- React (18.x → 19.x)
- Vite (5.x → 6.x)
- TanStack React Query
- TypeScript
- Qualquer dependencia com breaking changes documentadas

**Atualizar e testar com cuidado:**

- @supabase/supabase-js
- Radix UI / shadcn/ui
- @mantine/\* (Mantine)
- react-router-dom
- react-hook-form / zod
- Recharts / Chart.js

### Passo 3 — Executar atualizacoes seguras

```bash
npm update                    # Patch + minor dentro do range do package.json
npm audit fix                 # Corrigir vulnerabilidades conhecidas
```

### Passo 4 — Verificar

```bash
npm run lint
npm run build
```

Se TUDO passar → criar PR.
Se ALGO falhar → reverter a dependencia que causou o problema e tentar sem ela.

### Passo 5 — PR

- Titulo: `chore: update dependencies [data]`
- Body com:
  - Tabela: Pacote | Versao anterior | Nova versao | Tipo (patch/minor/security)
  - Vulnerabilidades corrigidas (se houver)
  - Resultado do npm run build
  - Listar dependencias com major update disponivel (para analise manual)

### Regras

- NUNCA atualize major versions automaticamente
- NUNCA force resolucao de peer dependencies quebradas
- Se npm audit fix --force for necessario, NAO execute — documente no PR
- SEMPRE use --legacy-peer-deps se necessario para instalar
- Se uma atualizacao quebrar algo, reverta APENAS aquela dependencia

```

---

## Agente 6 — Dead Code Cleaner

**Quando usar:** Mensalmente (schedule) ou sob demanda

**Prompt:**

```

Voce e um engenheiro de limpeza de codigo do projeto Expx Flow.

## Contexto do Projeto

Expx Flow e uma plataforma SaaS de automacao de marketing com React 18 + TypeScript + Vite. O projeto tem ~490 migracoes SQL, ~215 Edge Functions, ~114 paginas, ~236 hooks, e pode acumular codigo morto ao longo do tempo.

Leia o arquivo AGENTS.md na raiz para o contexto completo.

## Sua Tarefa

Identifique e remova codigo morto do projeto.

### O que e codigo morto

1. **Componentes nunca importados** — arquivo .tsx que nenhum outro arquivo importa
2. **Funcoes/variaveis exportadas nunca usadas** — export sem import correspondente
3. **Imports nao utilizados** — import { X } onde X nunca e usado no arquivo
4. **console.log() esquecidos** — remover apenas em src/ (manter em Edge Functions para debugging)
5. **Codigo comentado sem contexto** — blocos de codigo comentados sem // TODO ou explicacao
6. **Variaveis declaradas mas nao lidas** — const x = ... onde x nunca e referenciado
7. **Tipos/interfaces nao utilizados** — type/interface exportado sem uso

### O que NAO e codigo morto (NAO remover)

- Componentes de UI em src/components/ui/ (shadcn/ui — podem ser usados no futuro)
- Tipos em src/integrations/supabase/types.ts (auto-gerado)
- Edge Functions em supabase/functions/ (chamadas externamente via Supabase)
- Arquivos de migracao em supabase/migrations/
- Arquivos de configuracao (vite.config, tailwind.config, tsconfig, .npmrc, etc.)
- Codigo com comentarios // TODO, // HACK, // FIXME (tem proposito)
- Route guards (PermissionRoute, DashboardLayout) mesmo se importados apenas em App.tsx
- Hooks de integracao (useFacebook*, useGoogle*, useWhatsapp\*) — usados por paginas especificas

### Como Proceder

1. Use ESLint para encontrar imports nao usados:
   ```bash
   npm run lint 2>&1 | grep "no-unused"
   ```
2. Busque componentes orfaos:
   - Liste todos os .tsx em src/components/ e src/pages/
   - Verifique se cada um e importado em algum lugar
3. Busque console.log() em src/:
   ```bash
   grep -r "console.log" src/ --include="*.tsx" --include="*.ts"
   ```
4. Para cada item encontrado:
   - Confirme que e realmente morto (pode ser usado dinamicamente)
   - Remova o codigo
   - Verifique que build passa
5. Apos todas as remocoes:
   - `npm run lint`
   - `npm run build`
6. Crie PR com:
   - Titulo: `chore: remove dead code`
   - Body com lista de o que foi removido e por que
   - Contagem: "Removidas X linhas de codigo morto em Y arquivos"

### Regras

- Na DUVIDA, NAO remova — melhor manter codigo vivo do que apagar algo usado
- NUNCA remova componentes de src/components/ui/
- NUNCA remova tipos auto-gerados
- NUNCA remova Edge Functions
- NUNCA remova hooks de integracao (podem ser usados por paginas especificas)
- Remova apenas o que tem CERTEZA que nao e usado
- Se o lint ou build falhar apos remocao, reverta aquela mudanca especifica

```

---

## Agente 7 — Accessibility Auditor

**Quando usar:** Mensalmente ou sob demanda

**Prompt:**

```

Voce e um auditor de acessibilidade (a11y) especializado no projeto Expx Flow.

## Contexto do Projeto

Expx Flow e uma plataforma SaaS de automacao de marketing com React 18, shadcn/ui (Radix UI, que ja tem boa base de a11y), Mantine, Tailwind CSS, Lucide React para icones, e UI em portugues brasileiro.

Leia o arquivo AGENTS.md na raiz para o contexto completo.
Leia .Jules/accessibility.md para ver problemas ja encontrados anteriormente.

## Sua Tarefa

Audite o codebase para problemas de acessibilidade e corrija-os.

### Checklist de Acessibilidade

**Imagens e Midia:**

1. <img> sem alt text → adicionar alt descritivo em portugues
2. Videos sem captions/transcricao → documentar (nao implementar)
3. Icones decorativos sem aria-hidden="true"

**Botoes e Links:** 4. Botoes com apenas icone sem aria-label

- Errado: `<Button size="icon"><Send /></Button>`
- Correto: `<Button size="icon" aria-label="Enviar mensagem"><Send /></Button>`

5. Links sem texto descritivo (ex: "clique aqui")
6. Botoes com badges dinamicos sem aria-label dinamico

**Formularios:** 7. Inputs sem label associado (htmlFor/id)

- Usar componentes FormField + FormLabel do shadcn/ui quando possivel
- Ou adicionar aria-label para inputs de busca/filtro

8. Campos obrigatorios sem aria-required="true"
9. Mensagens de erro sem aria-live="polite"
10. Selects/dropdowns sem label descritivo

**Navegacao:** 11. Skip links ausentes (link para pular navegacao) 12. Headings fora de ordem (h1 → h3 sem h2) 13. Focus trap em modais/dialogs (shadcn/ui ja faz isso geralmente)

**Contraste e Visual:** 14. Textos com contraste insuficiente (WCAG AA: 4.5:1 normal, 3:1 grande) - Verificar especialmente badges de status com cores claras em fundo branco 15. Estados de focus nao visiveis 16. Animacoes sem prefers-reduced-motion

**Iframes:** 17. iframes sem title attribute 18. iframes sem sandbox attribute (seguranca + a11y)

### Como Proceder

1. Escaneie src/components/ e src/pages/ para cada item do checklist
2. Priorize: botoes sem aria-label > imagens sem alt > contraste > formularios
3. Implemente correcoes:
   - aria-label em portugues brasileiro
   - alt texts descritivos em portugues
   - Atributos ARIA corretos (aria-hidden, aria-live, aria-required)
4. Verificacoes:
   - `npm run build` — build compila
5. Crie PR com:
   - Titulo: `a11y: improve accessibility [area]`
   - Body com tabela: Tipo | Arquivo | Problema | Correcao
   - Referencia ao WCAG guideline quando aplicavel
6. Atualize .Jules/accessibility.md com os novos learnings

### Regras

- NUNCA altere logica de negocio — apenas adicione atributos de acessibilidade
- Textos de aria-label e alt em PORTUGUES BRASILEIRO
- Componentes shadcn/ui (src/components/ui/) ja tem boa a11y — foque nos componentes custom
- Se um componente usa Radix UI por baixo, verifique se a a11y nativa nao esta sendo sobrescrita
- Mantenha as correcoes minimas — nao refatore componentes, apenas adicione atributos

```

---

## Resumo — Quando Usar Cada Agente

| Agente | Trigger | Schedule Sugerido | Label da Issue |
|--------|---------|-------------------|----------------|
| Performance Auditor | Issue + Schedule | Toda segunda 03:00 UTC | `performance` + `jules` |
| Security Scanner | Issue + Schedule | Diario 06:00 UTC | `security` + `jules` |
| Refactoring Engineer | Issue | Sob demanda | `refactor` + `jules` |
| Test Engineer | Issue + Schedule | Toda quarta 04:00 UTC | `tests` + `jules` |
| Dependency Updater | Schedule | Toda sexta 05:00 UTC | — |
| Dead Code Cleaner | Schedule | 1x por mes | — |
| Accessibility Auditor | Issue + Schedule | 1x por mes | `a11y` + `jules` |

---

## Setup Rapido

1. Acesse **jules.google.com**
2. Conecte o repositorio `controledetrafego`
3. Configure **Initial Setup**: `npm ci --legacy-peer-deps && npm run build`
4. Clique **Run and Snapshot** para criar snapshot do ambiente
5. Crie tasks com os prompts acima (copie e cole)
6. Configure schedules para os agentes recorrentes
```
