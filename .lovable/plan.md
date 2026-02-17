

# Tela de Historias Detalhada - Gestao de Projetos

## Resumo

Redesenhar completamente a pagina `/historias`, substituindo os cards atuais por uma tela profissional com indicadores de performance, filtros avancados e tabela de dados detalhada.

## Estrutura da Nova Tela

A pagina tera 3 secoes principais:

1. **Indicadores (KPIs)** - Cards de resumo no topo
2. **Filtros** - Barra de filtros aprimorada
3. **Tabela de Dados** - Tabela completa substituindo os cards

---

## 1. Indicadores (KPIs no topo)

Quatro cards de resumo:
- **Total de Historias** - quantidade total filtrada
- **Tempo Medio de Conclusao** - media em dias entre `created_at` e `completed_at` das historias concluidas
- **Historias por Cliente** - quantidade de clientes distintos com historias
- **Taxa de Conclusao** - percentual de historias com status `done`

---

## 2. Filtros Aprimorados

Manter os filtros existentes e adicionar:
- **Filtro por Cliente** - Select com lista de clientes (substituindo o campo de busca por texto)
- **Status expandido** - Aberta / Em Andamento / Concluida / Todas (mapear `progress` e `done`)
- **Busca por titulo** - manter campo de busca
- **Filtro por Squad** - manter select existente

---

## 3. Tabela de Dados

Colunas da tabela:

| Coluna | Fonte |
|--------|-------|
| ID | `historia.id` (ultimos 6 chars) |
| Cliente | `client_name` (do join com clients) |
| Titulo/Descricao | `historia.title` + `description` truncada |
| Data de Abertura | `created_at` |
| Data de Fechamento | `completed_at` (se status = done) |
| Tempo Total | Diferenca entre `created_at` e `completed_at` |
| Tempo de Trabalho | Soma de `duration_minutes` da tabela `task_time_tracking` |
| Lider Responsavel | `responsible_name` |
| Progresso | Barra de progresso (subtasks_done / subtasks_total) |
| Status | Badge colorido |

---

## Detalhes Tecnicos

### Arquivos a Modificar

1. **`src/hooks/useHistorias.ts`**
   - Adicionar campo `completed_at` na query de tasks
   - Buscar tempo de trabalho da tabela `task_time_tracking` agrupado por `task_id` (sum de `duration_minutes`)
   - Adicionar campo `clients` (lista unica) para popular o filtro de cliente por select
   - Estender interface `Historia` com `completed_at` e `total_work_minutes`

2. **`src/pages/Historias.tsx`**
   - Substituir grid de cards por componentes de KPIs + Tabela
   - Calcular metricas de resumo (tempo medio, taxa conclusao)
   - Usar componentes `Table` do shadcn/ui

3. **`src/components/historias/HistoriaFilters.tsx`**
   - Adicionar Select de cliente (com lista populada do hook)
   - Expandir opcoes de status para incluir "Em Andamento"

4. **`src/components/historias/HistoriaCard.tsx`**
   - Manter arquivo (pode ser usado futuramente) mas nao sera mais importado na pagina principal

5. **Novo: `src/components/historias/HistoriaTable.tsx`**
   - Componente de tabela com todas as colunas
   - Formatacao de datas com `date-fns` e locale `ptBR`
   - Calculo de tempo total (dias/horas) e tempo de trabalho

6. **Novo: `src/components/historias/HistoriaKPIs.tsx`**
   - 4 cards de indicadores com icones e valores calculados

### Busca de Tempo de Trabalho

Consulta adicional no hook para buscar tempo investido:
```sql
SELECT task_id, SUM(duration_minutes) as total_minutes
FROM task_time_tracking
WHERE task_id IN (historiaIds)
GROUP BY task_id
```

Para historias (tasks pai), tambem somar o tempo das subtarefas:
```sql
SELECT parent.id, SUM(ttt.duration_minutes)
FROM tasks parent
JOIN tasks sub ON sub.parent_task_id = parent.id
JOIN task_time_tracking ttt ON ttt.task_id = sub.id
WHERE parent.id IN (historiaIds)
```

### Formatacao de Tempo

- Tempo total: diferenca em dias entre abertura e fechamento (ex: "12 dias")
- Tempo de trabalho: converter minutos para formato legivel (ex: "4h 30min")

