# PLAN — Implementação do Carousel Studio SaaS

> Plano de implementação em fases para construir o SaaS descrito em `SPEC.md`.
> Stack: **Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase (DB/Auth/Storage/Edge) + React Query + Deploy Vercel.**
>
> Cada fase termina com um estado **funcional e verificável**. Não pule a verificação.

---

## Decisões de Arquitetura (tomar antes de codar)

| Tema                  | Decisão recomendada                                                                             | Alternativa                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Framework             | Next.js App Router (Server Components + Server Actions)                                         | —                                                                      |
| Backend de IA         | **Route Handlers / Server Actions** no Next (Fluid Compute, streaming via SSE/`ReadableStream`) | Supabase Edge Functions (Deno) — útil se quiser portar 1:1 do original |
| Auth                  | Supabase Auth + `@supabase/ssr` (cookies)                                                       | —                                                                      |
| Multi-tenant          | `org_id` em todas as tabelas + RLS via `get_user_org_ids()` SECURITY DEFINER                    | schema-per-tenant (overkill)                                           |
| Estado de dados       | TanStack React Query (igual ao original)                                                        | SWR                                                                    |
| Render do canvas      | HTML/CSS div + `html2canvas` (igual ao original)                                                | Satori/`@vercel/og` (server-side, futuro)                              |
| Secrets de IA por org | Cifradas no banco (pgsodium/Vault) ou env por org                                               | Texto puro (NÃO)                                                       |

> **Sobre render server-side:** o original usa `html2canvas` no browser. É o caminho mais fiel e rápido de portar. Avaliar `@vercel/og`/Satori só numa fase posterior se quiser export server-side determinístico — mas Satori **não** suporta tudo que CSS suporta, então o canvas atual pode não converter 1:1.

---

## Fase 0 — Bootstrap do projeto

**Objetivo:** repositório rodando localmente + Supabase conectado.

1. `npx create-next-app@latest` (TypeScript, Tailwind, App Router, `src/`).
2. Instalar: `@supabase/supabase-js @supabase/ssr @tanstack/react-query html2canvas jszip jspdf sonner zod react-hook-form lucide-react`.
3. shadcn/ui: `npx shadcn@latest init` + componentes base (button, input, slider, select, dialog, tabs, switch, popover, skeleton, tooltip).
4. Criar projeto Supabase; configurar `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
5. Clients Supabase: `lib/supabase/client.ts` (browser) e `lib/supabase/server.ts` (`@supabase/ssr` com cookies).
6. Providers: `QueryClientProvider` + `<Toaster>` (sonner) no root layout.

**Verificação:** `npm run dev` sobe; página inicial conecta no Supabase (query trivial OK).

---

## Fase 1 — Multi-tenancy + Auth (fundação)

**Objetivo:** organizações, membros, RLS isolando tudo. **Esta é a fase mais importante — erre aqui e tudo desmorona.**

1. **Migrations:**
   - `organizations`, `memberships`, `org_settings`, `ai_model_configs`, `brand_profiles`.
   - Função `get_user_org_ids()` **SECURITY DEFINER** retornando `setof uuid` das orgs do `auth.uid()`.
   - RLS em todas: `org_id IN (SELECT get_user_org_ids())`. `GRANT ... TO authenticated` em todas.
   - Trigger `updated_at`.
2. **Auth:** `/login`, `/signup`, callback. Middleware que protege `/app/*`.
3. **Onboarding:** usuário sem org → `/onboarding` cria `organizations` + `memberships(owner)` + `org_settings` default.
4. **Org context:** hook/provider que resolve a org ativa (de membership; persistir escolha se múltiplas).
5. **Settings de membros:** convidar (por email), atribuir role.

**Verificação (crítica):** criar 2 usuários em 2 orgs; confirmar via SQL e via app que A não lê dados de B. Testar policy com `set role authenticated` + `request.jwt.claims`.

> ⚠️ **Armadilha herdada:** nunca fazer subquery direta em tabela com RLS dentro de uma policy — usar `get_user_org_ids()` SECURITY DEFINER. Subquery nested falha silenciosamente retornando 0 rows. Toda tabela nova precisa de `GRANT` ou o front recebe array vazio sem erro.

---

## Fase 2 — Schema do carrossel + CRUD de projetos

**Objetivo:** criar/listar/abrir projetos (sem editor ainda).

1. **Migrations:** `carousel_projects`, `carousel_slides` (todos os campos do `StudioSlide` — copiar defaults do anexo). RLS por `org_id` (slides via project → função `get_user_project_ids()` SECURITY DEFINER, espelhando o `get_user_carousel_studio_project_ids()` original). Index em `project_id`. UNIQUE(project_id, slide_number).
2. **Storage:** bucket público `visual-creatives`; policies de upload por org (`org/{orgId}/...`).
3. **Hooks (React Query):**
   - `useProjects(orgId)` — lista, ordenada por `updated_at desc`.
   - `useProject(id)`, `useCreateProject`, `useUpdateProject`, `useUpdateProjectStatus`.
   - `useSlides(projectId)` — porta de `useCarouselStudioSlides`: query + `updateSlide` (optimistic + debounce 2s) + `createSlides` + `updateExportedUrl` + `flushAll`.
4. **Telas:** `/app` (grid de projetos com thumbnail) e `/app/new` placeholder.

**Verificação:** criar projeto via UI → linha em `carousel_projects` com `org_id` certo; criar slides → `carousel_slides`; editar campo → persiste após 2s.

---

## Fase 3 — Canvas de render (`SlideCanvas`) — o coração

**Objetivo:** renderizar 1 slide fiel ao original, controlado por props.

1. Portar `types.ts` **integralmente** (enums, `FONT_PAIR_CSS`, `FONT_PAIR_LABELS`, `BADGE_POSITION_STYLES`, `TEXT_POSITION_CLASSES`, `getOverlayGradient`).
2. Portar `SlideCanvas.tsx` (646 linhas): camadas fundo → overlay → badge → texto (com parser de `**realce**`) → imagens de conteúdo → cantos (SVG) → indicadores.
   - Fundo individual vs panorâmico compartilhado (cálculo de `background-position`/`background-size` por slide).
   - `crossOrigin="anonymous"` em todas as `<img>`.
3. Carregar Google Fonts (link idempotente, igual `preloadFonts`).
4. Tela de teste: renderizar um slide mock com todas as features ligadas e escalado via `transform: scale()`.

**Verificação:** comparar visualmente com screenshots do editor original; todas as 6 famílias de fonte, 8 overlays, 6 cantos, badge e galeria aparecem corretos.

---

## Fase 4 — Editor completo (sidebar + barras)

**Objetivo:** editar todas as propriedades do slide.

1. Portar as **sections** (`src/components/carousel-studio/sections/`): Background, Overlay, Text, ImageContent, Fonts, Badge, Corners, Client→**Brand**.
   - `ClientSection` vira **BrandSection** (puxa de `brand_profiles`, auto-popula handle/cor/badge).
2. Portar `StudioSidebar`, `StudioTopBar`, `StudioBottomBar` (zoom 25–100%), `SlideStrip`, `SidebarSection`.
3. Página `/app/studio/[projectId]`: estado dos slides via `useSlides`, slide ativo, navegação, `flushAll` ao sair.
4. Upload de imagens (fundo/badge/conteúdo) → storage `org/{orgId}/uploads/...`.

**Verificação:** editar cada controle reflete no canvas em tempo real e persiste; trocar de slide preserva edições.

---

## Fase 5 — Export (PNG / ZIP)

**Objetivo:** exportar idêntico ao preview.

1. Portar `useSlideExport`: render off-screen em container `position:fixed; left:-99999px` sem `transform`, clonar nó, aguardar `document.fonts.ready` + load de `<img>` (timeout 8s), `html2canvas({ scale:1, useCORS:true, allowTaint:true, width:1080, height:1350 })`.
2. `exportSlide` → upload `org/{orgId}/carousel-studio/{projectId}/{slideNumber}.png` (upsert) + URL com `?v=Date.now()` → `updateExportedUrl`.
3. `exportAllAsZip` → `jszip` + download.
4. **Proxy de imagem externa:** Route Handler `/api/proxy-image` que baixa a imagem externa e a recacheia no storage da org (resolve CORS/taint). Usar ao selecionar imagem do Pexels/IA.

**Verificação:** PNG exportado é pixel-idêntico ao preview (fontes corretas, sem canvas "tainted"); ZIP abre com todos os slides.

---

## Fase 6 — IA Gateway + geração

**Objetivo:** geração de conteúdo/imagem/legenda por tenant.

1. Portar `_shared/ai-gateway.ts` como `lib/ai/gateway.ts`: OpenRouter, `FUNCTION_DEFAULTS`, resolução de modelo (default → `ai_model_configs` da org → key de `org_settings` → fallback env), cache 60s, `callAI`/`callAIVision`.
2. Route Handlers (ou Server Actions):
   - `POST /api/ai/generate-content` — gera headline/subtitle/visual_description de todos os slides a partir do prompt.
   - `POST /api/ai/slide-image-prompt`.
   - `POST /api/ai/generate-image` — imagem do slide.
   - `POST /api/ai/caption` — legenda+hashtags+CTA.
   - `POST /api/ai/pexels` — busca Pexels com key da org.
3. Streaming (SSE/`ReadableStream`) para geração de carrossel com progresso por slide (porta de `useCarouselGenerationStream`).
4. **Cobrança/limites:** validar key da org; se ausente, usar fallback de plataforma respeitando `monthly_export_limit`/plano.

**Verificação:** com key da org A, gerar carrossel; trocar para org B com outra key e confirmar que usa a key de B (logar provider/modelo). Sem key → erro claro/fallback.

---

## Fase 7 — Wizard de criação

**Objetivo:** `/app/new` em 4 passos cria projeto + slides (com ou sem IA).

1. Portar `StudioWizardModal` (728 linhas) como página/stepper: estilo → IA vs manual → prompt → design.
2. Se IA: chamar `/api/ai/generate-content` e popular slides; senão criar slides vazios.
3. Redirecionar para `/app/studio/[projectId]`.

**Verificação:** fluxo IA e fluxo manual ambos criam projeto navegável.

---

## Fase 8 — Settings da organização (config por tenant)

**Objetivo:** cada empresa configura tudo.

1. `/app/settings`: form (react-hook-form + zod) para `org_settings` — keys de IA (OpenRouter/OpenAI/Anthropic/Gemini), key Pexels, cor/handle/badge padrão, pares de fonte habilitados.
2. `/app/settings/members` — convites + roles.
3. `/app/brands` — CRUD de `brand_profiles`.
4. Cifrar keys (pgsodium/Vault) ou armazenar via Edge com service role; nunca expor ao client.

**Verificação:** salvar config da org persiste e é usada na geração; outra org não vê.

---

## Fase 9 — Billing/limites + polish (opcional v1.1)

- Planos (free/pro), `monthly_export_limit`, contador de uso.
- Stripe (ou Vercel marketplace) — opcional.
- Landing, onboarding polido, empty states, loading skeletons.

---

## Fase 10 — Deploy

1. Projeto Vercel ligado ao repo; env vars (`vercel env`).
2. Supabase: rodar migrations, criar buckets, policies de storage.
3. Se usar Edge Functions Supabase: `supabase functions deploy`.
4. Smoke test em produção com 2 tenants.

---

## Ordem de prioridade (caminho crítico)

**Fase 1 (multi-tenant/RLS) → 2 (schema/CRUD) → 3 (canvas) → 4 (editor) → 5 (export)** entregam um produto usável manualmente. **6–8** adicionam IA e config por tenant. 9–10 produtizam.

## Riscos & mitigação

| Risco                                            | Mitigação                                                 |
| ------------------------------------------------ | --------------------------------------------------------- |
| RLS mal configurado vaza dados entre tenants     | Testes de isolamento na Fase 1 antes de qualquer feature  |
| `html2canvas` "taints" canvas com imagem externa | Proxy/recache no storage da org + `crossOrigin`           |
| Export difere do preview (fontes)                | `document.fonts.ready` + `fonts.load()` antes de capturar |
| Render server-side (Satori) não bate 1:1         | Manter `html2canvas` client-side na v1                    |
| Keys de IA expostas                              | Cifrar no banco; só backend acessa                        |
| Custo de IA por tenant                           | Limites por plano + key própria da org                    |
