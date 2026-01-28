
# Sistema de Atendentes e Squads para WhatsApp

## Resumo

Implementar um sistema de atribuicao de conversas que integra com a estrutura de Squads existente, permitindo atribuir conversas tanto a atendentes individuais quanto a squads inteiros.

## Arquitetura de Dados

### Nova coluna na tabela `teams` (Squads)

Adicionar campo para definir quem e o responsavel pelo WhatsApp de cada squad:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| whatsapp_responsible_id | uuid | FK para employees.id - responsavel pelo WhatsApp do squad |

### Nova tabela: `whatsapp_conversation_assignments`

Tabela central para gerenciar atribuicoes de conversas:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK |
| conversation_id | uuid | FK para whatsapp_conversations |
| company_id | uuid | FK para companies |
| assigned_type | text | `individual` ou `squad` |
| assigned_to_user_id | uuid | FK para auth.users (quando individual) |
| assigned_to_team_id | uuid | FK para teams (quando squad) |
| assigned_by | uuid | Quem fez a atribuicao |
| assigned_at | timestamp | Data/hora da atribuicao |
| status | text | `active`, `transferred`, `closed` |
| notes | text | Observacoes |

### Nova tabela: `whatsapp_assignment_history`

Historico completo para auditoria e relatorios de performance:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK |
| conversation_id | uuid | FK |
| company_id | uuid | FK |
| from_user_id | uuid | Atendente anterior |
| from_team_id | uuid | Squad anterior |
| to_user_id | uuid | Novo atendente |
| to_team_id | uuid | Novo squad |
| action | text | `assigned`, `transferred`, `closed`, `reopened` |
| reason | text | Motivo |
| created_at | timestamp | |
| created_by | uuid | Quem realizou |

### Adicionar coluna em `whatsapp_messages`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| sent_by_user_id | uuid | FK - qual colaborador enviou a mensagem |

## Logica de Atribuicao

### Hierarquia de Visibilidade

1. **Conversa atribuida a individuo**: Apenas aquele usuario ve
2. **Conversa atribuida a squad**: O `whatsapp_responsible_id` do squad ve
3. **Conversa nao atribuida**: Todos veem (ou apenas admins, configuravel)

### Atribuicao Automatica via Cliente

Se uma conversa esta vinculada a um `client_id`, e esse cliente tem `team_id`, a conversa pode herdar a atribuicao do squad automaticamente.

### Fluxo de Troca de Responsavel

Quando alguem muda o `whatsapp_responsible_id` de um squad:
- Automaticamente o novo responsavel passa a ver todas as conversas daquele squad
- Nao precisa reatribuir cada conversa individualmente

## Interface de Usuario

### Filtros na Lista de Conversas

Adicionar ao sidebar lateral:
- **Todas**: Todas as conversas visiveis para o usuario
- **Minhas**: Apenas atribuidas diretamente ao usuario
- **Meu Squad**: Conversas do squad do usuario (se aplicavel)
- **Nao atribuidas**: Conversas sem atendente/squad
- **Por Squad**: Dropdown para filtrar por squad especifico (admin)
- **Por Atendente**: Dropdown para filtrar por pessoa (admin)

### Indicadores Visuais no Item da Conversa

No componente `WhatsAppConversationItem`:
- Avatar pequeno do atendente responsavel (canto inferior esquerdo)
- Badge colorido do squad (se atribuido a squad)
- Icone de "sem atribuicao" para conversas livres

### Controles no Cabecalho do Chat

No componente `WhatsAppChatWindow`:
- Dropdown para atribuir/transferir conversa
- Opcoes: Atribuir a mim, Atribuir a squad, Atribuir a colega
- Botao "Encerrar atendimento"

### Modal de Transferencia

- Tabs: "Para Pessoa" e "Para Squad"
- Lista de colaboradores ou squads disponiveis
- Campo para motivo da transferencia

### Configuracao de Responsavel do Squad

Na tela de configuracao do squad (ou nova tela):
- Campo para selecionar "Responsavel pelo WhatsApp"
- Ao mudar, historico e registrado

## Metricas para Relatorios Futuros

Com esta estrutura sera possivel extrair:

- Tempo de primeira resposta por atendente/squad
- Volume de conversas por atendente/squad
- Taxa de transferencia entre atendentes
- Satisfacao cruzando com temperatura da analise
- Tempo medio de resolucao
- Conversas por status (ativa, encerrada, aguardando)
- Historico de quem atendeu cada cliente

---

## Detalhes Tecnicos

### Migracao SQL

```sql
-- 1. Adicionar responsavel WhatsApp nos squads
ALTER TABLE teams
ADD COLUMN whatsapp_responsible_id UUID REFERENCES employees(id);

-- 2. Tabela de atribuicoes
CREATE TABLE whatsapp_conversation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_type TEXT NOT NULL CHECK (assigned_type IN ('individual', 'squad')),
  assigned_to_user_id UUID REFERENCES auth.users(id),
  assigned_to_team_id UUID REFERENCES teams(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id)
);

-- 3. Historico para auditoria e relatorios
CREATE TABLE whatsapp_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id),
  from_team_id UUID REFERENCES teams(id),
  to_user_id UUID REFERENCES auth.users(id),
  to_team_id UUID REFERENCES teams(id),
  action TEXT NOT NULL CHECK (action IN ('assigned', 'transferred', 'closed', 'reopened')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Rastrear quem enviou cada mensagem
ALTER TABLE whatsapp_messages
ADD COLUMN sent_by_user_id UUID REFERENCES auth.users(id);

-- 5. Indices para performance
CREATE INDEX idx_assignments_conversation ON whatsapp_conversation_assignments(conversation_id);
CREATE INDEX idx_assignments_user ON whatsapp_conversation_assignments(assigned_to_user_id, status);
CREATE INDEX idx_assignments_team ON whatsapp_conversation_assignments(assigned_to_team_id, status);
CREATE INDEX idx_assignments_company ON whatsapp_conversation_assignments(company_id, status);
CREATE INDEX idx_assignment_history_conv ON whatsapp_assignment_history(conversation_id);
CREATE INDEX idx_messages_sent_by ON whatsapp_messages(sent_by_user_id);
```

### Novos Componentes

1. `useWhatsAppAssignments.tsx` - Hook para gerenciar atribuicoes
2. `WhatsAppAssignmentPicker.tsx` - Dropdown de atribuicao (pessoa ou squad)
3. `WhatsAppTransferDialog.tsx` - Modal de transferencia
4. `WhatsAppSquadResponsiblePicker.tsx` - Componente para configurar responsavel do squad

### Modificacoes em Componentes Existentes

1. `useWhatsAppConversations.tsx` - Incluir dados de atribuicao no fetch
2. `WhatsAppConversationItem.tsx` - Mostrar avatar/badge do atendente/squad
3. `WhatsAppConversationList.tsx` - Adicionar filtros
4. `WhatsAppInboxDrawer.tsx` - Adicionar botoes de filtro no sidebar
5. `WhatsAppChatWindow.tsx` - Adicionar controles de atribuicao no cabecalho

---

## Fases de Implementacao

### Fase 1 - Infraestrutura
1. Criar tabelas no banco (migracao)
2. Adicionar coluna `whatsapp_responsible_id` em teams
3. Criar hook `useWhatsAppAssignments`
4. Modificar envio de mensagens para registrar `sent_by_user_id`

### Fase 2 - Interface Basica
1. Indicador visual de atendente/squad na lista
2. Dropdown de atribuicao no cabecalho do chat
3. Filtro "Minhas conversas" no sidebar

### Fase 3 - Squad Integration
1. UI para configurar responsavel WhatsApp do squad
2. Atribuicao automatica baseada no cliente/squad
3. Filtro "Meu Squad" no sidebar

### Fase 4 - Recursos Avancados
1. Modal de transferencia completo
2. Filtros por atendente/squad especifico (admin)
3. Encerramento de atendimento

### Fase 5 - Relatorios (Futura)
1. Dashboard de performance por atendente
2. Metricas de tempo de resposta
3. Analise de satisfacao
