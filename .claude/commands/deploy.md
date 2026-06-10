---
description: Roda testes, lint e build, valida o implementado e faz commit + push na main (deploy Vercel)
argument-hint: [mensagem de commit opcional]
allowed-tools: Bash(npm run:*), Bash(git:*), Bash(supabase functions deploy:*), Bash(grep:*), Read, Grep, Glob
---

# Deploy

Pipeline completo de deploy: testes → lint → build → validacao → commit/push na `main` (dispara deploy automatico na Vercel). Se houver Edge Functions alteradas, deployar no Supabase antes do push.

Mensagem de commit fornecida pelo usuario (pode estar vazia): $ARGUMENTS

## Pipeline (fail-fast — qualquer falha interrompe ANTES do commit)

### 1. Verificar se ha mudancas para deployar

```bash
git status --porcelain
```

Se nao houver mudancas (working tree limpo), informar e PARAR — nada a deployar.

### 2. Rodar os testes

```bash
npm run test:ci
```

- Se algum teste falhar, PARAR o pipeline e mostrar a saida dos testes. NAO commitar com testes quebrados.
- Corrigir os testes apenas se o usuario pedir.

### 3. Rodar lint

```bash
npm run lint
```

- Erros de lint bloqueiam o pipeline. Warnings nao bloqueiam, mas devem ser reportados.

### 4. Rodar build de producao

```bash
npm run build
```

- Build quebrado bloqueia o pipeline (a Vercel falharia de qualquer forma). Mostrar o erro e PARAR.

### 5. Validar o que foi implementado

Revisar o diff completo (`git diff` + `git diff --staged` + arquivos novos) verificando as regras criticas do projeto:

| Verificacao                                      | Como checar                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `activeCompany.company_id` (nunca `.id`)         | `grep -rn "activeCompany\.id[^_a-zA-Z]" src/` nos arquivos alterados                |
| Pagina protegida nova tem `<DashboardLayout>`    | Inspecionar paginas novas/alteradas em `src/pages/`                                 |
| Nova tabela tem GRANT + RLS com SECURITY DEFINER | Inspecionar migrations novas em `supabase/migrations/`                              |
| Nova permissao adicionada nos 3 lugares          | Enum DB + `PermissionGroupsSettings.tsx` + `PermissionsSettings.tsx`                |
| Edge Function tem CORS headers e try/catch       | Inspecionar funcoes novas/alteradas em `supabase/functions/`                        |
| `types.ts` nao foi editado manualmente           | Se `src/integrations/supabase/types.ts` mudou, confirmar que foi regenerado via CLI |
| UI text em PT-BR                                 | Textos visiveis ao usuario nos componentes alterados                                |

Se encontrar violacao, PARAR, reportar o problema e corrigir antes de prosseguir.

### 6. Deploy de Edge Functions (se aplicavel)

Se o diff inclui mudancas em `supabase/functions/<nome>/`:

```bash
supabase functions deploy <nome-funcao>
```

Deployar apenas as funcoes alteradas, uma a uma. Falha no deploy de funcao bloqueia o pipeline.

### 7. Commit e push na main

```bash
git add -A
git commit -m "<mensagem>"
git push origin main
```

- Se o usuario forneceu mensagem em $ARGUMENTS, usar ela. Caso contrario, gerar a partir do diff em PT-BR seguindo o padrao dos commits recentes (`git log --oneline -5` — prefixos `feat:`, `fix:`, `docs:`, `chore:`).
- O push na `main` dispara o deploy automatico do frontend na Vercel.

### 8. Confirmar resultado

Reportar ao usuario:

- Resultado dos testes (quantos passaram)
- Lint e build OK
- Validacoes do passo 5 OK (ou o que foi corrigido)
- Edge Functions deployadas (se houver)
- Hash do commit e confirmacao do push (deploy Vercel disparado)

## Regras

- **Pipeline fail-fast**: qualquer passo que falhe (teste, lint, build, validacao, deploy de funcao) interrompe tudo ANTES do commit. Nunca commitar codigo quebrado na main.
- **Nao usar `--no-verify`** no commit — os hooks do husky fazem parte do pipeline.
- **Nao fazer force push** em hipotese alguma.
