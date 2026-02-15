

# Squads de Agentes de IA - Editor Visual de Workflows Colaborativos

## Resumo

Criar um sistema de "Squads de Agentes" onde o usuario pode montar visualmente equipes de agentes de IA por cliente, definir hierarquias (lider, gerentes, executores), e configurar fluxos de delegacao automatica entre eles. O lider recebe a tarefa do usuario e orquestra os demais agentes ate gerar o produto final.

## Estrutura da Feature

### 1. Novas tabelas no banco de dados

- **ia_agent_squads**: Cadastro das squads (nome, descricao, client_id, company_id, user_id, status)
- **ia_agent_squad_members**: Membros da squad (squad_id, agent_id, role [leader/manager/executor], position_x, position_y - para o canvas visual)
- **ia_agent_squad_flows**: Conexoes/fluxos entre agentes (squad_id, source_agent_id, target_agent_id, label, condition - para definir o caminho de delegacao)
- **ia_agent_squad_executions**: Log de execucoes da squad (squad_id, triggered_by, status, input, final_output, started_at, completed_at)
- **ia_agent_squad_execution_steps**: Passos individuais de cada execucao (execution_id, agent_id, input, output, status, order, started_at, completed_at)

### 2. Pagina de listagem - `/ia/squads`

- Grid de cards com as squads existentes (similar a pagina de Agentes)
- Filtros por cliente
- Botao "Criar Nova Squad"
- Cada card mostra: nome da squad, cliente vinculado, quantidade de agentes, status

### 3. Editor Visual da Squad - `/ia/squads/:squadId/edit`

Baseado no mesmo padrao do FunnelEditor (React Flow / @xyflow/react):

- **Barra lateral esquerda**: Lista de agentes disponiveis para arrastar ao canvas (filtrados pelo cliente da squad)
- **Canvas central**: Area de arraste com React Flow onde os agentes sao posicionados como nos
- **Tipos de nos**:
  - **AgentNode**: No customizado mostrando nome do agente, avatar, role (lider/gerente/executor), e skills habilitadas
  - **GroupNode**: Reutilizar conceito de agrupamento para organizar etapas (ex: "Analise", "Criacao", "Revisao")
- **Conexoes (Edges)**: Setas entre agentes representando o fluxo de delegacao, com labels editaveis (ex: "Enviar briefing", "Revisar copy")
- **Painel de propriedades**: Ao clicar num agente-no, abre painel lateral para definir:
  - Role na squad (Lider, Gerente, Executor)
  - Instrucoes especificas para o contexto da squad
  - Condicoes de ativacao (quando este agente deve ser acionado)

### 4. Edge Function para orquestracao - `squad-orchestrator`

- Recebe o input do usuario e o squad_id
- Identifica o agente lider
- Executa o fluxo sequencialmente seguindo as conexoes definidas no editor visual:
  1. Envia input ao lider
  2. Lider processa e gera delegacoes (seguindo as edges do grafo)
  3. Cada agente downstream recebe o output do anterior como contexto
  4. Quando todos completam, o resultado final retorna ao usuario
- Registra cada passo na tabela de execucoes

### 5. Integracao com o menu lateral

- Adicionar item "Squads de IA" no submenu de Inteligencia Artificial, abaixo de "Agentes de IA"

---

## Detalhes Tecnicos

### Arquitetura de arquivos

```text
src/
  pages/
    AgentSquads.tsx          -- Listagem de squads
    AgentSquadEditor.tsx     -- Editor visual (React Flow)
  components/
    agent-squads/
      SquadAgentNode.tsx     -- No customizado para agente
      SquadAgentLibrary.tsx  -- Sidebar com agentes arrastaveis
      SquadNodeEditPanel.tsx -- Painel de config do no
      SquadExecutionLog.tsx  -- Visualizacao de execucoes
  hooks/
    useAgentSquads.tsx       -- CRUD de squads
    useSquadExecution.tsx    -- Acompanhar execucoes

supabase/functions/
  squad-orchestrator/
    index.ts                 -- Orquestracao da squad
```

### Fluxo de orquestracao (squad-orchestrator)

```text
Usuario envia mensagem
        |
        v
  Identifica Lider
        |
        v
  Lider processa input
        |
   (segue edges do grafo)
        |
   +---------+---------+
   |                   |
   v                   v
Analista           Copywriter
   |                   |
   v                   v
  (output)          (output)
   |                   |
   +---------+---------+
             |
             v
      Designer (gera imagem)
             |
             v
      Lider consolida
             |
             v
      Retorna ao usuario
```

### Modelo de dados dos nos (React Flow)

Cada agente no canvas sera armazenado com:
- `agent_id` (referencia ao ia_agents)
- `role` (leader | manager | executor)
- `squad_instructions` (instrucoes adicionais para contexto da squad)
- `position` (x, y no canvas)

As conexoes (edges) definem a ordem de delegacao e sao persistidas na tabela `ia_agent_squad_flows`.

### Logica de execucao

A Edge Function `squad-orchestrator` carrega o grafo da squad, faz uma travessia topologica (respeitando dependencias), e executa cada agente na ordem correta, passando o output acumulado como contexto. Agentes em paralelo (sem dependencia entre si) podem ser executados simultaneamente.

