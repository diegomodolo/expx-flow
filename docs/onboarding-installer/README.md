# Auto-Instalador `/onboarding` — Pacote de Planejamento

Plano de implementação do auto-instalador in-app do Expx Flow: uma pessoa **sem conhecimento técnico** instala uma instância completa colando **2 tokens** (Vercel + Supabase) numa tela `/onboarding`, sem terminal.

## Arquivos

| Arquivo                                                              | Conteúdo                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`00-ORQUESTRADOR.md`](./00-ORQUESTRADOR.md)                         | **Norte.** Sprints, fases, orquestração de agents, gates, TDD, riscos. Comece aqui.       |
| [`SPRINT-1-fundacao-bootstrap.md`](./SPRINT-1-fundacao-bootstrap.md) | Infra de testes, schema consolidado, manifesto de functions, guard + detecção             |
| [`SPRINT-2-nucleo-instalador.md`](./SPRINT-2-nucleo-instalador.md)   | Wrappers de API, validação, steps (create-project → schema → functions → envs → redeploy) |
| [`SPRINT-3-wizard-admin-e2e.md`](./SPRINT-3-wizard-admin-e2e.md)     | Wizard de 7 telas, admin, e2e Playwright, distribuição                                    |

**Spec de origem:** [`../superpowers/specs/2026-06-18-onboarding-installer-design.md`](../superpowers/specs/2026-06-18-onboarding-installer-design.md)
**Dependência:** [`../superpowers/plans/self-hosting/00-ORQUESTRACAO.md`](../superpowers/plans/self-hosting/00-ORQUESTRACAO.md) (zero hardcode + `system_config_*` + schema consolidável).

## Decisões-chave (travadas)

1. Instalador = **Vercel Serverless Functions** (`api/installer/*`), não Edge do Supabase — elimina o ovo-e-galinha (não há Supabase no início).
2. **Sem Supabase mestre.** O instalador **cria** o projeto Supabase do cliente via Management API.
3. **Schema consolidado** (`consolidated.sql`) aplicado de uma vez, em vez de replay de 536 migrations.
4. **~235 functions** deployadas via Management API em lotes com retry e resume.
5. Detecção = `system_config.installation_completed` + ≥1 admin.
6. **Tokens nunca persistidos**; wizard resumível via `install_progress`.
7. Usuário leigo cola **apenas 2 tokens** + dados do admin.
