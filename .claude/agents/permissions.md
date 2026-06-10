---
name: permissions
description: "Use para validar consistencia entre rotas (App.tsx), sidebar (DashboardSidebar.tsx) e permissoes (useEmployeePermissions.tsx), e debugar Acesso Negado indevido"
---

# Permissions — Contexto Especializado

## Escopo

Validacao de consistencia entre rotas (App.tsx), sidebar (DashboardSidebar.tsx) e sistema de permissoes (useEmployeePermissions.tsx). Detecta mismatches que causam "Acesso Negado" para usuarios com permissoes corretas.

## Arquivos-chave

| Arquivo                                                | Funcao                                                |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `src/App.tsx`                                          | Rotas + PermissionProtectedRoute (requiredPermission) |
| `src/components/dashboard/DashboardSidebar.tsx`        | Menu items com url + permission                       |
| `src/hooks/useEmployeePermissions.tsx`                 | Tipo MenuItemType (todas as permissoes validas)       |
| `src/components/PermissionProtectedRoute.tsx`          | Componente que enforces permissao nas rotas           |
| `src/components/settings/PermissionsSettings.tsx`      | UI de gestao de permissoes individuais                |
| `src/components/settings/PermissionGroupsSettings.tsx` | UI de gestao de grupos de permissao                   |

## Procedimento de Validacao

### 1. Extrair dados das 3 fontes

**App.tsx** — Buscar todos os pares:

```
<Route path="<URL>" element={
  <PermissionProtectedRoute requiredPermission="<PERM>">
```

**DashboardSidebar.tsx** — Buscar todos os pares:

```
{ url: "<URL>", permission: "<PERM>" as MenuItemType }
```

**useEmployeePermissions.tsx** — Extrair o union type `MenuItemType`:

```
export type MenuItemType = "dashboard" | "clientes" | ...
```

### 2. Cruzar e classificar

| Categoria       | Descricao                                                | Severidade |
| --------------- | -------------------------------------------------------- | ---------- |
| MISMATCH        | Sidebar e rota usam permissoes diferentes para mesma URL | CRITICO    |
| MISSING_ROUTE   | Sidebar item sem rota protegida no App.tsx               | ALTO       |
| MISSING_SIDEBAR | Rota protegida sem item no sidebar                       | INFO       |
| UNDEFINED_PERM  | Permissao usada mas nao definida no MenuItemType         | CRITICO    |
| UNUSED_PERM     | Permissao no MenuItemType mas nunca usada                | INFO       |

### 3. Formato de output

```markdown
## Resultado da Validacao de Permissoes

### CRITICO (requer correcao imediata)

| URL       | Sidebar Permission | Route Permission | Acao                               |
| --------- | ------------------ | ---------------- | ---------------------------------- |
| /reunioes | reunioes           | squad            | Corrigir rota para usar `reunioes` |

### ALTO (verificar)

| URL | Sidebar Permission | Existe no App.tsx? |
| --- | ------------------ | ------------------ |

### INFO (nao requer acao)

...
```

## Regras

1. **Ignorar URLs com `#`** (hash links como `#tv-dashboard`) — sao modais/dialogs, nao rotas
2. **Ignorar rotas sem PermissionProtectedRoute** — sao rotas publicas ou apenas autenticadas
3. **Normalizar URLs**: remover parametros dinamicos (`:id`, `:token`) para matching
4. **Permissoes default** (`dashboard`, `tarefas`) — nao precisam de PermissionProtectedRoute
5. **Rotas filhas** (ex: `/relatorios/executivo`) podem herdar permissao do pai se compativel

## Erros Historicos

| Data       | URL         | Problema                           | Causa                    |
| ---------- | ----------- | ---------------------------------- | ------------------------ |
| 2026-03-17 | `/reunioes` | Sidebar: `reunioes`, Rota: `squad` | Permissao errada na rota |

## Quando usar este agent

- Apos criar/modificar paginas em App.tsx
- Apos alterar sidebar em DashboardSidebar.tsx
- Apos adicionar novas permissoes
- Como parte de code review de PRs que tocam rotas/permissoes
- Quando usuario reporta "Acesso Negado" inesperado
