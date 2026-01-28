

# Tela de Configuracao do Agente de IA para WhatsApp

## Resumo

Vamos criar uma tela de configuracao completa e profissional para o agente de IA do WhatsApp, acessivel atraves de um icone de IA (Sparkles) na barra lateral esquerda do inbox. Esta tela permitira configurar todos os aspectos do comportamento do agente: identidade, tom de voz, base de conhecimento, formatacao de respostas e regras de seguranca.

---

## 1. Nova Tabela no Banco de Dados

Criar uma tabela `whatsapp_ai_agent_config` para armazenar as configuracoes do agente por empresa:

**Campos:**
- `id` (UUID, PK)
- `company_id` (UUID, FK para companies)
- `instance_id` (UUID, FK para whatsapp_instances, nullable - para config global ou por instancia)

**Painel Identidade e Funcao:**
- `agent_name` (VARCHAR) - Nome do agente
- `department` (VARCHAR) - Suporte Tecnico, Vendas, Pos-venda, Atendimento Geral
- `primary_objective` (VARCHAR) - Resolver duvida, Agendar reuniao, Acalmar, Vender, Informar

**Equalizador de Tom e Voz (valores 0-100):**
- `formality_level` (INTEGER) - Casual <-> Formal
- `empathy_level` (INTEGER) - Objetividade <-> Empatia
- `enthusiasm_level` (INTEGER) - Calmo <-> Energetico
- `emoji_usage` (VARCHAR) - none, moderate, intense

**Formatacao da Resposta:**
- `response_length` (VARCHAR) - short, medium, long
- `use_bold` (BOOLEAN) - Usar negrito em palavras-chave
- `use_lists` (BOOLEAN) - Usar listas/bullet points
- `use_short_paragraphs` (BOOLEAN) - Quebrar em paragrafos curtos
- `mandatory_cta` (TEXT) - Chamada para acao obrigatoria

**Regras e Guardrails:**
- `blacklist_words` (TEXT[]) - Lista de palavras proibidas
- `min_confidence_threshold` (INTEGER) - Limite para transbordo humano (0-100)
- `escalation_message` (TEXT) - Mensagem quando precisar de humano

**Contexto do Cliente (checkboxes):**
- `use_purchase_history` (BOOLEAN)
- `use_client_name` (BOOLEAN)
- `use_satisfaction_score` (BOOLEAN)
- `use_conversation_history` (BOOLEAN)

**Metadata:**
- `created_at`, `updated_at`

---

## 2. Alteracoes na Interface

### 2.1 Botao na Sidebar do Inbox

Adicionar um icone `Sparkles` na barra lateral esquerda do `WhatsAppInboxDrawer.tsx`, abaixo dos filtros existentes (Silenciados), que abre o modal de configuracao do agente.

### 2.2 Modal de Configuracao (3 colunas)

O modal sera uma Dialog grande (`max-w-6xl`) dividida em 3 areas conforme a especificacao:

```text
+-------------------+----------------------+------------------+
|  PERSONA E TOM    |  CONHECIMENTO E      |   PLAYGROUND     |
|                   |  REGRAS              |   (Preview)      |
| - Departamento    |                      |                  |
| - Objetivo        | - Upload docs        | [Input cliente]  |
| - Nome agente     | - Checkboxes ctx     |                  |
|                   | - Blacklist          | [Output IA]      |
| Sliders:          | - Transbordo         |                  |
| - Formalidade     |                      | [Botao Testar]   |
| - Empatia         | Formatacao:          |                  |
| - Entusiasmo      | - Tamanho            |                  |
| - Emojis          | - Negrito            |                  |
|                   | - Listas             |                  |
|                   | - CTA                |                  |
+-------------------+----------------------+------------------+
```

---

## 3. Componentes a Criar

### 3.1 `WhatsAppAIAgentConfigModal.tsx`
Modal principal que organiza as 3 colunas e gerencia o estado.

### 3.2 `WhatsAppAIAgentIdentityPanel.tsx`
Coluna esquerda com:
- Select para Departamento/Persona
- Select para Objetivo Primario
- Input para Nome do Agente
- Sliders (0-100) para: Formalidade, Empatia, Entusiasmo
- Radio group para Uso de Emojis

### 3.3 `WhatsAppAIAgentKnowledgePanel.tsx`
Coluna do meio com:
- Upload de documentos (reutilizar logica do `KnowledgeDocumentsManager`)
- Checkboxes de contexto do cliente
- Textarea para palavras na blacklist
- Slider para limite de confianca (transbordo)
- Textarea para mensagem de escalacao

### 3.4 `WhatsAppAIAgentFormatPanel.tsx`
Secao de formatacao da resposta:
- Radio group para tamanho (Curta/Media/Longa)
- Checkboxes para negrito, listas, paragrafos curtos
- Textarea para CTA obrigatoria

### 3.5 `WhatsAppAIAgentPlayground.tsx`
Coluna direita (preview) com:
- Textarea para simular mensagem do cliente
- Botao "Testar Resposta"
- Area de preview mostrando a resposta gerada
- Visual estilo bolha de WhatsApp

### 3.6 `useWhatsAppAIAgentConfig.tsx`
Hook para gerenciar CRUD das configuracoes:
- Buscar configuracao por company_id
- Salvar/atualizar configuracao
- Valores padrao quando nao existir

---

## 4. Integracao com Edge Function

Atualizar `whatsapp-ai-assistant/index.ts` para:
1. Receber o `companyId` junto com as mensagens
2. Buscar a configuracao do agente no banco
3. Construir o system prompt dinamicamente baseado nas configuracoes:
   - Tom de voz conforme sliders
   - Regras de formatacao
   - Blacklist de palavras
   - Instrucoes de CTA
4. Incluir documentos da base de conhecimento quando existirem

---

## 5. Fluxo de Uso

1. Usuario clica no icone ✨ na sidebar esquerda do inbox
2. Modal abre mostrando as configuracoes atuais (ou valores padrao)
3. Usuario ajusta sliders, seleciona opcoes e faz upload de docs
4. Na coluna direita, pode testar com uma mensagem exemplo
5. Ao clicar "Salvar", configuracoes sao persistidas
6. Proximo uso do assistente de IA aplica as novas configuracoes

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/xxx_whatsapp_ai_agent_config.sql` | Criar tabela |
| `src/hooks/useWhatsAppAIAgentConfig.tsx` | Novo hook |
| `src/components/whatsapp/WhatsAppAIAgentConfigModal.tsx` | Modal principal |
| `src/components/whatsapp/WhatsAppAIAgentIdentityPanel.tsx` | Painel identidade |
| `src/components/whatsapp/WhatsAppAIAgentKnowledgePanel.tsx` | Painel conhecimento |
| `src/components/whatsapp/WhatsAppAIAgentFormatPanel.tsx` | Painel formatacao |
| `src/components/whatsapp/WhatsAppAIAgentPlayground.tsx` | Preview/teste |
| `src/components/whatsapp/WhatsAppInboxDrawer.tsx` | Adicionar botao IA |
| `supabase/functions/whatsapp-ai-assistant/index.ts` | Aplicar config |
| `src/integrations/supabase/types.ts` | Tipos atualizados |

