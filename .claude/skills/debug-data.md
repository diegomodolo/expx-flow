# /debug-data

## Descricao

Diagnostica problemas de dados que nao aparecem no frontend. Segue uma sequencia sistematica para identificar a causa raiz (RLS, GRANT, company_id errado, etc).

## Inputs

- `tabela`: Nome da tabela com problema (obrigatorio). Ex: `user_reports`
- `company_id`: Company ID esperado (opcional). Se nao fornecido, busca do contexto.

## Steps

### 1. Verificar se existem dados na tabela (bypassando RLS)

Criar edge function temporaria `supabase/functions/debug-table/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { table_name, company_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // Bypassa RLS
    );

    // 1. Total de registros na tabela
    const { count: totalCount } = await supabase
      .from(table_name)
      .select("*", { count: "exact", head: true });

    // 2. Registros para o company_id especifico
    let companyCount = null;
    let sampleData = null;
    if (company_id) {
      const { count } = await supabase
        .from(table_name)
        .select("*", { count: "exact", head: true })
        .eq("company_id", company_id);
      companyCount = count;

      const { data } = await supabase
        .from(table_name)
        .select("*")
        .eq("company_id", company_id)
        .limit(3);
      sampleData = data;
    }

    // 3. Company IDs distintos na tabela
    const { data: allData } = await supabase
      .from(table_name)
      .select("company_id")
      .limit(100);
    const distinctCompanyIds = [...new Set(allData?.map(r => r.company_id))];

    // 4. Verificar GRANTs
    const { data: grants } = await supabase.rpc('exec_sql', {
      sql: `SELECT grantee, privilege_type FROM information_schema.table_privileges WHERE table_name = '${table_name}' AND grantee = 'authenticated'`
    }).catch(() => ({ data: null }));

    return new Response(JSON.stringify({
      success: true,
      diagnostico: {
        total_registros: totalCount,
        registros_company_id: companyCount,
        company_ids_encontrados: distinctCompanyIds,
        company_id_buscado: company_id,
        grants_authenticated: grants,
        amostra_dados: sampleData,
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

### 2. Deploy e testar

```bash
supabase functions deploy debug-table
```

Chamar a funcao com os parametros e analisar o resultado.

### 3. Diagnostico baseado no resultado

| Situacao | Causa Provavel | Solucao |
|----------|---------------|---------|
| total_registros = 0 | Tabela vazia, dados nao foram inseridos | Verificar mutation/insert |
| total > 0, company_count = 0 | company_id errado nos registros | UPDATE para corrigir, verificar se usa `activeCompany.company_id` |
| company_count > 0, mas frontend mostra 0 | RLS bloqueando ou GRANT faltando | Verificar policies e GRANT |
| grants vazio | Falta GRANT | `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tabela> TO authenticated` |
| Policy usa subquery em company_members | RLS nested falha silenciosa | Recriar policy com SECURITY DEFINER |

### 4. Limpar apos debug

```bash
rm -rf supabase/functions/debug-table
```

## Quando usar

- Dados inseridos mas nao aparecem na tela
- Frontend mostra lista vazia sem erro
- Suspicion de RLS ou GRANT incorreto
- Company ID mismatch
