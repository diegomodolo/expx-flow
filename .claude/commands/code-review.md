---
description: Revisa o diff atual nas dimensoes frontend, backend, auth/permissoes e testes, com findings por severidade
argument-hint: "[escopo opcional: ultimo commit | branch | arquivos especificos]"
---

# /code-review

Escopo solicitado (se vazio, revisar mudanças não commitadas + último commit): $ARGUMENTS

Delegue este trabalho ao agente `orquestrador` (via Task tool) com o briefing abaixo. Não revise diretamente.

## Briefing para o orquestrador

Executar o fluxo **Code review** definido em `agents/orquestrador.md`:

1. Levantar o diff do escopo (`git diff`, `git diff --staged`, `git show` conforme o caso).
2. Revisar em dimensões paralelas, cada uma na perspectiva de um agente especializado com suas rules:
   - `frontend` (`rules/frontend.md` + `rules/global.md`): DashboardLayout, `activeCompany.company_id`, React Query (`enabled`, invalidation), PT-BR, imports `@/`, shadcn
   - `backend` (`rules/backend.md`): RLS SECURITY DEFINER, GRANT, CORS + OPTIONS, response format, config.toml, migrations sequenciais, secrets com fallback
   - `auth`/`permissions` (`rules/auth-permissions.md`): guards, owner bypass, 4 passos de permissão, consistência rotas × sidebar
   - `testing` (`rules/testing.md`): a mudança tem teste? mocks corretos?
3. Cada finding deve ter: severidade, arquivo:linha, problema, correção sugerida.
4. **Não aplicar correções** — só reportar (correções via `/corrigir-bug` ou `/melhoria`).

## Output esperado (PT-BR)

```markdown
## Code Review

### CRÍTICO (bloqueia deploy)

| Arquivo:linha | Problema | Correção sugerida |

### ALTO (corrigir antes de prosseguir)

...

### INFO (sugestões)

...

### Resumo

- Arquivos revisados: X | Críticos: X | Altos: X
- Veredito: APROVADO / APROVADO COM RESSALVAS / REPROVADO
```
