
# Plano: Módulo de Customer Success (CS) - "O Melhor Módulo de CS do Mundo"

## Visao Geral

Criar um sistema completo de Customer Success orientado a **Retenção (Churn Zero)** e **Expansão (Upsell)** através da prova constante de valor (ROI). O módulo será integrado ao ecossistema existente, aproveitando dados de campanhas, alertas e tarefas.

---

## Arquitetura do Modulo

```text
+------------------------------------------------------------------+
|                    MODULO CUSTOMER SUCCESS                        |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+  +-------------------+  +-----------------+|
|  |  HEALTH SCORE 360 |  |  JORNADA VITORIA  |  | EARLY WARNING   ||
|  |  (3 Pilares)      |  |  (Milestones)     |  | SYSTEM          ||
|  +-------------------+  +-------------------+  +-----------------+|
|           |                      |                     |          |
|  +-------------------+  +-------------------+  +-----------------+|
|  |  TOUCHPOINTS &    |  |  FEEDBACK & VOC   |  | COMPROVANTE     ||
|  |  QBR AUTOMATION   |  |  (NPS + Sugestoes)|  | VALOR MENSAL    ||
|  +-------------------+  +-------------------+  +-----------------+|
|                                                                   |
+------------------------------------------------------------------+
```

---

## 1. Painel de Saude do Cliente (Health Score 360)

### O que sera feito:
Expandir o Health Score existente de 4 pilares tecnico para um modelo de **3 pilares estrategicos** que integra performance financeira, operacional e relacional.

### Tabelas no Banco de Dados:

**Nova tabela: `client_health_config`**
- `id`, `client_id`, `company_id`
- `target_roas` (meta de ROAS do cliente)
- `target_cpl` (meta de CPL)
- `nps_score` (ultima nota NPS, 0-10)
- `nps_collected_at` (data da ultima coleta)
- `last_cs_contact_at` (ultimo contato CS)
- `onboarding_status` (pending, in_progress, completed)
- `churn_risk_level` (low, medium, high, critical)
- `health_score_financial` (0-100)
- `health_score_operational` (0-100)
- `health_score_relational` (0-100)
- `health_score_total` (0-100)
- `created_at`, `updated_at`

### Componentes React:

1. **`CSHealthScore360.tsx`** - Painel visual com os 3 pilares
   - Grafico radar mostrando os 3 scores
   - Indicadores coloridos (vermelho/amarelo/verde)
   - Lista de fatores de risco

2. **`CSRiskRadar.tsx`** - Lista de clientes em risco
   - Clientes com score < 40 piscando em vermelho
   - Ordenacao por risco (critico primeiro)
   - Acoes rapidas (ligar, agendar reuniao, criar tarefa)

### Algoritmo de Calculo (Edge Function: `calculate-health-score-360`):

**Pilar Financeiro (40 pontos)**:
- ROAS >= meta: +40 pts
- ROAS 80-99% da meta: +30 pts  
- ROAS 50-79% da meta: +15 pts
- ROAS < 50% da meta: 0 pts

**Pilar Operacional (30 pontos)**:
- Criativos aprovados em < 48h: +15 pts
- Responde WhatsApp em < 24h: +10 pts
- Sem pendencias de aprovacao: +5 pts

**Pilar Relacional (30 pontos)**:
- NPS 9-10: +15 pts
- NPS 7-8: +10 pts
- NPS 0-6: 0 pts
- Contato CS < 7 dias: +10 pts
- Contato CS 7-14 dias: +5 pts
- Contato CS > 14 dias: 0 pts
- QBR realizado no trimestre: +5 pts

---

## 2. Jornada da Vitoria (Success Plan Dinamico)

### O que sera feito:
Criar uma timeline visual de conquistas com milestones pre-definidos e personalizaveis.

### Tabelas no Banco de Dados:

**Nova tabela: `client_milestones`**
- `id`, `client_id`, `company_id`
- `milestone_type` (onboarding, first_campaign, first_lead, monthly_goal, quarterly_goal, custom)
- `title`, `description`
- `status` (pending, in_progress, completed, celebrated)
- `completed_at`, `celebrated_at`
- `celebration_sent` (boolean)
- `celebration_method` (whatsapp, email, both)
- `metrics_snapshot` (JSON com dados no momento da vitoria)
- `order` (para ordenacao)
- `created_at`, `updated_at`

**Nova tabela: `milestone_templates`**
- `id`, `company_id`
- `milestone_type`, `title`, `description`
- `trigger_condition` (JSON com regras para auto-completar)
- `celebration_message_template`
- `is_active`, `order`

### Componentes React:

1. **`CSSuccessJourney.tsx`** - Timeline visual
   - Barra de progresso do onboarding (0-100%)
   - Lista de milestones com status
   - Icones de celebracao para vitorias

2. **`CSMilestoneCard.tsx`** - Card individual de milestone
   - Status visual (pendente/em progresso/concluido)
   - Botao "Validar Vitoria" para CS
   - Preview da mensagem de celebracao

3. **`CSCelebrationModal.tsx`** - Modal de celebracao
   - Preview do grafico de resultado
   - Selector de canal (WhatsApp/Email)
   - Personalizacao da mensagem
   - Botao enviar celebracao

### Edge Functions:

- **`check-milestone-triggers`**: Cron job diario que verifica se algum cliente atingiu um milestone automatico (ex: primeira campanha ativa, primeiro lead)
- **`send-celebration`**: Dispara mensagem de celebracao via WhatsApp/Email com grafico de resultado

---

## 3. Gestao de Touchpoints e QBR

### O que sera feito:
Automatizar lembretes de reunioes e gerar pautas pre-prontas baseadas em dados.

### Tabelas no Banco de Dados:

**Nova tabela: `client_touchpoints`**
- `id`, `client_id`, `company_id`
- `touchpoint_type` (call, meeting, qbr, email, whatsapp)
- `occurred_at`
- `summary` (resumo da interacao)
- `ai_summary` (resumo gerado por IA)
- `participants` (array de user_ids)
- `next_action`, `next_action_date`
- `created_by`, `created_at`

**Nova tabela: `qbr_reports`**
- `id`, `client_id`, `company_id`
- `period_start`, `period_end`
- `metrics_snapshot` (JSON)
- `best_creatives` (array de creative_ids)
- `executive_summary` (gerado por IA)
- `action_plan`
- `status` (draft, scheduled, presented, archived)
- `presented_at`
- `public_token`, `view_count`
- `created_at`, `updated_at`

### Componentes React:

1. **`CSTouchpointLog.tsx`** - Historico de contatos
   - Timeline de interacoes
   - Filtros por tipo
   - Resumos AI

2. **`CSQBRGenerator.tsx`** - Gerador de QBR
   - Puxa automaticamente dados dos ultimos 90 dias
   - Gera slides pre-prontos
   - Investimento Total, Retorno, Melhores Criativos
   - Botao "Gerar com IA"

3. **`CSQBRReminder.tsx`** - Card de lembrete
   - "Faz X dias que nao apresentamos QBR para Cliente Y"
   - Acao rapida para agendar

### Edge Functions:

- **`generate-qbr-content`**: Usa Lovable AI para gerar resumo executivo e plano de acao baseado nos dados
- **`check-qbr-overdue`**: Cron job semanal que cria alertas para clientes sem QBR ha mais de 85 dias

---

## 4. Alertas Pro-ativos (Early Warning System)

### O que sera feito:
Expandir o sistema de alertas existente (`system_alerts`) com novos tipos especificos de CS.

### Novos Tipos de Alertas:

| Tipo | Gatilho | Severidade | Acao Sugerida |
|------|---------|------------|---------------|
| `cpa_spike` | CPA subiu 20% em 3 dias | critical | "Alinhar com Gestor de Trafego" |
| `roas_drop` | ROAS caiu abaixo da meta por 7 dias | critical | "Reuniao de alinhamento urgente" |
| `budget_ceiling` | Cliente bateu teto de orcamento 3 meses seguidos | info | "Oferecer aumento de fee" |
| `no_response` | Cliente nao responde ha 5 dias | warning | "Enviar mensagem de follow-up" |
| `qbr_overdue` | QBR nao realizado ha 85+ dias | warning | "Agendar reuniao estrategica" |
| `nps_low` | NPS <= 6 | critical | "Acao de recuperacao urgente" |
| `churn_risk` | Health Score < 40 | critical | "Plano de retencao" |

### Componentes React:

1. **`CSAlertCenter.tsx`** - Central de alertas CS
   - Filtros por tipo de alerta
   - Acoes em lote
   - Historico de resolucoes

2. **`CSUpsellOpportunities.tsx`** - Oportunidades de expansao
   - Lista de clientes com potencial de upsell
   - Historico de orcamento vs gasto
   - Sugestoes automaticas

### Edge Functions:

- **`monitor-cs-alerts`**: Cron job que roda a cada 6 horas monitorando todos os gatilhos
- **`create-cs-task`**: Cria tarefa automaticamente quando alerta critico e detectado

---

## 5. Central de Feedback e VoC (Voice of Customer)

### O que sera feito:
Sistema de NPS e caixa de sugestoes integrado.

### Tabelas no Banco de Dados:

**Nova tabela: `client_nps_responses`**
- `id`, `client_id`, `company_id`
- `score` (0-10)
- `feedback` (texto livre)
- `trigger_type` (monthly, campaign_delivery, qbr)
- `responded_at`
- `contact_name`, `contact_email`
- `follow_up_done`, `follow_up_notes`
- `created_at`

**Nova tabela: `client_suggestions`**
- `id`, `client_id`, `company_id`
- `title`, `description`
- `category` (service, creative, communication, other)
- `status` (new, reviewing, planned, implemented, declined)
- `priority` (low, medium, high)
- `admin_notes`
- `submitted_by` (nome do contato)
- `created_at`, `updated_at`

### Componentes React:

1. **`CSNPSTracker.tsx`** - Dashboard de NPS
   - Grafico de evolucao do NPS
   - Lista de detratores/passivos/promotores
   - Acoes de follow-up

2. **`CSSuggestionBox.tsx`** - Backlog de sugestoes
   - Kanban de sugestoes por status
   - Filtros por cliente/categoria
   - Historico de implementacoes

3. **`CSNPSSurveyModal.tsx`** - Modal de pesquisa NPS
   - Pergunta simples (0-10)
   - Campo de feedback opcional
   - Enviado automaticamente apos entregas

### Edge Functions:

- **`send-nps-survey`**: Dispara pesquisa NPS via WhatsApp/Email
- **`process-nps-response`**: Processa resposta e atualiza health score

---

## 6. Comprovante de Valor Mensal (Feature Diferencial)

### O que sera feito:
Pagina publica interativa (mobile-first) com resumo mensal de resultados.

### Tabelas no Banco de Dados:

**Nova tabela: `value_statements`**
- `id`, `client_id`, `company_id`
- `period_month`, `period_year`
- `total_investment`, `total_return`
- `leads_generated`, `conversions`
- `best_campaign_id`, `best_creative_id`
- `executive_summary` (gerado por IA)
- `next_month_plan`
- `public_token`
- `status` (draft, sent, viewed, approved)
- `sent_at`, `viewed_at`, `approved_at`
- `approval_notes`
- `created_at`, `updated_at`

### Componentes React:

1. **`CSValueStatementGenerator.tsx`** - Gerador do comprovante
   - Puxa dados automaticamente
   - Preview antes de enviar
   - Personalizacao de mensagem

2. **`CSValueStatementPublic.tsx`** - Pagina publica (nova rota)
   - Design mobile-first
   - Grafico de investimento vs retorno
   - Destaque do melhor criativo
   - Botao "Aprovar Plano do Proximo Mes"

3. **`CSValueStatementList.tsx`** - Lista de comprovantes enviados
   - Status de visualizacao
   - Taxa de aprovacao
   - Historico

### Rotas:

- `/cs/value-statement/:token` - Pagina publica do comprovante

---

## 7. Integracao com Sistema Existente

### Modificacoes em Componentes Existentes:

1. **`ClientDetailsLayout.tsx`**: Adicionar nova secao "Customer Success" no menu lateral
2. **`useClientHealthScore.tsx`**: Expandir para usar os 3 pilares
3. **`AccountHealthRadar.tsx`**: Atualizar visual para mostrar pilares
4. **`AlertasDoSistema.tsx`**: Integrar novos tipos de alertas CS

### Novas Paginas:

| Rota | Componente | Descricao |
|------|------------|-----------|
| `/cs` | `CSHub.tsx` | Dashboard principal de CS |
| `/cs/clients/:id` | `CSClientDetail.tsx` | Detalhe CS do cliente |
| `/clientes/:id/cs` | `ClienteCS.tsx` | Aba CS no detalhe do cliente |
| `/cs/value-statement/:token` | `ValueStatementPublic.tsx` | Comprovante publico |

### Novas Edge Functions:

| Funcao | Tipo | Descricao |
|--------|------|-----------|
| `calculate-health-score-360` | Manual | Recalcula health score |
| `check-milestone-triggers` | Cron (diario) | Verifica milestones automaticos |
| `send-celebration` | Manual | Envia mensagem de celebracao |
| `generate-qbr-content` | Manual | Gera conteudo QBR com IA |
| `check-qbr-overdue` | Cron (semanal) | Alerta QBR atrasado |
| `monitor-cs-alerts` | Cron (6h) | Monitora todos os gatilhos CS |
| `send-nps-survey` | Cron/Manual | Dispara pesquisa NPS |
| `generate-value-statement` | Cron (mensal) | Gera comprovante de valor |

---

## Fases de Implementacao

### Fase 1: Fundacao (Semana 1-2)
- Criar tabelas no banco de dados
- Criar `CSHub.tsx` como pagina principal
- Implementar Health Score 360 (expandir o existente)
- Criar `CSRiskRadar.tsx`

### Fase 2: Jornada do Cliente (Semana 3-4)
- Implementar sistema de Milestones
- Criar componentes da Jornada da Vitoria
- Implementar celebracoes automaticas

### Fase 3: Touchpoints e QBR (Semana 5-6)
- Implementar log de touchpoints
- Criar gerador de QBR automatico
- Integrar com Lovable AI para resumos

### Fase 4: Alertas e Automacoes (Semana 7-8)
- Expandir sistema de alertas
- Implementar gatilhos de CS
- Criar tarefas automaticas

### Fase 5: Feedback e Valor (Semana 9-10)
- Implementar sistema NPS
- Criar caixa de sugestoes
- Desenvolver Comprovante de Valor Mensal

---

## Detalhes Tecnicos

### Hooks Personalizados:

```text
useCSHealthScore() - Health Score 360 do cliente
useClientMilestones(clientId) - Milestones do cliente
useCSAlerts() - Alertas especificos de CS
useQBRReports(clientId) - Relatorios QBR
useNPSResponses(clientId) - Respostas NPS
useValueStatements(clientId) - Comprovantes de valor
```

### Integracao com Lovable AI:

- Resumo executivo de QBR
- Geracao de plano de acao
- Analise de sentimento do feedback NPS
- Sugestoes de recuperacao para clientes em risco

### Notificacoes:

- WhatsApp: Celebracoes, NPS, Comprovante de Valor
- Email: QBR, Relatorios detalhados
- Sistema: Alertas para CS, Tarefas automaticas
