# GitHub Automation Blueprint — CI/CD com IA para Projetos

> Template estrutural para replicar o pipeline de automacao GitHub com IA em qualquer projeto.
> Passe este documento ao Claude em um novo projeto e ele criara toda a estrutura.

---

## 1. Visao Geral da Arquitetura

O pipeline e composto por **4 sistemas** que se interconectam:

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB AUTOMATION                         │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │ Issue         │   │ Workflows    │   │ Notifications│    │
│  │ Templates (7) │──▶│ Actions (8)  │──▶│ Telegram (5) │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────┐       │
│  │          PIPELINE AUTOMATICO                      │       │
│  │                                                    │       │
│  │  Issue criada ──▶ IA analisa ──▶ IA implementa    │       │
│  │                                       │            │       │
│  │  PR criado ◀──────────────────────────┘            │       │
│  │     │                                              │       │
│  │     ▼                                              │       │
│  │  Tests (lint + test + build)                       │       │
│  │     │                                              │       │
│  │     ▼                                              │       │
│  │  Auto Review (IA revisa codigo)                    │       │
│  │     │                                              │       │
│  │     ├──▶ APPROVED ──▶ Auto Merge (squash)         │       │
│  │     │                                              │       │
│  │     └──▶ NEEDS_TESTS ──▶ Auto Add Tests           │       │
│  │                              │                     │       │
│  │                              └──▶ Re-review ──▶ Merge │   │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Arquivos

```
.github/
├── workflows/
│   ├── tests.yml                # Quality gate (lint + test + build)
│   ├── claude.yml               # IA implementa features/bugs
│   ├── auto-pr-review.yml       # IA revisa codigo + auto-merge
│   ├── auto-add-tests.yml       # IA cria testes faltantes
│   ├── client-request.yml       # IA avalia e implementa pedidos de cliente
│   ├── daily-brainstorm.yml     # IA sugere features diariamente
│   ├── telegram-pr.yml          # Notificacao de novos PRs
│   └── telegram-issues.yml      # Notificacao de issues abertas/fechadas
└── ISSUE_TEMPLATE/
    ├── bug-report.yml           # Auto-trigger: claude-analyze
    ├── feature-suggestion.yml   # Label: feature-suggestion
    ├── client-request.yml       # Auto-trigger: client-request
    ├── performance.yml          # Label: performance
    ├── refactor.yml             # Label: refactor
    ├── security-audit.yml       # Label: security
    └── test-coverage.yml        # Label: tests
```

---

## 2. Secrets Necessarios (GitHub Repository Settings)

Configure estes secrets em **Settings > Secrets and variables > Actions**:

| Secret               | Usado por                                                                | Como obter                                 |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| `ANTHROPIC_API_KEY`  | claude, auto-pr-review, auto-add-tests, client-request, daily-brainstorm | console.anthropic.com > API Keys           |
| `TELEGRAM_BOT_TOKEN` | Todos os workflows                                                       | @BotFather no Telegram > /newbot           |
| `TELEGRAM_CHAT_ID`   | Todos os workflows                                                       | @userinfobot no Telegram ou API getUpdates |

**Secrets opcionais (conforme stack):**

| Secret                  | Usado por                      | Quando                               |
| ----------------------- | ------------------------------ | ------------------------------------ |
| `SUPABASE_ACCESS_TOKEN` | claude.yml                     | Se usar Supabase (migrations, types) |
| `SUPABASE_PROJECT_ID`   | claude.yml                     | Se usar Supabase                     |
| `GH_TOKEN` (PAT)        | auto-pr-review, auto-add-tests | Se precisar de permissoes extras     |

> **Nota:** `GITHUB_TOKEN` e fornecido automaticamente pelo GitHub Actions. Para workflows que disparam outros workflows via `repository_dispatch`, pode ser necessario um PAT (Personal Access Token) com permissao `repo`.

---

## 3. Workflow 1 — Tests (Quality Gate)

**Proposito:** Barreira de qualidade em todo PR para main.

### Template

```yaml
name: Tests

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Instalar dependencias
        run: npm ci --legacy-peer-deps

      - name: Lint
        run: npm run lint

      - name: Testes
        run: npm run test:ci

      - name: Build
        run: npm run build
```

### Adaptacoes por stack

| Stack           | Lint                | Test              | Build                   |
| --------------- | ------------------- | ----------------- | ----------------------- |
| Node + Vitest   | `npm run lint`      | `npm run test:ci` | `npm run build`         |
| Python + pytest | `ruff check .`      | `pytest`          | `python -m build`       |
| Go              | `golangci-lint run` | `go test ./...`   | `go build ./...`        |
| Rust            | `cargo clippy`      | `cargo test`      | `cargo build --release` |

---

## 4. Workflow 2 — Claude Code (Implementacao Automatica)

**Proposito:** IA analisa issues (bugs + features), implementa, cria testes e abre PR.

### Triggers

```yaml
on:
  issue_comment:
    types: [created] # Comentario com @claude
  pull_request_review_comment:
    types: [created] # Review comment com @claude
  issues:
    types: [labeled] # Label claude-analyze
```

### Template Completo

````yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [labeled]

jobs:
  claude:
    if: |
      (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'claude-analyze')) ||
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude'))
    runs-on: ubuntu-latest
    timeout-minutes: 60
    permissions:
      contents: write
      issues: write
      pull-requests: write
      statuses: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      # (Opcional) Setup de ferramentas do backend (Supabase, Prisma, etc.)
      # - name: Setup Supabase CLI
      #   uses: supabase/setup-cli@v1
      #   with:
      #     version: latest

      - uses: anthropics/claude-code-action@v1
        id: claude
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          label_trigger: claude-analyze
          claude_args: "--max-turns 100 --allowedTools Bash,Write,Edit,Read,Glob,Grep"
          prompt: |
            Voce e um agente de desenvolvimento automatico do [NOME_DO_PROJETO].

            ## PASSO 0 — Detectar tipo de issue

            Verifique as labels da issue:
            ```bash
            gh issue view ${{ github.event.issue.number }} --json labels --jq '.labels[].name'
            ```
            - Se tem label `feature-suggestion` → fluxo de FEATURE (Secao A)
            - Caso contrario → fluxo de BUG FIX (Secao B)

            ---

            # SECAO A — FEATURE

            ## A1 — Carregar contexto
            1. Leia CLAUDE.md na raiz (regras, padroes, convencoes)
            2. Leia o sub-agente relevante em .claude/agents/
            3. Se o diretorio alvo tiver CLAUDE.md local, leia tambem

            ## A2 — Entender a feature
            - Leia o corpo da issue completo
            - Analise o codebase para entender onde a feature se encaixa
            - Verifique se algo similar ja existe

            ## A3 — Implementar
            Siga TODOS os padroes do CLAUDE.md:
            - [LISTAR PADROES DO SEU PROJETO]
            - Nunca editar arquivos auto-gerados
            - UI no idioma do projeto

            ## A4 — Testes (OBRIGATORIO)
            1. Crie testes usando a infraestrutura existente
            2. Execute: npm run test — TODOS devem passar
            3. Execute: npm run build — sem erros
            4. Se falhar, corrija ANTES de continuar

            ## A5 — Criar PR
            1. Branch: claude/feature-issue-${{ github.event.issue.number }}
            2. Commit: feat: <descricao> (Fixes #${{ github.event.issue.number }})
            3. PR com: o que foi feito + testes + resultado de test/build
            4. Comente na issue com status
            5. Feche a issue: gh issue close ${{ github.event.issue.number }} --reason "completed"

            ---

            # SECAO B — BUG FIX

            ## B1 — Carregar contexto (mesmo que A1)
            ## B2 — Analise (localizar bug, verificar se ja corrigido)
            ## B3 — Decisao
            - Ja corrigido → comentar + fechar issue
            - Fix necessario → implementar + testar + PR

            ## B4-B6 — Implementar, testar, criar PR (mesmo fluxo que A3-A5)
            Branch: claude/fix-issue-${{ github.event.issue.number }}
            Commit: fix: <descricao>

            ---

            ## CHECKLIST FINAL
            - [ ] gh issue comment executado
            - [ ] gh issue close executado
            - [ ] PR criado (se houve implementacao)
            - [ ] npm run test e npm run build passaram

      # Disparar Auto PR Review apos criar PR
      - name: Trigger Auto PR Review
        if: success()
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          ISSUE_NUM="${{ github.event.issue.number }}"
          PR_NUMBER=$(gh pr list --state open --head "claude/fix-issue-${ISSUE_NUM}" --json number --jq '.[0].number' 2>/dev/null || echo "")
          if [ -z "$PR_NUMBER" ] || [ "$PR_NUMBER" = "null" ]; then
            PR_NUMBER=$(gh pr list --state open --head "claude/feature-issue-${ISSUE_NUM}" --json number --jq '.[0].number' 2>/dev/null || echo "")
          fi

          if [ -n "$PR_NUMBER" ] && [ "$PR_NUMBER" != "null" ]; then
            # Reportar status de testes (Claude ja rodou)
            SHA=$(gh pr view "$PR_NUMBER" --json headRefOid --jq '.headRefOid')
            gh api repos/${{ github.repository }}/statuses/$SHA \
              -f state=success \
              -f context="test-and-build" \
              -f description="Tests passed in Claude Code workflow" \
              -f target_url="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"

            # Disparar review
            HEAD_BRANCH=$(gh pr view "$PR_NUMBER" --json headRefName --jq '.headRefName')
            gh api repos/${{ github.repository }}/dispatches \
              -f event_type="review-pr" \
              -f "client_payload[pr_number]=$PR_NUMBER" \
              -f "client_payload[head_branch]=$HEAD_BRANCH"
          fi

      # Notificacao Telegram
      - name: Notificar Telegram
        if: always()
        run: |
          if [ "${{ job.status }}" = "success" ]; then
            EMOJI="✅"; STATUS="Concluido"
          else
            EMOJI="❌"; STATUS="Falhou"
          fi
          ISSUE_TITLE="${{ github.event.issue.title || 'N/A' }}"
          ISSUE_NUMBER="${{ github.event.issue.number || '?' }}"
          ISSUE_URL="${{ github.event.issue.html_url || '' }}"

          MESSAGE="${EMOJI} *Claude Code — ${STATUS}*

          📋 *Issue:* [#${ISSUE_NUMBER} — ${ISSUE_TITLE}](${ISSUE_URL})

          [Ver no GitHub](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})"

          curl -s -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d chat_id="${{ secrets.TELEGRAM_CHAT_ID }}" \
            -d parse_mode="Markdown" \
            -d disable_web_page_preview="true" \
            -d text="$MESSAGE"
````

### Pontos de customizacao no prompt

| Secao         | O que adaptar                                      |
| ------------- | -------------------------------------------------- |
| A1 (Contexto) | Paths dos agents e CLAUDE.md locais do SEU projeto |
| A3 (Padroes)  | Stack, libs UI, data fetching, estilo, locale      |
| A4 (Testes)   | Infra de testes, helpers, mocks do SEU projeto     |
| A5 (PR)       | Naming de branches, formato de commit              |
| Migrations    | Remover/adaptar se nao usar Supabase               |

---

## 5. Workflow 3 — Auto PR Review (Revisao + Auto-Merge)

**Proposito:** IA revisa codigo, aprova ou solicita testes/mudancas. Se aprovado, faz merge automatico.

### Triggers

```yaml
on:
  workflow_dispatch: # Manual (informar PR number)
  workflow_run: # Apos Tests workflow passar
    workflows: ["Tests"]
    types: [completed]
  repository_dispatch: # Dispatch de outros workflows
    types: [review-pr]
```

### Template Completo

```yaml
name: Auto PR Review

on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: "Numero do PR para revisar"
        required: true
        type: string
  workflow_run:
    workflows: ["Tests"]
    types: [completed]
  repository_dispatch:
    types: [review-pr]

jobs:
  review:
    if: |
      (github.event_name == 'workflow_dispatch') ||
      (github.event_name == 'repository_dispatch') ||
      (github.event.workflow_run.event == 'pull_request' && github.event.workflow_run.conclusion == 'success')
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: write
      pull-requests: write
      issues: write
      statuses: write
      id-token: write
    steps:
      # 1. Resolver numero do PR de diferentes triggers
      - name: Resolve PR number and branch
        id: pr
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            PR_NUMBER="${{ github.event.inputs.pr_number }}"
            HEAD_BRANCH=$(gh api repos/${{ github.repository }}/pulls/$PR_NUMBER --jq '.head.ref')
          elif [ "${{ github.event_name }}" = "repository_dispatch" ]; then
            PR_NUMBER="${{ github.event.client_payload.pr_number }}"
            HEAD_BRANCH="${{ github.event.client_payload.head_branch }}"
          else
            PR_NUMBER=$(gh api repos/${{ github.repository }}/commits/${{ github.event.workflow_run.head_sha }}/pulls --jq '.[0].number')
            HEAD_BRANCH="${{ github.event.workflow_run.head_branch }}"
          fi
          if [ -z "$PR_NUMBER" ] || [ "$PR_NUMBER" = "null" ]; then
            echo "skip=true" >> $GITHUB_OUTPUT; exit 0
          fi
          echo "number=$PR_NUMBER" >> $GITHUB_OUTPUT
          echo "head_branch=$HEAD_BRANCH" >> $GITHUB_OUTPUT
          echo "skip=false" >> $GITHUB_OUTPUT

      - uses: actions/checkout@v4
        if: steps.pr.outputs.skip != 'true'
        with:
          fetch-depth: 0
          ref: ${{ steps.pr.outputs.head_branch }}

      # 2. Skip se ja tem label needs-tests (outro workflow ja cuidando)
      - name: Check needs-tests label
        if: steps.pr.outputs.skip != 'true'
        id: check_label
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          HAS_LABEL=$(gh pr view ${{ steps.pr.outputs.number }} --json labels --jq '.labels[].name' | grep -c "needs-tests" || true)
          echo "has_needs_tests=$HAS_LABEL" >> $GITHUB_OUTPUT

      # 3. Cache de aprovacao (nao re-revisar se nada mudou)
      - name: Check previous approvals
        if: steps.pr.outputs.skip != 'true' && steps.check_label.outputs.has_needs_tests == '0'
        id: prev_review
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          PR=${{ steps.pr.outputs.number }}
          LAST_APPROVAL_DATE=$(gh api repos/${{ github.repository }}/pulls/$PR/reviews \
            --jq '[.[] | select(.state == "APPROVED" and .user.login == "github-actions[bot]")] | last | .submitted_at' 2>/dev/null || echo "")
          if [ -n "$LAST_APPROVAL_DATE" ] && [ "$LAST_APPROVAL_DATE" != "null" ]; then
            NEW_COMMITS=$(gh api repos/${{ github.repository }}/pulls/$PR/commits \
              --jq "[.[] | select(.commit.committer.date > \"$LAST_APPROVAL_DATE\")] | length" 2>/dev/null || echo "0")
            if [ "$NEW_COMMITS" = "0" ]; then
              echo "already_approved=true" >> $GITHUB_OUTPUT; exit 0
            fi
          fi
          echo "already_approved=false" >> $GITHUB_OUTPUT

      # 4. Instalar Claude Code e executar review
      - name: Setup Node
        if: steps.pr.outputs.skip != 'true' && steps.check_label.outputs.has_needs_tests == '0' && steps.prev_review.outputs.already_approved != 'true'
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Claude Code
        if: steps.pr.outputs.skip != 'true' && steps.check_label.outputs.has_needs_tests == '0' && steps.prev_review.outputs.already_approved != 'true'
        run: npm install -g @anthropic-ai/claude-code

      - name: Review PR
        if: steps.pr.outputs.skip != 'true' && steps.check_label.outputs.has_needs_tests == '0' && steps.prev_review.outputs.already_approved != 'true'
        id: review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ steps.pr.outputs.number }}
          REPO: ${{ github.repository }}
        run: |
          # Detectar se e re-analise
          PREV_COMMENTS=$(gh api repos/$REPO/issues/$PR_NUMBER/comments \
            --jq '[.[] | select(.user.login == "github-actions[bot]" and (.body | contains("Revisao Automatica")))] | length' 2>/dev/null || echo "0")
          REVIEW_CONTEXT=""
          if [ "$PREV_COMMENTS" != "0" ]; then
            REVIEW_CONTEXT="IMPORTANTE: Este PR ja foi revisado. Foque APENAS nos testes adicionados."
          fi

          claude -p "
          Voce e um revisor de codigo automatico.
          Voce APENAS revisa — nunca escreve codigo ou testes.
          $REVIEW_CONTEXT

          ## Contexto
          1. Leia CLAUDE.md na raiz do projeto
          2. Leia regras relevantes em .claude/rules/

          ## Tarefa
          Revise o PR #\$PR_NUMBER do repositorio \$REPO.

          ### Passo 1: Info do PR
          gh pr view \$PR_NUMBER --json title,body,author,files,additions,deletions,labels

          ### Passo 2: Diff
          gh pr diff \$PR_NUMBER

          ### Passo 3: Analisar cada arquivo
          - Segue padroes do CLAUDE.md?
          - Tem testes correspondentes?
          - Problemas de seguranca ou arquitetura?

          ### Passo 4: Decisao

          Se APPROVED:
          - Dismiss reviews anteriores de CHANGES_REQUESTED
          - Comentar + aprovar
          - Escrever: REVIEW_RESULT:APPROVED

          Se NEEDS_TESTS (arquivos .ts/.tsx sem teste):
          - Comentar listando arquivos sem teste
          - Escrever: REVIEW_RESULT:NEEDS_TESTS
          - Escrever: FILES_WITHOUT_TESTS:<lista separada por virgula>

          Se CHANGES_REQUESTED (problemas graves, NAO falta de testes):
          - Request changes com detalhes
          - Escrever: REVIEW_RESULT:CHANGES_REQUESTED

          REGRAS:
          - NUNCA rejeite por falta de testes — use NEEDS_TESTS
          - So rejeite por problemas graves de codigo
          " --max-turns 30 --allowedTools Bash,Read,Glob,Grep 2>&1 | tee /tmp/review-output.txt

          # Extrair decisao
          if grep -qE "REVIEW_RESULT:(APPROVED|NEEDS_TESTS|CHANGES_REQUESTED)" /tmp/review-output.txt; then
            DECISION=$(grep -oE "REVIEW_RESULT:(APPROVED|NEEDS_TESTS|CHANGES_REQUESTED)" /tmp/review-output.txt | tail -1 | sed 's/REVIEW_RESULT://')
          else
            DECISION="UNKNOWN"
          fi
          FILES_LIST=""
          if [ "$DECISION" = "NEEDS_TESTS" ]; then
            FILES_LIST=$(grep -o "FILES_WITHOUT_TESTS:.*" /tmp/review-output.txt | tail -1 | sed 's/FILES_WITHOUT_TESTS://' | sed 's/\*\*//g' || echo "")
          fi
          PR_TITLE=$(gh pr view "$PR_NUMBER" --json title --jq '.title' 2>/dev/null || echo "PR #$PR_NUMBER")
          echo "decision=$DECISION" >> $GITHUB_OUTPUT
          echo "pr_title=$PR_TITLE" >> $GITHUB_OUTPUT
          echo "files_without_tests=$FILES_LIST" >> $GITHUB_OUTPUT

      # 5. Resolver decisao final (cache vs review nova)
      - name: Set decision for cached approval
        if: steps.pr.outputs.skip != 'true' && steps.prev_review.outputs.already_approved == 'true'
        id: review_cached
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "decision=APPROVED" >> $GITHUB_OUTPUT
          PR_TITLE=$(gh pr view "${{ steps.pr.outputs.number }}" --json title --jq '.title' 2>/dev/null || echo "PR")
          echo "pr_title=$PR_TITLE" >> $GITHUB_OUTPUT

      - name: Resolve final decision
        if: steps.pr.outputs.skip != 'true'
        id: final
        run: |
          if [ "${{ steps.prev_review.outputs.already_approved }}" = "true" ]; then
            echo "decision=${{ steps.review_cached.outputs.decision }}" >> $GITHUB_OUTPUT
            echo "pr_title=${{ steps.review_cached.outputs.pr_title }}" >> $GITHUB_OUTPUT
            echo "files_without_tests=" >> $GITHUB_OUTPUT
          else
            echo "decision=${{ steps.review.outputs.decision }}" >> $GITHUB_OUTPUT
            echo "pr_title=${{ steps.review.outputs.pr_title }}" >> $GITHUB_OUTPUT
            echo "files_without_tests=${{ steps.review.outputs.files_without_tests }}" >> $GITHUB_OUTPUT
          fi

      # 6. Acoes baseadas na decisao
      - name: Trigger Auto Add Tests
        if: steps.pr.outputs.skip != 'true' && steps.final.outputs.decision == 'NEEDS_TESTS'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr edit ${{ steps.pr.outputs.number }} --add-label "needs-tests"
          gh api repos/${{ github.repository }}/dispatches \
            -f event_type="add-tests" \
            -f "client_payload[pr_number]=${{ steps.pr.outputs.number }}" \
            -f "client_payload[head_branch]=${{ steps.pr.outputs.head_branch }}" \
            -f "client_payload[files_without_tests]=${{ steps.final.outputs.files_without_tests }}"

      - name: Auto-merge if approved
        if: steps.pr.outputs.skip != 'true' && steps.final.outputs.decision == 'APPROVED'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          PR=${{ steps.pr.outputs.number }}
          # Atualizar branch
          gh api repos/${{ github.repository }}/pulls/$PR/update-branch -X PUT -f update_method=merge 2>/dev/null || true
          sleep 5
          # Reportar status
          SHA=$(gh pr view $PR --json headRefOid --jq '.headRefOid')
          gh api repos/${{ github.repository }}/statuses/$SHA \
            -f state=success \
            -f context="test-and-build" \
            -f description="Approved by Auto PR Review" \
            -f target_url="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          sleep 5
          # Merge (fallback chain)
          gh pr merge $PR --squash --auto 2>/dev/null \
            || gh pr merge $PR --squash 2>/dev/null \
            || gh pr merge $PR --squash --admin 2>/dev/null \
            || echo "Merge nao foi possivel automaticamente."

      # 7. Telegram
      - name: Notificar Telegram
        if: steps.pr.outputs.skip != 'true' && steps.final.outputs.decision != '' && always()
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          DECISION="${{ steps.final.outputs.decision }}"
          PR_NUMBER="${{ steps.pr.outputs.number }}"
          PR_TITLE="${{ steps.final.outputs.pr_title }}"
          PR_URL="https://github.com/${{ github.repository }}/pull/${PR_NUMBER}"
          case "$DECISION" in
            APPROVED) EMOJI="✅"; STATUS="Aprovado e Mergeando" ;;
            NEEDS_TESTS) EMOJI="🧪"; STATUS="Criando Testes" ;;
            CHANGES_REQUESTED) EMOJI="❌"; STATUS="Mudancas Necessarias" ;;
            *) EMOJI="⚠️"; STATUS="Revisao Concluida" ;;
          esac
          MESSAGE="${EMOJI} *Auto Review — ${STATUS}*

          📋 *PR:* [#${PR_NUMBER} — ${PR_TITLE}](${PR_URL})"

          curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            -d parse_mode="Markdown" \
            -d disable_web_page_preview="true" \
            -d text="$MESSAGE"
```

### Decisoes do Review e Fluxo

```
PR chega para review
    │
    ├── Ja tem label needs-tests? ──▶ Skip (outro workflow cuida)
    │
    ├── Ja foi aprovado sem novos commits? ──▶ Reusar aprovacao (cache)
    │
    └── Review completo:
        ├── APPROVED ──▶ Update branch + Report status + Squash merge
        ├── NEEDS_TESTS ──▶ Add label + Dispatch auto-add-tests
        └── CHANGES_REQUESTED ──▶ Request changes (problemas graves)
```

---

## 6. Workflow 4 — Auto Add Tests

**Proposito:** Quando review detecta testes faltantes, a IA cria automaticamente.

### Template Completo

```yaml
name: Auto Add Tests

on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: "Numero do PR"
        required: true
        type: string
  repository_dispatch:
    types: [add-tests]
  pull_request_target:
    types: [labeled]

jobs:
  add-tests:
    if: |
      (github.event_name == 'workflow_dispatch') ||
      (github.event_name == 'repository_dispatch') ||
      (github.event.label.name == 'needs-tests')
    runs-on: ubuntu-latest
    timeout-minutes: 45
    permissions:
      contents: write
      pull-requests: write
      issues: write
      statuses: write
      id-token: write
    steps:
      - name: Resolve PR info
        id: pr
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            PR_NUMBER="${{ github.event.inputs.pr_number }}"
            HEAD_BRANCH=$(gh pr view "$PR_NUMBER" --json headRefName --jq '.headRefName')
            echo "number=$PR_NUMBER" >> $GITHUB_OUTPUT
            echo "head_branch=$HEAD_BRANCH" >> $GITHUB_OUTPUT
            echo "files=" >> $GITHUB_OUTPUT
          elif [ "${{ github.event_name }}" = "repository_dispatch" ]; then
            echo "number=${{ github.event.client_payload.pr_number }}" >> $GITHUB_OUTPUT
            echo "head_branch=${{ github.event.client_payload.head_branch }}" >> $GITHUB_OUTPUT
            echo "files=${{ github.event.client_payload.files_without_tests }}" >> $GITHUB_OUTPUT
          else
            echo "number=${{ github.event.pull_request.number }}" >> $GITHUB_OUTPUT
            echo "head_branch=${{ github.event.pull_request.head.ref }}" >> $GITHUB_OUTPUT
            echo "files=" >> $GITHUB_OUTPUT
          fi

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ steps.pr.outputs.head_branch }}

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Create missing tests
        id: tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ steps.pr.outputs.number }}
          HEAD_BRANCH: ${{ steps.pr.outputs.head_branch }}
          FILES_WITHOUT_TESTS: ${{ steps.pr.outputs.files }}
        run: |
          # Contexto com ou sem lista pre-definida
          if [ -n "$FILES_WITHOUT_TESTS" ]; then
            FILE_CONTEXT="Arquivos que precisam de testes: $FILES_WITHOUT_TESTS
          Va DIRETO para criar testes."
          else
            FILE_CONTEXT="Identifique arquivos .ts/.tsx no PR sem teste correspondente."
          fi

          claude -p "
          Voce cria testes para o projeto.

          ## Contexto
          1. Leia CLAUDE.md na raiz
          2. Leia a infra de testes (test-utils, mocks)

          ## Tarefa
          PR #\$PR_NUMBER tem arquivos sem testes. Crie-os.
          $FILE_CONTEXT

          ## Convencoes
          - [LISTAR CONVENCOES DE TESTE DO SEU PROJETO]
          - Minimo: teste de renderizacao + teste de comportamento principal

          ## Verificar
          npm run test — se falhar, corrigir o teste e re-executar

          ## Commit
          git config user.name 'github-actions[bot]'
          git config user.email 'github-actions[bot]@users.noreply.github.com'
          git add '*.test.ts' '*.test.tsx'
          git commit -m 'test: add missing tests for PR #\${PR_NUMBER}'
          git push origin HEAD:\${HEAD_BRANCH}

          ## Output
          Escrever: TESTS_CREATED:<count>|<files>
          " --max-turns 50 --allowedTools Bash,Write,Edit,Read,Glob,Grep 2>&1 | tee /tmp/tests-output.txt

          # Parsear output
          RESULT_LINE=$(grep "TESTS_CREATED:" /tmp/tests-output.txt | tail -1 | sed 's/\*\*//g' || echo "")
          if [ -n "$RESULT_LINE" ]; then
            CLEAN=$(echo "$RESULT_LINE" | sed 's/.*TESTS_CREATED://')
            echo "count=$(echo "$CLEAN" | cut -d'|' -f1)" >> $GITHUB_OUTPUT
            echo "files=$(echo "$CLEAN" | cut -d'|' -f2)" >> $GITHUB_OUTPUT
            echo "success=true" >> $GITHUB_OUTPUT
          else
            echo "success=false" >> $GITHUB_OUTPUT
          fi

      # Reportar status, remover label, comentar, disparar re-review
      - name: Report status
        if: steps.tests.outputs.success == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          SHA=$(gh pr view ${{ steps.pr.outputs.number }} --json headRefOid --jq '.headRefOid')
          gh api repos/${{ github.repository }}/statuses/$SHA \
            -f state=success -f context="test-and-build" \
            -f description="Tests passed in Auto Add Tests" \
            -f target_url="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"

      - name: Cleanup and re-trigger review
        if: steps.tests.outputs.success == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr edit ${{ steps.pr.outputs.number }} --remove-label "needs-tests" || true
          gh pr comment ${{ steps.pr.outputs.number }} --body "## Testes Adicionados 🧪
          **${{ steps.tests.outputs.count }}** arquivo(s) de teste criado(s).
          Disparando re-review...
          ---
          *Testes criados automaticamente*"
          gh api repos/${{ github.repository }}/dispatches \
            -f event_type="review-pr" \
            -f "client_payload[pr_number]=${{ steps.pr.outputs.number }}" \
            -f "client_payload[head_branch]=${{ steps.pr.outputs.head_branch }}"

      - name: Notificar Telegram
        if: always()
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          # [Template Telegram padrao - ver secao 9]
          echo "Notificacao enviada"
```

---

## 7. Workflow 5 — Client Request Triage

**Proposito:** Avaliar pedidos de cliente. Se viavel, implementar. Se nao, rejeitar com justificativa.

### Diferencas vs claude.yml

| Aspecto          | claude.yml              | client-request.yml           |
| ---------------- | ----------------------- | ---------------------------- |
| Trigger          | `claude-analyze` label  | `client-request` label       |
| Avaliacao previa | Nao (implementa direto) | Sim (Fase 1-2: viabilidade)  |
| Pode rejeitar    | Nao                     | Sim (label `wont-implement`) |
| Max turns        | 100                     | 50                           |
| Filosofia        | "Implementar"           | "Na duvida, NAO implementar" |

### Template (resumido — mesma estrutura do claude.yml)

```yaml
name: Client Request Triage

on:
  issues:
    types: [labeled]

jobs:
  triage:
    if: contains(github.event.issue.labels.*.name, 'client-request')
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          label_trigger: client-request
          claude_args: "--max-turns 50 --allowedTools Bash,Write,Edit,Read,Glob,Grep"
          prompt: |
            Voce e o arquiteto de produto.
            Um cliente fez uma solicitacao.

            ## FASE 1 — Avaliacao
            1. Viabilidade tecnica (stack atual)
            2. Alinhamento com produto (beneficia outros?)
            3. Escopo (max 5 arquivos)
            4. Seguranca

            ## FASE 2 — Decisao
            NAO viavel → comentar + label wont-implement + fechar (not_planned)
            Viavel → label approved + implementar (Fases 3-6)

            ## FASES 3-6 — Implementar, testar, PR, fechar issue
            [Mesmo fluxo do claude.yml]

            REGRA: Na duvida, NAO implemente.
```

---

## 8. Workflow 6 — Daily Brainstorm

**Proposito:** IA sugere uma feature por dia, categorizada por dia da semana.

### Template

```yaml
name: Daily Feature Brainstorm

on:
  schedule:
    - cron: "0 11 * * *" # Ajustar ao fuso horario
  workflow_dispatch:

jobs:
  brainstorm:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code
      - name: Generate suggestion
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          # Categoria por dia da semana
          DAY_OF_WEEK=$(date +%u)
          case $DAY_OF_WEEK in
            1|4) CATEGORY="Competitiva" ;;
            2|5) CATEGORY="Engagement" ;;
            3|6) CATEGORY="Monetizacao" ;;
            7)   CATEGORY="Wildcard" ;;
          esac

          claude -p "
          Voce e um product manager especialista.

          ## Contexto
          Leia CLAUDE.md para entender o projeto.

          ## Tarefa
          Sugira UMA feature para a categoria: $CATEGORY

          Categorias:
          - Competitiva: features que concorrentes tem
          - Engagement: gamificacao, social, retencao
          - Monetizacao: pricing, upsells, receita
          - Wildcard: inovacao livre

          ## Regras
          1. Verificar issues existentes para evitar duplicatas:
             gh issue list --label feature-suggestion --state all --limit 50 --json title --jq '.[].title'
          2. Implementavel na stack atual
          3. Valor real para usuarios
          4. Implementavel em 1-2 dias

          ## Output
          1. Criar issue com gh issue create --label feature-suggestion
          2. Enviar notificacao Telegram com botoes Aprovar/Rejeitar
          " --max-turns 30 --allowedTools Bash,Read,Glob,Grep
```

### Categorias customizaveis

Adapte as categorias ao dominio do seu projeto:

| Dominio    | Categorias sugeridas                           |
| ---------- | ---------------------------------------------- |
| LMS/EdTech | Competitiva, Engagement, Monetizacao, Wildcard |
| E-commerce | UX, Conversao, Operacoes, Inovacao             |
| SaaS B2B   | Integracao, Analytics, Automacao, Enterprise   |
| Saude      | Compliance, UX Paciente, Eficiencia, AI        |

---

## 9. Workflows 7 e 8 — Notificacoes Telegram

### Telegram PR (novo PR aberto)

```yaml
name: Telegram PR Notifications

on:
  pull_request:
    types: [opened]

jobs:
  notify:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    steps:
      - name: Notificar Telegram
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          PR_URL: ${{ github.event.pull_request.html_url }}
          PR_AUTHOR: ${{ github.event.pull_request.user.login }}
          PR_BRANCH: ${{ github.event.pull_request.head.ref }}
          PR_BASE: ${{ github.event.pull_request.base.ref }}
          PR_ADDITIONS: ${{ github.event.pull_request.additions }}
          PR_DELETIONS: ${{ github.event.pull_request.deletions }}
          PR_FILES: ${{ github.event.pull_request.changed_files }}
          LABELS_JSON: ${{ toJSON(github.event.pull_request.labels.*.name) }}
          RAW_PR_BODY: ${{ github.event.pull_request.body }}
        run: |
          LABELS=$(echo "$LABELS_JSON" | tr -d '[]"' | sed 's/,/, /g')
          PR_BODY=$(echo "$RAW_PR_BODY" | head -c 500)

          # Detectar se e agente IA ou humano
          if echo "${PR_AUTHOR}" | grep -qE "github-actions|claude"; then
            AGENT="🤖 Claude"
          else
            AGENT="👤 ${PR_AUTHOR}"
          fi

          MESSAGE="🔀 *Novo Pull Request*

          📋 *PR:* [#${PR_NUMBER} — ${PR_TITLE}](${PR_URL})
          ${AGENT}
          🌿 *Branch:* ${PR_BRANCH} → ${PR_BASE}
          🏷️ *Labels:* ${LABELS:-nenhum}
          📊 *Alteracoes:* +${PR_ADDITIONS} / -${PR_DELETIONS} (${PR_FILES} arquivos)

          📝 *Descricao:*
          ${PR_BODY:-Sem descricao}"

          curl -s -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d chat_id="${{ secrets.TELEGRAM_CHAT_ID }}" \
            -d parse_mode="Markdown" \
            -d disable_web_page_preview="true" \
            -d text="$MESSAGE"
```

### Telegram Issues (aberta/fechada)

```yaml
name: Telegram Issue Notifications

on:
  issues:
    types: [opened, closed]

jobs:
  notify:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    steps:
      - name: Notificar Telegram
        run: |
          ISSUE_TITLE="${{ github.event.issue.title }}"
          ISSUE_NUMBER="${{ github.event.issue.number }}"
          ISSUE_URL="${{ github.event.issue.html_url }}"
          ISSUE_AUTHOR="${{ github.event.issue.user.login }}"
          ISSUE_BODY=$(echo "${{ github.event.issue.body }}" | head -c 500)
          LABELS=$(echo '${{ toJSON(github.event.issue.labels.*.name) }}' | tr -d '[]"' | sed 's/,/, /g')

          if [ "${{ github.event.action }}" = "opened" ]; then
            MESSAGE="🆕 *Nova Issue Aberta*

          📋 *Issue:* [#${ISSUE_NUMBER} — ${ISSUE_TITLE}](${ISSUE_URL})
          👤 *Autor:* ${ISSUE_AUTHOR}
          🏷️ *Labels:* ${LABELS:-nenhum}

          📝 *Descricao:*
          ${ISSUE_BODY:-Sem descricao}"
          else
            CLOSED_BY="${{ github.event.sender.login }}"
            MESSAGE="🔒 *Issue Fechada*

          📋 *Issue:* [#${ISSUE_NUMBER} — ${ISSUE_TITLE}](${ISSUE_URL})
          👤 *Fechada por:* ${CLOSED_BY}
          🏷️ *Labels:* ${LABELS:-nenhum}"
          fi

          curl -s -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d chat_id="${{ secrets.TELEGRAM_CHAT_ID }}" \
            -d parse_mode="Markdown" \
            -d disable_web_page_preview="true" \
            -d text="$MESSAGE"
```

---

## 10. Issue Templates

### Principio de Design

Cada template tem **3 elementos**:

1. **Labels auto-atribuidas** — Disparam o workflow correto
2. **Campos estruturados** — IA consegue parsear automaticamente
3. **Markdown explicativo** — Usuario entende o que vai acontecer

### Template: Bug Report (trigger automatico)

```yaml
name: "Bug Report"
description: "Reportar bug para a IA analisar e corrigir automaticamente"
labels: ["bug", "claude-analyze"] # claude-analyze DISPARA o workflow
body:
  - type: markdown
    attributes:
      value: |
        A IA vai analisar este bug, implementar a correcao e abrir um PR automaticamente.

  - type: input
    id: url
    attributes:
      label: URL onde o erro ocorre
      placeholder: "https://app.exemplo.com/pagina"
    validations:
      required: false

  - type: textarea
    id: description
    attributes:
      label: Descricao do bug
      description: O que acontece vs. o que deveria acontecer
      placeholder: |
        **Comportamento atual:**
        O botao X nao responde ao clique.

        **Comportamento esperado:**
        Deveria abrir o modal de confirmacao.
    validations:
      required: true

  - type: textarea
    id: stack-trace
    attributes:
      label: Stack trace / erro no console
      render: shell
    validations:
      required: false

  - type: textarea
    id: steps
    attributes:
      label: Passos para reproduzir
    validations:
      required: false

  - type: input
    id: file
    attributes:
      label: Arquivo suspeito (se souber)
      placeholder: "src/pages/Dashboard.tsx"
    validations:
      required: false
```

### Template: Feature Suggestion

```yaml
name: "Feature Suggestion"
description: "Sugestao de nova funcionalidade"
labels: ["feature-suggestion"]
body:
  - type: input
    id: feature-name
    attributes:
      label: Nome da Feature
    validations:
      required: true
  - type: dropdown
    id: category
    attributes:
      label: Categoria
      options:
        - Competitiva
        - Engagement
        - Monetizacao
        - Wildcard
    validations:
      required: true
  - type: textarea
    id: problem
    attributes:
      label: Problema que resolve
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposta de implementacao
    validations:
      required: true
  - type: dropdown
    id: impact
    attributes:
      label: Impacto estimado
      options: [Alto, Medio, Baixo]
    validations:
      required: true
  - type: dropdown
    id: complexity
    attributes:
      label: Complexidade estimada
      options: [Alta, Media, Baixa]
    validations:
      required: true
```

### Template: Client Request (com avaliacao)

```yaml
name: "Solicitacao de Cliente"
description: "Pedido de cliente avaliado e implementado por IA"
labels: ["client-request"]
body:
  - type: markdown
    attributes:
      value: |
        A IA vai avaliar esta solicitacao. Se fizer sentido, implementa automaticamente.

  - type: input
    id: client
    attributes:
      label: Cliente / Organizacao
    validations:
      required: false

  - type: textarea
    id: request
    attributes:
      label: O que o cliente esta pedindo?
    validations:
      required: true

  - type: textarea
    id: context
    attributes:
      label: Contexto / Motivacao
    validations:
      required: false

  - type: dropdown
    id: area
    attributes:
      label: Area do sistema
      options:
        - "[LISTAR AREAS DO SEU PROJETO]"
    validations:
      required: true

  - type: dropdown
    id: priority
    attributes:
      label: Prioridade
      options:
        - Baixa (seria legal ter)
        - Media (importante para o fluxo)
        - Alta (bloqueia o uso)
    validations:
      required: true
```

### Templates adicionais recomendados

| Template       | Labels        | Quando usar                          |
| -------------- | ------------- | ------------------------------------ |
| Performance    | `performance` | Pagina lenta, N+1, re-renders        |
| Refactor       | `refactor`    | Extrair componentes, migrar patterns |
| Security Audit | `security`    | Auditoria de vulnerabilidades        |
| Test Coverage  | `tests`       | Criar testes para modulo existente   |

---

## 11. Labels Necessarias

Crie estas labels no repositorio (Settings > Labels):

### Labels de trigger (disparam workflows)

| Label            | Cor       | Descricao                     | Dispara            |
| ---------------- | --------- | ----------------------------- | ------------------ |
| `claude-analyze` | `#7057ff` | IA analisa e implementa       | claude.yml         |
| `client-request` | `#0e8a16` | Pedido de cliente para triage | client-request.yml |
| `needs-tests`    | `#fbca04` | PR precisa de testes          | auto-add-tests.yml |

### Labels de status

| Label            | Cor       | Descricao                               |
| ---------------- | --------- | --------------------------------------- |
| `approved`       | `#0e8a16` | Solicitacao aprovada para implementacao |
| `wont-implement` | `#e4e669` | Rejeitado com justificativa             |

### Labels de tipo

| Label                | Cor       | Descricao                 |
| -------------------- | --------- | ------------------------- |
| `bug`                | `#d73a4a` | Bug report                |
| `feature-suggestion` | `#a2eeef` | Sugestao de feature       |
| `performance`        | `#f9d0c4` | Otimizacao de performance |
| `refactor`           | `#d4c5f9` | Refatoracao de codigo     |
| `security`           | `#b60205` | Auditoria de seguranca    |
| `tests`              | `#bfd4f2` | Cobertura de testes       |

---

## 12. Fluxo Completo — Do Issue ao Merge

```
1. ISSUE CRIADA
   │
   ├── Telegram notifica (telegram-issues.yml)
   │
   ├── Se label "claude-analyze" (bug ou feature):
   │   └── claude.yml:
   │       ├── Carregar CLAUDE.md + agents
   │       ├── Analisar issue
   │       ├── Implementar + testar
   │       ├── Criar PR (claude/fix-* ou claude/feature-*)
   │       ├── Comentar + fechar issue
   │       └── Disparar auto-pr-review
   │
   ├── Se label "client-request":
   │   └── client-request.yml:
   │       ├── Avaliar viabilidade
   │       ├── Se viavel: implementar (mesmo fluxo)
   │       └── Se nao viavel: comentar + fechar
   │
   └── Se label "feature-suggestion" (sem claude-analyze):
       └── Aguarda humano adicionar claude-analyze

2. PR CRIADO
   │
   ├── Telegram notifica (telegram-pr.yml)
   │
   ├── tests.yml roda (lint + test + build)
   │   │
   │   └── Se passa → dispara auto-pr-review
   │
   └── auto-pr-review.yml:
       │
       ├── APPROVED → auto-merge (squash)
       │
       ├── NEEDS_TESTS → auto-add-tests.yml:
       │   ├── IA cria testes
       │   ├── Commit + push
       │   ├── Remove label needs-tests
       │   └── Re-dispara auto-pr-review → APPROVED → merge
       │
       └── CHANGES_REQUESTED → aguarda humano

3. ISSUE FECHADA
   └── Telegram notifica (telegram-issues.yml)

4. DAILY (08:00)
   └── daily-brainstorm.yml:
       └── IA cria issue com sugestao de feature
```

---

## 13. Fluxo de Implementacao para um Novo Projeto

### Fase 1 — Minimo viavel (dia 1)

```
.github/
├── workflows/
│   ├── tests.yml              # Quality gate
│   ├── telegram-pr.yml        # Notificacao PR
│   └── telegram-issues.yml    # Notificacao Issues
└── ISSUE_TEMPLATE/
    └── bug-report.yml         # Template de bug
```

**Secrets:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

### Fase 2 — IA implementadora (semana 1)

```
.github/
├── workflows/
│   ├── tests.yml
│   ├── claude.yml             # + IA implementa
│   ├── telegram-pr.yml
│   └── telegram-issues.yml
└── ISSUE_TEMPLATE/
    ├── bug-report.yml
    └── feature-suggestion.yml # + Sugestoes
```

**Secrets:** + `ANTHROPIC_API_KEY`

### Fase 3 — Review e auto-merge (semana 2)

```
.github/
├── workflows/
│   ├── tests.yml
│   ├── claude.yml
│   ├── auto-pr-review.yml     # + Review automatico
│   ├── auto-add-tests.yml     # + Testes automaticos
│   ├── telegram-pr.yml
│   └── telegram-issues.yml
└── ISSUE_TEMPLATE/
    ├── bug-report.yml
    ├── feature-suggestion.yml
    └── client-request.yml     # + Pedidos de cliente
```

### Fase 4 — Completo (semana 3+)

```
.github/
├── workflows/
│   ├── tests.yml
│   ├── claude.yml
│   ├── auto-pr-review.yml
│   ├── auto-add-tests.yml
│   ├── client-request.yml     # + Triage de cliente
│   ├── daily-brainstorm.yml   # + Sugestoes diarias
│   ├── telegram-pr.yml
│   └── telegram-issues.yml
└── ISSUE_TEMPLATE/
    ├── bug-report.yml
    ├── feature-suggestion.yml
    ├── client-request.yml
    ├── performance.yml        # + Templates extras
    ├── refactor.yml
    ├── security-audit.yml
    └── test-coverage.yml
```

---

## 14. Patterns Importantes

### Comunicacao entre workflows (repository_dispatch)

```yaml
# Workflow A dispara Workflow B:
- name: Trigger workflow B
  run: |
    gh api repos/${{ github.repository }}/dispatches \
      -f event_type="nome-do-evento" \
      -f "client_payload[chave]=$VALOR"

# Workflow B recebe:
on:
  repository_dispatch:
    types: [nome-do-evento]
# Acesso: ${{ github.event.client_payload.chave }}
```

### Status reporting (bypass de branch protection)

```yaml
# Reportar status de check para permitir merge
- name: Report status
  run: |
    SHA=$(gh pr view $PR --json headRefOid --jq '.headRefOid')
    gh api repos/${{ github.repository }}/statuses/$SHA \
      -f state=success \
      -f context="test-and-build" \
      -f description="Tests passed"
```

### Merge fallback chain

```yaml
# Tentar merge com fallbacks progressivos
gh pr merge $PR --squash --auto 2>/dev/null \
|| gh pr merge $PR --squash 2>/dev/null \
|| gh pr merge $PR --squash --admin 2>/dev/null \
|| echo "Merge nao possivel"
```

### Output parsing do Claude

```yaml
# Claude escreve no stdout; parsear com grep/sed
claude -p "..." 2>&1 | tee /tmp/output.txt
DECISION=$(grep -oE "REVIEW_RESULT:(APPROVED|NEEDS_TESTS|CHANGES_REQUESTED)" /tmp/output.txt | tail -1 | sed 's/REVIEW_RESULT://')
```

### Cache de aprovacao

```yaml
# Nao re-revisar se nada mudou desde ultima aprovacao
LAST_APPROVAL=$(gh api repos/REPO/pulls/PR/reviews --jq '...')
NEW_COMMITS=$(gh api repos/REPO/pulls/PR/commits --jq '...')
if [ "$NEW_COMMITS" = "0" ]; then
echo "already_approved=true"
fi
```

---

## 15. Anti-patterns

| Anti-pattern                            | Problema                                   | Solucao                           |
| --------------------------------------- | ------------------------------------------ | --------------------------------- |
| Sem timeout nos workflows               | IA pode rodar por horas, custo alto        | Sempre definir `timeout-minutes`  |
| Prompt sem contexto do projeto          | IA improvisa padroes errados               | Sempre carregar CLAUDE.md         |
| Review rejeita por falta de testes      | Loop infinito (rejeita → ninguem adiciona) | Usar NEEDS_TESTS + auto-add-tests |
| Merge sem testes passando               | Codigo quebrado na main                    | Quality gate obrigatorio          |
| Telegram sem `disable_web_page_preview` | Preview de links polui mensagem            | Sempre incluir flag               |
| Workflows sem `if: always()` no notify  | Falhas silenciosas                         | Notificar sempre                  |
| Prompt sem "SEMPRE fechar issue"        | Issues ficam abertas para sempre           | Regra explicita no prompt         |
| PAT token com permissoes excessivas     | Risco de seguranca                         | Minimo de permissoes necessarias  |

---

## 16. Prompt para Bootstrapping

```
Leia o arquivo docs/github-automation-blueprint.md.
Configure toda a automacao GitHub para este projeto seguindo o blueprint:

1. Crie .github/workflows/tests.yml (adaptar comandos de lint/test/build)
2. Crie .github/workflows/claude.yml (adaptar prompt aos padroes do projeto)
3. Crie .github/workflows/auto-pr-review.yml
4. Crie .github/workflows/auto-add-tests.yml (adaptar convencoes de teste)
5. Crie .github/workflows/client-request.yml (adaptar areas do sistema)
6. Crie .github/workflows/daily-brainstorm.yml (adaptar categorias)
7. Crie .github/workflows/telegram-pr.yml
8. Crie .github/workflows/telegram-issues.yml
9. Crie .github/ISSUE_TEMPLATE/bug-report.yml
10. Crie .github/ISSUE_TEMPLATE/feature-suggestion.yml
11. Crie .github/ISSUE_TEMPLATE/client-request.yml

Adapte os prompts ao CLAUDE.md deste projeto, as convencoes de teste,
e as areas/dominios especificos.

Liste os secrets que preciso configurar em Settings > Secrets.
```

---

## Referencia Rapida

```
tests.yml             → Quality gate (lint + test + build)
claude.yml            → IA implementa features/bugs de issues
auto-pr-review.yml    → IA revisa PRs + auto-merge
auto-add-tests.yml    → IA cria testes faltantes
client-request.yml    → IA avalia + implementa pedidos de cliente
daily-brainstorm.yml  → IA sugere features diariamente
telegram-pr.yml       → Notificacao de PRs
telegram-issues.yml   → Notificacao de issues
ISSUE_TEMPLATE/*.yml  → Templates estruturados com labels de trigger
```
