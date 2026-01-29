

## Separar Métricas de Tempo de Resposta no CS-TV Dashboard

### Resumo

Vamos separar as métricas de tempo de resposta em **duas categorias distintas**:

1. **Tempo Médio da Primeira Resposta do Dia** - Mede quanto tempo leva para o atendente responder à **primeira mensagem** de um cliente **em cada dia**
2. **Tempo Médio Entre Respostas** - Mede o tempo médio de **todas as respostas** durante uma conversa (métrica atual)

---

### Lógica de Cálculo

```text
+------------------------------------------------------------------+
|                    MENSAGENS DE UM CLIENTE                        |
+------------------------------------------------------------------+
| Dia 28/01                                                         |
|   08:00 [CLIENTE] "Bom dia"              ←─┐                      |
|   08:15 [ATENDENTE] "Olá!"               ←─┴─ PRIMEIRA RESPOSTA   |
|                                               (15 min)            |
|   10:30 [CLIENTE] "Tenho uma dúvida"     ←─┐                      |
|   10:45 [ATENDENTE] "Claro, diga"        ←─┴─ Resposta normal     |
|                                               (15 min)            |
+------------------------------------------------------------------+
| Dia 29/01                                                         |
|   09:00 [CLIENTE] "Bom dia novamente"    ←─┐                      |
|   10:30 [ATENDENTE] "Olá!"               ←─┴─ PRIMEIRA RESPOSTA   |
|                                               (1h30min)           |
|   14:00 [CLIENTE] "Resolveu?"            ←─┐                      |
|   14:05 [ATENDENTE] "Sim!"               ←─┴─ Resposta normal     |
|                                               (5 min)             |
+------------------------------------------------------------------+

Tempo Médio PRIMEIRA RESPOSTA = (15 + 90) / 2 = 52.5 min
Tempo Médio ENTRE RESPOSTAS   = (15 + 15 + 90 + 5) / 4 = 31.25 min
```

---

### Alterações Técnicas

#### 1. Edge Function (`cs-tv-dashboard-data`)

Modificar a lógica de cálculo para rastrear separadamente:

```typescript
interface ResponseTimeData {
  // Todas as respostas (atual)
  allResponseTimes: number[];
  allResponseTimesByUser: Map<string, number[]>;
  
  // Primeira resposta do dia
  firstResponseTimes: number[];
  firstResponseTimesByUser: Map<string, number[]>;
}
```

**Lógica para identificar "primeira resposta do dia":**
- Agrupar mensagens por `conversation_id` + `data do dia`
- Para cada dia de cada conversa, identificar a **primeira mensagem incoming**
- Medir o tempo até a **primeira resposta outgoing** desse dia
- Se não houver mensagem incoming naquele dia (apenas continuação), não conta como "primeira"

#### 2. Interfaces de Dados

Adicionar novos campos na interface:

```typescript
// WhatsApp Sentiment
whatsappSentiment: {
  // ... campos existentes
  averageResponseTimeMinutes: number | null;      // Entre respostas (atual)
  averageFirstResponseTimeMinutes: number | null; // NOVO: Primeira do dia
}

// Attendant Performance  
interface AttendantPerformance {
  // ... campos existentes
  averageResponseTimeMinutes: number | null;      // Entre respostas (atual)
  averageFirstResponseTimeMinutes: number | null; // NOVO: Primeira do dia
}
```

#### 3. Componente `CSTVWhatsAppSentiment`

Expandir o grid de estatísticas para mostrar ambas métricas:

| Conversas | Score Médio | 1ª Resposta | Tempo Médio | Alertas |
|-----------|-------------|-------------|-------------|---------|
| 127       | 7.2         | 45m         | 12m         | 3       |

- **1ª Resposta** (ícone Sunrise/Play): Tempo médio da primeira resposta do dia
- **Tempo Médio** (ícone Clock): Tempo médio entre todas as respostas

#### 4. Componente `CSTVAttendantPerformance`

Adicionar ambas métricas na linha de estatísticas do atendente:

```
📧 12 conversas | ⏱️ 1ª: 32m | 🔄 Médio: 8m | ⚠️ 2 alertas
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/cs-tv-dashboard-data/index.ts` | Nova lógica de cálculo para separar primeira resposta do dia |
| `src/components/cs-tv-dashboard/CSTVWhatsAppSentiment.tsx` | Adicionar card para "1ª Resposta" |
| `src/components/cs-tv-dashboard/CSTVAttendantPerformance.tsx` | Mostrar ambas métricas por atendente |
| `src/pages/DashboardCSTVPublic.tsx` | Atualizar interfaces TypeScript |

---

### Resultado Visual Esperado

**Card Sentimento WhatsApp:**
```
+---------------------------------------------------------------+
|  Sentimento WhatsApp                                          |
+---------------------------------------------------------------+
|  [████████████████░░░░░░] Positivo: 45 | Neutro: 12 | Neg: 3 |
+---------------------------------------------------------------+
|  📱 127     | 📊 7.2    | 🌅 45m      | ⏱️ 12m    | 🔔 3      |
|  Conversas | Score    | 1ª Resposta | Tempo Med | Alertas   |
+---------------------------------------------------------------+
```

**Card Performance Atendente:**
```
#1 [Avatar] Isabelle                              8.5
   [████████████░░░]
   📧 12 conversas | 🌅 1ª: 32m | ⏱️ Med: 8m | ⚠️ 2 alertas
   +45  12  -3                         127 msg enviadas
```

