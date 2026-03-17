# /validate-permissions

## Descricao

Valida consistencia entre rotas protegidas (App.tsx), items do sidebar (DashboardSidebar.tsx) e tipo de permissoes (useEmployeePermissions.tsx). Detecta mismatches que causam "Acesso Negado" indevido.

## Steps

### 1. Ler as 3 fontes de verdade

Ler os seguintes arquivos e extrair dados estruturados:

- **`src/App.tsx`** — Extrair TODOS os pares `path` + `requiredPermission` de `<PermissionProtectedRoute>`. Procurar o pattern:

  ```
  <Route path="<URL>" element={<PermissionProtectedRoute requiredPermission="<PERM>">
  ```

- **`src/components/dashboard/DashboardSidebar.tsx`** — Extrair TODOS os pares `url` + `permission` dos menu items. Procurar o pattern:

  ```
  { title: "...", url: "<URL>", icon: ..., permission: "<PERM>" as MenuItemType }
  ```

- **`src/hooks/useEmployeePermissions.tsx`** — Extrair o union type completo `MenuItemType`. Procurar o pattern:
  ```
  export type MenuItemType = "dashboard" | "clientes" | ...
  ```

### 2. Cruzar dados e detectar problemas

Para cada item do sidebar que tem uma URL (ignorar URLs com `#`):

1. **Procurar a URL correspondente nas rotas do App.tsx** (normalizar: ignorar parametros `:id`, comparar path base)
2. **Se encontrou**: comparar `sidebar.permission` com `route.requiredPermission`
   - Se diferentes → **MISMATCH** (CRITICO)
   - Se iguais → OK
3. **Se nao encontrou**: verificar se e uma rota sem PermissionProtectedRoute
   - Se nao existe nenhuma rota → **MISSING_ROUTE** (ALTO)

Para cada permissao usada em rotas ou sidebar: 4. **Verificar se existe no MenuItemType**

- Se nao existe → **UNDEFINED_PERM** (CRITICO)

Para cada permissao no MenuItemType: 5. **Verificar se e usada em alguma rota ou sidebar**

- Se nao usada → **UNUSED_PERM** (INFO)

### 3. Gerar relatorio

Apresentar resultado em formato tabela markdown:

```markdown
## Validacao de Permissoes

### CRITICO — Corrigir imediatamente

| URL | Sidebar Permission | Route Permission | Acao Sugerida |
| --- | ------------------ | ---------------- | ------------- |

### ALTO — Verificar

| URL | Sidebar Permission | Tem rota? | Acao Sugerida |
| --- | ------------------ | --------- | ------------- |

### INFO — Apenas informativo

| Permissao | Status | Detalhes |
| --------- | ------ | -------- |

### Resumo

- Total rotas protegidas: X
- Total items sidebar: X
- Total permissoes definidas: X
- Problemas criticos: X
- Problemas altos: X
```

### 4. Sugerir correcoes

Para cada MISMATCH ou MISSING_ROUTE, sugerir a correcao especifica:

- Qual arquivo editar
- Qual valor trocar por qual
- **Regra: a permissao do sidebar e a fonte de verdade** (e o que o admin configura), a rota deve alinhar com ela

### 5. Aplicar correcoes (se solicitado)

Se o usuario pedir para corrigir, editar `src/App.tsx` trocando o `requiredPermission` nas rotas com MISMATCH. **Nunca alterar o sidebar** — o sidebar reflete o que o admin configurou.

Apos correcoes:

- `npm run build` para verificar
- Re-rodar validacao para confirmar zero problemas criticos

## Checklist de Qualidade

- [ ] Todas as URLs do sidebar (exceto `#hash`) tem rota correspondente
- [ ] Todas as rotas protegidas usam mesma permissao que o sidebar
- [ ] Todas as permissoes usadas existem no MenuItemType
- [ ] Zero items CRITICO no relatorio
- [ ] Build passa sem erros
