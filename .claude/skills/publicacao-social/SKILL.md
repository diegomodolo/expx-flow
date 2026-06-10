# Publicação Social (Instagram/Facebook) — Skill de Contexto do Módulo

## Visão Geral

Publicação de posts (imagem, vídeo, reel, carrossel) em Instagram e Facebook via Graph API.
Fluxo: frontend cria linha em `scheduled_posts` → invoca a edge function `publish-scheduled-post` → função adquire lock atômico (status `publishing`), publica nas plataformas selecionadas, atualiza o post com resultado e grava trilha em `post_publish_logs`.

Entradas do fluxo:

- **Imediata (modais)**: `PublishCarouselModal.tsx`, `PublishCreativeModal.tsx` — inserem o post com `scheduled_at = now()` e invocam a função na hora
- **Agendada (cron)**: `scheduled-post-publisher` roda a cada minuto e invoca `publish-scheduled-post` para posts vencidos
- **Manual**: `useScheduledPosts.tsx` → `publishNow(id)`

## Arquivos-Chave

| Arquivo                                                  | Responsabilidade                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `supabase/functions/publish-scheduled-post/index.ts`     | Publicação efetiva (FB photos/feed, IG containers + polling + publish) |
| `supabase/functions/scheduled-post-publisher/index.ts`   | Cron que dispara posts agendados vencidos                              |
| `supabase/functions/_shared/instagram-token-resolver.ts` | Resolve token correto (page vs Business Manager vs fallback user)      |
| `src/components/generators/PublishCarouselModal.tsx`     | Modal de publicação de carrossel (mockup IG + plataformas)             |
| `src/components/generators/PublishCreativeModal.tsx`     | Modal de publicação de criativo (imagem única)                         |
| `src/hooks/useScheduledPosts.tsx`                        | CRUD de posts agendados + `publishNow`                                 |

Tabelas: `scheduled_posts` (status: scheduled → publishing → published/failed), `post_publish_logs` (trilha por ação: create_container, wait_processing, publish).

## Padrões Estabelecidos

- **Carrossel IG**: criar 1 container filho por slide (`is_carousel_item: true`), depois container pai (`media_type: CAROUSEL`, `children`), aguardar `status_code = FINISHED` via polling, então `media_publish`. Criar filhos com `Promise.all` (preserva ordem dos slides) — NUNCA sequencial, estoura o tempo.
- **Carrossel FB**: upload de cada foto com `published: false` em paralelo, depois post em `/feed` com `attached_media`.
- **URLs de imagem**: remover query params (cache busters) antes de mandar para o IG — `mediaUrl.split("?")[0]`. Instagram rejeita/falha com URLs sujas.
- **Lock atômico**: `UPDATE scheduled_posts SET status='publishing' WHERE id=... AND status IN ('scheduled','pending','failed')` com `.maybeSingle()` — evita publicação dupla entre modal e cron.
- **Status final**: qualquer plataforma com sucesso → `published` (erros parciais ficam em `error_message`); todas falharam → `failed`.

## Armadilhas e Bugs (resolvidos em 2026-06)

1. **Gateway 504 aos 150s, mas a função continua rodando**: o `supabase.functions.invoke` recebe `FunctionsHttpError` (504) aos ~150s, porém a edge function CONTINUA executando em background e pode publicar com sucesso depois. Se o frontend tratar o 504 como falha e o usuário clicar de novo, cria post DUPLICADO no Facebook (cada clique insere nova linha em `scheduled_posts`, então o lock não protege). Solução: no catch do invoke, fazer polling de `scheduled_posts.status` até `published`/`failed` (ver `waitForPostResult` no PublishCarouselModal).
2. **Rate limit da Meta vira "UNKNOWN"**: quando o app atinge `(#4) Application request limit reached`, a consulta de status do container retorna `{error: {code: 4}}` sem `status_code` — o polling antigo marcava `UNKNOWN` e insistia 15× (~100s desperdiçados). Solução: abortar imediatamente quando `statusData.error` existe, expondo a mensagem real (códigos 4/17/32 = rate limit → mensagem amigável).
3. **Rate limit do app é compartilhado**: os crons de sync (facebook-sync-scheduler, fetch-facebook-pages com 42s, social-tv-dashboard-data com 31s, fetch-instagram-profile-picture) consomem a cota da aplicação Meta a cada minuto. Publicações podem falhar por rate limit mesmo sem uso intenso do usuário. `is_transient: true` — janela rolante de ~1h.
4. **Token para ler status do container**: usar o mesmo `page_access_token` resolvido pelo `instagram-token-resolver`. O `/me` pode funcionar enquanto a leitura do container está rate-limited (buckets diferentes).

## Contexto Não-Óbvio

- Tempos medidos (carrossel 8 slides, sequencial, antes do fix): FB ~46s + containers IG ~37s + polling ~100s ≈ 190s > 150s do gateway.
- `post_publish_logs` é a melhor ferramenta de diagnóstico — mostra cada etapa com timestamp e `response_data` cru da Meta.
- O notificador WhatsApp (Z-API) roda no final da função e nunca derruba a publicação (try/catch próprio).
- Polling config por tipo: image 20s max, carousel 45s max, video/reel 5min max — vídeo em carrossel pode não ficar pronto em 45s.
