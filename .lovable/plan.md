
# Command Center Expx -- Centro de Comando de Squad

Tela de gestao em tempo real para lideres de squad, com integracao Discord, timeline visual por colaborador e automacoes de atribuicao de tarefas.

---

## Visao Geral

Uma nova pagina acessivel via sidebar (Equipe > Command Center) que funciona como um painel de controle operacional para lideres de squad. A interface combina visualizacao de carga de trabalho, drag-and-drop de tarefas e notificacoes automaticas via Discord.

---

## Fase 1 -- Infraestrutura e Rota (Base)

**Objetivo**: Criar a pagina, rota e entrada no sidebar.

- Criar `src/pages/SquadCommandCenter.tsx` com layout base usando `DashboardLayout`
- Adicionar rota `/squad-command-center` no `App.tsx` (protegida)
- Adicionar item "Command Center" no sidebar em "Equipe" (`DashboardSidebar.tsx`) com icone `Radar` ou `Activity`
- Adicionar permission type `command-center` no sistema de permissoes

---

## Fase 2 -- Header Dinamico (Saude da Operacao)

**Objetivo**: Exibir metricas em tempo real no topo da pagina.

Componente: `src/components/command-center/CommandCenterHeader.tsx`

- **Grafico Donut** de disponibilidade: % de colaboradores da squad com tarefas ativas agora vs total (usando `recharts` PieChart)
- **Clock-In Sync com Discord**: Consultar presenca dos membros via nova action `get-member-presence` na edge function `discord-bot` (endpoint `GET /guilds/{id}/members/{id}` retorna status). Avatares ficam opacos quando o membro esta offline/idle no Discord
- **Metrica de Vazao**: Contador "Concluidas / Total" do dia, calculado a partir da tabela `tasks` filtrada por `completed_at` no dia atual

### Mudancas na Edge Function `discord-bot`:
- Adicionar action `get-member-presence` que faz `GET /guilds/{guild_id}/presences` (nota: o Discord REST API nao expoe presenca diretamente -- sera necessario usar o status "Online/Offline" baseado na ultima atividade, ou marcar manualmente via slash command `/online`)
- Alternativa viavel: usar `GET /guilds/{guild_id}/members` que ja existe, e adicionar campo de status manual na tabela `employees` (ex: `discord_status`) atualizado via webhook ou comando

---

## Fase 3 -- Seletor de Squad e Colaboradores

Componente: `src/components/command-center/SquadSelector.tsx`

- Dropdown para selecionar a squad ativa (usa `useTeams`)
- Ao selecionar, carrega membros da squad e suas tarefas do dia
- Se o usuario logado e lider de apenas uma squad, pre-seleciona automaticamente

---

## Fase 4 -- Coluna de Backlog (The Inbox)

Componente: `src/components/command-center/BacklogColumn.tsx`

- Lista de tarefas com status `todo` da squad selecionada, sem `start_date` definido
- **Borda colorida por area**: Baseada na cor da squad/categoria da tarefa
- **Indicador de Aging**: Calcula horas desde `created_at`. Se > 4h, aplica borda amarela/laranja com `animate-pulse`
- **Quick Preview**: Tooltip com `HoverCard` do Radix exibindo descricao resumida, prioridade, e prazo
- Cards arrastáveis usando `react-beautiful-dnd` (ja instalado)

---

## Fase 5 -- Timeline de Workload (Regua de 6 Horas)

Componente: `src/components/command-center/WorkloadTimeline.tsx`

A parte central e mais complexa da tela.

- Para cada colaborador da squad, renderiza uma **linha do tempo horizontal** representando 6 horas de trabalho
- A regua e dividida em **blocos de 18 minutos** (20 blocos por colaborador)
- Tarefas ja atribuidas (com `start_date` no dia e `ai_estimated_minutes`) ocupam slots proporcionalmente
- Horario de inicio configuravel (ex: 08:00) usando campo existente ou default

### Subcomponentes:
- `TimelineRow.tsx` -- Linha de um colaborador com avatar, nome, e regua
- `TimelineSlot.tsx` -- Bloco individual de 18min (livre ou ocupado)
- `TimelineTaskCard.tsx` -- Card de tarefa posicionado na regua

### Drag & Drop (Ghost Drag):
- Ao arrastar card do backlog sobre a timeline, exibir preview visual ("sombra")
- Se o horario esta livre: sombra verde (`bg-green-500/30`)
- Se ja ocupado: sombra vermelha (`bg-red-500/30`)
- Ao soltar: verificar se cabe nas 6h restantes. Se nao couber, exibir `AlertDialog` de confirmacao

### Smart Allocation (ao soltar):
- Calcular proximo slot livre na timeline do colaborador
- Atualizar `start_date` da tarefa no banco com o horario calculado
- Se `ai_estimated_minutes` nao estiver definido, usar 18min como default
- Enviar notificacao via Discord (Fase 7)

---

## Fase 6 -- Time-Collapse (Ajuste em Tempo Real)

Componente: Logica integrada ao `WorkloadTimeline.tsx`

- Quando uma tarefa e marcada como `done` (via UI ou via Discord `/entregar`), recalcular a timeline
- Se a tarefa foi concluida mais rapido que o estimado, puxar tarefas subsequentes para frente
- Usar `supabase.channel()` para realtime updates na tabela `tasks` (listen to UPDATE events)
- Animacao suave com `transition-all duration-500`

---

## Fase 7 -- Integracoes Discord (Automacoes)

### 7a. Notificacao de Atribuicao
- Ao atribuir tarefa (drop na timeline), enviar embed via `send-dm` ao colaborador
- Embed contendo: titulo, deadline, tempo estimado, link para a tarefa
- Usar `discord_user_id` do colaborador (ja mapeado na tabela `employees`)

### 7b. Nova action na Edge Function: `send-task-embed`
- Action dedicada que constroi um embed rico com campos formatados
- Botoes de acao no embed (nota: botoes interativos requerem Discord Interactions endpoint -- simplificar para links inicialmente)

### 7c. Alerta de Overtime
- Criar logica no frontend: se `start_date + ai_estimated_minutes + 7min` < agora e status != `done`, exibir card pulsando em laranja
- Opcionalmente, enviar mensagem automatica no canal da squad via `send-message`

---

## Fase 8 -- Visao de "Carga de Amanha"

- Botao expansivel no final de cada linha de colaborador
- Ao clicar, mostra tarefas com `start_date` ou `deadline` no proximo dia util
- Usa `date-fns` para calcular proximo dia util (pula sabado/domingo)

---

## Fase 9 -- Estilo Visual (Glassmorphism Dark)

- Fundo com gradiente azul-escuro (`from-slate-950 via-blue-950 to-slate-900`)
- Cards com `backdrop-blur-xl bg-white/5 border border-white/10`
- Acentos neon em ciano (`text-cyan-400`), roxo (`text-purple-400`), verde (`text-emerald-400`)
- Sombras com glow: `shadow-[0_0_15px_rgba(6,182,212,0.15)]`
- Avatares offline em P&B com `grayscale filter`

---

## Resumo Tecnico de Arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/SquadCommandCenter.tsx` | Criar -- pagina principal |
| `src/components/command-center/CommandCenterHeader.tsx` | Criar -- header com metricas |
| `src/components/command-center/SquadSelector.tsx` | Criar -- seletor de squad |
| `src/components/command-center/BacklogColumn.tsx` | Criar -- coluna de backlog |
| `src/components/command-center/WorkloadTimeline.tsx` | Criar -- timeline principal |
| `src/components/command-center/TimelineRow.tsx` | Criar -- linha por colaborador |
| `src/components/command-center/TimelineSlot.tsx` | Criar -- slot de 18min |
| `src/components/command-center/TimelineTaskCard.tsx` | Criar -- card na timeline |
| `src/hooks/useCommandCenter.ts` | Criar -- hook de dados do command center |
| `src/App.tsx` | Editar -- adicionar rota |
| `src/components/dashboard/DashboardSidebar.tsx` | Editar -- adicionar item no menu |
| `supabase/functions/discord-bot/index.ts` | Editar -- adicionar action `send-task-embed` |

---

## Limitacoes e Decisoes

1. **Discord Rich Presence**: A API REST do Discord nao expoe presenca de membros. A presenca so esta disponivel via Gateway (WebSocket). Para a v1, usaremos um campo `discord_status` manual ou simplesmente nao implementaremos o Clock-In Sync automatico, deixando o avatar com indicador baseado em "ultima atividade" ou tarefas em andamento.

2. **Slash Commands (/entregar, /travei)**: Requerem um bot com Gateway connection (servidor persistente), o que nao e possivel com Edge Functions serverless. Para a v1, essas acoes serao feitas pela UI do sistema (botoes na tarefa). Futuramente, um bot dedicado pode ser adicionado.

3. **Sons e Haptic Feedback**: Sons podem ser implementados com `Audio API` do browser. Haptic feedback so funciona em dispositivos com suporte (mobile/tablet) via `navigator.vibrate()`.

4. **Implementacao em etapas**: Dada a complexidade, sugiro implementar as Fases 1-5 primeiro (estrutura + timeline + drag-and-drop) e as Fases 6-9 como segunda iteracao.
