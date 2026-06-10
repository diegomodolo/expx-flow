# Rules — Auth e Permissões (escopo: agentes auth e permissions)

Aplicam-se a qualquer trabalho com autenticação, permissões, roles e route guards. Carregar junto com `.claude/rules/global.md`.

1. **Nova permissão = 4 passos obrigatórios** (pular qualquer um causa erro):
   1. Banco: `ALTER TYPE menu_item_type ADD VALUE 'nova-permissao';`
   2. `PermissionGroupsSettings.tsx`: adicionar em `MENU_ITEMS[]`
   3. `PermissionsSettings.tsx`: adicionar em `MENU_ITEMS[]`
   4. `App.tsx`: `<PermissionProtectedRoute requiredPermission="nova-permissao">`
   - Playbook completo: skill `add-permission`.
2. **Owner bypass**: Sempre checar `isOwner` ANTES de checar permissão individual. Owner tem acesso total.
3. **Loading states**: Route guards devem tratar `loading` (spinner) antes de redirecionar — senão redirect loop em `/auth`.
4. **Permissões default**: `dashboard` e `tarefas` são sempre acessíveis — não usar `PermissionProtectedRoute` nelas.
5. **Sidebar é a fonte de verdade**: Em mismatch entre permissão do sidebar e da rota, corrigir a ROTA em `App.tsx`. NUNCA alterar o sidebar — ele reflete o que o admin configurou.
6. **Validação após mudanças**: Após criar/modificar rotas, sidebar ou permissões, rodar a validação de consistência do agente `permissions` (3 fontes: App.tsx × DashboardSidebar.tsx × MenuItemType).
7. **CRM auth é isolado**: `CRMAuthContext` + Edge Function `crm-auth` + sessão em localStorage (`crm_session`). Não misturar com Supabase Auth.
