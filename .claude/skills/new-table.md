# /new-table

## Descricao

Cria uma nova tabela no Supabase com RLS seguro (SECURITY DEFINER), GRANTs, e migration completa. Previne os erros silenciosos mais comuns.

## Inputs

- `nome`: Nome da tabela em snake_case (obrigatorio). Ex: `user_reports`
- `campos`: Lista de campos adicionais (obrigatorio). Ex: `title TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'aberto'`
- `tem_user`: Se a tabela rastreia o usuario criador (opcional, default: true)

## Steps

### 1. Criar migration

Criar arquivo `supabase/migrations/<timestamp>_create_<nome>.sql`:

```sql
-- ============================================
-- Tabela: <nome>
-- ============================================

-- 1. Criar tabela
CREATE TABLE public.<nome> (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),  -- se tem_user = true
  <campos>,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index para performance (company_id e sempre filtrado)
CREATE INDEX idx_<nome>_company_id ON public.<nome>(company_id);

-- 3. RLS
ALTER TABLE public.<nome> ENABLE ROW LEVEL SECURITY;

-- 4. Policies usando SECURITY DEFINER (NUNCA subquery direta em company_members!)
--    A funcao get_user_company_ids ja existe no banco.
CREATE POLICY "<nome>_select" ON public.<nome> FOR SELECT
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "<nome>_insert" ON public.<nome> FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "<nome>_update" ON public.<nome> FOR UPDATE
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "<nome>_delete" ON public.<nome> FOR DELETE
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

-- 5. GRANT OBRIGATORIO (sem isso, frontend recebe array vazio sem erro!)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<nome> TO authenticated;
```

### 2. Verificar se get_user_company_ids existe

Se for a primeira tabela do projeto com esse padrao, criar a funcao:

```sql
CREATE OR REPLACE FUNCTION public.get_user_company_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM company_members WHERE user_id = p_user_id;
$$;
```

### 3. Aplicar migration

Opcao A — via CLI:
```bash
supabase db push
```

Opcao B — via SQL Editor (se CLI nao funcionar):
Copiar o SQL e executar diretamente no Supabase SQL Editor.

### 4. Criar hook de dados no frontend

Criar `src/hooks/use<NomePascal>.ts` seguindo o padrao do projeto:

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface <NomePascal> {
  id: string;
  company_id: string;
  user_id: string;
  // ... campos da tabela
  created_at: string;
  updated_at: string;
}

export function use<NomePascal>(companyId: string | undefined) {
  return useQuery({
    queryKey: ["<nome-kebab>", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("<nome>")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as <NomePascal>[];
    },
    enabled: !!companyId,
  });
}
```

## Erros que este skill previne

| Erro | Como previne |
|------|-------------|
| Dados nao aparecem (0 rows) | Usa SECURITY DEFINER em vez de subquery |
| Frontend recebe [] sem erro | Inclui GRANT TO authenticated |
| RLS falha silenciosa | Nao faz subquery em company_members |
| Query lenta | Cria index em company_id |
| company_id errado | Template usa `companyId` parametrizado |

## Checklist

- [ ] Tabela criada com todos campos
- [ ] RLS habilitado
- [ ] Policies usando `get_user_company_ids()` (SECURITY DEFINER)
- [ ] GRANT para authenticated
- [ ] Index em company_id
- [ ] Migration aplicada
- [ ] Hook frontend com `enabled: !!companyId`
