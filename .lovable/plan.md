
# CS TV Dashboard - Plano de Implementação

## Objetivo
Criar um dashboard de TV dedicado ao Customer Success, similar aos dashboards Radar TV e Tráfego TV já existentes, com foco em:
- Análise de notas de relacionamento (saúde dos clientes)
- Dados de sentimento das conversas WhatsApp (temperatura da IA)
- Métricas de CS agregadas
- Controles de zoom, atualização automática, rotação e modo kiosk

---

## Visão Geral da Arquitetura

```text
+-------------------+          +-------------------------+
|   CS TV Settings  |          |   DashboardCSTVPublic   |
|   (Configurações) |          |   (Página Pública)      |
+--------+----------+          +------------+------------+
         |                                  |
         | Gera Token                       | Token na URL
         v                                  v
+--------+----------+          +------------+------------+
|   cs_tv_token     |          |   cs-tv-dashboard-data  |
|   (companies)     +<---------+   (Edge Function)       |
+-------------------+          +------------+------------+
                                            |
                                            | Busca dados
                                            v
                               +------------+------------+
                               |   Supabase Tables       |
                               | - client_health_config  |
                               | - whatsapp_realtime_    |
                               |   analysis              |
                               | - whatsapp_conversations|
                               | - clients               |
                               +-------------------------+
```

---

## Componentes a Criar

### 1. Database Migration
Adicionar coluna `cs_tv_dashboard_token` na tabela `companies` para armazenar o token de acesso público.

### 2. Funções RPC (Database)
- `generate_cs_tv_dashboard_token` - Gerar token único
- `set_cs_tv_dashboard_token` - Salvar token com segurança

### 3. Edge Function: `cs-tv-dashboard-data`
Endpoint público que retorna os dados agregados de CS:

**Dados retornados:**
- Nome da empresa
- Métricas agregadas de saúde (média, distribuição por risco)
- Lista de clientes por nível de risco (crítico, alto, médio, baixo)
- Análise de sentimento das conversas WhatsApp:
  - Total de conversas ativas
  - Distribuição por temperatura (positiva, neutra, negativa)
  - Conversas em estado crítico (temperatura negativa)
  - Alertas gerados pela IA
- NPS agregado e distribuição (promotores, neutros, detratores)
- Clientes sem contato recente do CS

### 4. Hook: `useCsTvDashboardToken`
Similar ao `useRadarTvDashboardToken`, para gerenciar o token do CS TV.

### 5. Componentes do Dashboard TV

#### Estrutura de arquivos:
```text
src/components/cs-tv-dashboard/
├── CSTVControls.tsx          # Controles (zoom, refresh, rotação, tema, kiosk)
├── CSTVHeader.tsx            # Cabeçalho com logo e última atualização
├── CSTVHealthMetrics.tsx     # KPIs de saúde agregados
├── CSTVRiskDistribution.tsx  # Gráfico de distribuição por risco
├── CSTVCriticalClients.tsx   # Lista de clientes críticos/alto risco
├── CSTVWhatsAppSentiment.tsx # Análise de sentimento do WhatsApp
├── CSTVNPSOverview.tsx       # Visão geral do NPS
├── CSTVPendingContacts.tsx   # Clientes sem contato recente
```

### 6. Página Pública: `DashboardCSTVPublic.tsx`
Acessível via `/cs-tv/:token`, renderiza todos os componentes do dashboard.

### 7. Configurações: `CSTVSettings.tsx`
Página de configurações para gerar/regenerar token e obter link público.

### 8. Menu do CS
Adicionar item "CS TV" no sidebar do módulo CS (`CSLayout.tsx`).

### 9. Rotas
- Rota pública: `/cs-tv/:token`
- Rota interna: `/cs/tv` (configurações)

---

## Dados Exibidos no Dashboard

### Painel 1: Métricas de Saúde
| Métrica | Fonte |
|---------|-------|
| Saúde Média | `client_health_config.health_score_total` |
| Clientes Críticos | `churn_risk_level = 'critical'` |
| Clientes Alto Risco | `churn_risk_level = 'high'` |
| NPS Médio | `client_health_config.nps_score` |

### Painel 2: Sentimento WhatsApp
| Métrica | Fonte |
|---------|-------|
| Total Conversas | `whatsapp_conversations` |
| Temperatura Positiva | `whatsapp_realtime_analysis.temperature = 'positive'` |
| Temperatura Neutra | `temperature = 'neutral'` |
| Temperatura Negativa | `temperature = 'negative'` |
| Score Médio IA | `whatsapp_realtime_analysis.score` |
| Alertas Ativos | `whatsapp_realtime_analysis.alerts` (contagem) |

### Painel 3: Distribuição de Risco
Gráfico visual mostrando proporção de clientes por nível de risco (crítico, alto, médio, baixo).

### Painel 4: Clientes em Alerta
Lista scrollável de clientes com:
- Avatar e nome
- Nível de risco
- Score de saúde
- Fatores de risco (tooltip)

### Painel 5: Conversas Críticas
Lista de conversas WhatsApp com temperatura negativa:
- Nome do contato
- Cliente vinculado (se houver)
- Score da IA
- Alertas detectados

### Painel 6: Pendências de CS
- Clientes sem contato há mais de 7 dias
- NPS não coletado há mais de 30 dias

---

## Detalhes Técnicos

### Edge Function: Lógica Principal
```typescript
// Buscar dados em paralelo
const [
  clientsHealthResult,
  whatsappAnalysisResult,
  conversationsResult,
] = await Promise.all([
  // Health configs com dados do cliente
  supabase.from('client_health_config')
    .select('*, clients!inner(id, name, avatar)')
    .eq('company_id', companyId),
  
  // Análises de WhatsApp ativas
  supabase.from('whatsapp_realtime_analysis')
    .select('*, whatsapp_conversations!inner(contact_name, client_id)')
    .eq('company_id', companyId),
    
  // Conversas com análise
  supabase.from('whatsapp_conversations')
    .select('id, contact_name, client_id, clients(name)')
    .eq('company_id', companyId)
]);
```

### Controles do Dashboard
Reutilizar a estrutura do `RadarTVControls.tsx`:
- Zoom (50% a 150%)
- Intervalo de atualização (1 a 30 minutos)
- Rotação (0°, 90°, 180°, 270°)
- Tema claro/escuro
- Tela cheia
- Modo Kiosk

---

## Arquivos a Criar/Modificar

### Novos Arquivos
1. `supabase/migrations/xxx_add_cs_tv_token.sql`
2. `supabase/functions/cs-tv-dashboard-data/index.ts`
3. `src/hooks/useCsTvDashboardToken.tsx`
4. `src/pages/DashboardCSTVPublic.tsx`
5. `src/pages/cs/CSTVPage.tsx`
6. `src/components/cs-tv-dashboard/CSTVControls.tsx`
7. `src/components/cs-tv-dashboard/CSTVHeader.tsx`
8. `src/components/cs-tv-dashboard/CSTVHealthMetrics.tsx`
9. `src/components/cs-tv-dashboard/CSTVRiskDistribution.tsx`
10. `src/components/cs-tv-dashboard/CSTVCriticalClients.tsx`
11. `src/components/cs-tv-dashboard/CSTVWhatsAppSentiment.tsx`
12. `src/components/cs-tv-dashboard/CSTVNPSOverview.tsx`
13. `src/components/settings/CSTVSettings.tsx`

### Arquivos a Modificar
1. `src/components/cs/CSLayout.tsx` - Adicionar item "CS TV" no menu
2. `src/App.tsx` - Adicionar rotas `/cs-tv/:token` e `/cs/tv`
3. `supabase/config.toml` - Registrar nova edge function

---

## Ordem de Implementação

1. **Migration** - Adicionar coluna e funções RPC
2. **Edge Function** - Criar endpoint de dados
3. **Hook** - Gerenciamento de token
4. **Componentes TV** - UI do dashboard
5. **Página Pública** - Montar dashboard completo
6. **Configurações** - Página para gerar token
7. **Integração** - Menu e rotas
8. **Testes** - Validar fluxo completo
