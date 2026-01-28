
# Plano: Ferramentas de CS no WhatsApp

## Objetivo
Adicionar 3 funcionalidades no chat do WhatsApp para facilitar o trabalho da equipe de CS:
1. **Adicionar Lembrete** - Para lembrar de voltar a falar com o cliente
2. **Criar Tarefa** - Para registrar algo a ser feito posteriormente
3. **Adicionar Observacao** - Nota privada sobre o cliente, visivel apenas no sistema

## Onde as opcoes vao aparecer

As 3 opcoes serao adicionadas no menu de contexto (dropdown de 3 pontinhos) que ja existe na janela do chat do WhatsApp. Aparecerao logo abaixo das opcoes existentes, agrupadas em uma secao "Ferramentas CS".

## Funcionalidade 1: Adicionar Lembrete

**O que faz:** Abre um modal simples para agendar um lembrete de follow-up com o cliente.

**Campos do modal:**
- Data do lembrete (obrigatorio)
- Hora do lembrete (opcional)
- Motivo/descricao (obrigatorio)

**Comportamento:**
- Ao salvar, cria um registro na tabela `client_touchpoints` com tipo `whatsapp` e a data como `next_action_date`
- O lembrete aparecera no Cockpit da CS como tarefa pendente
- So funciona se o chat estiver vinculado a um cliente

**Validacao:** Se o chat nao estiver vinculado a um cliente, mostra aviso pedindo para vincular primeiro.

## Funcionalidade 2: Criar Tarefa

**O que faz:** Abre um modal simplificado para criar uma tarefa vinculada ao cliente.

**Campos do modal (versao simplificada):**
- Titulo (obrigatorio)
- Descricao (opcional)
- Prazo (obrigatorio)
- Prioridade (baixa/media/alta)

**Comportamento:**
- Usa o hook `useTasks.createTask` existente
- Vincula automaticamente ao cliente do chat (`related_client_id`)
- A tarefa aparece no Kanban de tarefas com vinculo ao cliente

**Validacao:** Se o chat nao estiver vinculado a um cliente, mostra aviso pedindo para vincular primeiro.

## Funcionalidade 3: Adicionar Observacao

**O que faz:** Abre um modal para adicionar uma nota privada sobre o cliente.

**Campos do modal:**
- Texto da observacao (obrigatorio)

**Comportamento:**
- Usa o hook `useClientNotes.addNote` existente
- A observacao aparece na aba "Historico" do cadastro do cliente
- Cada observacao registra quem criou e quando

**Validacao:** Se o chat nao estiver vinculado a um cliente, mostra aviso pedindo para vincular primeiro.

## Componentes a criar

| Arquivo | Descricao |
|---------|-----------|
| `WhatsAppReminderModal.tsx` | Modal para adicionar lembrete |
| `WhatsAppQuickTaskModal.tsx` | Modal simplificado para criar tarefa |
| `WhatsAppNoteModal.tsx` | Modal para adicionar observacao |

## Alteracoes em arquivos existentes

| Arquivo | Alteracao |
|---------|-----------|
| `WhatsAppChatWindow.tsx` | Adicionar 3 itens no menu dropdown + estados dos modais |

## Fluxo visual

```text
[Chat do WhatsApp]
       |
       v
[Menu 3 pontinhos]
       |
       +-- Atualizar mensagens
       +-- Marcar como lido
       +-- Arquivar
       +-- Fixar
       +-- Silenciar
       +-- --------------------
       +-- [NOVO] Adicionar Lembrete (icone: Bell)
       +-- [NOVO] Criar Tarefa (icone: CheckSquare)  
       +-- [NOVO] Adicionar Observacao (icone: StickyNote)
       +-- --------------------
       +-- Bloquear contato
       +-- Deletar chat
```

## Detalhes Tecnicos

### WhatsAppReminderModal
- Props: `open`, `onOpenChange`, `clientId`, `clientName`
- Usa `useClientTouchpoints().createTouchpoint` com tipo `whatsapp`
- O campo `summary` sera preenchido com o motivo
- O campo `next_action_date` sera a data/hora do lembrete

### WhatsAppQuickTaskModal
- Props: `open`, `onOpenChange`, `clientId`, `clientName`
- Usa `useTasks().createTask`
- Campos: `title`, `description`, `deadline`, `priority`
- O `related_client_id` e preenchido automaticamente

### WhatsAppNoteModal
- Props: `open`, `onOpenChange`, `clientId`, `clientName`
- Usa `useClientNotes().addNote`
- Campo unico: `content` (texto da observacao)

### Validacao de cliente vinculado
- Antes de abrir qualquer modal, verifica se `linkedClientId` existe
- Se nao existir, mostra toast com mensagem: "Vincule este chat a um cliente primeiro"
