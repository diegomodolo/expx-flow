

# Backlog Command Center - Central de Processamento de Demandas

## Resumo

Construir uma nova tela dedicada de administracao de Backlog, separada do Command Center existente, com foco em triagem rapida, organizacao por peso/cliente e prontidao para distribuicao aos lideres de Squad.

---

## Estrutura das 3 Zonas

```text
+------------------+---------------------------------------------+
|                  |                                             |
|  ZONA A          |          ZONA B                             |
|  Sidebar de      |          "Bucket" Central                   |
|  Clientes +      |          Cards de Tarefas com               |
|  Filtros         |          densidade proporcional             |
|                  |                                             |
|  - Logo cliente  |          - Selecao multipla                 |
|  - Badge minutos |          - Indicador de Prontidao           |
|  - Temperatura   |          - Tags inteligentes                |
|                  |                                             |
+------------------+---------------------------------------------+
|                                                                |
|  ZONA C - Footer Dinamico ("Painel de Pesagem")               |
|  "12 tarefas selecionadas (216 min) = 60% de 1 colaborador"   |
|                                                                |
+----------------------------------------------------------------+
```

---

## Fase 1 - Estrutura Base e Rota

**O que sera feito:**
- Nova pagina `BacklogCommandCenter.tsx` em `/backlog-command-center`
- Hook dedicado `useBacklogCommandCenter.ts` para buscar tarefas com status `todo` sem `start_date`, agrupadas por cliente
- Layout de 3 zonas usando flexbox: sidebar lateral (clientes), area central (cards), footer fixo

**Detalhes tecnicos:**
- Rota registrada no router existente com permissao `command-center`
- Query Supabase com JOIN em `task_clients` e `clients` para obter dados de cliente por tarefa
- Estado local para selecao multipla de tarefas (`selectedTaskIds: Set<string>`)

---

## Fase 2 - Zona A: Sidebar de Clientes e Filtros

**Funcionalidades:**
- Lista vertical de clientes com avatar/logo e nome
- Badge ao lado mostrando total de minutos acumulados no backlog (soma de `ai_estimated_minutes`)
- Barra de "Temperatura" por cliente:
  - Azul: fluxo normal
  - Laranja: backlog crescendo (mais tarefas criadas que concluidas nos ultimos 3 dias)
  - Vermelho: sem tarefas distribuidas ha mais de 48h
- Filtro por clique no cliente (filtra a Zona B)
- Toggles de visualizacao: por Urgencia, por Tipo (`task_type`), por Projeto

**Detalhes tecnicos:**
- Componente `BacklogClientSidebar.tsx`
- Calculo de temperatura baseado em comparacao de `created_at` vs `completed_at` dos ultimos 3 dias
- Deteccao de 48h sem distribuicao: verificar ultima tarefa com `start_date` preenchido para aquele cliente

---

## Fase 3 - Zona B: Bucket Central de Tarefas

**Funcionalidades:**
- Cards com altura sutilmente proporcional ao `ai_estimated_minutes` (minimo 60px, maximo 120px)
- Indicador de Prontidao ("raio"): card fica opaco se faltam informacoes (sem `description`, sem checklist, etc.)
- Tags inteligentes:
  - `[URGENTE]`: card com borda pulsante vermelha (reutiliza logica de aging existente)
  - `[RECORRENTE]`: icone de loop se `recurring_template_id` esta preenchido
- Selecao multipla com checkbox em cada card
- Ordenacao inteligente (Smart Sorting): por custo-beneficio (tarefas rapidas com prioridade alta primeiro)

**Detalhes tecnicos:**
- Componente `BacklogBucket.tsx` e `BacklogTaskCard.tsx`
- Calculo de readiness: `description` preenchido + `ai_estimated_minutes` > 0 + tem cliente vinculado
- Altura do card: `Math.min(120, Math.max(60, (minutes / 60) * 120))px`

---

## Fase 4 - Zona C: Footer Dinamico (Painel de Pesagem)

**Funcionalidades:**
- Barra fixa no rodape que aparece quando ha tarefas selecionadas
- Exibe: quantidade selecionada, total de minutos, equivalente em % de capacidade diaria (360 min = 100%)
- Botoes de Bulk-Action:
  - "Atribuir em Massa": abre modal para escolher Squad/membro
  - "Liberar para Lideres": altera status das tarefas para `in_progress` com `start_date` definido
- Animacao de entrada slide-up quando selecao ativa

**Detalhes tecnicos:**
- Componente `BacklogFooterBar.tsx`
- Capacidade diaria = 360 minutos (6h uteis, alinhado com o Command Center existente)
- Bulk update via Supabase batch: `supabase.from('tasks').update({...}).in('id', selectedIds)`

---

## Fase 5 - Quick Entry (Lancamento Relampago)

**Funcionalidades:**
- Campo de texto inteligente no topo da Zona B
- Parser de sintaxe: `"Post Black Friday @ClienteX #Design /18min"`
  - `@` = cliente (busca por nome)
  - `#` = categoria/tipo
  - `/` = tempo estimado em minutos
- Criacao instantanea do card sem formulario

**Detalhes tecnicos:**
- Componente `BacklogQuickEntry.tsx`
- Regex parser para extrair tokens: `/@(\w+)/`, `/#(\w+)/`, `/\/(\d+)min/`
- Busca fuzzy no nome do cliente para o `@`
- Fallback: se parser nao encontrar cliente, abre popover de selecao

---

## Fase 6 - Simulador de Impacto e Filtro de Ociosidade

**Funcionalidades:**
- Botao "Simular Distribuicao": mostra preview visual da timeline da Squad com as tarefas selecionadas encaixadas
- Reutiliza componente `WorkloadTimeline` existente em modo read-only
- Filtro de Ociosidade: botao que destaca tarefas que cabem nos slots livres dos membros da Squad

**Detalhes tecnicos:**
- Componente `BacklogImpactSimulator.tsx` usando Dialog/Sheet
- Calculo de slots livres reutilizando logica de `findNextFreeSlot` do `useCommandCenter`
- Tarefas compativeis recebem classe CSS de destaque (`ring-2 ring-primary`)

---

## Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| `src/pages/BacklogCommandCenter.tsx` | Pagina principal |
| `src/hooks/useBacklogCommandCenter.ts` | Hook de dados e logica |
| `src/components/backlog-center/BacklogClientSidebar.tsx` | Sidebar de clientes |
| `src/components/backlog-center/BacklogBucket.tsx` | Area central de cards |
| `src/components/backlog-center/BacklogTaskCard.tsx` | Card individual |
| `src/components/backlog-center/BacklogFooterBar.tsx` | Footer dinamico |
| `src/components/backlog-center/BacklogQuickEntry.tsx` | Campo de entrada rapida |
| `src/components/backlog-center/BacklogImpactSimulator.tsx` | Modal de simulacao |
| `src/components/backlog-center/BacklogHeader.tsx` | Header com metricas |

## Arquivos a Modificar

| Arquivo | Motivo |
|---|---|
| `src/App.tsx` | Adicionar rota `/backlog-command-center` |
| Sidebar/navegacao | Adicionar link no menu |

---

## Ordem de Implementacao

1. Hook de dados + Pagina base com layout de 3 zonas
2. Sidebar de clientes com badges e temperatura
3. Bucket central com cards proporcionais e indicador de prontidao
4. Footer dinamico com bulk-actions
5. Quick Entry com parser inteligente
6. Simulador de impacto e filtro de ociosidade

