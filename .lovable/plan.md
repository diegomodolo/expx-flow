
## Diagnóstico (por que “não traz mensagem nenhuma”)
Pelos logs do Edge Function `fetch-whatsapp-messages`, a API do UazapiGO está retornando mensagens (ex.: `100 mensagens encontradas`), porém o sistema está salvando **0** no banco (`Mensagens salvas: 0, Total no banco: 0`).  
Ou seja: o problema não é a chamada ao endpoint em si — é a persistência/normalização dentro do Edge Function + banco.

O motivo mais provável (e confirmado pelo schema atual) é:
- O Edge Function faz `upsert(..., { onConflict: "external_id" })`
- Mas a tabela `public.whatsapp_messages` **não tem nenhuma constraint UNIQUE** para `external_id` (nem índice único), então o Postgres **não consegue aplicar o ON CONFLICT**.

Eu validei no schema do banco que só existem PK/FKs e checks; não existe unique em `external_id`.

Além disso, há um segundo problema potencial:
- A resposta do `/message/find` pode vir com mensagens de vários chats (ou com campos diferentes), então precisamos **filtrar** por `chatid === "<numero>@s.whatsapp.net"` antes de salvar, e melhorar o fallback de conteúdo para mensagens de mídia quando `msg.type` existe.

## O que vamos implementar
### 1) Ajuste no banco (obrigatório para salvar mensagens)
Criar uma constraint UNIQUE (recomendado: por empresa) para suportar o upsert:

Opção recomendada:
- UNIQUE `(company_id, external_id)`

Por que assim:
- Evita colisão entre empresas diferentes
- Permite múltiplas mensagens com `external_id = NULL` (Postgres permite múltiplos NULLs em unique)
- Mantém a deduplicação estável para re-sync

Também vamos atualizar o Edge Function para usar:
- `onConflict: "company_id,external_id"`

### 2) Ajuste no Edge Function `fetch-whatsapp-messages` (para efetivamente preencher o chat)
Mudanças principais:
- **Filtrar mensagens** retornadas: manter apenas as mensagens cujo `msg.chatid` (ou `msg.chatId`, dependendo do payload) bate com o `chatId` solicitado.
- **Corrigir a chave do upsert** para `company_id,external_id`.
- **Melhorar extração de conteúdo**: se `msg.type` vier como `image/video/audio/document` e não existir `content.text`, preencher `content` com placeholder (`[Imagem]`, `[Vídeo]`, etc.) ao invés de “pular”.
- **Logs úteis**: logar contagem de `skipped`, `saved`, e os 2–3 primeiros erros do banco (sem expor token completo).
- (Opcional) aceitar `limit` e `offset` do frontend para “Buscar mensagens anteriores” fazer paginação real.

### 3) Ajuste leve no frontend (se necessário)
Hoje o frontend chama `fetchMessagesFromApi(true)` sem parâmetros de paginação.  
Se você quer que o botão “Buscar mensagens anteriores” realmente busque páginas antigas:
- Adicionar estado local de `offset` no chat
- Incrementar `offset` a cada clique
- Passar `{ limit, offset }` para o Edge Function
- Mesclar mensagens no banco (já que o banco vai deduplicar por external_id)

Se você só quer “trazer as mensagens desse chat”, sem paginação, dá para manter como está — desde que o backend passe a salvar corretamente.

## Plano de execução (passo a passo)
1. **Criar migration** no Supabase para adicionar UNIQUE em `whatsapp_messages`:
   - `UNIQUE (company_id, external_id)`
2. **Atualizar o Edge Function** `supabase/functions/fetch-whatsapp-messages/index.ts`:
   - trocar `onConflict: "external_id"` por `onConflict: "company_id,external_id"`
   - filtrar mensagens por `chatid`
   - melhorar parsing de conteúdo/mídia
   - adicionar logs de `saved/skipped/errors`
3. (Opcional, se você aprovar) **Adicionar paginação**:
   - frontend envia `limit/offset`
   - Edge Function repassa para UazapiGO
4. **Teste guiado**:
   - abrir o chat do “Miguel Viana”
   - clicar no ícone de atualizar (🔄)
   - confirmar no drawer:
     - a lista deixa de mostrar “Nenhuma mensagem ainda”
   - validar nos logs do Edge Function:
     - `fetched > 0`, `saved > 0`, `total no banco > 0`

## Perguntas rápidas (para eu alinhar sem suposições)
- Você quer deduplicar mensagens por `external_id` **por empresa** (mais seguro) ou global (menos seguro)?
- O botão “Buscar mensagens anteriores” precisa de paginação real (limit/offset) ou pode apenas “sincronizar tudo que tiver” sem paginação?

## Resultado esperado
- Ao clicar em um chat antigo ou no botão de atualizar, o sistema chama `POST https://plannerx.uazapi.com/message/find` com o **token da instância correta** e `chatid` do contato
- As mensagens retornadas são filtradas para aquele chat e **salvas no banco**
- O chat passa a exibir o histórico corretamente (em vez de “Nenhuma mensagem ainda”)
