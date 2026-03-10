# Jules Agent Blueprint — Automacao com Google Jules para Projetos

> Template estrutural para configurar o Google Jules (AI coding agent) em qualquer projeto.
> Passe este documento ao Claude/Jules em um novo projeto e ele criara toda a estrutura.

---

## 1. O Que e o Jules

Jules e o agente de coding autonomo do Google, alimentado pelo Gemini. Ele:

- Roda em VMs isoladas na nuvem (Ubuntu Linux)
- Clona seu repositorio, instala dependencias, roda testes
- Implementa mudancas e abre PRs automaticamente
- Le `AGENTS.md` para entender contexto do projeto
- Integra com GitHub via App + API + GitHub Actions

### Diferenca entre Jules e Claude Code

| Aspecto       | Claude Code                             | Jules                                                    |
| ------------- | --------------------------------------- | -------------------------------------------------------- |
| Runtime       | Dentro do GitHub Actions runner         | VM isolada na nuvem Google                               |
| Contexto      | CLAUDE.md (hierarquico, por diretorio)  | AGENTS.md (raiz + subdiretorios)                         |
| Trigger       | Labels, comments, dispatch              | Labels, schedule, dispatch, API                          |
| Memoria       | `.claude/` (agents, skills, memory)     | `.Jules/` (learnings capturados)                         |
| GitHub Action | `anthropics/claude-code-action@v1`      | `google-labs-code/jules-invoke@v1`                       |
| API Key       | `ANTHROPIC_API_KEY`                     | `JULES_API_KEY`                                          |
| Foco          | Implementacao completa (feature/bug→PR) | Tarefas especializadas (perf, security, refactor, tests) |

### Como usar os dois juntos

```
Claude Code → Implementa features e corrige bugs (fluxo completo)
Jules       → Tarefas especializadas (performance, seguranca, refactor, testes)
```

---

## 2. Estrutura de Arquivos

```
projeto/
├── AGENTS.md                         # Contexto para Jules (e outros agentes)
├── .Jules/                           # Memoria/learnings do Jules
│   ├── security.md                   # Vulnerabilidades encontradas e prevencoes
│   ├── accessibility.md              # Learnings de acessibilidade
│   └── performance.md                # Otimizacoes aprendidas
├── .github/
│   ├── workflows/
│   │   ├── jules-performance.yml     # Jules: auditoria de performance
│   │   ├── jules-security.yml        # Jules: auditoria de seguranca
│   │   ├── jules-refactor.yml        # Jules: refatoracao de codigo
│   │   ├── jules-tests.yml           # Jules: criacao de testes
│   │   └── telegram-pr.yml          # Detecta PRs do Jules
│   └── ISSUE_TEMPLATE/
│       ├── performance.yml           # Template: performance (label: jules)
│       ├── security-audit.yml        # Template: seguranca (label: jules)
│       ├── refactor.yml              # Template: refactor (label: jules)
│       └── test-coverage.yml         # Template: testes (label: jules)
```

---

## 3. Secrets Necessarios

| Secret               | Onde obter                             | Usado por          |
| -------------------- | -------------------------------------- | ------------------ |
| `JULES_API_KEY`      | jules.google.com > Settings > API Keys | Workflows do Jules |
| `TELEGRAM_BOT_TOKEN` | @BotFather no Telegram                 | Notificacoes       |
| `TELEGRAM_CHAT_ID`   | @userinfobot no Telegram               | Notificacoes       |

> **Nota:** O Jules precisa do GitHub App instalado no repositorio. Acesse jules.google.com, conecte sua conta GitHub e selecione os repositorios.

---

## 4. AGENTS.md — Contexto Principal

O Jules le automaticamente o `AGENTS.md` na raiz do repositorio. Este arquivo e o equivalente do `CLAUDE.md` — da ao Jules todo o contexto do projeto.

### Diferenca: AGENTS.md vs CLAUDE.md

| Aspecto    | AGENTS.md                                  | CLAUDE.md                       |
| ---------- | ------------------------------------------ | ------------------------------- |
| Padrao     | Aberto (Linux Foundation)                  | Proprietario Anthropic          |
| Lido por   | Jules, Codex, Cursor, Copilot, 20+ agentes | Apenas Claude Code              |
| Hierarquia | Raiz + subdiretorios (nearest file wins)   | Raiz + subdiretorios            |
| Formato    | Markdown livre (sem secoes obrigatorias)   | Markdown (convencoes do Claude) |

### Template AGENTS.md

````markdown
# [Nome do Projeto] — Contexto para Agentes de IA

## O que e o projeto

[1-2 paragrafos: descricao, dominio, tipo (SaaS, API, CLI)]

## Stack

- **Frontend**: [framework + versao]
- **Backend**: [servico/framework]
- **Banco**: [tipo + servico]
- **Testes**: [runner + libs]
- **Deploy**: [onde roda]

## Comandos

```bash
npm install              # Instalar dependencias
npm run dev              # Dev server
npm run build            # Build producao
npm run lint             # Linter
npm run test             # Testes
npm run test:ci          # Testes CI (sem watch)
```
````

## Diretrizes de codigo

- **Idioma da UI**: [idioma]
- **Path alias**: [mapeamento, ex: @/ → ./src/]
- **Componentes UI**: [lib, ex: shadcn/ui — nao editar]
- **Estilo**: [framework CSS, tema padrao, utility classes]
- **Formularios**: [lib + validacao]
- **Data fetching**: [padrao]
- **Toasts/notificacoes**: [lib]
- **Icones**: [lib]
- **Locale**: [locale, ex: pt-BR]

## Regras importantes

- [NUNCA editar X (arquivo auto-gerado)]
- [RLS/seguranca ativa — considerar em queries]
- [Sem SSR / Com SSR — tipo de rendering]
- [TypeScript strict mode: on/off]
- [Preferir performance: lazy loading, memoizacao]

## Estrutura de pastas

```
src/
├── components/       # [descricao]
├── pages/            # [descricao]
├── hooks/            # [descricao]
├── lib/              # [descricao]
└── integrations/     # [descricao]
```

## Modelo de dados

```
Entidade A → Entidade B → Entidade C
```

## Sistema de autenticacao

- Provider: [qual]
- Roles: [lista]
- Route guards: [componentes]

## Convencoes de teste

- Runner: [Vitest/Jest/pytest/etc]
- Helpers: [renderWithProviders, etc]
- Mocks: [createMockX, authScenarios, etc]
- Nomes: [idioma dos nomes de teste]
- Colocacao: [__tests__/ co-localizado ou src/test/]

## Ao corrigir bugs ou implementar features

1. Leia codigo similar antes de escrever
2. Siga os padroes existentes
3. Priorize performance
4. Escreva testes
5. Garanta que build e test passam

````

### AGENTS.md por subdiretorio

Jules le o `AGENTS.md` mais proximo na arvore de diretorios. Crie um em subdiretorios complexos:

```markdown
# [Area] (path/relativo/)

## Visao geral
[O que essa area faz, quantos arquivos, complexidade]

## Arquivos principais
| Arquivo | Funcao |
|---------|--------|
| `File.tsx` | [descricao] |

## Padroes locais
- [Pattern 1 com exemplo de codigo]
- [Pattern 2 com exemplo de codigo]

## Regras ao editar
1. [Regra especifica desta area]
2. [Regra especifica desta area]
````

---

## 5. .Jules/ — Memoria de Learnings

O Jules captura aprendizados de sessoes anteriores em arquivos dentro de `.Jules/`. Isso funciona como memoria institucional.

### Formato de um Learning

```markdown
## YYYY-MM-DD - Titulo descritivo do learning

**Learning:** [O que foi descoberto / o erro encontrado]
**Action:** [O que fazer para prevenir / corrigir no futuro]
```

Ou para vulnerabilidades:

```markdown
## YYYY-MM-DD - Titulo da vulnerabilidade

**Vulnerability:** [Descricao da vulnerabilidade encontrada]
**Learning:** [Contexto de como/onde isso ocorre]
**Prevention:** [Acao corretiva permanente]
```

### Arquivos recomendados

| Arquivo                   | Conteudo                                            |
| ------------------------- | --------------------------------------------------- |
| `.Jules/security.md`      | Vulnerabilidades encontradas (XSS, iframes, RLS)    |
| `.Jules/accessibility.md` | Problemas de a11y (ARIA, screen readers, contraste) |
| `.Jules/performance.md`   | Otimizacoes (N+1, select \*, re-renders, bundle)    |
| `.Jules/patterns.md`      | Padroes de codigo aprendidos (boas praticas)        |

### Exemplo real (do ExpxPlay)

**security.md:**

```markdown
## 2024-05-24 - Missing sandbox attribute on iframe elements

**Vulnerability:** Found multiple iframe elements rendering external URLs
without the sandbox attribute. Could allow embedded content to execute
malicious scripts.
**Prevention:** Always add sandbox="allow-scripts allow-same-origin
allow-popups allow-forms" to iframe elements rendering external content.
```

**accessibility.md:**

```markdown
## 2025-02-19 - Missing Aria-Label on Icon-Only Buttons

**Learning:** Interactive widgets often use icon-only buttons
(e.g., <Button size="icon"><Send/></Button>) that are inaccessible
to screen readers without aria-label.
**Action:** Always ensure any <Button size="icon"> has a descriptive
aria-label attribute.
```

**performance.md:**

```markdown
## 2026-03-03 - Replaced wildcard selects

**Learning:** Selecting all columns with .select("_") causes overfetching
which impacts performance and bundle size.
**Action:** Replace select("_") with precise column lists.
```

---

## 6. Workflows do Jules (GitHub Actions)

### Workflow 1 — Performance Audit

```yaml
name: Jules Performance Audit

on:
  issues:
    types: [labeled]
  schedule:
    - cron: "0 3 * * 1" # Toda segunda 03:00 UTC
  workflow_dispatch:

jobs:
  performance:
    if: |
      (github.event_name == 'schedule') ||
      (github.event_name == 'workflow_dispatch') ||
      (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'performance') && contains(github.event.issue.labels.*.name, 'jules'))
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - uses: google-labs-code/jules-invoke@v1
        with:
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          prompt: |
            Voce e um engenheiro de performance.

            ## Contexto
            Leia AGENTS.md na raiz para entender o projeto.

            ## Tarefa
            Analise o codigo buscando problemas de performance:
            1. Queries N+1 (multiplas queries quando uma bastaria)
            2. select("*") em vez de colunas especificas
            3. Componentes sem memo() que re-renderizam desnecessariamente
            4. Bundles grandes que poderiam ser lazy-loaded
            5. Imagens sem otimizacao

            ## Regras
            - Foque nos 3 problemas mais criticos
            - Implemente as correcoes
            - Rode os testes: npm run test
            - Rode o build: npm run build
            - Crie PR apenas se testes passarem
            - Maximo 100 linhas alteradas por PR
            - Nao altere APIs publicas

      - name: Notificar Telegram
        if: always()
        run: |
          STATUS="${{ job.status == 'success' && '✅ Concluido' || '❌ Falhou' }}"
          curl -s -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d chat_id="${{ secrets.TELEGRAM_CHAT_ID }}" \
            -d parse_mode="Markdown" \
            -d text="⚡ *Jules Performance — ${STATUS}*

          [Ver execucao](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})"
```

### Workflow 2 — Security Audit

```yaml
name: Jules Security Audit

on:
  issues:
    types: [labeled]
  schedule:
    - cron: "0 6 * * *" # Diariamente 06:00 UTC
  workflow_dispatch:

jobs:
  security:
    if: |
      (github.event_name == 'schedule') ||
      (github.event_name == 'workflow_dispatch') ||
      (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'security') && contains(github.event.issue.labels.*.name, 'jules'))
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      # Restricao de seguranca: so usuarios confiados
      - name: Check user allowlist
        if: github.event_name == 'issues'
        run: |
          ALLOWED='["owner-username","trusted-user"]'
          USER="${{ github.event.issue.user.login }}"
          if ! echo "$ALLOWED" | jq -e "index(\"$USER\")" > /dev/null; then
            echo "Usuario $USER nao autorizado para trigger Jules"
            exit 1
          fi

      - uses: google-labs-code/jules-invoke@v1
        with:
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          prompt: |
            Voce e um auditor de seguranca.

            ## Contexto
            Leia AGENTS.md na raiz para entender o projeto.

            ## Tarefa
            Escaneie o codigo buscando vulnerabilidades:

            CRITICO:
            - Secrets/tokens hardcoded no codigo
            - SQL injection ou queries sem parametrizacao
            - Autenticacao ausente em endpoints

            ALTO:
            - XSS (dangerouslySetInnerHTML sem sanitizacao)
            - CSRF
            - select("*") expondo colunas sensiveis
            - RLS policies ausentes ou permissivas
            - iframes sem sandbox attribute

            MEDIO:
            - Open redirects via input do usuario
            - Dados de outros usuarios acessiveis sem verificacao
            - Inputs nao validados

            ## Regras
            - Corrija severidade mais alta primeiro
            - Maximo 100 linhas por fix
            - Rode testes apos cada fix
            - Crie PR se houver correcoes
            - Documente no PR body cada vulnerabilidade corrigida
```

### Workflow 3 — Refactor

```yaml
name: Jules Refactor

on:
  issues:
    types: [labeled]
  workflow_dispatch:
    inputs:
      target:
        description: "Arquivo ou diretorio alvo"
        required: true
        type: string

jobs:
  refactor:
    if: |
      (github.event_name == 'workflow_dispatch') ||
      (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'refactor') && contains(github.event.issue.labels.*.name, 'jules'))
    runs-on: ubuntu-latest
    timeout-minutes: 45
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - uses: google-labs-code/jules-invoke@v1
        with:
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          prompt: |
            Voce e um engenheiro de refatoracao.

            ## Contexto
            Leia AGENTS.md na raiz para entender o projeto.

            ## Tarefa
            Refatore o codigo conforme solicitado na issue.

            Tipos comuns de refatoracao:
            1. Extrair componentes (arquivo > 300 linhas)
            2. Migrar useEffect para useQuery
            3. Remover codigo morto
            4. Melhorar tipagem TypeScript (remover any)
            5. Otimizar queries
            6. Melhorar tratamento de erros

            ## Regras
            - NAO altere comportamento externo (mesmas props/APIs)
            - NAO quebre testes existentes
            - Rode: npm run test && npm run build
            - Se a issue especificar restricoes, respeite-as
            - Crie PR com descricao do que mudou e por que
```

### Workflow 4 — Test Coverage

```yaml
name: Jules Test Coverage

on:
  issues:
    types: [labeled]
  schedule:
    - cron: "0 4 * * 3" # Quarta 04:00 UTC
  workflow_dispatch:
    inputs:
      target:
        description: "Arquivo ou modulo alvo"
        required: true
        type: string

jobs:
  tests:
    if: |
      (github.event_name == 'schedule') ||
      (github.event_name == 'workflow_dispatch') ||
      (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'tests') && contains(github.event.issue.labels.*.name, 'jules'))
    runs-on: ubuntu-latest
    timeout-minutes: 45
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - uses: google-labs-code/jules-invoke@v1
        with:
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          prompt: |
            Voce e um engenheiro de qualidade.

            ## Contexto
            Leia AGENTS.md na raiz para entender o projeto e convencoes de teste.

            ## Tarefa
            Identifique arquivos sem cobertura de teste e crie testes.

            ## Convencoes
            - [ADAPTAR: listar convencoes de teste do projeto]
            - Minimo: teste de renderizacao + teste de comportamento
            - Cubra casos de sucesso E erro
            - Nomes de teste no idioma do projeto

            ## Regras
            - Rode npm run test — todos devem passar
            - Nao altere codigo fonte (apenas crie testes)
            - Crie PR com lista de testes adicionados
```

---

## 7. Issue Templates para Jules

### Performance

```yaml
name: "Performance (Jules)"
description: "Solicitar otimizacao de performance"
labels: ["performance", "jules"]
body:
  - type: markdown
    attributes:
      value: |
        O Jules vai analisar o codigo e aplicar otimizacoes de performance.

  - type: input
    id: target
    attributes:
      label: Pagina ou componente alvo
      placeholder: "src/pages/Dashboard.tsx"
    validations:
      required: true

  - type: dropdown
    id: type
    attributes:
      label: Tipo de problema
      options:
        - Pagina carrega lentamente
        - Muitas queries ao banco (N+1)
        - Re-renders excessivos
        - Bundle/chunk muito grande
        - Imagens nao otimizadas
        - Outro
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Descricao do problema
    validations:
      required: true

  - type: textarea
    id: metrics
    attributes:
      label: Metricas observadas (se disponivel)
      description: Tempo de carregamento, numero de requests, etc.
    validations:
      required: false
```

### Security Audit

```yaml
name: "Security Audit (Jules)"
description: "Solicitar auditoria de seguranca"
labels: ["security", "jules"]
body:
  - type: markdown
    attributes:
      value: |
        O Jules vai auditar o codigo buscando vulnerabilidades e aplicar correcoes.

  - type: input
    id: target
    attributes:
      label: Arquivo, diretorio ou feature alvo
      placeholder: "src/pages/admin/ ou 'sistema de autenticacao'"
    validations:
      required: true

  - type: checkboxes
    id: checks
    attributes:
      label: O que verificar
      options:
        - label: "select('*') expondo colunas sensiveis"
        - label: "Dados de outros usuarios acessiveis sem verificacao"
        - label: "Tokens ou secrets hardcoded"
        - label: "dangerouslySetInnerHTML sem sanitizacao"
        - label: "Inputs do usuario usados em URLs (open redirect)"
        - label: "Policies de seguranca ausentes ou permissivas"
        - label: "Verificacao completa (todos acima)"
          required: false

  - type: textarea
    id: context
    attributes:
      label: Contexto adicional
    validations:
      required: false
```

### Refactor

```yaml
name: "Refactor (Jules)"
description: "Solicitar refatoracao de codigo"
labels: ["refactor", "jules"]
body:
  - type: markdown
    attributes:
      value: |
        O Jules vai analisar o codigo e implementar a refatoracao.

  - type: input
    id: target-file
    attributes:
      label: Arquivo ou diretorio alvo
      placeholder: "src/pages/admin/AdminPortalEdit.tsx"
    validations:
      required: true

  - type: dropdown
    id: type
    attributes:
      label: Tipo de refatoracao
      options:
        - Extrair componentes (arquivo muito grande)
        - Migrar useEffect para useQuery
        - Remover codigo morto
        - Melhorar tipagem TypeScript (remover any)
        - Otimizar queries
        - Melhorar tratamento de erros/loading
        - Outro
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Descricao do que precisa mudar
    validations:
      required: true

  - type: textarea
    id: constraints
    attributes:
      label: Restricoes (o que NAO alterar)
    validations:
      required: false
```

### Test Coverage

```yaml
name: "Test Coverage (Jules)"
description: "Solicitar criacao de testes"
labels: ["tests", "jules"]
body:
  - type: markdown
    attributes:
      value: |
        O Jules vai analisar o arquivo, identificar funcoes sem cobertura e criar testes.

  - type: input
    id: target
    attributes:
      label: Arquivo ou modulo alvo
      placeholder: "src/hooks/useAuth.tsx"
    validations:
      required: true

  - type: dropdown
    id: scope
    attributes:
      label: Escopo dos testes
      options:
        - Arquivo especifico
        - Diretorio inteiro
        - Auditoria completa de cobertura
    validations:
      required: true

  - type: textarea
    id: focus
    attributes:
      label: Cenarios prioritarios
    validations:
      required: false

  - type: textarea
    id: context
    attributes:
      label: Contexto adicional (dependencias, mocks)
    validations:
      required: false
```

---

## 8. Deteccao de PRs do Jules no Telegram

O Jules cria PRs com marcadores identificaveis. Adapte o workflow de notificacao:

```yaml
# Dentro do telegram-pr.yml, na deteccao de agente:
run: |
  if echo "${PR_AUTHOR}" | grep -qE "github-actions|claude"; then
    AGENT="🤖 Claude"
  elif echo "${PR_BODY}" | grep -qE "jules.google.com|automatically by Jules"; then
    AGENT="🤖 Jules"
  else
    AGENT="👤 ${PR_AUTHOR}"
  fi
```

---

## 9. Jules API — Integracao Programatica

Alem dos GitHub Actions, o Jules tem uma API REST para criar tarefas programaticamente.

### Endpoints principais

| Metodo | Endpoint                             | Funcao                         |
| ------ | ------------------------------------ | ------------------------------ |
| GET    | `/v1alpha/sources`                   | Listar repositorios conectados |
| POST   | `/v1alpha/sessions`                  | Criar tarefa (session)         |
| GET    | `/v1alpha/sessions`                  | Listar tarefas                 |
| POST   | `/v1alpha/sessions/{id}:approvePlan` | Aprovar plano gerado           |
| GET    | `/v1alpha/sessions/{id}/activities`  | Ver progresso                  |
| POST   | `/v1alpha/sessions/{id}:sendMessage` | Enviar mensagem/instrucao      |

### Criar tarefa via API

```bash
curl -X POST "https://jules.googleapis.com/v1alpha/sessions" \
  -H "X-Goog-Api-Key: $JULES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix performance issue in Dashboard",
    "prompt": "Optimize N+1 queries in src/pages/Dashboard.tsx",
    "sourceContext": {
      "gitHub": {
        "owner": "seu-usuario",
        "repo": "seu-projeto",
        "branch": "main"
      }
    },
    "automationMode": "AUTO_CREATE_PR",
    "requirePlanApproval": false
  }'
```

### Opcoes de automationMode

| Modo             | Comportamento                                   |
| ---------------- | ----------------------------------------------- |
| `AUTO_CREATE_PR` | Cria PR automaticamente ao concluir             |
| (default)        | Aguarda aprovacao do plano antes de implementar |

---

## 10. Environment Setup no Jules

O Jules roda em VMs com ferramentas pre-instaladas:

### Ferramentas disponiveis

| Categoria       | Ferramentas                          |
| --------------- | ------------------------------------ |
| **Node.js**     | v22, npm, yarn, pnpm, bun            |
| **Python**      | 3.12, poetry, uv, pipx               |
| **Go**          | 1.24                                 |
| **Java**        | OpenJDK 21, Maven, Gradle            |
| **Rust**        | 1.87, cargo                          |
| **Infra**       | Docker, Docker Compose, Git          |
| **Linters**     | eslint, prettier, ruff, mypy, black  |
| **Utilitarios** | curl, jq, ripgrep, clang, gcc, cmake |

### Configurar setup script

No jules.google.com > Seu repositorio > Configuration > Initial Setup:

```bash
node -v
npm ci --legacy-peer-deps
npm run test
```

Use "Run and Snapshot" para validar e criar snapshot reutilizavel.

---

## 11. Labels Necessarias

| Label         | Cor                     | Dispara                       |
| ------------- | ----------------------- | ----------------------------- |
| `jules`       | `#4285f4` (azul Google) | Identifica tarefas para Jules |
| `performance` | `#f9d0c4`               | jules-performance.yml         |
| `security`    | `#b60205`               | jules-security.yml            |
| `refactor`    | `#d4c5f9`               | jules-refactor.yml            |
| `tests`       | `#bfd4f2`               | jules-tests.yml               |

> **Regra de combinacao:** O workflow so dispara quando AMBAS as labels estao presentes (`jules` + tipo). Isso evita conflito com workflows do Claude que usam as mesmas labels de tipo.

---

## 12. Divisao de Responsabilidades: Claude vs Jules

### Modelo recomendado

```
┌─────────────────────────────────────┐
│           CLAUDE CODE               │
│                                     │
│  ✅ Features novas (issue→PR)       │
│  ✅ Bug fixes (issue→PR)            │
│  ✅ Client requests (triage→PR)     │
│  ✅ Code review automatico          │
│  ✅ Criacao de testes faltantes     │
│  ✅ Daily brainstorm                │
│  ✅ Auto-merge                      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│             JULES                   │
│                                     │
│  ✅ Performance audit (semanal)     │
│  ✅ Security scan (diario)          │
│  ✅ Refatoracao sob demanda         │
│  ✅ Test coverage (semanal)         │
│  ✅ Dependency updates              │
│  ✅ Cleanup de codigo morto         │
└─────────────────────────────────────┘
```

### Por que essa divisao?

| Razao                          | Detalhe                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| Jules roda em VM isolada       | Perfeito para scans pesados (npm audit, testes completos)     |
| Claude tem CLAUDE.md rico      | Melhor para implementacoes que precisam seguir muitos padroes |
| Jules tem snapshot de ambiente | Mais rapido para tarefas repetitivas                          |
| Claude tem auto-merge pipeline | Melhor para fluxo completo (issue→merge)                      |

---

## 13. Seguranca — Allowlist de Usuarios

Issues podem ser criadas por qualquer pessoa. Para evitar abuso:

```yaml
# Em todo workflow do Jules disparado por issue:
- name: Check user allowlist
  if: github.event_name == 'issues'
  run: |
    ALLOWED='["owner","trusted-user-1","trusted-user-2"]'
    USER="${{ github.event.issue.user.login }}"
    if ! echo "$ALLOWED" | jq -e "index(\"$USER\")" > /dev/null; then
      echo "::error::Usuario $USER nao autorizado"
      exit 1
    fi
```

---

## 14. Fluxo de Implementacao para Novo Projeto

### Fase 1 — Minimo viavel (dia 1)

```
projeto/
├── AGENTS.md                         # Contexto do projeto
└── .github/
    └── ISSUE_TEMPLATE/
        └── performance.yml           # 1 template para testar
```

**Secrets:** `JULES_API_KEY`
**Config:** Conectar repositorio em jules.google.com + setup script

### Fase 2 — Workflows automaticos (semana 1)

```
projeto/
├── AGENTS.md
├── .github/
│   ├── workflows/
│   │   ├── jules-security.yml        # Scan diario
│   │   └── jules-performance.yml     # Audit semanal
│   └── ISSUE_TEMPLATE/
│       ├── performance.yml
│       └── security-audit.yml
```

### Fase 3 — Suite completa (semana 2+)

```
projeto/
├── AGENTS.md
├── .Jules/                            # Learnings capturados
│   ├── security.md
│   ├── accessibility.md
│   └── performance.md
├── .github/
│   ├── workflows/
│   │   ├── jules-performance.yml
│   │   ├── jules-security.yml
│   │   ├── jules-refactor.yml
│   │   ├── jules-tests.yml
│   │   └── telegram-pr.yml          # Com deteccao de Jules
│   └── ISSUE_TEMPLATE/
│       ├── performance.yml
│       ├── security-audit.yml
│       ├── refactor.yml
│       └── test-coverage.yml
```

---

## 15. Anti-patterns

| Anti-pattern                    | Problema                               | Solucao                                    |
| ------------------------------- | -------------------------------------- | ------------------------------------------ |
| Sem AGENTS.md                   | Jules improvisa padroes errados        | Sempre criar AGENTS.md com contexto        |
| Sem allowlist em issues         | Qualquer pessoa pode disparar Jules    | Implementar check de usuario               |
| Sem timeout                     | Tarefas podem rodar por horas          | Sempre definir timeout-minutes             |
| Prompt sem "rode testes"        | Jules nao valida mudancas              | Incluir npm run test no prompt             |
| Jules e Claude no mesmo trigger | Ambos tentam implementar a mesma issue | Labels distintas (jules vs claude-analyze) |
| Sem setup script/snapshot       | Cada execucao instala do zero (lento)  | Configurar snapshot no jules.google.com    |
| .Jules/ no .gitignore           | Learnings perdidos entre branches      | Commitar .Jules/ no repositorio            |

---

## 16. Prompt para Bootstrapping

```
Leia o arquivo docs/jules-agent-blueprint.md.
Configure o Google Jules para este projeto seguindo o blueprint:

1. Crie AGENTS.md na raiz (adaptar ao projeto atual)
2. Crie .Jules/ com arquivos iniciais de learning
3. Crie .github/workflows/jules-performance.yml
4. Crie .github/workflows/jules-security.yml
5. Crie .github/workflows/jules-refactor.yml
6. Crie .github/workflows/jules-tests.yml
7. Crie .github/ISSUE_TEMPLATE/performance.yml
8. Crie .github/ISSUE_TEMPLATE/security-audit.yml
9. Crie .github/ISSUE_TEMPLATE/refactor.yml
10. Crie .github/ISSUE_TEMPLATE/test-coverage.yml
11. Atualize telegram-pr.yml para detectar PRs do Jules

Adapte os prompts ao AGENTS.md deste projeto.
Liste os secrets necessarios e passos de config no jules.google.com.
```

---

## Referencia Rapida

```
AGENTS.md                  → Contexto do projeto para Jules (e outros agentes)
.Jules/*.md                → Memoria de learnings (seguranca, a11y, performance)
jules-performance.yml      → Audit de performance (semanal + issue)
jules-security.yml         → Scan de seguranca (diario + issue)
jules-refactor.yml         → Refatoracao sob demanda (issue)
jules-tests.yml            → Criacao de testes (semanal + issue)
ISSUE_TEMPLATE/*.yml       → Templates com labels jules + tipo
jules.google.com           → Config de repositorio + setup script + snapshot
JULES_API_KEY              → Secret para autenticar workflows
```

Sources:

- [Jules - Google's Coding Agent](https://jules.google.com/)
- [Jules Documentation](https://jules.google/docs/)
- [Jules GitHub Action](https://github.com/google-labs-code/jules-action)
- [Jules API](https://developers.google.com/jules/api)
- [AGENTS.md Specification](https://agents.md/)
