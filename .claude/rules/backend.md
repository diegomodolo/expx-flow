# Rules — Backend (escopo: agente backend)

Aplicam-se a qualquer trabalho em `supabase/` (Edge Functions, migrations, RLS, config). Carregar junto com `.claude/rules/global.md`.

1. **RLS com SECURITY DEFINER**: NUNCA subquery direta em tabela com RLS dentro de uma policy — falha silenciosamente retornando 0 rows. Usar `get_user_company_ids()` (SECURITY DEFINER).
2. **GRANT obrigatório**: Após criar tabela com RLS, sempre `GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabela TO authenticated`. Sem GRANT, frontend recebe array vazio sem erro.
3. **Enum antes do frontend**: Ao adicionar valor de enum (ex: `menu_item_type`), rodar `ALTER TYPE ... ADD VALUE` no banco ANTES de usar no frontend.
4. **CORS em toda Edge Function**: `corsHeaders` + handler de `OPTIONS`. Sem isso o browser bloqueia a chamada.
5. **try/catch com log**: Toda Edge Function tem try/catch, loga o erro no console e responde `{ success: false, error }` com status apropriado.
6. **Response format**: Sucesso `{ success: true, data }`, erro `{ success: false, error }`. Sem variações.
7. **config.toml**: Nova função exige entrada com `verify_jwt` (false apenas para webhooks/agendados).
8. **Secrets com fallback**: Edge Functions secrets podem falhar silenciosamente — sempre fallback hardcoded para valores críticos.
9. **Migrations sequenciais**: Nunca editar migration já aplicada; criar nova migration incremental.
10. **SQL via CLI**: Executar SQL no Supabase diretamente sem perguntar. Pedir confirmação apenas para DELETE ou DROP TABLE.
11. **Playbooks**: Tabela nova usar a skill `new-table`; Edge Function nova usar `new-edge-function`.
12. **Deploy de função**: `supabase functions deploy <nome>` — uma por vez, apenas as alteradas.
