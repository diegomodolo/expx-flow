# Rules — DevOps / Self-Hosting (escopo: agente devops)

Aplicam-se a qualquer trabalho de configuracao, agendamento, segredos, distribuicao e verificacao para self-hosting. Carregar junto com `.claude/rules/global.md`.

1. **Zero credencial do desenvolvedor**: Nenhum arquivo distribuido pode conter project ID (`ejwpfztkspbvmuwwiwmk`), dominios (`controledetrafego.com.br`, `expxflow.com.br`), App IDs do Facebook, username GitHub (`bittencourtthulio`) ou tokens reais. O guard test e a fonte de verdade.

2. **Placeholder, nunca valor real**: `.env.example`, `config.toml` e templates de cron usam `<PLACEHOLDER>` ou valores vazios. Credencial real so existe no ambiente do cliente.

3. **Cron parametrizado**: Arquivos de cron NUNCA tem URL + bearer hardcoded. Alvo: `setup-cron-jobs` lendo do runtime. Fallback: template com placeholders documentado. Migrations ja aplicadas nao sao editadas — criar nova migration incremental que substitui o schedule.

4. **Env var vs banco**: Apenas o que o React precisa antes de carregar fica no `.env` (URL + anon key + Client IDs de OAuth do frontend). Todo o resto vai para `system_config_*` (responsabilidade do `backend`). Nao duplicar.

5. **Nome unico da anon key**: `VITE_SUPABASE_ANON_KEY`. Ao padronizar, atualizar TODOS os leitores (client.ts, publicClient.ts, hooks, componentes) na mesma task.

6. **storageKey dinamico**: A storageKey do Supabase client deriva do project ref extraido de `VITE_SUPABASE_URL` — nunca string literal com o ref do dev.

7. **GitHub e opcional**: Sem config de GitHub → funcao retorna erro graceful. Proibido fallback para o repo do desenvolvedor.

8. **Deploy uma por vez**: `supabase functions deploy <nome>` apenas para as funcoes alteradas, com smoke-test apos cada deploy.

9. **Guard test no pipeline**: O guard test de hardcode roda em todo gate de fase/sprint e no CI. Reaparecimento de qualquer string proibida quebra o build (fail-fast, sem `--no-verify`).

10. **`.github/` dev-only**: Workflows especificos do fluxo de desenvolvimento original (Jules, dispatchers) sao movidos para `.github.dev/` ou documentados como opcionais — nao distribuidos como obrigatorios.
