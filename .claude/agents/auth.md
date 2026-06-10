---
name: auth
description: "Use para autenticacao Supabase, sistema de permissoes, roles, route guards e CRM auth isolado"
---

# Auth — Contexto Especializado

> **Rules obrigatorias:** carregar `.claude/rules/global.md` + `.claude/rules/auth-permissions.md` antes de trabalhar. Ao concluir, reportar o resultado ao agente `orquestrador` (nao delegar diretamente a outros agentes).

## Escopo

Autenticacao Supabase, sistema de permissoes, roles, route guards, e CRM auth isolado.

## Arquivos-chave

| Arquivo                                       | Funcao                                          |
| --------------------------------------------- | ----------------------------------------------- |
| `src/hooks/useAuth.tsx`                       | AuthProvider + hook `useAuth()` (Supabase Auth) |
| `src/hooks/useEmployeePermissions.tsx`        | Hook de permissoes (56 tipos)                   |
| `src/hooks/usePermissionGroups.tsx`           | CRUD de grupos de permissao                     |
| `src/contexts/CRMAuthContext.tsx`             | Auth separado para modulo CRM                   |
| `src/contexts/CompanyContext.tsx`             | Contexto de empresa ativa                       |
| `src/components/ProtectedRoute.tsx`           | Route guard (auth apenas)                       |
| `src/components/PermissionProtectedRoute.tsx` | Route guard (auth + permissao)                  |

## Fluxo de Autenticacao

```
Usuario visita rota protegida
  → ProtectedRoute: useAuth() → user existe?
    → Nao: Navigate(/auth)
    → Sim: PermissionProtectedRoute?
      → useEmployeePermissions() → isOwner?
        → Sim: Acesso total
        → Nao: hasPermission(requiredPermission)?
          → Sim: Renderizar
          → Nao: Tela "Acesso Negado"
```

## Patterns Obrigatorios

### Proteger nova rota em App.tsx

```typescript
// Rota apenas autenticada:
<Route path="/minha-rota" element={
  <ProtectedRoute>
    <MinhaPage />
  </ProtectedRoute>
} />

// Rota com permissao especifica:
<Route path="/minha-rota" element={
  <ProtectedRoute>
    <PermissionProtectedRoute requiredPermission="minha-permissao">
      <MinhaPage />
    </PermissionProtectedRoute>
  </ProtectedRoute>
} />
```

### Verificar permissao em componente

```typescript
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

const MeuComponente = () => {
  const { hasPermission, isOwner } = useEmployeePermissions();

  // Owners sempre tem acesso
  if (!hasPermission("campanhas")) return null;

  return <div>Conteudo restrito</div>;
};
```

### Acessar usuario autenticado

```typescript
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";

const MeuComponente = () => {
  const { user, session } = useAuth();
  const { activeCompany } = useCompany();

  // user.id — ID do usuario Supabase
  // activeCompany.company_id — Empresa ativa
};
```

## 56 Permissoes Disponiveis

```typescript
type MenuItemType =
  | "dashboard"
  | "clientes"
  | "campanhas"
  | "squad"
  | "tarefas"
  | "colaboradores"
  | "relatorios"
  | "gerador-campanhas"
  | "gerador-conteudo"
  | "gerador-criativos"
  | "geradores"
  | "ia"
  | "configuracoes"
  | "agentes-ia"
  | "editar-agentes"
  | "editor-funil"
  | "whatsapp"
  | "ver-quadros-outros"
  | "radar-saude"
  | "rotinas"
  | "lead-intelligence"
  | "cs-cockpit"
  | "cs-carteira"
  | "cs-jornada"
  | "cs-acoes"
  | "cs-clientes"
  | "cs-tv"
  | "agendamento"
  | "automatizadores"
  | "social-tv"
  | "editor-imagens"
  | "planejador-conteudo"
  | "repositorio-criativos"
  | "alertas"
  | "tarefas-recorrentes"
  | "workspace"
  | "automacoes"
  | "campanhas-unificadas"
  | "marketing-tv"
  | "keyword-planner"
  | "radar-tv"
  | "relatorios-marketing"
  | "skills-ia"
  | "editar-skills"
  | "roteiros"
  | "command-center"
  | "reunioes"
  | "planner"
  | "checklists"
  | "fluxos"
  | "mapas-mentais"
  | "dashboard-equipe"
  | "groupops"
  | "youtube-content-lab"
  | "squads-ia"
  | "parametros-performance";
```

**Permissoes default (sempre acessiveis):** `dashboard`, `tarefas`

## Tabelas do banco envolvidas

| Tabela                     | Funcao                                         |
| -------------------------- | ---------------------------------------------- |
| `auth.users`               | Usuarios Supabase (built-in)                   |
| `employees`                | Colaboradores vinculados a usuarios            |
| `company_members`          | Membros de empresa + role (owner/collaborator) |
| `employee_permissions`     | Permissoes individuais (is_enabled boolean)    |
| `permission_groups`        | Grupos nomeados de permissoes                  |
| `permission_group_items`   | Menu items em cada grupo                       |
| `permission_group_members` | Colaboradores em cada grupo                    |

## CRM Auth (Sistema separado)

```typescript
// CRM tem auth proprio via CRMAuthContext
interface CRMUser {
  id: string;
  email: string;
  full_name: string;
  workspace_id: string;
  role: "admin" | "collaborator";
}

// Login CRM chama Edge Function crm-auth
// Sessao armazenada em localStorage (crm_session)
```

## Adicionar Nova Permissao — 4 Passos Obrigatorios

**Todos os 4 passos devem ser feitos. Pular qualquer um causa erro.**

1. **Banco:** `ALTER TYPE menu_item_type ADD VALUE 'nova-permissao';`
2. **PermissionGroupsSettings.tsx:** Adicionar em `MENU_ITEMS[]`
3. **PermissionsSettings.tsx:** Adicionar em `MENU_ITEMS[]`
4. **App.tsx:** `<PermissionProtectedRoute requiredPermission="nova-permissao">`

**Erro se pular passo 1:** `invalid input value for enum menu_item_type: "nova-permissao"`

## Erros Comuns e Solucoes

| Erro                        | Causa                                             | Solucao                                       |
| --------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Redirect loop em /auth      | ProtectedRoute sem loading check                  | Verificar `if (loading) return spinner`       |
| Owner sem acesso            | Checando permissao antes de isOwner               | Sempre checar `isOwner` primeiro              |
| Permissoes nao carregam     | company_id nao disponivel                         | Esperar `activeCompany` antes de fetch        |
| CRM auth falha              | Token expirado em localStorage                    | Limpar `crm_session` e relogar                |
| Erro enum ao ativar perm    | Valor nao existe em `menu_item_type`              | `ALTER TYPE menu_item_type ADD VALUE 'valor'` |
| Dados com company_id errado | Usando `activeCompany.id` em vez de `.company_id` | **SEMPRE** `activeCompany.company_id`         |

## Checklist antes de submeter

- [ ] Nova rota tem ProtectedRoute wrapper
- [ ] Nova rota com permissao tem PermissionProtectedRoute
- [ ] requiredPermission usa valor valido de MenuItemType
- [ ] Owner bypass esta preservado (nao checar permissao para owners)
- [ ] Loading states tratados (spinner enquanto auth/permissoes carregam)
- [ ] Tela de "Acesso Negado" funciona corretamente
