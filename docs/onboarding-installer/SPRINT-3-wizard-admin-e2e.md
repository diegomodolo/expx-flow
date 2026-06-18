# Sprint 3 — Wizard, Admin & E2E

> **Meta do sprint:** transformar o núcleo num produto usável por leigos — o wizard de 7 telas com progresso ao vivo e resume, criação do admin, fechamento da instalação, suíte e2e Playwright e a distribuição (botão Deploy to Vercel + docs + skill).

**Gate de saída:** ver [`00-ORQUESTRADOR.md`](./00-ORQUESTRADOR.md) §5 GATE 3.

UI em PT-BR, `@/` imports, React Hook Form + Zod, toasts via Sonner, `cn()` para classes.

---

## Fase 3.1 — UI do Wizard

### Task 3.1.1 — Estrutura e navegação do wizard

- **RED (Testing Library):** wizard inicia no passo de boas-vindas; "Começar" avança; não permite avançar com campo obrigatório vazio; botão "Voltar" funciona onde aplicável.
- **GREEN:** `src/pages/Onboarding.tsx` + `src/components/onboarding/` (um componente por passo); estado do passo + dados via React Hook Form/Zod.
- **Aceite:** testes verdes; 7 passos (0 boas-vindas, 1 token Vercel, 2 token Supabase, 3 org+nome, 4 instalando, 5 admin, 6 concluído).

### Task 3.1.2 — Passos de tokens e organização

- **RED:** colar token → chama `validate-tokens`; inválido → mensagem PT-BR e bloqueio; passo 3 popula dropdown via `list-orgs`; sem org → mensagem clara.
- **GREEN:** integrar com as functions; cada campo tem link + dica de "onde pegar".
- **Aceite:** testes verdes; validação inline; textos amigáveis para leigo.

### Task 3.1.3 — Passo "Instalando" (progresso SSE + resume)

- **RED:** consome SSE de `run`, mostra barra/porcentagem e nome do step em PT-BR; ao recarregar, lê progresso e retoma a barra sem repetir steps; `partial` → reinvoca `run` automaticamente até `done`.
- **GREEN:** componente de progresso consumindo SSE; leitura de `install_progress` no mount.
- **Aceite:** testes verdes; recarregar no meio não reinicia do zero; mensagens compreensíveis.

---

## Fase 3.2 — Admin & fechamento

### Task 3.2.1 — `POST /api/installer/create-admin`

- **RED:** cria admin via `auth.admin.createUser` (confirmado); define como owner; marca `system_config.installation_completed=true`; email duplicado/ senha fraca → erro PT-BR; recusa se já existe admin.
- **GREEN:** implementar (service_role do projeto criado, na function da Vercel).
- **Aceite:** testes verdes; admin vira owner; flag marcada **só** após admin criado.

### Task 3.2.2 — Passo admin + redirecionamento final

- **RED:** form email+senha+confirmação (Zod); sucesso → tela "Concluído" → "Entrar" leva para `/`; guard agora libera o app.
- **GREEN:** integrar com `create-admin`; invalidar cache do status do guard após sucesso.
- **Aceite:** testes verdes; após concluir, `/onboarding` redireciona para `/`.

---

## Fase 3.3 — E2E Playwright

> Roda contra os **fakes** de Vercel/Supabase Management (Sprint 1, Fase 1.1) — nenhuma API real.

### Task 3.3.1 — Fluxo feliz

- **E2E:** boas-vindas → cola tokens válidos → escolhe org/nome → assiste instalação até 100% → cria admin → "Entrar" → app carrega (guard liberado).
- **Aceite:** verde; cobre os 7 passos.

### Task 3.3.2 — Resume

- **E2E:** interromper/recarregar durante `deploy-functions`; ao voltar, a barra retoma do último lote e conclui sem re-deployar tudo.
- **Aceite:** verde; nenhuma function re-deployada no resume (asserção sobre chamadas do fake).

### Task 3.3.3 — Token inválido

- **E2E:** colar token inválido → mensagem PT-BR, avanço bloqueado; corrigir → prossegue.
- **Aceite:** verde.

### Task 3.3.4 — Reinstalação bloqueada

- **E2E:** com `installation_completed=true`, acessar `/onboarding` → redireciona para `/`; chamar `run` → 409.
- **Aceite:** verde.

---

## Fase 3.4 — Distribuição

### Task 3.4.1 — Botão "Deploy to Vercel"

- Adicionar botão/markdown no README que clona o repo e sobe o frontend **sem Supabase** (o instalador cuida do resto).
- Garantir `vercel.json` com as serverless functions (`api/installer/*`) e `includeFiles` das functions Supabase.
- **Aceite:** o botão sobe uma instância que cai direto em `/onboarding`.

### Task 3.4.2 — Docs para leigos

- Atualizar `docs/INSTALACAO.md`: novo caminho = "clique no botão, cole 2 tokens, pronto" (com prints de onde pegar cada token).
- Atualizar `docs/CHECKLIST_POS_INSTALACAO.md` com o pós-onboarding (configurar integrações em `/configuracoes/sistema`).
- **Aceite:** um leigo consegue seguir sem terminal.

### Task 3.4.3 — Skill de contexto

- Criar `.claude/skills/onboarding-installer/SKILL.md` cobrindo: visão geral, arquivos-chave (`api/installer/*`, guard, wizard, scripts de build), padrões (steps idempotentes, tokens efêmeros), armadilhas (limite de tempo, redeploy invalida memória) e contexto não-óbvio (por que serverless da Vercel e não edge do Supabase).
- **Aceite:** skill segue o formato das existentes e é commitada com o trabalho.

---

## Critérios de Aceite do Sprint 3 (GATE 3 — release-ready)

- [ ] Wizard de 7 telas com progresso SSE, resume e PT-BR — testes verdes.
- [ ] `create-admin` cria owner e marca `installation_completed`; guard libera o app.
- [ ] E2E: fluxo feliz, resume, token inválido, reinstalação bloqueada — todos verdes.
- [ ] Botão "Deploy to Vercel" + `INSTALACAO.md`/`CHECKLIST` atualizados; skill criada.
- [ ] `build` + `lint` + `test:ci` + `test:e2e` verdes.
- [ ] Guard test de hardcode (self-hosting) continua passando — nenhuma credencial do dev no bundle.

---

## Resultado final verificável

Uma pessoa **sem conhecimento técnico**:

1. Clica em "Deploy to Vercel".
2. Abre o app → cai em `/onboarding`.
3. Cola 2 tokens, escolhe a org, dá um nome.
4. Assiste à instalação automática (Supabase criado, schema, ~235 functions, envs, redeploy).
5. Cadastra email/senha do admin.
6. Entra na aplicação já funcionando.

Sem terminal. Sem editar arquivos. Sem ver credenciais do desenvolvedor.
