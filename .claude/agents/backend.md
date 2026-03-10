# Backend (Supabase) — Contexto Especializado

## Escopo

Edge Functions (Deno runtime), migrations PostgreSQL, RLS policies, e configuracao do Supabase.

## Arquivos-chave

| Arquivo                               | Funcao                                      |
| ------------------------------------- | ------------------------------------------- |
| `supabase/functions/`                 | ~215 Edge Functions organizadas por dominio |
| `supabase/migrations/`                | ~490 migrations SQL incrementais            |
| `supabase/config.toml`                | JWT verification por funcao                 |
| `src/integrations/supabase/client.ts` | Cliente Supabase (frontend)                 |
| `src/integrations/supabase/types.ts`  | Tipos auto-gerados (nao editar)             |

## Categorias de Edge Functions

| Prefixo      | Quantidade | Descricao                                 |
| ------------ | ---------- | ----------------------------------------- |
| `generate-*` | ~34        | Geracao IA (campanhas, criativos, slides) |
| `fetch-*`    | ~12        | Busca dados de APIs externas              |
| `manage-*`   | ~10        | Operacoes administrativas                 |
| `google-*`   | ~9         | Integracao Google Ads                     |
| `daily-*`    | ~8         | Tarefas agendadas diarias                 |
| `create-*`   | ~8         | Criacao de recursos (campanhas, ads)      |
| `send-*`     | ~7         | Envio de notificacoes/mensagens           |
| `analyze-*`  | ~6         | Analise e IA                              |
| `whatsapp-*` | ~5         | Operacoes WhatsApp                        |
| `facebook-*` | ~5         | Operacoes Facebook                        |

## Patterns Obrigatorios

### Edge Function Padrao

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // SEMPRE tratar OPTIONS para CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validacao de campos obrigatorios
    if (!body.requiredField) {
      return new Response(
        JSON.stringify({ success: false, error: "Campo obrigatorio ausente" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Cliente Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Logica de negocio...

    return new Response(JSON.stringify({ success: true, data: resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in funcao-nome:", error);
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

### Auth em Edge Functions

```typescript
// Para funcoes que verificam JWT do usuario:
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
);
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
```

### config.toml — JWT Verification

```toml
# Funcoes publicas (webhooks, scheduled):
[functions.whatsapp-webhook]
verify_jwt = false

# Funcoes autenticadas (padrao):
[functions.fetch-facebook-pages]
verify_jwt = true
```

### Response Format

```typescript
// Sucesso:
{ success: true, data: { ... } }

// Erro:
{ success: false, error: "Mensagem descritiva" }
```

## Erros Comuns e Solucoes

| Erro                   | Causa                            | Solucao                                                      |
| ---------------------- | -------------------------------- | ------------------------------------------------------------ |
| CORS bloqueado         | Falta OPTIONS handler            | Adicionar check `req.method === "OPTIONS"`                   |
| 401 Unauthorized       | JWT verification ativo sem token | Configurar `verify_jwt = false` em config.toml se webhook    |
| Tipos nao reconhecidos | Deno nao encontra modulo         | Usar `https://esm.sh/` ou `https://deno.land/`               |
| Env var undefined      | Nome errado                      | Usar exatamente: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

## Checklist antes de submeter

- [ ] CORS headers incluidos (corsHeaders constant)
- [ ] OPTIONS request tratado
- [ ] Campos obrigatorios validados com status 400
- [ ] try/catch com erro logado no console
- [ ] Response format consistente (`{ success, data/error }`)
- [ ] config.toml atualizado se nova funcao
- [ ] Env vars acessadas via `Deno.env.get()`
