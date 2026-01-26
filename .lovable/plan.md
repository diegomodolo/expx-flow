
# Plano: Módulo CS com Menu Expandido e Lista de Clientes Dedicada

## Visão Geral

Implementação de uma estrutura completa de Customer Success com:
1. **Menu lateral dedicado** com submenus para as 4 áreas principais
2. **Nova lista de clientes focada em CS** com métricas de saúde, NPS, risco de churn e touchpoints

---

## Fase 1: Reestruturar Menu Lateral

### 1.1 Atualizar DashboardSidebar.tsx

Transformar o item "Customer Success" atual em uma categoria expandível com submenu:

```
Customer Success (Heart icon)
├── Radar de Risco
├── Saúde 360
├── Jornada
├── Ações
└── Clientes CS  ← Nova tela de lista
```

**Alterações em `src/components/dashboard/DashboardSidebar.tsx`:**
- Mover "Customer Success" de item simples para categoria própria
- Adicionar 5 subitens com rotas específicas

---

## Fase 2: Criar Rotas Dedicadas para Cada Seção

### 2.1 Novas páginas em `src/pages/cs/`:

| Arquivo | Rota | Descrição |
|---------|------|-----------|
| `CSRiskRadarPage.tsx` | `/cs/radar` | Radar de Risco (conteúdo da tab atual) |
| `CSHealth360Page.tsx` | `/cs/saude` | Saúde 360 (cards de health score) |
| `CSJourneyPage.tsx` | `/cs/jornada` | Jornada da Vitória |
| `CSActionsPage.tsx` | `/cs/acoes` | Ações, NPS, QBR, Value Statements |
| `CSClientsList.tsx` | `/cs/clientes` | Nova lista de clientes focada em CS |

### 2.2 Atualizar `src/App.tsx`:
- Adicionar rotas aninhadas `/cs/*`
- Manter `/cs` como redirect para `/cs/radar`

---

## Fase 3: Layout Compartilhado para CS

### 3.1 Criar `src/components/cs/CSLayout.tsx`

Layout com sidebar interna (similar ao RadarLayout):
- Sidebar compacta com ícones
- Expande com tooltip no hover
- Destaque visual na rota ativa

**Estrutura visual:**
```
┌─────────────────────────────────────────────────────────┐
│ DashboardLayout (sidebar principal)                      │
│ ┌──────┬────────────────────────────────────────────────┐│
│ │ CS   │ Conteúdo da seção ativa                        ││
│ │ Menu │                                                 ││
│ │      │                                                 ││
│ │ 🎯   │  [KPIs]   [Cards/Tabelas]                      ││
│ │ ❤️   │                                                 ││
│ │ 🏆   │                                                 ││
│ │ ⚡   │                                                 ││
│ │ 👥   │                                                 ││
│ └──────┴────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Fase 4: Nova Lista de Clientes para CS

### 4.1 Criar `src/pages/cs/CSClientsList.tsx`

Tela inspirada no `Clientes.tsx` atual, mas com foco em métricas CS:

**Colunas da tabela:**
| Coluna | Descrição |
|--------|-----------|
| Cliente | Avatar + Nome + Empresa |
| Health Score | Barra de progresso colorida (0-100%) |
| Risco de Churn | Badge (Crítico/Alto/Médio/Baixo) |
| NPS | Score com ícone (Promotor/Passivo/Detrator) |
| Último Contato | Data + dias desde último touchpoint |
| Campanhas Ativas | Contador |
| Onboarding | Status (Pendente/Em Andamento/Concluído) |
| Ações | Ver, Editar, Registrar Touchpoint |

**Filtros disponíveis:**
- Por risco de churn
- Por faixa de health score
- Por status de onboarding
- Por responsável CS
- Busca por nome

**Funcionalidades:**
- Ordenação por qualquer coluna
- Paginação
- Edição inline via ClientDialog existente
- Botão "Registrar Touchpoint" direto na lista
- Botão "Configurar Health Score" para clientes sem config

### 4.2 Criar hook `useCSClientsList.tsx`

Hook dedicado que combina:
- Dados de `clients` (tabela principal)
- Dados de `client_health_config`
- Dados de `client_touchpoints` (último contato)
- Estatísticas de campanhas

---

## Fase 5: Integração e Navegação

### 5.1 Atualizar CSHub.tsx

Transformar em página de redirect ou overview rápida que redireciona para `/cs/radar`

### 5.2 Links de navegação

Ao clicar em cliente na lista CS → abre `/clientes/:id/cs` (página de CS individual já existente)

---

## Arquivos a Criar

```
src/
├── components/cs/
│   └── CSLayout.tsx                 # Layout compartilhado
│
├── pages/cs/
│   ├── CSRiskRadarPage.tsx         # Radar de Risco
│   ├── CSHealth360Page.tsx         # Saúde 360
│   ├── CSJourneyPage.tsx           # Jornada
│   ├── CSActionsPage.tsx           # Ações
│   └── CSClientsList.tsx           # Lista de clientes CS
│
└── hooks/
    └── useCSClientsList.tsx        # Hook para lista de clientes
```

## Arquivos a Modificar

```
src/
├── components/dashboard/
│   └── DashboardSidebar.tsx        # Adicionar categoria CS com submenus
│
├── App.tsx                          # Adicionar rotas /cs/*
│
└── pages/cs/
    └── CSHub.tsx                    # Simplificar ou redirecionar
```

---

## Detalhes Técnicos

### Menu na Sidebar

Nova categoria no `menuCategories`:
```typescript
{
  title: "Customer Success",
  icon: Heart,
  items: [
    { title: "Radar de Risco", url: "/cs/radar", icon: AlertTriangle, permission: "clientes" },
    { title: "Saúde 360", url: "/cs/saude", icon: Activity, permission: "clientes" },
    { title: "Jornada", url: "/cs/jornada", icon: Trophy, permission: "clientes" },
    { title: "Ações", url: "/cs/acoes", icon: Target, permission: "clientes" },
    { title: "Clientes CS", url: "/cs/clientes", icon: Users, permission: "clientes" },
  ]
}
```

### Rotas no App.tsx

```typescript
<Route path="/cs" element={<CSLayout />}>
  <Route index element={<Navigate to="/cs/radar" replace />} />
  <Route path="radar" element={<CSRiskRadarPage />} />
  <Route path="saude" element={<CSHealth360Page />} />
  <Route path="jornada" element={<CSJourneyPage />} />
  <Route path="acoes" element={<CSActionsPage />} />
  <Route path="clientes" element={<CSClientsList />} />
</Route>
```

### Hook useCSClientsList

```typescript
// Retorna clientes com dados CS integrados
interface CSClientListItem {
  id: string;
  name: string;
  company: string;
  avatar: string | null;
  
  // CS Data
  healthScore: number;
  churnRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  npsScore: number | null;
  onboardingStatus: string;
  lastTouchpointAt: string | null;
  activeCampaigns: number;
  csManagerId: string | null;
  
  // Para edição
  hasHealthConfig: boolean;
}
```

---

## Resultado Final

1. **Menu organizado**: CS tem sua própria categoria no sidebar com 5 submenus
2. **Navegação fluida**: Cada seção é uma página dedicada com URL própria
3. **Lista de clientes CS**: Visão focada em métricas de retenção e sucesso
4. **Ações rápidas**: Registrar touchpoint, editar config direto da lista
5. **Consistência visual**: Usa mesmos componentes e padrões do sistema
