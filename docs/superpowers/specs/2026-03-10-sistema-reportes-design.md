# Sistema de Reportes — Design Spec

## Objetivo

Criar uma área no sistema onde colaboradores podem reportar bugs e sugerir features. Os reportes são criados como GitHub Issues com templates e labels corretas, permitindo que o Claude Code no GitHub analise, implemente (com PR) ou recuse (com justificativa). O status e respostas ficam visíveis para o colaborador na interface.

## Decisões de Design

| Decisão | Escolha |
|---------|---------|
| Usuários | Todos os colaboradores logados |
| Acesso | Página dedicada `/reportes` no menu lateral |
| Permissão | Nova permissão `reportes` no sistema de permissões |
| Tipos de reporte | Bug e Feature |
| Arquitetura | Híbrida (Supabase + GitHub) |
| Autenticação GitHub | PAT como variável de ambiente na Edge Function |
| Atualização de status | Sob demanda ao abrir o reporte |
| Layout da página | Cards com contadores de status no topo + tabs por tipo |
| Formulário de criação | Modal/Dialog (shadcn Dialog) |
| Detalhe do reporte | Accordion inline na lista |
| Status possíveis | `aberto`, `em_analise`, `implementado`, `recusado` |
| Visibilidade ao usuário | Status + resposta do Claude |

## Modelo de Dados

### Tabela `user_reports`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK, default gen_random_uuid()) | ID do reporte |
| `company_id` | uuid (FK → companies) | Empresa do colaborador |
| `user_id` | uuid (FK → auth.users) | Quem reportou |
| `type` | text (check: 'bug' ou 'feature') | Tipo do reporte |
| `title` | text (not null) | Título do reporte |
| `description` | text (not null) | Descrição detalhada |
| `extra_fields` | jsonb | Campos adicionais (url, passos, área do sistema) |
| `github_issue_number` | integer | Número da issue criada |
| `github_issue_url` | text | URL da issue |
| `status` | text (default 'aberto') | Status atual |
| `claude_response` | text | Resposta/motivo quando o Claude analisa |
| `created_at` | timestamptz (default now()) | Data de criação |
| `updated_at` | timestamptz (default now()) | Última atualização |

**RLS Policies:**
- SELECT: Usuários veem todos os reportes da sua `company_id` (transparência interna)
- INSERT: Usuários só inserem com seu próprio `user_id` e `company_id`
- UPDATE: Apenas `service_role` (Edge Functions) pode atualizar `status` e `claude_response`
- DELETE: Não permitido (reportes são permanentes)

**Índices:** `company_id`, `user_id`, `status`.

## Campos do Formulário

### Bug
- Título (obrigatório)
- URL onde ocorreu o erro (opcional)
- Descrição: o que aconteceu vs o que esperava (obrigatório)
- Passos para reproduzir (opcional, textarea)
- Stack trace / mensagem de erro (opcional, textarea)
- Arquivo suspeito (opcional, text)

### Feature
- Título (obrigatório)
- Categoria (obrigatório, select: Competitiva, Automação, IA/Agentes, Integração, UX)
- Qual problema resolve (obrigatório, textarea)
- Proposta de solução (obrigatório, textarea)
- Impacto esperado (obrigatório, select: Crítico, Alto, Médio, Baixo)
- Complexidade estimada (obrigatório, select: Simples, Média, Complexa)
- Área do sistema afetada (opcional, select)

### Schema de `extra_fields` (jsonb)

**Bug:** `{ url?: string, steps?: string, stack_trace?: string, suspected_file?: string }`
**Feature:** `{ category: string, problem: string, proposal: string, impact: string, complexity: string, area?: string }`

## Arquitetura

### Edge Functions

#### `create-github-issue`
- **Input:** `{ type, title, description, extra_fields, user_name, company_id, user_id }`
- **Ações:**
  1. Monta o corpo da issue seguindo o template GitHub correspondente (`bug-report` ou `feature-suggestion`)
  2. Define labels: Bug → `bug` + `claude-analyze`; Feature → `feature-suggestion` + `claude-analyze`
  3. Cria a issue via GitHub API (`POST /repos/{owner}/{repo}/issues`) usando PAT
  4. Insere registro na tabela `user_reports` com `github_issue_number` e `github_issue_url`
  5. Retorna o registro criado
- **Auth:** JWT verificado (colaborador logado)
- **Env vars:** `GITHUB_PAT`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`

#### `fetch-github-issue-status`
- **Input:** `{ report_id, github_issue_number }`
- **Ações:**
  1. Busca a issue via GitHub API (`GET /repos/{owner}/{repo}/issues/{number}`)
  2. Busca comentários da issue (`GET /repos/{owner}/{repo}/issues/{number}/comments`)
  3. Mapeia status (ver regras abaixo)
  4. Extrai resposta do Claude (comentários de bot/claude)
  5. Atualiza o registro na tabela `user_reports` se houve mudança
  6. Retorna dados atualizados
- **Auth:** JWT verificado

### Mapeamento de Status

| Condição GitHub | Status no Sistema |
|----------------|-------------------|
| Issue aberta, sem comentário do Claude | `aberto` |
| Issue aberta, com comentário do Claude | `em_analise` |
| Issue fechada + PR merged ou label `implemented` | `implementado` |
| Issue fechada + label `wontfix` | `recusado` |
| Issue fechada sem labels específicas (fallback) | `implementado` |

## Componentes Frontend

### Página: `src/pages/Reportes.tsx`
- Rota: `/reportes` (PermissionProtectedRoute com permissão `reportes`)
- Layout padrão do sistema (DashboardLayout)

### Componentes: `src/components/reportes/`

#### `ReportesPage.tsx`
- Container principal
- Header com título + botão "Novo Reporte"
- Contadores de status (4 cards: Abertos, Em Análise, Implementados, Recusados)
- Tabs: Todos / Bugs / Features
- Lista de reportes com accordion

#### `ReportStatusCards.tsx`
- 4 cards com contadores por status
- Cores: Aberto (azul), Em Análise (amarelo), Implementado (verde), Recusado (vermelho)

#### `ReportList.tsx`
- Lista de reportes filtrada por tab ativa
- Cada item: badge de tipo, título, autor, data, badge de status
- Clique expande accordion com detalhes

#### `ReportDetailAccordion.tsx`
- Conteúdo expandido do reporte
- Seções: Descrição, campos extras (URL/área), Resposta do Claude
- Ao expandir, chama `useFetchIssueStatus` para atualizar status sob demanda

#### `NewReportDialog.tsx`
- Modal com formulário (shadcn Dialog + React Hook Form + Zod)
- Toggle de tipo (Bug/Feature) que altera campos visíveis
- Validação: título e descrição obrigatórios
- Submit chama `useCreateReport` mutation

### Hooks: `src/hooks/`

#### `useUserReports.ts`
- `useQuery` que busca reportes da `user_reports` filtrados por `company_id`
- Query key: `["user-reports", companyId]`

#### `useCreateReport.ts`
- `useMutation` que chama Edge Function `create-github-issue`
- Invalida query `["user-reports"]` no sucesso
- Toast de sucesso/erro

#### `useFetchIssueStatus.ts`
- `useMutation` chamado imperativamente ao expandir o accordion
- Chama Edge Function `fetch-github-issue-status`
- Atualiza cache local do react-query com dados atualizados via `queryClient.setQueryData`

## Integração com Sistema Existente

### Permissão
- Adicionar `'reportes'` ao tipo `MenuItemType` em `useEmployeePermissions.tsx`
- Adicionar `'reportes'` ao array `allPermissions` do owner
- A migration SQL cuida da criação da tabela (não há tabela de permissões — permissões são controladas por código)

### Rota (App.tsx)
- Adicionar `<Route path="/reportes" element={<PermissionProtectedRoute requiredPermission="reportes"><Reportes /></PermissionProtectedRoute>} />`

### Menu Lateral (DashboardSidebar.tsx)
- Adicionar item "Reportes" com ícone `MessageSquareWarning` (Lucide) na categoria "Sistema"
- Importar `MessageSquareWarning` de `lucide-react`
- Visível apenas se o colaborador tem permissão `reportes`

### GitHub Workflow
- Nenhuma alteração necessária no `claude.yml` — já processa issues com labels `claude-analyze` e `feature-suggestion`

## Fluxo Completo

1. Colaborador acessa `/reportes` → vê lista com contadores de status
2. Clica "Novo Reporte" → modal com formulário (campos mudam por tipo)
3. Preenche e envia → Edge Function cria issue no GitHub + salva no Supabase
4. Workflow `claude.yml` detecta a issue (pela label) → analisa automaticamente
5. Claude implementa (cria PR) ou recusa (comenta motivo e fecha)
6. Colaborador volta à página → clica no reporte → accordion expande
7. Sistema busca status atualizado do GitHub → mostra resposta do Claude e status

## Tratamento de Erros

| Cenário | Comportamento |
|---------|---------------|
| GitHub API fora do ar na criação | Toast de erro: "Não foi possível criar o reporte. Tente novamente." — registro NÃO é salvo no Supabase |
| PAT expirado/inválido | Toast de erro genérico. Log detalhado no Edge Function para debug |
| GitHub API fora na consulta de status | Mostra dados do cache local (Supabase) com aviso: "Não foi possível atualizar o status" |
| Issue deletada no GitHub | Mostra status do cache local sem erro. Status permanece o último conhecido |

## Migration SQL

A migration deve criar: tabela `user_reports`, índices, RLS policies (SELECT por company_id, INSERT com check de user_id, sem UPDATE/DELETE para usuários), e trigger para `updated_at`.
