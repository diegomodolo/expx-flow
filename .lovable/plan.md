
# Plano: Ordenar e Sincronizar Lista de Colaboradores no WhatsApp

## Problema Atual
O modal de "Gerenciar Usuários" das instâncias WhatsApp busca dados de uma fonte diferente da tela de Colaboradores:
- **Modal WhatsApp**: busca `company_members` + `profiles`
- **Tela Colaboradores**: busca tabela `employees`

Isso causa duas inconsistências:
1. A lista não está ordenada alfabeticamente
2. Podem aparecer usuários diferentes dos colaboradores cadastrados

## Solução

Alterar o componente `WhatsAppInstanceUsersModal` para buscar dados da tabela `employees` (mesma fonte da tela de Colaboradores), garantindo que:
- A lista venha ordenada por nome (`.order("name")`)
- Apareçam exatamente os mesmos colaboradores da tela de colaboradores

---

## Detalhes Tecnico

### Arquivo: `src/components/whatsapp/WhatsAppInstanceUsersModal.tsx`

**Alteracoes na interface `CompanyUser`:**
- Adicionar campo `employee_id` para referencia

**Alteracoes na funcao `loadData`:**

Substituir a query atual:
```typescript
// ATUAL: busca de company_members + profiles
const { data: members } = await supabase
  .from("company_members")
  .select("user_id, role")
  .eq("company_id", activeCompany.company_id);
```

Por query na tabela `employees`:
```typescript
// NOVO: busca de employees (mesma fonte da tela de colaboradores)
const { data: employeesData } = await supabase
  .from("employees")
  .select("id, user_id, name, role, avatar")
  .eq("company_id", activeCompany.company_id)
  .order("name"); // ordenacao alfabetica

const users: CompanyUser[] = employeesData?.map(emp => ({
  user_id: emp.user_id,
  full_name: emp.name,
  role: emp.role,
  avatar_url: emp.avatar || null,
})) || [];
```

**Beneficios:**
- Query mais simples (uma tabela ao inves de duas)
- Ordenacao ja vem do banco de dados
- Dados identicos a tela de colaboradores
