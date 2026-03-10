# Claude Code Blueprint — Estrutura de Configuracao para Projetos

> Template estrutural para replicar o workflow Claude Code em qualquer projeto.
> Passe este documento ao Claude em um novo projeto e ele criara toda a estrutura.

---

## 1. Visao Geral da Arquitetura de Configuracao

O Claude Code usa um sistema de contexto hierarquico composto por **6 camadas**:

```
Projeto/
├── CLAUDE.md                         # 1. Contexto global (OBRIGATORIO)
├── AGENTS.md                         # 2. Guia resumido para agentes IA
├── .claudeignore                     # 3. Exclusao de arquivos do indexing
├── .husky/pre-commit                 # 4. Quality gates automaticos
├── .claude/
│   ├── agents/                       # 5. Sub-agentes especializados por dominio
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── auth.md
│   │   ├── testing.md
│   │   └── ...
│   └── skills/                       # 6. Slash commands invocaveis
│       ├── new-page.md
│       ├── new-component.md
│       ├── write-test.md
│       └── ...
├── src/pages/admin/CLAUDE.md         # 7. Contexto local por diretorio
├── src/components/dashboard/CLAUDE.md
├── api/CLAUDE.md
└── ...
```

### Como o Claude Code carrega contexto

1. **CLAUDE.md raiz** — Sempre carregado em toda conversa (contexto global)
2. **CLAUDE.md por diretorio** — Carregado automaticamente quando o Claude trabalha naquele diretorio
3. **.claudeignore** — Filtra arquivos que o Claude nao deve indexar
4. **Agents** — Referenciados no CLAUDE.md raiz; o Claude le antes de tarefas complexas
5. **Skills** — Comandos invocaveis com `/nome` que guiam workflows especificos

---

## 2. CLAUDE.md Raiz — Template Estrutural

Este e o arquivo mais importante. Ele da ao Claude todo o contexto do projeto.

### Secoes Obrigatorias

````markdown
# [Nome do Projeto] - [Descricao curta]

## Visao Geral

[1-2 paragrafos: o que o projeto faz, tipo (SaaS, API, CLI, etc.), dominio]

## Stack Tecnologico

- **Frontend**: [framework + versao]
- **UI**: [lib de componentes + CSS]
- **Roteamento**: [lib]
- **Forms**: [lib + validacao]
- **Data Fetching**: [lib]
- **Backend**: [servico/framework]
- **Testes**: [runner + libs]
- **Deploy**: [onde roda]

## Comandos

\```bash
npm run dev # [descricao]
npm run build # [descricao]
npm run lint # [descricao]
npm run test # [descricao]
\```

## Estrutura do Projeto

\```
src/
├── [arvore de diretorios com comentarios inline]
\```

## Arquitetura de Rotas

### Publicas

- `/rota` — [descricao]

### Protegidas

- `/rota` — [descricao]

### Admin

- `/admin/*` — [lista]

## Sistema de Autenticacao

- Provider: [qual]
- Hook/Context: [nome] expoe: [campos]
- Roles: [lista]
- Route guards: [lista de componentes]

## Modelo de Dados

### Hierarquia Principal

\```
Entidade A → Entidade B → Entidade C
\```

### Tabelas/Collections-chave

- `nome` — [descricao]

## Padroes e Convencoes

### Codigo

- [path aliases, utilities, patterns de data fetching, locale, idioma]

### Estilo

- [tema padrao, cor primaria, responsividade]

### Componentes

- [lib de UI, organizacao, forms, toasts]

## Variaveis de Ambiente

\```
VARIAVEL_1 # [descricao]
VARIAVEL_2 # [descricao]
\```

## Regra de Testes Obrigatorios

[politica de testes: o que deve ser testado, fluxo obrigatorio, infra disponivel]

## Observacoes Importantes

- [alertas: arquivos auto-gerados, RLS, SSR/CSR, strict mode, etc.]

## Sub-agentes Especializados (.claude/agents/)

| Agente | Arquivo      | Quando usar       |
| ------ | ------------ | ----------------- |
| [Nome] | `arquivo.md` | [contexto de uso] |

## Skills (Slash Commands — .claude/skills/)

### Tier 1 — Scaffolding e Qualidade

| Comando | Descricao   |
| ------- | ----------- |
| `/nome` | [o que faz] |

### Tier 2 — Dominio Especifico

| Comando | Descricao   |
| ------- | ----------- |
| `/nome` | [o que faz] |

## CLAUDE.md por Diretorio

| Diretorio | Conteudo                                 |
| --------- | ---------------------------------------- |
| `path/`   | [resumo do que o CLAUDE.md local contem] |
````

### Principio: Quanto mais contexto, melhor o Claude trabalha

O CLAUDE.md raiz deve ser **completo mas conciso**. O Claude carrega ele inteiro em toda conversa, entao:

- Mantenha entre 150-300 linhas
- Use tabelas em vez de paragrafos longos
- Inclua code snippets para patterns (o Claude replica)
- Referencie os agents para contexto profundo

---

## 3. CLAUDE.md por Diretorio — Quando e Como Criar

### Quando criar

Crie um CLAUDE.md local quando o diretorio tem:

- **Alta complexidade** (500+ linhas de codigo, muitos arquivos)
- **Padroes locais** diferentes do resto do projeto
- **Tipos/interfaces locais** que o Claude precisa conhecer
- **Regras de edicao especificas** (ex: nao quebrar lazy loading)

### Template para CLAUDE.md local

````markdown
# [Nome da Area] (path/relativo/)

## Visao Geral

[N arquivos, ~N linhas. O que essa area faz.]

## Navegacao / Estrutura

[Menu, tabs, componentes principais]

## Arquivos Principais

| Arquivo       | Linhas | Funcao      |
| ------------- | ------ | ----------- |
| `Arquivo.tsx` | N      | [o que faz] |

## Tipos Importantes

\```typescript
type NomeDoTipo = {
campo: tipo;
};
\```

## Padroes Locais

### [Nome do Padrao]

\```typescript
// Exemplo de codigo que o Claude deve seguir
\```

## Regras ao Editar

1. **[Regra]** — [explicacao]
2. **[Regra]** — [explicacao]
````

### Diretorios que tipicamente merecem CLAUDE.md local

| Tipo de Diretorio       | Motivo                                                 |
| ----------------------- | ------------------------------------------------------ |
| `pages/admin/`          | Alta complexidade, muitos arquivos, tabs, lazy loading |
| `pages/[role]/`         | Escopo diferente por role, queries filtradas           |
| `components/[feature]/` | Patterns de memo, props, animacoes                     |
| `api/` ou `functions/`  | Runtime diferente, patterns de seguranca               |
| `lib/` (se complexo)    | Utilities compartilhadas com regras                    |

---

## 4. AGENTS.md — Guia Compacto para Agentes IA

Diferente do CLAUDE.md (que e carregado automaticamente), o AGENTS.md serve como referencia rapida. Util quando outros agentes IA (nao so Claude Code) trabalham no projeto.

### Template

````markdown
# [Projeto] - Contexto para Agentes de IA

## O que e o projeto

[1-2 frases]

## Stack

- **Frontend**: [stack]
- **Backend**: [stack]
- **Testes**: [runner]

## Diretrizes de codigo

- **Idioma da UI**: [idioma]
- **Path alias**: [mapeamento]
- **Componentes**: [regras]
- **Estilo**: [regras]
- **Data fetching**: [padrao]

## Regras importantes

- [lista de "nunca faca X"]
- [lista de "sempre faca Y"]

## Estrutura de pastas

\```
[arvore simplificada]
\```

## Ao corrigir bugs ou implementar features

1. [passo-a-passo do workflow ideal]
````

---

## 5. .claudeignore — O Que Excluir

O `.claudeignore` segue a mesma sintaxe do `.gitignore`. Excluir arquivos pesados/irrelevantes melhora a performance do Claude e evita confusao.

### Template

```gitignore
# Dependencies & lock files
node_modules/
package-lock.json
pnpm-lock.yaml
bun.lockb
yarn.lock

# Build artifacts
dist/
build/
.next/
.vercel/
.netlify/

# Auto-generated (especificar o arquivo e como regenerar)
# src/path/to/auto-generated-types.ts

# Environment secrets
.env
.env.*

# IDE metadata
.vscode/
.idea/
.jules/
.lovable/

# Audit/report files (nao sao codigo-fonte)
# AUDIT_*.md
# REPORT_*.md

# Editor/OS temp
*.local
*.log
.DS_Store
*.sw?
```

### Principio: Inclua TUDO que nao e codigo editavel

Se o Claude nao deveria editar ou nao precisa ler um arquivo, coloque no `.claudeignore`.

---

## 6. Sub-agentes (.claude/agents/) — Contexto Profundo por Dominio

Agents sao arquivos `.md` em `.claude/agents/` que contem conhecimento especializado. O Claude Code os le sob demanda antes de tarefas complexas.

### Quando criar um agent

| Sinal                       | Exemplo                                       |
| --------------------------- | --------------------------------------------- |
| Dominio com regras proprias | Backend com RLS, CORS, patterns de seguranca  |
| Stack diferente             | Edge functions em Deno vs frontend em Node    |
| Complexidade alta           | Integracao Stripe com multi-tenant            |
| Erros recorrentes           | Auth bugs, permissoes, queries vazias         |
| Patterns especificos        | Testing mocks, form validation, data fetching |

### Agents recomendados por tipo de projeto

**Fullstack Web App:**

- `frontend.md` — Componentes, estilo, data fetching, routing
- `backend.md` — API, banco de dados, queries, migrations
- `auth.md` — Autenticacao, permissoes, roles, route guards
- `testing.md` — Infra de testes, mocks, patterns

**Com integraces:**

- `payments.md` — Stripe/gateway, checkout, webhooks
- `ai.md` — Integracao com LLM, prompts, rate limiting
- `integrations.md` — APIs externas, imports, webhooks

### Template para um agent

````markdown
# [Dominio] — Contexto Especializado

## Escopo

[O que este agent cobre]

## Arquivos-chave

| Arquivo        | Funcao      |
| -------------- | ----------- |
| `path/file.ts` | [descricao] |

## Patterns Obrigatorios

### [Nome do Pattern]

\```typescript
// Codigo template que DEVE ser seguido
\```

## Erros Comuns e Solucoes

| Erro      | Causa   | Solucao |
| --------- | ------- | ------- |
| [sintoma] | [causa] | [fix]   |

## Checklist antes de submeter

- [ ] [verificacao 1]
- [ ] [verificacao 2]
````

---

## 7. Skills (.claude/skills/) — Slash Commands

Skills sao comandos invocaveis com `/nome` que guiam o Claude em workflows repetitivos. Cada skill e um `.md` que define inputs, steps, templates e checklists.

### Quando criar uma skill

| Sinal                           | Exemplo                                  |
| ------------------------------- | ---------------------------------------- |
| Workflow repetitivo             | Criar pagina, componente, migration      |
| Boilerplate necessario          | Edge function com CORS, testes com mocks |
| Qualidade precisa ser garantida | Security review, perf audit              |
| Onboarding de devs              | "Como adicionar uma tab no admin?"       |

### Skills recomendadas por tipo de projeto

**Tier 1 — Todo projeto deveria ter:**
| Skill | O que faz |
|-------|-----------|
| `/new-page` | Scaffold de nova pagina com routing e guard |
| `/new-component` | Componente com convencoes do projeto |
| `/write-test` | Teste com mocks e providers do projeto |
| `/security-review` | Audit de seguranca |
| `/perf-audit` | Audit de performance |

**Tier 2 — Conforme o projeto cresce:**
| Skill | O que faz |
|-------|-----------|
| `/new-migration` | Migration SQL com RLS, indexes |
| `/new-api-route` | Endpoint com validacao e auth |
| `/new-edge-function` | Serverless function com boilerplate |
| `/debug-[dominio]` | Diagnostico de problemas comuns |
| `/[dominio]-feature` | Feature scoped por role/permissao |

### Template para uma skill

````markdown
# /[nome-da-skill]

## Descricao

[O que esta skill faz]

## Inputs

- `nome`: [descricao] (obrigatorio)
- `tipo`: [descricao] (opcional, default: X)

## Steps

### 1. [Acao]

[Instrucoes detalhadas para o Claude]

### 2. [Acao]

[Instrucoes + template de codigo]

### 3. [Acao]

[Verificacoes e ajustes]

## Template de Codigo

\```typescript
// Boilerplate que o Claude deve usar como base
\```

## Checklist de Qualidade

- [ ] [verificacao 1]
- [ ] [verificacao 2]
- [ ] Teste criado junto com o codigo
````

---

## 8. Quality Gates — Pre-commit Hooks

O `.husky/pre-commit` garante qualidade automaticamente antes de cada commit.

### Setup

```bash
npm install --save-dev husky lint-staged
npx husky init
```

### .husky/pre-commit

```bash
npx lint-staged
npm run test:ci
```

### package.json (lint-staged config)

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix"],
    "*.{ts,tsx,css,md}": ["prettier --write"]
  }
}
```

### Principio: O Claude respeita pre-commit hooks

Quando um hook falha, o Claude diagnostica o problema e corrige antes de tentar novamente. Isso cria um loop de qualidade automatico.

---

## 9. Auto Memory (.claude/projects/[hash]/memory/)

O Claude Code tem um sistema de memoria persistente entre conversas. Configurar corretamente melhora a consistencia ao longo do tempo.

### O que salvar na memoria

- Padroes confirmados em multiplas interacoes
- Decisoes arquiteturais importantes
- Preferencias do usuario (workflow, ferramentas)
- Solucoes para problemas recorrentes

### O que NAO salvar

- Contexto de sessao (tarefa atual, estado temporario)
- Informacao nao verificada
- Duplicatas do CLAUDE.md

### MEMORY.md (limite: 200 linhas visíveis)

Manter conciso. Criar arquivos topicos separados (`patterns.md`, `debugging.md`) para detalhes, linkados do MEMORY.md.

---

## 10. Fluxo de Implementacao para um Novo Projeto

### Passo 1 — CLAUDE.md raiz (dia 1)

Crie o CLAUDE.md raiz com todas as secoes obrigatorias. Este e o minimo viavel.

```bash
# Resultado esperado:
projeto/
└── CLAUDE.md          # ~150-300 linhas
```

### Passo 2 — .claudeignore + AGENTS.md (dia 1)

```bash
projeto/
├── CLAUDE.md
├── AGENTS.md          # ~50-100 linhas (resumo)
└── .claudeignore      # ~20-40 linhas
```

### Passo 3 — Quality gates (semana 1)

```bash
projeto/
├── .husky/
│   └── pre-commit     # lint + test
├── CLAUDE.md
├── AGENTS.md
└── .claudeignore
```

### Passo 4 — CLAUDE.md por diretorio (conforme complexidade cresce)

Crie apenas para diretorios que causam confusao ou erros recorrentes.

```bash
projeto/
├── src/pages/admin/CLAUDE.md      # Quando admin ficar complexo
├── src/components/[feature]/CLAUDE.md  # Quando patterns locais surgirem
├── api/CLAUDE.md                  # Quando API tiver patterns proprios
└── [backend]/CLAUDE.md            # Quando backend tiver regras especificas
```

### Passo 5 — Agents (quando dominos se especializam)

```bash
projeto/
├── .claude/
│   └── agents/
│       ├── frontend.md
│       ├── backend.md
│       ├── auth.md
│       └── testing.md
```

### Passo 6 — Skills (quando workflows se repetem)

```bash
projeto/
├── .claude/
│   ├── agents/
│   └── skills/
│       ├── new-page.md
│       ├── new-component.md
│       └── write-test.md
```

---

## 11. Checklist de Validacao

Use este checklist para verificar se a configuracao do Claude Code esta completa:

### Essencial

- [ ] CLAUDE.md raiz com todas as secoes obrigatorias
- [ ] .claudeignore excluindo dependencias, build, auto-gerados, secrets
- [ ] Comandos de dev/build/test documentados no CLAUDE.md

### Recomendado

- [ ] AGENTS.md como guia compacto
- [ ] Pre-commit hooks (lint + test)
- [ ] Regra de testes obrigatorios documentada
- [ ] Variaveis de ambiente documentadas (sem valores)

### Avancado

- [ ] CLAUDE.md por diretorio para areas complexas
- [ ] Agents para dominios especializados (3-7 agents)
- [ ] Skills para workflows repetitivos (5-15 skills)
- [ ] Secao de "Regras ao Editar" em cada CLAUDE.md local
- [ ] Templates de codigo nos agents e skills

---

## 12. Prompt para Bootstrapping

Ao iniciar um novo projeto, passe este prompt ao Claude Code:

```
Leia o arquivo docs/claude-code-blueprint.md (ou cole o conteudo).
Analise este projeto e crie a estrutura completa de configuracao Claude Code
seguindo o blueprint:

1. CLAUDE.md raiz com todas as secoes obrigatorias
2. .claudeignore adequado a stack
3. AGENTS.md resumido
4. CLAUDE.md para cada diretorio complexo existente
5. Agents iniciais em .claude/agents/ (pelo menos: frontend, backend, auth, testing)
6. Skills iniciais em .claude/skills/ (pelo menos: /new-page, /new-component, /write-test)
7. Pre-commit hook com lint + test

Adapte tudo ao contexto, stack e convencoes DESTE projeto.
```

---

## 13. Anti-patterns — O Que Nao Fazer

| Anti-pattern                           | Por que evitar                           | O que fazer                            |
| -------------------------------------- | ---------------------------------------- | -------------------------------------- |
| CLAUDE.md com 500+ linhas              | Consome contexto, Claude perde foco      | Mover detalhes para agents             |
| Duplicar info entre CLAUDE.md e agents | Inconsistencia quando atualizar          | CLAUDE.md referencia, agent detalha    |
| Skills muito genericas                 | Claude nao sabe o que fazer              | Incluir template de codigo e checklist |
| CLAUDE.md local sem "Regras ao Editar" | Claude faz mudancas que quebram patterns | Sempre incluir regras explicitas       |
| Ignorar .claudeignore                  | Claude le arquivos enormes/irrelevantes  | Excluir tudo que nao e codigo editavel |
| Nao documentar testes                  | Claude nao cria testes                   | Regra explicita + infra de teste       |
| Agents sem exemplos de codigo          | Claude improvisa patterns                | Incluir snippets template              |

---

## Referencia Rapida

```
CLAUDE.md raiz        → "Quem somos, como trabalhamos" (global)
CLAUDE.md local       → "Regras desta area especifica" (por diretorio)
AGENTS.md             → "Resumo para qualquer IA" (compacto)
.claudeignore         → "O que ignorar" (exclusao)
.claude/agents/*.md   → "Conhecimento profundo por dominio" (sob demanda)
.claude/skills/*.md   → "Workflow guiado passo-a-passo" (invocavel com /)
.husky/pre-commit     → "Qualidade automatica" (gate)
memory/MEMORY.md      → "O que aprendi entre sessoes" (persistente)
```
