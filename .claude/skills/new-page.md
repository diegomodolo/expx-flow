# /new-page

## Descricao

Cria uma nova pagina no Expx Flow com routing, guard de permissao, e estrutura padrao.

## Inputs

- `nome`: Nome da pagina em PascalCase (obrigatorio). Ex: `GerenciadorLeads`
- `rota`: Path da rota (obrigatorio). Ex: `/gerenciador-leads`
- `permissao`: MenuItemType para permissao (opcional). Se omitido, rota e apenas autenticada
- `titulo`: Titulo da pagina em Portugues (obrigatorio). Ex: `Gerenciador de Leads`

## Steps

### 1. Criar arquivo da pagina

Criar `src/pages/<Nome>.tsx`:

```typescript
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const <Nome> = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold"><Titulo></h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><Titulo></CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Conteudo em construcao...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default <Nome>;
```

### 2. Adicionar rota em App.tsx

Importar a pagina (lazy ou direto) e adicionar a rota no local apropriado:

**Se tem permissao:**

```typescript
<Route path="<rota>" element={
  <ProtectedRoute>
    <PermissionProtectedRoute requiredPermission="<permissao>">
      <Nome />
    </PermissionProtectedRoute>
  </ProtectedRoute>
} />
```

**Se nao tem permissao (apenas auth):**

```typescript
<Route path="<rota>" element={
  <ProtectedRoute>
    <Nome />
  </ProtectedRoute>
} />
```

### 3. Adicionar ao menu (se necessario)

Se a pagina deve aparecer na sidebar, adicionar entrada no componente de navegacao em `src/components/dashboard/DashboardSidebar.tsx`.

### 4. Verificar

- Rodar `npm run build` para verificar TypeScript
- Acessar a rota no navegador
- Verificar que guard de permissao funciona

## Checklist de Qualidade

- [ ] Arquivo em `src/pages/` com export default
- [ ] Rota adicionada em `App.tsx` na posicao correta
- [ ] Guard correto (ProtectedRoute e/ou PermissionProtectedRoute)
- [ ] Imports usam `@/`
- [ ] Titulo e textos em Portugues
- [ ] Build passa sem erros
