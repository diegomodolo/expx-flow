
# Plano: Transformar CS de Dashboard Passivo para Ferramenta de Trabalho Ativa

## Visão Geral

Evolução do módulo CS para o "Melhor Módulo do Mundo para Agências", focando em:
1. **Cockpit da CS** - Nova tela operacional "Minha Mesa"
2. **Drill-down de Saúde** - Tooltip explicando o "porquê" do score
3. **Semáforos de Performance** - Indicadores visuais de CPA/ROAS nas listagens
4. **Unificação Radar + Saúde 360** - Eliminar redundância
5. **Jornada em Kanban** - Visualização de pipeline de clientes

---

## Fase 1: Nova Tela "Cockpit da CS" (Minha Mesa)

### Estrutura da Tela

A nova home do módulo CS será dividida em 3 colunas:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Cockpit da CS - Bom dia, [Nome]!                                    [Squad Filter]│
├─────────────────────┬─────────────────────┬──────────────────────────────────────┤
│  🔥 INCÊNDIOS       │  📋 TAREFAS DO DIA  │  💰 OPORTUNIDADES                   │
│  Alertas Críticos   │  Playbook Automático│  Upsell & Vitórias                  │
├─────────────────────┼─────────────────────┼──────────────────────────────────────┤
│ ⚠️ Apollo: NPS 4    │ ☐ Onboarding       │ 💎 Codemed: 3 meses no teto          │
│ [WhatsApp] [Ligar]  │    ControlSis 2/5   │    [Oferecer Gold]                  │
│                     │    [Fazer Call]     │                                      │
│ 🔴 Açougue: -40%    │                     │ 🏆 ACP: Recorde de vendas!           │
│    leads hoje       │ ☐ QBR vence hoje    │    [Enviar Parabéns]                │
│ [Ver Campanha]      │    Certtus          │                                      │
│                     │    [Enviar QBR]     │                                      │
│                     │                     │                                      │
│                     │ ☐ Touchpoint        │                                      │
│                     │    Andes (15 dias)  │                                      │
│                     │    [Mandar Oi]      │                                      │
└─────────────────────┴─────────────────────┴──────────────────────────────────────┘
│                      Progresso do Dia: ████████░░ 6/10 tarefas                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Lógica de Priorização (Regras de Negócio)

**Coluna A - Incêndios (Alertas que não podem esperar):**
| Prioridade | Tipo | Critério | Exemplo |
|------------|------|----------|---------|
| 1 | Queda Brusca de Leads | Variação > -30% em 24h | "Leads caíram 40% hoje" |
| 2 | NPS Detrator | Score <= 6 coletado nos últimos 3 dias | "NPS 4 ontem" |
| 3 | Campanha Pausada | Status mudou para paused/ended inesperadamente | "Campanha principal pausou" |
| 4 | CPA Explodindo | CPA > 200% da meta por 3+ dias | "CPA 3x acima do target" |
| 5 | Cliente Crítico | churn_risk_level = 'critical' | "Risco crítico detectado" |

**Coluna B - Tarefas do Dia (Playbook Automático):**
| Tipo | Critério | Ação Sugerida |
|------|----------|---------------|
| Onboarding | Milestone pendente do tipo 'onboarding' | "Call de Onboarding (Etapa X/Y)" |
| QBR | Próximo QBR vence em <= 7 dias | "Enviar QBR para [Cliente]" |
| Touchpoint | Sem contato há > 10 dias | "Mandar 'Oi' para [Cliente]" |
| NPS Coleta | NPS não coletado há > 30 dias | "Coletar NPS de [Cliente]" |
| Follow-up | Milestone concluído não celebrado | "Celebrar vitória com [Cliente]" |

**Coluna C - Oportunidades (Ouro na Mesa):**
| Tipo | Critério | Ação Sugerida |
|------|----------|---------------|
| Upsell Verba | Spend > 90% do teto por 3+ meses | "Oferecer plano superior" |
| Upsell ROAS | ROAS > 150% da meta consistente | "Expandir investimento" |
| Vitória | Conversões bateram recorde ou meta | "Enviar parabéns" |
| Renovação | Contrato vence em 30-60 dias + Health >= 70 | "Iniciar renovação" |

### Gamificação

- Barra de progresso "Meta do Dia" com contador de tarefas concluídas
- Animação de celebração ao completar 100% das tarefas
- Histórico de dias com 100% no perfil da CS

---

## Fase 2: Drill-down de Saúde (Tooltip/Popover)

### Na Tela Clientes CS

Ao passar o mouse sobre a barra de Health Score, exibir HoverCard com:

```text
┌────────────────────────────────────────────┐
│ 🔍 Análise do Health Score: 45%            │
├────────────────────────────────────────────┤
│ Pilar              Score    Status         │
│ ────────────────────────────────────────── │
│ 💰 Financeiro      30%      ⚠️ Problema    │
│    → ROI caiu 15% vs meta                  │
│                                            │
│ ⚙️ Operacional     60%      ✓ OK          │
│    → 3 campanhas ativas                    │
│                                            │
│ 💬 Relacional      45%      ⚠️ Atenção    │
│    → Sem contato há 20 dias                │
├────────────────────────────────────────────┤
│ [Ver detalhes completos →]                 │
└────────────────────────────────────────────┘
```

Implementação: Adicionar `HoverCard` do Radix ao redor da Progress bar na tabela.

---

## Fase 3: Semáforos de Performance nas Campanhas

### Na Coluna "Campanhas" da Tela Clientes CS

Substituir o número simples por um indicador visual:

```text
Antes: "3"

Depois: 
┌──────────────────┐
│ 🟢 3 campanhas   │  ← Verde: CPA/ROAS batendo meta
│ 🟡 2 campanhas   │  ← Amarelo: 80-100% da meta
│ 🔴 1 campanha    │  ← Vermelho: < 80% da meta
└──────────────────┘
```

Lógica do Semáforo:
- **Verde**: CPA <= target_cpa OU ROAS >= target_roas
- **Amarelo**: CPA entre 100-120% do target OU ROAS entre 80-100%
- **Vermelho**: CPA > 120% do target OU ROAS < 80%

Hover mostra resumo: "CPA: R$45 (meta: R$50) | ROAS: 3.2x (meta: 3x)"

---

## Fase 4: Unificar Radar de Risco + Saúde 360

### Proposta: "Painel de Controle da Carteira"

Renomear e unificar as telas:
- **Antes**: Radar de Risco (tela separada) + Saúde 360 (tela separada)
- **Depois**: Uma única tela "Saúde da Carteira" com filtros por nível de risco

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Saúde da Carteira                                      [Squad] [Período] │
├──────────────────────────────────────────────────────────────────────────┤
│ [Todos] [🔴 Críticos: 2] [🟠 Alto: 5] [🟡 Médio: 8] [🟢 Baixo: 15]       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Cards de clientes filtrados pelo tab selecionado                        │
│  (Reutiliza CSRiskRadar e CSHealthScore360Card)                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

A sidebar do CS mudará:
- **Remove**: "Radar de Risco" e "Saúde 360" como itens separados
- **Adiciona**: "Carteira" (nova tela unificada)

---

## Fase 5: Jornada em Kanban

### Transformar Jornada da Vitória em Pipeline Visual

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Pipeline de Sucesso                                               [Squad Filter] │
├───────────────┬───────────────┬───────────────┬───────────────┬──────────────────┤
│  ONBOARDING   │ SETUP CAMP.   │ PRIMEIROS     │  OTIMIZAÇÃO   │     ESCALA       │
│     (10)      │     (5)       │  LEADS (8)    │     (12)      │      (7)         │
├───────────────┼───────────────┼───────────────┼───────────────┼──────────────────┤
│ ┌───────────┐ │ ┌───────────┐ │ ┌───────────┐ │ ┌───────────┐ │ ┌───────────────┐│
│ │ Cliente A │ │ │ Cliente D │ │ │ Cliente G │ │ │ Cliente J │ │ │   Cliente M   ││
│ │ 🟡 45%    │ │ │ 🟢 78%    │ │ │ 🟢 82%    │ │ │ 🟢 90%    │ │ │   🟢 95%      ││
│ │ [Ação]    │ │ │ [Ação]    │ │ │ [Ação]    │ │ │ [Ação]    │ │ │   [Ação]      ││
│ └───────────┘ │ └───────────┘ │ └───────────┘ │ └───────────┘ │ └───────────────┘│
│ ┌───────────┐ │               │ ┌───────────┐ │               │                  │
│ │ Cliente B │ │               │ │ Cliente H │ │               │                  │
│ │ 🔴 25%    │ │               │ │ 🟡 65%    │ │               │                  │
│ └───────────┘ │               │ └───────────┘ │               │                  │
└───────────────┴───────────────┴───────────────┴───────────────┴──────────────────┘
│ 💡 Insight: 10 clientes travados no Onboarding. Verificar gargalos.              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Stages do Pipeline (baseado em milestone_type)

| Coluna | Critério | Descrição |
|--------|----------|-----------|
| Onboarding | milestones de tipo 'onboarding' pendentes | Fase inicial |
| Setup de Campanha | milestone 'first_campaign' pendente | Configurando campanhas |
| Primeiros Leads | milestone 'first_lead' pendente | Aguardando resultados |
| Otimização | milestone 'monthly_goal' pendente | Ajustando performance |
| Escala | milestone 'quarterly_goal' ou todos concluídos | Expandindo resultados |

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/cs/CSCockpitPage.tsx` | Nova tela "Minha Mesa" - Home operacional da CS |
| `src/components/cs/CSCockpitFires.tsx` | Coluna de Incêndios/Alertas |
| `src/components/cs/CSCockpitTasks.tsx` | Coluna de Tarefas do Dia |
| `src/components/cs/CSCockpitOpportunities.tsx` | Coluna de Oportunidades |
| `src/components/cs/CSHealthScoreTooltip.tsx` | Tooltip/HoverCard com drill-down de saúde |
| `src/components/cs/CSCampaignTrafficLight.tsx` | Semáforo de performance de campanhas |
| `src/components/cs/CSPortfolioPage.tsx` | Tela unificada Carteira (Radar + Saúde) |
| `src/components/cs/CSJourneyKanban.tsx` | Kanban visual do pipeline de sucesso |
| `src/hooks/useCSCockpitData.tsx` | Hook para buscar dados do cockpit (alertas, tarefas, oportunidades) |
| `src/hooks/useCSCampaignPerformance.tsx` | Hook para métricas de campanha por cliente |

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/components/dashboard/DashboardSidebar.tsx` | Adicionar "Cockpit" como primeiro item, renomear/unificar Radar+Saúde |
| `src/App.tsx` | Adicionar rota `/cs/cockpit` e `/cs/carteira` |
| `src/components/cs/CSLayout.tsx` | Atualizar navegação interna |
| `src/pages/cs/CSClientsList.tsx` | Adicionar HoverCard no Health Score + Semáforo nas campanhas |
| `src/pages/cs/CSJourneyPage.tsx` | Transformar em visualização Kanban |
| `src/hooks/useCSClientsList.tsx` | Incluir métricas de performance de campanha |

---

## Reorganização do Menu CS

**Novo menu lateral:**
```
Customer Success
├── 🏠 Cockpit (NOVO - Home operacional)
├── 📊 Carteira (Unificação Radar + Saúde 360)
├── 🏆 Jornada (Kanban visual)
├── ⚡ Ações (Touchpoints, NPS, QBR)
└── 👥 Clientes CS (Lista com drill-down)
```

---

## Detalhes Técnicos

### Hook useCSCockpitData

```typescript
interface CockpitData {
  fires: FireAlert[];      // Alertas críticos
  tasks: DailyTask[];      // Tarefas do dia
  opportunities: Opportunity[]; // Oportunidades
  progress: {
    completed: number;
    total: number;
  };
}

interface FireAlert {
  id: string;
  clientId: string;
  clientName: string;
  type: 'nps_detractor' | 'leads_drop' | 'campaign_paused' | 'cpa_exploding' | 'critical_risk';
  severity: 'critical' | 'high';
  message: string;
  detectedAt: string;
  actions: Array<{ label: string; action: 'whatsapp' | 'call' | 'view_campaign' | 'view_client' }>;
}

interface DailyTask {
  id: string;
  clientId: string;
  clientName: string;
  type: 'onboarding' | 'qbr' | 'touchpoint' | 'nps_collect' | 'celebrate';
  title: string;
  subtitle: string;
  dueType: 'overdue' | 'today' | 'upcoming';
  completed: boolean;
  primaryAction: { label: string; action: string };
}

interface Opportunity {
  id: string;
  clientId: string;
  clientName: string;
  type: 'upsell_budget' | 'upsell_roas' | 'victory' | 'renewal';
  title: string;
  description: string;
  value?: number;
  primaryAction: { label: string; action: string };
}
```

### Lógica de Detecção de Alertas

O hook buscará:
1. **NPS Detrator**: `client_health_config` onde `nps_score <= 6` AND `nps_collected_at` nos últimos 3 dias
2. **Queda de Leads**: Comparar `campaigns.conversions` das últimas 24h vs média dos 7 dias anteriores
3. **CPA Explodindo**: `campaigns` onde CPA atual > 200% do `client_benchmarks.target_cpa`
4. **Cliente Crítico**: `client_health_config.churn_risk_level = 'critical'`

---

## Resultado Final

1. **Cockpit operacional**: CS sabe exatamente o que fazer ao abrir o sistema
2. **Drill-down de saúde**: Causa raiz visível sem navegar para outra tela
3. **Semáforos de performance**: "Cheiro de agência" com métricas de tráfego
4. **Painel unificado**: Visão consolidada da carteira sem fragmentação
5. **Pipeline visual**: Gestora identifica gargalos rapidamente
6. **Gamificação**: Motivação para completar tarefas diárias
