

## Plano de Implementação: Alertas em Tempo Real e Persistência no Banco de Dados

### Resumo

Este plano aborda duas melhorias críticas para o sistema de alertas do CS-TV Dashboard:

1. **Persistência de alertas exibidos no banco de dados** - Garantir que cada alerta (crítico ou celebração) seja exibido apenas uma vez, independentemente de qual dispositivo ou sessão o dashboard esteja aberto

2. **Notificação instantânea via Realtime** - Disparar alertas imediatamente quando a IA gerar uma análise que atenda aos critérios, sem aguardar o próximo ciclo de sincronização

---

### Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE ALERTAS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Atendente]                                                                │
│       │                                                                     │
│       ▼                                                                     │
│  [Chat WhatsApp] ──► [whatsapp-ai-assistant]                               │
│                              │                                              │
│                              ▼                                              │
│                      [Análise de IA]                                        │
│                              │                                              │
│                              ▼                                              │
│               ┌──────────────┴──────────────┐                               │
│               │                             │                               │
│               ▼                             ▼                               │
│  [whatsapp_realtime_analysis]    [whatsapp_realtime_analysis_history]      │
│               │                                                             │
│               │ (score < 3 ou score >= 9)                                   │
│               ▼                                                             │
│  ┌────────────────────────────┐                                             │
│  │  cs_tv_displayed_alerts   │◄──────┐                                      │
│  │  (NOVA TABELA)            │       │                                      │
│  │                           │       │                                      │
│  │  - analysis_id            │       │ Broadcast via Realtime               │
│  │  - company_id             │       │                                      │
│  │  - alert_type             │       │                                      │
│  │  - displayed_at           │       │                                      │
│  └────────────────────────────┘       │                                      │
│               │                       │                                      │
│               ▼                       │                                      │
│  ┌────────────────────────────┐       │                                      │
│  │   Supabase Realtime        │───────┘                                      │
│  │   (postgres_changes)       │                                              │
│  └────────────────────────────┘                                              │
│               │                                                              │
│               ▼                                                              │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │          Dashboard CS-TV (Múltiplos dispositivos)              │         │
│  │                                                                │         │
│  │    [TV 1]        [TV 2]        [TV 3]        [TV 4]           │         │
│  │       │             │             │             │              │         │
│  │       └─────────────┼─────────────┼─────────────┘              │         │
│  │                     ▼                                          │         │
│  │           [Modal de Alerta Instantâneo]                        │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Etapa 1: Criar Tabela de Alertas Exibidos

**Objetivo**: Armazenar quais alertas já foram exibidos para evitar repetição em qualquer dashboard.

**SQL para criar a tabela**:

```sql
-- Tabela para rastrear alertas já exibidos
CREATE TABLE cs_tv_displayed_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL,  -- ID do whatsapp_realtime_analysis_history
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical', 'celebration')),
  score NUMERIC(4,1),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  contact_name TEXT,
  attendant_name TEXT,
  displayed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Garantir que cada alerta só seja registrado uma vez
  UNIQUE(company_id, analysis_id)
);

-- Índices para performance
CREATE INDEX idx_cs_tv_displayed_alerts_company_id ON cs_tv_displayed_alerts(company_id);
CREATE INDEX idx_cs_tv_displayed_alerts_displayed_at ON cs_tv_displayed_alerts(displayed_at DESC);

-- RLS
ALTER TABLE cs_tv_displayed_alerts ENABLE ROW LEVEL SECURITY;

-- Política para service role (edge functions)
CREATE POLICY "Service role can manage displayed alerts"
ON cs_tv_displayed_alerts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### Etapa 2: Criar Tabela de Eventos de Alerta em Tempo Real

**Objetivo**: Usar uma tabela específica para disparar eventos via Supabase Realtime.

```sql
-- Tabela de eventos de alerta para Realtime
CREATE TABLE cs_tv_realtime_alert_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical', 'celebration')),
  alert_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índice para limpeza
CREATE INDEX idx_cs_tv_realtime_events_created_at ON cs_tv_realtime_alert_events(created_at);

-- RLS
ALTER TABLE cs_tv_realtime_alert_events ENABLE ROW LEVEL SECURITY;

-- Política para service role
CREATE POLICY "Service role can manage realtime events"
ON cs_tv_realtime_alert_events FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Habilitar replication para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cs_tv_realtime_alert_events;
```

---

### Etapa 3: Modificar Hook de Análise em Tempo Real

**Arquivo**: `src/hooks/useWhatsAppRealtimeAnalysis.tsx`

**Mudanças**:
- Após salvar a análise com score < 3 ou score >= 9, disparar a inserção na tabela `cs_tv_realtime_alert_events`
- Incluir os dados completos do alerta no campo JSONB

```typescript
// Após linha 193, adicionar:
// Se a nota atender aos critérios de alerta, disparar evento
if (analysisData.score < 3 || analysisData.score >= 9) {
  const alertType = analysisData.score < 3 ? 'critical' : 'celebration';
  
  // Buscar dados adicionais para o alerta
  const alertData = {
    analysisId: historyResult.data?.[0]?.id || currentResult.data?.[0]?.id,
    conversationId: convId,
    score: analysisData.score,
    temperature: analysisData.temperature,
    interpretation: analysisData.interpretation,
    suggestion: analysisData.suggestion,
    // Dados do contato serão preenchidos no dashboard
    timestamp: now,
  };
  
  await supabase
    .from('cs_tv_realtime_alert_events')
    .insert({
      company_id: companyId,
      alert_type: alertType,
      alert_data: alertData,
    });
}
```

---

### Etapa 4: Criar Hook de Subscrição Realtime para Alertas

**Novo arquivo**: `src/hooks/useCSTVRealtimeAlerts.tsx`

**Responsabilidades**:
- Subscrever à tabela `cs_tv_realtime_alert_events` via Supabase Realtime
- Verificar se o alerta já foi exibido consultando `cs_tv_displayed_alerts`
- Disparar o modal de alerta imediatamente se for um alerta novo

```typescript
import { useEffect, useCallback } from 'react';
import { supabasePublic } from '@/integrations/supabase/publicClient';

interface UseCSTVRealtimeAlertsProps {
  companyToken: string;
  onNewCriticalAlert: (alert: CriticalAlert) => void;
  onNewCelebrationAlert: (alert: CelebrationAlert) => void;
}

export function useCSTVRealtimeAlerts({
  companyToken,
  onNewCriticalAlert,
  onNewCelebrationAlert,
}: UseCSTVRealtimeAlertsProps) {
  
  useEffect(() => {
    // Primeiro, validar o token e obter company_id
    // Depois, subscrever à tabela de eventos
    
    const channel = supabasePublic
      .channel('cs-tv-realtime-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cs_tv_realtime_alert_events',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const event = payload.new;
          
          // Verificar se já foi exibido
          const { data: existing } = await supabasePublic
            .from('cs_tv_displayed_alerts')
            .select('id')
            .eq('analysis_id', event.alert_data.analysisId)
            .maybeSingle();
          
          if (existing) {
            console.log('Alerta já exibido anteriormente');
            return;
          }
          
          // Marcar como exibido
          await supabasePublic
            .from('cs_tv_displayed_alerts')
            .insert({
              company_id: event.company_id,
              analysis_id: event.alert_data.analysisId,
              alert_type: event.alert_type,
              score: event.alert_data.score,
              conversation_id: event.alert_data.conversationId,
            });
          
          // Disparar alerta
          if (event.alert_type === 'critical') {
            onNewCriticalAlert(event.alert_data);
          } else {
            onNewCelebrationAlert(event.alert_data);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabasePublic.removeChannel(channel);
    };
  }, [companyToken, onNewCriticalAlert, onNewCelebrationAlert]);
}
```

---

### Etapa 5: Modificar Edge Function cs-tv-dashboard-data

**Arquivo**: `supabase/functions/cs-tv-dashboard-data/index.ts`

**Mudanças**:
- Filtrar alertas que já foram exibidos (consultando `cs_tv_displayed_alerts`)
- Retornar apenas alertas novos (não exibidos)

```typescript
// Na seção de RECENT CRITICAL ALERTS, adicionar:
const { data: displayedAlerts } = await supabase
  .from('cs_tv_displayed_alerts')
  .select('analysis_id')
  .eq('company_id', company.id);

const displayedIds = new Set((displayedAlerts || []).map(a => a.analysis_id));

// Filtrar alertas não exibidos
const recentCriticalAlerts: CriticalAlert[] = whatsappAnalysis
  .filter(w => {
    const score = (w as any).score;
    const id = (w as any).id;
    return typeof score === 'number' && score < 3 && !displayedIds.has(id);
  })
  // ... resto do código
```

---

### Etapa 6: Modificar Dashboard CS-TV

**Arquivo**: `src/pages/DashboardCSTVPublic.tsx`

**Mudanças**:
- Integrar o novo hook `useCSTVRealtimeAlerts`
- Remover persistência local via localStorage
- Quando um alerta for fechado/visualizado, registrar na tabela `cs_tv_displayed_alerts`

```typescript
// Remover estados de dismissedAlertIds/dismissedCelebrationIds do localStorage
// Usar o hook de Realtime
useCSTVRealtimeAlerts({
  companyToken: token,
  onNewCriticalAlert: (alert) => {
    setActiveAlerts(prev => [...prev, alert]);
  },
  onNewCelebrationAlert: (alert) => {
    setActiveCelebrations(prev => [...prev, alert]);
  },
});

// Modificar handleDismissAlert para registrar no banco
const handleDismissAlert = useCallback(async (alertId: string) => {
  setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
  
  // Registrar como exibido no banco
  await supabasePublic.from('cs_tv_displayed_alerts').insert({
    company_id: companyId,
    analysis_id: alertId,
    alert_type: 'critical',
    // ... outros campos
  }).catch(console.error); // Silently handle if already exists
}, [companyId]);
```

---

### Etapa 7: Limpeza Automática de Eventos

**Objetivo**: Evitar acúmulo de registros na tabela de eventos.

**SQL Function**:
```sql
-- Função para limpar eventos antigos (mais de 1 hora)
CREATE OR REPLACE FUNCTION cleanup_cs_tv_realtime_events()
RETURNS void AS $$
BEGIN
  DELETE FROM cs_tv_realtime_alert_events
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
```

---

### Resumo dos Arquivos a Serem Modificados/Criados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| SQL Migration | Novo | Criar tabelas `cs_tv_displayed_alerts` e `cs_tv_realtime_alert_events` |
| `src/hooks/useCSTVRealtimeAlerts.tsx` | Novo | Hook para subscrição Realtime de alertas |
| `src/hooks/useWhatsAppRealtimeAnalysis.tsx` | Editar | Disparar evento quando score atender critérios |
| `supabase/functions/cs-tv-dashboard-data/index.ts` | Editar | Filtrar alertas já exibidos |
| `src/pages/DashboardCSTVPublic.tsx` | Editar | Integrar Realtime e persistência no banco |

---

### Seção Técnica

**Fluxo de Dados Detalhado**:

1. **Trigger de Análise**: Quando `useWhatsAppRealtimeAnalysis` gera uma nova análise com score < 3 ou >= 9:
   - Salva na tabela `whatsapp_realtime_analysis` (atual)
   - Salva no histórico `whatsapp_realtime_analysis_history` (atual)
   - **NOVO**: Insere evento em `cs_tv_realtime_alert_events`

2. **Propagação via Realtime**: O Supabase Realtime detecta o INSERT e notifica todos os dashboards subscritos

3. **Recebimento no Dashboard**: O hook `useCSTVRealtimeAlerts` recebe o evento:
   - Verifica em `cs_tv_displayed_alerts` se já foi exibido
   - Se não foi, insere na tabela e dispara o modal
   - Se já foi, ignora silenciosamente

4. **Sincronização Periódica**: Quando o dashboard faz refetch normal:
   - A edge function filtra alertas já na tabela `cs_tv_displayed_alerts`
   - Retorna apenas alertas novos (garantia de backup caso Realtime falhe)

**Benefícios**:
- **Consistência**: Múltiplos dashboards nunca exibem o mesmo alerta duas vezes
- **Instantaneidade**: Alertas aparecem em segundos, não minutos
- **Resiliência**: Mesmo se Realtime falhar, o refetch periódico ainda funciona
- **Auditoria**: Histórico completo de alertas exibidos para análise posterior

