#!/bin/bash
# Hook: Injeta contexto critico no inicio da sessao e apos compactacao
# Garante que regras criticas nunca se percam

cat << 'CONTEXT'
## Regras Criticas do Projeto (auto-injetadas)

1. **company_id**: SEMPRE usar `activeCompany.company_id`, NUNCA `activeCompany.id`
2. **DashboardLayout**: TODA pagina protegida DEVE usar `<DashboardLayout>`
3. **RLS**: NUNCA subquery em tabela com RLS dentro de policy — usar SECURITY DEFINER
4. **GRANT**: Toda nova tabela precisa de `GRANT ... TO authenticated`
5. **Enum**: Ao criar permissao, atualizar `menu_item_type` no banco ANTES do frontend
6. **Permissoes**: Adicionar em 3 lugares: enum DB + PermissionGroupsSettings + PermissionsSettings
7. **Edge Functions secrets**: Sempre adicionar fallback hardcoded para valores criticos
8. **Idioma**: Todos textos de UI em Portugues (PT-BR)
CONTEXT

exit 0
