# Edge Functions (supabase/functions/)

## Visao Geral

~215 Edge Functions em Deno runtime. Organizadas por prefixo/dominio.

## Categorias

| Prefixo      | Qtd  | Descricao                                           |
| ------------ | ---- | --------------------------------------------------- |
| `generate-*` | ~34  | Geracao IA (campanhas, criativos, slides, conteudo) |
| `fetch-*`    | ~12  | Busca de dados de APIs externas (Facebook, Google)  |
| `manage-*`   | ~10  | Operacoes administrativas em recursos               |
| `google-*`   | ~9   | Integracao Google Ads (sync, create, update)        |
| `daily-*`    | ~8   | Tarefas agendadas diarias (geracao automatica)      |
| `create-*`   | ~8   | Criacao de recursos (campanhas, ads, adsets)        |
| `send-*`     | ~7   | Envio de notificacoes e mensagens                   |
| `analyze-*`  | ~6   | Analise e IA (criativos, concorrentes, URLs)        |
| `whatsapp-*` | ~5   | Operacoes WhatsApp (webhook, envio, config)         |
| `facebook-*` | ~5   | Operacoes Facebook (auth, pages, sync)              |
| Outros       | ~40+ | CRM, chat, webhooks, validacoes, testes             |

## Diretorio Compartilhado

`_shared/` contem utilities reutilizaveis entre funcoes.

## Boilerplate Padrao

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Logica...
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

## JWT Verification (`config.toml`)

- `verify_jwt = true` (padrao): Funcoes autenticadas (~280+)
- `verify_jwt = false`: Webhooks e tarefas agendadas (~60+)
  - Exemplos: `whatsapp-webhook`, `daily-ad-generator`, `discord-bot`

## Env Vars Disponiveis

- `SUPABASE_URL` — URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY` — Chave com acesso total ao banco
- `SUPABASE_ANON_KEY` — Chave anonima (para auth user-aware)

## Regras ao Editar

1. **CORS** — Sempre incluir `corsHeaders` e handler de OPTIONS
2. **Response format** — Sempre `{ success: boolean, data/error }`
3. **config.toml** — Adicionar entrada para novas funcoes
4. **Imports** — Usar `https://esm.sh/` para npm packages, `https://deno.land/` para Deno stdlib
5. **Error handling** — try/catch com `console.error()` e response 500
6. **Service Role** — Usar SERVICE_ROLE_KEY para operacoes backend; ANON_KEY + Authorization header para user-aware
