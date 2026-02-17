
# Dashboard "Communication-First" - Fase 1: Layout 3 Colunas + Canais

## Resumo

Substituir o dashboard atual (`/dashboard`) por uma interface estilo Discord adaptada para a Expx. Nesta primeira fase, o foco sera no layout visual com 3 colunas funcionais, navegacao por canais de Squad e de Cliente, chat interno por canal e o painel "Meu Dia" com tarefas e timer.

---

## Estrutura Visual

```text
+-------------------+----------------------------------+-------------------+
|  COLUNA ESQUERDA  |       COLUNA CENTRAL             |  COLUNA DIREITA   |
|   (240px fixa)    |        (flex-1)                  |   (320px fixa)    |
|                   |                                  |                   |
| [Canais de Squad] |  [Header do Canal Ativo]         | [Tarefa Atual]    |
|  #squad-01        |  -------------------------       |  Timer 18:00      |
|  #squad-02        |  | Chat de mensagens    |       |                   |
|  #squad-03        |  | com scroll           |       | [Meu Dia]         |
|                   |  | ...                  |       |  Lista de tarefas |
| [Canais Cliente]  |  | ...                  |       |  pendentes        |
|  @cliente-alpha   |  -------------------------       |                   |
|  @cliente-beta    |  [Input de mensagem]             | [Status Equipe]   |
|                   |                                  |  Quem esta online |
| [Canal Geral]     |                                  |  e trabalhando    |
|  #geral           |                                  |                   |
+-------------------+----------------------------------+-------------------+
```

---

## 1. Tabela de Banco de Dados

### Nova tabela: `internal_channels`
Armazena os canais de comunicacao (squads, clientes, geral).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID do canal |
| company_id | uuid (FK companies) | Empresa |
| name | text | Nome exibido |
| channel_type | text | 'squad', 'client', 'general' |
| reference_id | uuid (nullable) | ID do team ou client associado |
| icon | text (nullable) | Emoji ou icone |
| created_at | timestamptz | |

### Nova tabela: `internal_messages`
Mensagens enviadas nos canais internos.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID da mensagem |
| channel_id | uuid (FK internal_channels) | Canal |
| user_id | uuid | Autor (ref auth.users) |
| content | text | Corpo da mensagem |
| task_reference_id | uuid (nullable) | Se menciona uma tarefa |
| is_pinned | boolean | Fixada |
| created_at | timestamptz | |

### RLS Policies
- Usuarios autenticados podem ler mensagens de canais da sua empresa (via company_members)
- Usuarios autenticados podem inserir mensagens em canais da sua empresa
- Usuarios podem deletar apenas suas proprias mensagens

---

## 2. Componentes a Criar

### `src/pages/CommunicationDashboard.tsx`
Pagina principal que substitui NewDashboard. Layout de 3 colunas usando CSS Grid ou flex com larguras fixas. Continua usando `DashboardLayout` (sidebar + header existentes).

### `src/components/comm-hub/ChannelSidebar.tsx`
Coluna esquerda:
- Secao "Squads" - lista canais tipo squad (dados da tabela `teams`)
- Secao "Clientes" - lista canais tipo client (dados da tabela `clients`)
- Secao "Geral" - canal unico de toda a empresa
- Cada item mostra icone + nome + badge de mensagens nao lidas
- Canal ativo fica destacado
- Estetica escura (#0B0E14 nos blocos, bordas sutis)

### `src/components/comm-hub/ChatFlow.tsx`
Coluna central:
- Header com nome do canal ativo + contagem de membros
- Area de scroll com mensagens (avatar, nome, hora, conteudo)
- Deteccao de mencoes de tarefa (#ID) renderizadas como mini-cards clicaveis
- Input de mensagem com envio por Enter (Shift+Enter para quebra de linha)
- Scroll automatico para ultima mensagem

### `src/components/comm-hub/MyDayPanel.tsx`
Coluna direita:
- **Timer da Tarefa Atual**: contagem regressiva de 18 minutos (visual grande e centralizado)
- **Lista "Meu Dia"**: reutiliza logica do MyDayCard existente em formato vertical compacto
- **Status da Equipe**: lista de membros da squad do usuario com indicadores de status (Online/Em Foco/Disponivel)

### `src/components/comm-hub/MessageBubble.tsx`
Componente de mensagem individual:
- Avatar do autor + nome + timestamp
- Conteudo com suporte a markdown basico
- Deteccao de padroes `#XXXXXX` para renderizar mini-card de tarefa

### `src/components/comm-hub/TaskMiniCard.tsx`
Mini-card inline renderizado quando uma tarefa e mencionada no chat:
- Titulo da tarefa, status (badge colorido), responsavel
- Clicavel para abrir TaskDialog

---

## 3. Hook de Dados

### `src/hooks/useInternalChat.ts`
- Busca canais da empresa (auto-criados a partir de teams + clients)
- Busca mensagens do canal selecionado com paginacao (50 por vez)
- Envia mensagens via insert no Supabase
- Subscription realtime para novas mensagens no canal ativo
- Funcao para auto-criar canais quando nao existem (on first load)

---

## 4. Integracao com a Rota

### `src/pages/DashboardPage.tsx`
Alterar para importar `CommunicationDashboard` em vez de `NewDashboard`.

---

## 5. Estetica e UX

- Fundo principal da area de canais: `bg-[#0B0E14]` ou equivalente dark
- Glassmorphism sutil nos paineis (backdrop-blur + bg opacity)
- Fonte Inter (ja instalada no projeto)
- Cores neon para status: verde (disponivel), amarelo (em foco), vermelho (indisponivel)
- Canal ativo com highlight lateral (barra vertical colorida a esquerda)
- Mensagens com hover sutil e opcao de pin
- Input de mensagem com borda arredondada e icone de envio

---

## 6. Sequencia de Implementacao

1. Criar migracao SQL (tabelas + RLS)
2. Criar hook `useInternalChat`
3. Criar componentes visuais (ChannelSidebar, ChatFlow, MyDayPanel, MessageBubble, TaskMiniCard)
4. Montar `CommunicationDashboard` com layout 3 colunas
5. Conectar rota `/dashboard` ao novo componente
6. Auto-gerar canais a partir de squads e clientes existentes

---

## O que NAO esta incluido nesta fase
- Voice Channels / Huddles
- Command Bar (slash commands)
- Focus Mode (blur do chat)
- Notificacoes inteligentes com IA
- Botao de "Mao Levantada"
- Thread automatica por tarefa
- Reply-to-Task (transformar mensagem em atualizacao de tarefa)

Esses recursos serao implementados em fases futuras.
