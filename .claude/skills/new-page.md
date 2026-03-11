# /new-page

## Descricao

Cria uma nova pagina completa no Expx Flow com DashboardLayout, routing, guard de permissao, hook de dados, e registro de permissao.

## Inputs

- `nome`: Nome da pagina em PascalCase (obrigatorio). Ex: `GerenciadorLeads`
- `rota`: Path da rota (obrigatorio). Ex: `/gerenciador-leads`
- `permissao`: Key para o sistema de permissoes (obrigatorio). Ex: `gerenciador-leads`
- `titulo`: Titulo da pagina em Portugues (obrigatorio). Ex: `Gerenciador de Leads`
- `tabela`: Nome da tabela Supabase se for CRUD (opcional). Ex: `leads`

## Steps

### 1. Criar arquivo da pagina

Criar `src/pages/<Nome>.tsx`:

**OBRIGATORIO: DashboardLayout + activeCompany.company_id**

```typescript
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useCompany } from "@/contexts/CompanyContext";

const <Nome> = () => {
  const { activeCompany } = useCompany();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold"><Titulo></h1>
            <p className="text-sm text-muted-foreground">Descricao da pagina</p>
          </div>
        </div>

        {/* Conteudo */}
      </div>
    </DashboardLayout>
  );
};

export default <Nome>;
```

### 2. Criar hook de dados (se tiver tabela)

Criar `src/hooks/use<Entidade>.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface <Entidade> {
  id: string;
  company_id: string;
  // ... campos
  created_at: string;
}

export function use<Entidade>(companyId: string | undefined) {
  return useQuery({
    queryKey: ["<entidade>", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("<tabela>")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as <Entidade>[];
    },
    enabled: !!companyId,
  });
}
```

**CRITICO:** Usar `companyId` vindo de `activeCompany.company_id`, NUNCA de `.id`.

### 3. Adicionar rota em App.tsx

```typescript
import <Nome> from "@/pages/<Nome>";

<Route path="<rota>" element={
  <ProtectedRoute>
    <PermissionProtectedRoute requiredPermission="<permissao>">
      <<Nome> />
    </PermissionProtectedRoute>
  </ProtectedRoute>
} />
```

### 4. Registrar permissao (3 LUGARES OBRIGATORIOS)

#### 4.1 SQL no Supabase (FAZER PRIMEIRO)
```sql
ALTER TYPE menu_item_type ADD VALUE '<permissao>';
```

#### 4.2 PermissionGroupsSettings.tsx
Adicionar no array `MENU_ITEMS` na categoria correta:
```typescript
{ key: '<permissao>', label: '<Titulo>', category: 'Sistema' },
```

#### 4.3 PermissionsSettings.tsx
Adicionar no array `MENU_ITEMS` na categoria correta:
```typescript
{ key: '<permissao>', label: '<Titulo>', description: 'Descricao da funcionalidade', category: 'Sistema' },
```

**Se pular o passo 4.1, ao tentar ativar a permissao vai dar erro: `invalid input value for enum menu_item_type`**

### 5. Adicionar ao sidebar (se necessario)

Editar `src/components/dashboard/DashboardSidebar.tsx` e adicionar item de menu com icone e rota.

### 6. SQL para tabela (se tiver tabela)

```sql
-- Criar tabela
CREATE TABLE public.<tabela> (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  -- campos especificos
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS com SECURITY DEFINER (NUNCA subquery direta em company_members!)
ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_company" ON public.<tabela> FOR SELECT
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "insert_own_company" ON public.<tabela> FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "update_own_company" ON public.<tabela> FOR UPDATE
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "delete_own_company" ON public.<tabela> FOR DELETE
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

-- GRANT OBRIGATORIO (sem isso, frontend recebe 0 rows sem erro!)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tabela> TO authenticated;
```

### 7. Verificar

- `npm run build` sem erros
- Acessar a rota no navegador
- Verificar DashboardLayout (sidebar + header visiveis)
- Verificar guard de permissao funciona

## Checklist de Qualidade

- [ ] **Pagina envolvida com `<DashboardLayout>`**
- [ ] **Usando `activeCompany.company_id`** (NUNCA `.id`)
- [ ] Hook com `enabled: !!companyId`
- [ ] Rota em App.tsx com PermissionProtectedRoute
- [ ] Enum `menu_item_type` atualizado no banco
- [ ] Permissao em PermissionGroupsSettings.tsx
- [ ] Permissao em PermissionsSettings.tsx
- [ ] Tabela com RLS usando SECURITY DEFINER (nao subquery direta)
- [ ] GRANT aplicado para role authenticated
- [ ] Imports usam `@/`
- [ ] Textos em Portugues
- [ ] Build passa sem erros
