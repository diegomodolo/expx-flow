---
description: Adiciona nova permissao nos 3 lugares obrigatorios (enum DB + PermissionGroupsSettings + PermissionsSettings)
argument-hint: <key> <label> <descricao> [categoria]
---

# /add-permission

## Descricao

Adiciona uma nova permissao ao sistema. Atualiza os 3 lugares obrigatorios (enum DB, PermissionGroupsSettings, PermissionsSettings) para evitar o erro `invalid input value for enum menu_item_type`.

## Inputs

- `key`: Chave da permissao em kebab-case (obrigatorio). Ex: `gerenciador-leads`
- `label`: Label visivel em Portugues (obrigatorio). Ex: `Gerenciador de Leads`
- `descricao`: Descricao da funcionalidade (obrigatorio). Ex: `Gerenciar e enriquecer leads`
- `categoria`: Categoria no menu de permissoes (opcional, default: `Sistema`). Opcoes: `Gestao`, `Marketing & Trafego`, `Sistema`, `Especial`

## Steps

### 1. SQL no Supabase (FAZER PRIMEIRO!)

Executar no SQL Editor do Supabase:

```sql
ALTER TYPE menu_item_type ADD VALUE '<key>';
```

**Se este passo for pulado, os passos 2 e 3 vao funcionar no frontend, mas ao tentar ATIVAR a permissao para um usuario vai dar erro: `invalid input value for enum menu_item_type: "<key>"`**

### 2. Adicionar em PermissionGroupsSettings.tsx

Editar `src/components/settings/PermissionGroupsSettings.tsx`, adicionar no array `MENU_ITEMS` na categoria `<categoria>`:

```typescript
{ key: '<key>', label: '<label>', category: '<categoria>' },
```

### 3. Adicionar em PermissionsSettings.tsx

Editar `src/components/settings/PermissionsSettings.tsx`, adicionar no array `MENU_ITEMS` na categoria `<categoria>`:

```typescript
{ key: '<key>', label: '<label>', description: '<descricao>', category: '<categoria>' },
```

### 4. Proteger rota em App.tsx (se ainda nao tiver)

```typescript
<Route path="/<rota>" element={
  <ProtectedRoute>
    <PermissionProtectedRoute requiredPermission="<key>">
      <Pagina />
    </PermissionProtectedRoute>
  </ProtectedRoute>
} />
```

### 5. Verificar

- `npm run build` sem erros
- Acessar Configuracoes > Permissoes
- Verificar que a nova permissao aparece na categoria correta
- Testar ativar/desativar a permissao (deve funcionar sem erro de enum)

## Ordem dos 3 Lugares (CRITICA)

```
1. Banco (ALTER TYPE) ──primeiro──> 2. PermissionGroupsSettings ──> 3. PermissionsSettings
```

**Nunca fazer 2 e 3 sem ter feito 1. O frontend vai mostrar a permissao, mas ao clicar vai dar erro.**

## Checklist

- [ ] `ALTER TYPE menu_item_type ADD VALUE '<key>'` executado no banco
- [ ] Entrada adicionada em PermissionGroupsSettings.tsx (MENU_ITEMS)
- [ ] Entrada adicionada em PermissionsSettings.tsx (MENU_ITEMS)
- [ ] Rota protegida com PermissionProtectedRoute
- [ ] Build passa sem erros
- [ ] Permissao ativa/desativa sem erro na UI
