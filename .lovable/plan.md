
# CS TV Dashboard - Performance por Atendente

## Objetivo
Adicionar uma nova seção ao CS TV Dashboard exibindo métricas de performance individual de cada atendente, baseado nos dados de conversas WhatsApp, análises de sentimento e atribuições.

---

## Métricas por Atendente

| Métrica | Fonte de Dados | Descrição |
|---------|----------------|-----------|
| Conversas Ativas | `whatsapp_conversation_assignments` | Total de conversas atribuídas ao atendente |
| Temperatura Média | `whatsapp_realtime_analysis` | Média de sentimento das conversas do atendente |
| Score Médio | `whatsapp_realtime_analysis.score` | Nota média (0-10) das conversas |
| Conversas Positivas | `temperature = 'positive'` | Quantidade com sentimento positivo |
| Conversas Negativas | `temperature = 'negative'` | Quantidade com sentimento negativo |
| Alertas Ativos | `whatsapp_realtime_analysis.alerts` | Número de alertas gerados nas conversas do atendente |
| Mensagens Enviadas | `whatsapp_messages.sent_by_user_id` | Total de mensagens enviadas pelo atendente |

---

## Arquitetura da Solução

```text
+---------------------------+
|   cs-tv-dashboard-data    |
|   (Edge Function)         |
+------------+--------------+
             |
             | Novo: agrega dados por
             | assigned_to_user_id
             v
+------------+--------------+
| whatsapp_conversation_    |
| assignments               |
+------------+--------------+
             |
             | JOIN por conversation_id
             v
+------------+--------------+
| whatsapp_realtime_        |
| analysis                  |
+---------------------------+
             |
             | JOIN por sent_by_user_id
             v
+---------------------------+
| whatsapp_messages         |
| (contagem de mensagens)   |
+---------------------------+
             |
             v
+---------------------------+
| profiles                  |
| (nome e avatar)           |
+---------------------------+
```

---

## Componentes a Criar/Modificar

### 1. Novo Componente: `CSTVAttendantPerformance.tsx`

Exibição visual dos atendentes com suas métricas:

- Lista ordenável por score ou conversas
- Avatar e nome do atendente
- Barra de progresso mostrando distribuição de temperaturas
- Indicadores de score médio e alertas
- Destaque para atendentes com muitas conversas negativas

### 2. Modificar Edge Function: `cs-tv-dashboard-data/index.ts`

Adicionar nova query que agrega:

```typescript
// Buscar atribuições ativas
const assignmentsResult = await supabase
  .from('whatsapp_conversation_assignments')
  .select('conversation_id, assigned_to_user_id')
  .eq('company_id', companyId)
  .eq('status', 'active')
  .not('assigned_to_user_id', 'is', null);

// Para cada atendente, buscar:
// - Análise de temperatura/score das conversas atribuídas
// - Contagem de mensagens enviadas
// - Dados do perfil (nome, avatar)
```

### 3. Modificar Interface de Dados

Adicionar no retorno da Edge Function:

```typescript
interface AttendantPerformance {
  id: string;
  name: string;
  avatarUrl: string | null;
  activeConversations: number;
  averageScore: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  activeAlerts: number;
  messagesSent: number;
}

// Adicionar ao CSTVDashboardData:
attendantPerformance: AttendantPerformance[];
```

### 4. Modificar Página: `DashboardCSTVPublic.tsx`

Adicionar o novo componente no grid do dashboard.

---

## Design Visual

O componente terá formato de "ranking" ou "leaderboard":

```text
+-----------------------------------------------+
|  Performance por Atendente                    |
+-----------------------------------------------+
|  [Avatar] Maria Silva           Score: 8.5    |
|  ████████████░░░░  12 conversas | 1 alerta    |
|  +8 positivas | 3 neutras | 1 negativa        |
+-----------------------------------------------+
|  [Avatar] João Santos           Score: 7.2    |
|  ███████████░░░░░  10 conversas | 3 alertas   |
|  +6 positivas | 2 neutras | 2 negativas       |
+-----------------------------------------------+
|  [Avatar] Ana Costa             Score: 6.1    |
|  █████████░░░░░░░  8 conversas | 5 alertas    |
|  +3 positivas | 2 neutras | 3 negativas       |
+-----------------------------------------------+
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/cs-tv-dashboard-data/index.ts` | Adicionar query de atendentes e agregação de métricas |
| `src/pages/DashboardCSTVPublic.tsx` | Importar e renderizar novo componente, atualizar interface de dados |

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/cs-tv-dashboard/CSTVAttendantPerformance.tsx` | Componente visual com lista de atendentes e métricas |

---

## Detalhes Técnicos

### Lógica de Agregação na Edge Function

```typescript
// 1. Buscar atribuições ativas com user_id
const { data: assignments } = await supabase
  .from('whatsapp_conversation_assignments')
  .select('conversation_id, assigned_to_user_id')
  .eq('company_id', companyId)
  .eq('status', 'active')
  .not('assigned_to_user_id', 'is', null);

// 2. Agrupar por atendente
const attendantConversations = new Map<string, string[]>();
assignments.forEach(a => {
  const userId = a.assigned_to_user_id;
  if (!attendantConversations.has(userId)) {
    attendantConversations.set(userId, []);
  }
  attendantConversations.get(userId).push(a.conversation_id);
});

// 3. Para cada atendente, calcular métricas
const attendantMetrics = [];
for (const [userId, convIds] of attendantConversations) {
  // Buscar análises das conversas deste atendente
  const analyses = whatsappAnalysis.filter(a => 
    convIds.includes(a.conversation_id)
  );
  
  // Calcular métricas
  const positiveCount = analyses.filter(a => a.temperature === 'positive').length;
  const neutralCount = analyses.filter(a => a.temperature === 'neutral').length;
  const negativeCount = analyses.filter(a => a.temperature === 'negative').length;
  
  const scores = analyses.map(a => a.score).filter(s => s !== null);
  const averageScore = scores.length > 0 
    ? scores.reduce((a, b) => a + b, 0) / scores.length 
    : null;
    
  const activeAlerts = analyses.reduce((count, a) => 
    count + (Array.isArray(a.alerts) ? a.alerts.length : 0), 0);
  
  attendantMetrics.push({
    id: userId,
    activeConversations: convIds.length,
    averageScore,
    positiveCount,
    neutralCount,
    negativeCount,
    activeAlerts,
  });
}

// 4. Buscar perfis dos atendentes
const userIds = [...attendantConversations.keys()];
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, full_name, avatar_url')
  .in('id', userIds);

// 5. Juntar dados e ordenar por score
const attendantPerformance = attendantMetrics
  .map(m => {
    const profile = profiles.find(p => p.id === m.id);
    return {
      ...m,
      name: profile?.full_name || 'Atendente',
      avatarUrl: profile?.avatar_url || null,
    };
  })
  .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
```

---

## Ordem de Implementação

1. Modificar Edge Function para buscar e agregar dados de atendentes
2. Criar componente `CSTVAttendantPerformance.tsx`
3. Atualizar interface de tipos em `DashboardCSTVPublic.tsx`
4. Integrar componente no layout do dashboard
5. Testar e validar exibição dos dados
