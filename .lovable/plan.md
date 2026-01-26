
# Plano: Integração de Squads no Módulo CS

## Contexto

O sistema já possui estrutura de Squads (tabela `teams`) onde cada cliente pode ser associado a um squad via `team_id`. A necessidade é permitir que cada CS trabalhe focado nos clientes do seu squad, com filtros e visualizações segmentadas.

## Arquitetura da Solução

### 1. Filtro Global de Squad no CSLayout

Adicionar um seletor de Squad no header da área CS que persiste entre navegações:

- Dropdown no topo do CSLayout para selecionar Squad
- Opção "Todos os Squads" (padrão) + "Meu Squad" (baseado no funcionário logado)
- Estado compartilhado via Context (`CSSquadFilterContext`)
- Persistência em localStorage para manter seleção entre sessões

### 2. Atualização dos Hooks de Dados

Modificar os hooks para aceitar filtro de squad:

**useCSClientsList.tsx:**
- Adicionar parâmetro `squadId?: string`
- Incluir `team_id` na query de clientes
- Filtrar clientes pelo squad selecionado

**useCSHealthScore360.tsx:**
- Adicionar parâmetro `squadId?: string`
- Buscar `team_id` dos clientes via join
- Filtrar dados pelo squad

### 3. Exibição do Squad nas Listagens

Adicionar coluna/badge de Squad nas tabelas e cards:

- CSClientsList: Coluna "Squad" com badge colorido
- CSRiskRadar: Identificação do squad em cada card de risco
- CSHealth360: Filtro e agrupamento por squad

### 4. KPIs Segmentados por Squad

Atualizar os cards de estatísticas para mostrar:
- Métricas do Squad selecionado (quando filtrado)
- Comparativo entre Squads (quando "Todos")

### 5. "Meu Squad" para CS Logado

Detectar automaticamente o squad do funcionário logado e oferecer atalho "Meu Squad"

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/contexts/CSSquadFilterContext.tsx` | Context para gerenciar filtro de squad global no módulo CS |

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/components/cs/CSLayout.tsx` | Adicionar header com dropdown de squad e Provider do contexto |
| `src/hooks/useCSClientsList.tsx` | Adicionar busca de `team_id` e filtro por squad |
| `src/hooks/useCSHealthScore360.tsx` | Adicionar filtro por squad nos dados de saúde |
| `src/pages/cs/CSClientsList.tsx` | Coluna de Squad na tabela + filtro adicional |
| `src/pages/cs/CSRiskRadarPage.tsx` | Aplicar filtro de squad e mostrar badge |
| `src/pages/cs/CSHealth360Page.tsx` | Aplicar filtro de squad |
| `src/pages/cs/CSJourneyPage.tsx` | Aplicar filtro de squad no seletor de clientes |
| `src/pages/cs/CSActionsPage.tsx` | Aplicar filtro de squad |
| `src/components/cs/CSRiskRadar.tsx` | Mostrar badge de squad em cada card |

---

## Detalhes Técnicos

### CSSquadFilterContext

```typescript
interface CSSquadFilterContextType {
  selectedSquadId: string | null; // null = todos
  setSelectedSquadId: (id: string | null) => void;
  squads: Team[];
  isLoading: boolean;
  mySquadId: string | null; // squad do usuário logado
}
```

### CSLayout com Filtro

Novo header no CSLayout:
- Logo CS + Título "Customer Success"
- Dropdown: "Todos os Squads" | "Meu Squad ({nome})" | Lista de squads
- Badge com contagem de clientes no squad selecionado

### Alterações no useCSClientsList

```typescript
// Adicionar campos no select
.select('id, name, company, avatar, created_at, team_id')

// Adicionar no retorno
squadId: client.team_id,
squadName: squadsMap[client.team_id] || null,

// Filtro no hook consumer
const filteredClients = selectedSquadId 
  ? clients.filter(c => c.squadId === selectedSquadId)
  : clients;
```

### Tabela de Clientes CS com Squad

Nova coluna após "Cliente":
| Squad | Badge colorido com nome do squad ou "Sem Squad" |

Novo filtro no header:
- Dropdown sincronizado com contexto global

### Badge de Squad no Risk Radar

Cada card de cliente em risco mostra:
- Badge colorido com nome do squad
- Permite identificação rápida de qual CS é responsável

---

## Fluxo do Usuário

1. CS acessa `/cs/radar`
2. No header, seleciona "Squad Marketing" ou "Meu Squad"
3. Todas as páginas CS filtram automaticamente pelos clientes daquele squad
4. KPIs mostram dados apenas do squad selecionado
5. Ao navegar entre seções (Radar, Saúde, Jornada, etc), filtro permanece ativo
6. Pode trocar para "Todos os Squads" para visão geral

---

## Resultado Final

1. **Filtro global** de Squad que persiste em toda navegação CS
2. **Identificação visual** de Squad em todas as listagens
3. **"Meu Squad"** para acesso rápido aos clientes do CS logado
4. **KPIs segmentados** por Squad selecionado
5. **Experiência focada** para cada membro do time de CS
