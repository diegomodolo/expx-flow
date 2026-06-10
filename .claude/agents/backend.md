---
name: backend
description: "Use para Edge Functions (Deno), migrations PostgreSQL, RLS policies e configuracao do Supabase"
---

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

## RLS — Cuidados Criticos

**NUNCA fazer subquery direta em tabela com RLS dentro de uma policy.** Usar funcao SECURITY DEFINER:

```sql
-- Funcao reutilizavel (ja existe no banco):
CREATE OR REPLACE FUNCTION public.get_user_company_ids(p_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM company_members WHERE user_id = p_user_id; $$;

-- Usar na policy:
CREATE POLICY "select" ON minha_tabela FOR SELECT
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));
```

**SEMPRE adicionar GRANT apos criar tabela:**

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.minha_tabela TO authenticated;
```

Sem GRANT, o frontend recebe array vazio sem erro.

## Erros Comuns e Solucoes

| Erro                   | Causa                                     | Solucao                                                   |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------- |
| CORS bloqueado         | Falta OPTIONS handler                     | Adicionar check `req.method === "OPTIONS"`                |
| 401 Unauthorized       | JWT verification ativo sem token          | Configurar `verify_jwt = false` em config.toml se webhook |
| Tipos nao reconhecidos | Deno nao encontra modulo                  | Usar `https://esm.sh/` ou `https://deno.land/`            |
| Env var undefined      | Nome errado ou secret nao propagou        | Usar fallback hardcoded para valores criticos             |
| 0 rows sem erro        | RLS com subquery nested ou GRANT faltando | Usar SECURITY DEFINER + GRANT TO authenticated            |
| Enum invalido          | Valor nao existe no enum do banco         | `ALTER TYPE nome_enum ADD VALUE 'novo-valor'`             |

## Checklist antes de submeter

- [ ] CORS headers incluidos (corsHeaders constant)
- [ ] OPTIONS request tratado
- [ ] Campos obrigatorios validados com status 400
- [ ] try/catch com erro logado no console
- [ ] Response format consistente (`{ success, data/error }`)
- [ ] config.toml atualizado se nova funcao
- [ ] Env vars acessadas via `Deno.env.get()` com fallback para valores criticos
- [ ] Nova tabela tem RLS com SECURITY DEFINER (nunca subquery em tabela com RLS)
- [ ] GRANT aplicado para role authenticated
- [ ] Enums atualizados no banco se necessario (menu_item_type, etc.)
- [ ] Deploy executado: `supabase functions deploy nome-funcao` (um por vez)
