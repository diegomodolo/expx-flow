
# Plano: Filtrar Ranking de Atendentes Apenas por `is_attendant = true`

## Diagnóstico do Problema

A investigação revelou a causa raiz:

| Instância | Tipo | Suely cadastrada? | is_attendant |
|-----------|------|-------------------|--------------|
| CS - Azeredo | cs | Sim | **false** |
| Squad #01 - Renata | cs | Sim | **false** |
| Squad #03 - Lidiane | cs | Sim | **false** |
| Thulio | administrative | Sim | false |

A Suely está vinculada às instâncias de CS, mas **não é atendente** (`is_attendant = false`). O código atual filtra corretamente por instâncias CS, mas não está verificando o campo `is_attendant`.

## Solução

Modificar a Edge Function `cs-tv-dashboard-data` para adicionar filtro `is_attendant = true` na lógica de ranking.

### Alterações Técnicas

**Arquivo:** `supabase/functions/cs-tv-dashboard-data/index.ts`

1. **No fallback de atribuição por instância (linha 588-603)**:
   - Adicionar verificação `if (!iu.is_attendant) return;` junto com a verificação de CS instance

2. **Garantir que apenas atendentes oficiais apareçam**:
   - Antes: filtra por `csInstanceIds.has(iu.instance_id)`
   - Depois: filtra por `csInstanceIds.has(iu.instance_id) && iu.is_attendant === true`

```typescript
// Antes (problema):
instanceUsersForCompany.forEach((iu: any) => {
  if (!csInstanceIds.has(iu.instance_id)) return;
  // ... Suely entra aqui porque está em instância CS
});

// Depois (correção):
instanceUsersForCompany.forEach((iu: any) => {
  // Only process users that are official attendants of CS instances
  if (!csInstanceIds.has(iu.instance_id)) return;
  if (!iu.is_attendant) return;  // <-- NOVA VERIFICAÇÃO
  // ... Agora Suely é excluída porque is_attendant = false
});
```

## Resultado Esperado

Após a correção:
- Isabelle: Aparece (is_attendant = true em CS - Azeredo)
- Lidiane: Aparece (is_attendant = true em Squad #03 - Lidiane)
- Renata: Aparece (is_attendant = true em Squad #01 - Renata)
- **Suely: Não aparece** (is_attendant = false em todas instâncias)

## Passos de Implementação

1. Editar a Edge Function adicionando verificação `is_attendant`
2. Fazer deploy da função atualizada
3. Testar o dashboard para confirmar que Suely não aparece mais
