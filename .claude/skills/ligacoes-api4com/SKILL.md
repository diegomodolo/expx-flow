---
name: ligacoes-api4com
description: "Use ao trabalhar com ligacoes telefonicas via API4Com no chat WhatsApp: dialer, ramal, webhook de gravacao, botao Ligar no WhatsAppChatWindow"
---

# Ligações API4Com — Skill de Contexto do Módulo

## Visão Geral

Módulo de ligações telefônicas integrado ao chat WhatsApp via API4Com. O agente clica em "Ligar" no chat, o sistema dispara o dialer via API, e a extensão Chrome da API4Com toca no ramal do agente. Ao encerrar, a API4Com envia um webhook com duração, status e URL da gravação.

**Localização:** botão de telefone no header do `WhatsAppChatWindow`, visível em conversas individuais com API4Com configurada.

### Modelo de Dados

```
whatsapp_configs
  - api4com_token      TEXT  — token de autenticação da API4Com
  - api4com_extension  TEXT  — número do ramal (ex: "1000")
  - api4com_domain     TEXT  — domínio SIP (ex: "expx.api4com.com") [não usado ativamente]
  - api4com_password   TEXT  — senha SIP do ramal [não usado ativamente]

voice_calls
  - company_id         UUID
  - conversation_id    UUID (nullable)
  - phone              TEXT  — número discado
  - contact_name       TEXT (nullable)
  - direction          TEXT  — sempre "outbound"
  - status             TEXT  — initiated | ringing | completed | busy | failed | cancelled | no_answer
  - api4com_call_id    TEXT  — ID retornado pelo dialer da API4Com
  - started_at         TIMESTAMPTZ (preenchido pelo webhook)
  - answered_at        TIMESTAMPTZ (preenchido pelo webhook)
  - ended_at           TIMESTAMPTZ (preenchido pelo webhook)
  - duration_seconds   INT   (preenchido pelo webhook)
  - hangup_cause       TEXT  (preenchido pelo webhook)
  - record_url         TEXT  — URL do áudio da gravação (preenchido pelo webhook)
```

---

## Arquivos-Chave

| Arquivo                                                                          | Responsabilidade                                                                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/components/whatsapp/WhatsAppCallButton.tsx`                                 | Botão + dialog com input de telefone editável, histórico de chamadas                                         |
| `src/hooks/useVoiceCalls.tsx`                                                    | `useVoiceCalls()` — lista chamadas + `initiateCall` mutation; `useApi4ComConfig()` — busca config da empresa |
| `supabase/functions/initiate-voice-call/index.ts`                                | Busca config, cria registro em voice_calls, chama POST /api/v1/dialer na API4Com                             |
| `supabase/functions/api4com-webhook/index.ts`                                    | Recebe channel-hangup da API4Com e atualiza voice_calls com duração/status/gravação                          |
| `src/components/whatsapp/WhatsAppApi4ComSettings.tsx`                            | Formulário de configuração token + ramal nas settings do WhatsApp                                            |
| `supabase/migrations/20260403130000_add_api4com_to_whatsapp_configs.sql`         | Cria tabela voice*calls + adiciona campos api4com*\* ao whatsapp_configs                                     |
| `supabase/migrations/20260404120000_add_sip_credentials_to_whatsapp_configs.sql` | Adiciona api4com_domain e api4com_password (campos presentes mas não usados ativamente)                      |

---

## Fluxo da Chamada

```
1. Agente abre o chat WhatsApp → clica no ícone de telefone
2. Dialog abre com input editável do número + histórico de chamadas anteriores
3. Agente edita o número se necessário → clica "Ligar"
4. Edge Function initiate-voice-call:
   a. Busca api4com_token e api4com_extension do whatsapp_configs
   b. Insere registro em voice_calls (status: "initiated")
   c. POST https://api.api4com.com/api/v1/dialer com extension + phone + metadata.gateway="expxflow"
   d. Atualiza voice_calls com api4com_call_id (status: "ringing")
5. API4Com toca na extensão Chrome do agente → agente atende
6. Ao encerrar → API4Com envia POST para Edge Function api4com-webhook
7. Webhook atualiza voice_calls com status final, duração, record_url
```

---

## Padrões Estabelecidos

### Chamar o dialer

```typescript
// Sempre incluir gateway: "expxflow" no metadata
// para que o webhook da API4Com seja acionado
body: JSON.stringify({
  extension: config.api4com_extension,
  phone,
  metadata: {
    gateway: "expxflow", // ← OBRIGATÓRIO para acionar o webhook
    voice_call_id: callRecord.id,
    company_id: companyId,
    conversation_id: conversationId || null,
  },
});
```

### Webhook (api4com-webhook)

```typescript
// Sempre retornar 200 mesmo em erro — evita retry da API4Com
return new Response(JSON.stringify({ received: true }), { ... });

// Webhook só dispara para chamadas com metadata.gateway === "expxflow"
// Configurado via PATCH /api/v1/integrations com webhookConstraint
```

### Integração na API4Com (já configurada)

```
Integration ID: 117307
gateway: "expxflow"
webhook: true
webhookUrl: https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/api4com-webhook
webhookTypes: ["channel-hangup"]
webhookConstraint: { metadata: { gateway: "expxflow" } }
```

---

## Armadilhas e Bugs

### "user not registered" ao chamar o dialer

**Causa:** A extensão Chrome da API4Com não está aberta/logada no Chrome do agente.
**Solução:** O agente precisa ter a extensão instalada e logada. Não é possível substituir o webphone da API4Com — tentamos embutir libwebphone/SIP diretamente no browser e não funcionou porque o Chrome bloqueia conexões SIP arbitrárias.
**Extensão:** https://chromewebstore.google.com/detail/api4com-extensao-para-nav/nmihkcakhpccmdhoifppbgeoapjaanno
**ID:** `nmihkcakhpccmdhoifppbgeoapjaanno`

### Não é possível abrir a extensão via window.open

**Causa:** Chrome bloqueia `chrome-extension://` URLs chamadas de páginas web (ERR_BLOCKED_BY_CLIENT).
**Solução:** Não tentar abrir a extensão programaticamente. Mostrar link para instalar e instrução para manter a extensão aberta.

### Status "Chamando..." preso no histórico

**Causa:** O webhook `channel-hangup` não chega para chamadas que falham antes de conectar (ex: ramal offline).
**Solução:** Labels neutros: `initiated` → "Iniciada", `ringing` → "Realizada". Não usar labels progressivos como "Chamando..." que ficam presos.

### Webhook não dispara

**Causa:** `metadata.gateway` não estava presente na chamada ao dialer.
**Solução:** Sempre incluir `gateway: "expxflow"` no metadata do dialer — o `webhookConstraint` filtra por esse campo.

### config.toml do webhook

```toml
[functions.api4com-webhook]
verify_jwt = false   # ← OBRIGATÓRIO — a API4Com não envia token JWT
```

---

## Contexto Não-Óbvio

- **api4com_domain e api4com_password** existem no banco mas não são usados no fluxo atual. Foram adicionados durante tentativa de SIP embutido (abandonada). Podem ser removidos no futuro ou usados se a API4Com adicionar suporte a chamadas sem extensão Chrome.

- **O token da API4Com** é enviado diretamente no header `Authorization` sem prefixo "Bearer" — é o formato proprietário deles.

- **A integration 117282 (gateway: "sippulse")** é uma integração anterior que existia na conta. Não interfere no fluxo atual.

- **Telefone no dialer:** a API4Com aceita apenas DDD (2 dígitos) + número (8 ou 9 dígitos), sem o +55. Números com +55 retornam erro `InvalidPhoneNumber`. O input editável permite o agente ajustar o formato antes de ligar.
