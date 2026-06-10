---
name: new-edge-function
description: "Use ao criar uma nova Edge Function Supabase: boilerplate com CORS, validacao, config.toml e hook frontend"
---

# new-edge-function (Playbook)

## Descricao

Cria uma nova Edge Function no Supabase com boilerplate completo, CORS, validacao, e config.toml.

## Inputs

- `nome`: Nome da funcao em kebab-case (obrigatorio). Ex: `fetch-lead-data`
- `auth`: Se requer autenticacao (opcional, default: true). Opcoes: `true`, `false`
- `descricao`: Descricao curta da funcao (obrigatorio). Ex: `Busca dados de leads por empresa`

## Steps

### 1. Criar diretorio e arquivo

Criar `supabase/functions/<nome>/index.ts`:

**Se auth = true (padrao):**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validacao de campos obrigatorios
    if (!body.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: "company_id e obrigatorio" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Cliente Supabase com service_role (bypassa RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Logica de negocio
    // ...

    return new Response(JSON.stringify({ success: true, data: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in <nome>:", error);
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

**Se auth = false (webhook/scheduled):**

Mesmo boilerplate, mas sem validacao de auth header.

### 2. Atualizar config.toml

Adicionar em `supabase/config.toml`:

```toml
[functions.<nome>]
verify_jwt = <true|false>
```

### 3. Configurar secrets (se necessario)

Se a funcao usa secrets externos (API keys, tokens):

```bash
supabase secrets set MINHA_SECRET=valor
```

**CRITICO:** Secrets podem falhar silenciosamente. SEMPRE adicionar fallback:

```typescript
const apiKey = Deno.env.get("MINHA_API_KEY") || "fallback-se-necessario";

// Log para debug:
console.log("Debug - API_KEY present:", !!Deno.env.get("MINHA_API_KEY"));
```

### 4. Deploy

```bash
supabase functions deploy <nome>
```

**UM deploy por vez. Nao juntar multiplos deploys num unico comando.**

### 5. Criar hook de chamada no frontend (se chamada pelo cliente)

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function use<NomePascal>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { company_id: string /* ... */ }) => {
      const { data, error } = await supabase.functions.invoke("<nome>", {
        body: payload,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");
      return data.data;
    },
    onSuccess: () => {
      toast.success("Operacao realizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["related-query"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
```

## Checklist de Qualidade

- [ ] CORS headers incluidos (corsHeaders + OPTIONS handler)
- [ ] Campos obrigatorios validados com status 400
- [ ] try/catch com `console.error` e response 500
- [ ] Response format: `{ success: true/false, data/error }`
- [ ] config.toml atualizado com verify_jwt correto
- [ ] Secrets com fallback hardcoded para valores criticos
- [ ] Deploy executado: `supabase functions deploy <nome>`
- [ ] Hook frontend com toast em Portugues
