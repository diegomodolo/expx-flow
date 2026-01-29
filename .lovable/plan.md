

# CS TV Dashboard - Performance por Atendente (Correção)

## Problema Identificado

A seção "Performance por Atendente" não exibe dados porque:

1. A lógica atual busca dados da tabela `whatsapp_conversation_assignments`, que está **vazia**
2. O sistema já possui outra forma de associar atendentes: via `whatsapp_instance_users` (usuários vinculados a instâncias de WhatsApp)
3. Cada conversa tem um `instance_id`, e os usuários são atribuídos às instâncias - essa relação já existe e tem dados

## Solução Proposta

Modificar a Edge Function para buscar a performance dos atendentes utilizando **duas fontes de dados**:

1. **Fonte primária**: `whatsapp_conversation_assignments` (atribuições diretas de conversas)
2. **Fonte secundária**: `whatsapp_instance_users` (usuários associados às instâncias)

Quando não houver atribuições individuais, o sistema calculará a performance baseada nas conversas das instâncias às quais o usuário está associado.

---

## Arquitetura da Solução

```text
+--------------------------------+
|     cs-tv-dashboard-data       |
|        (Edge Function)         |
+--------------+-----------------+
               |
    +----------+---------+
    |                    |
    v                    v
+---+---+         +------+------+
|assign-|         |   instance_ |
|ments  |         |    users    |
|(vazia)|         | (tem dados) |
+-------+         +------+------+
                         |
                         v
                  +------+------+
                  | conversations|
                  |  por inst.   |
                  +------+------+
                         |
                         v
                  +------+------+
                  |  realtime_  |
                  |   analysis  |
                  +-------------+
```

---

## Mudanças na Edge Function

### Nova Query: Buscar usuários de instâncias

```typescript
// Buscar usuários associados às instâncias
const instanceUsersResult = await supabase
  .from('whatsapp_instance_users')
  .select('instance_id, user_id')
  .eq('can_view', true);
```

### Nova Lógica: Calcular performance por instância

```typescript
// Se não houver assignments, usar instance_users
if (assignments.length === 0 && instanceUsers.length > 0) {
  // Agrupar conversas por instância
  const conversationsByInstance = new Map<string, string[]>();
  conversations.forEach(c => {
    if (!conversationsByInstance.has(c.instance_id)) {
      conversationsByInstance.set(c.instance_id, []);
    }
    conversationsByInstance.get(c.instance_id).push(c.id);
  });

  // Associar usuários às suas conversas via instância
  instanceUsers.forEach(iu => {
    const convIds = conversationsByInstance.get(iu.instance_id) || [];
    if (!attendantConversations.has(iu.user_id)) {
      attendantConversations.set(iu.user_id, []);
    }
    // Adicionar conversas da instância ao usuário
    convIds.forEach(id => {
      if (!attendantConversations.get(iu.user_id).includes(id)) {
        attendantConversations.get(iu.user_id).push(id);
      }
    });
  });
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `supabase/functions/cs-tv-dashboard-data/index.ts` | Adicionar busca de `whatsapp_instance_users`, implementar lógica de fallback para associação via instâncias |

---

## Benefícios

1. **Sem necessidade de configuração adicional** - usa as associações já existentes
2. **Compatibilidade futura** - quando `whatsapp_conversation_assignments` tiver dados, será usado como fonte primária
3. **Dados imediatos** - já existem 3 usuários associados a 2 instâncias com dados para exibir

---

## Detalhes Técnicos

### Dados Existentes no Banco

| Tabela | Registros |
|--------|-----------|
| `whatsapp_conversation_assignments` | 0 (vazia) |
| `whatsapp_instance_users` | 3 usuários em 2 instâncias |
| `whatsapp_realtime_analysis` | 23 análises |
| `whatsapp_conversations` | 791 conversas |

### Cálculo de Métricas

Para cada usuário de instância:
- **Conversas ativas**: Total de conversas na(s) instância(s) associada(s)
- **Score médio**: Média dos scores de análise das conversas
- **Temperatura**: Distribuição positiva/neutra/negativa das análises
- **Alertas**: Soma de alertas ativos nas conversas

