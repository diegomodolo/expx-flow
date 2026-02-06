
# Plano de Integração: WhatsApp Business Platform (Meta Cloud API)

## Visao Geral

Este plano detalha a integração completa da **API Oficial do WhatsApp** (Meta Cloud API) ao sistema existente, adicionando um terceiro provedor além do Z-API e UazapiGO. A integração permitira enviar e receber mensagens atraves da infraestrutura oficial da Meta, com suporte a templates aprovados.

---

## Pre-requisitos (Responsabilidade do Usuario)

Antes de comecar a implementacao, o usuario precisara:

1. **Conta no Meta for Developers**: Criar em developers.facebook.com
2. **WhatsApp Business App**: Criar um aplicativo com produto WhatsApp
3. **Business Manager Verificado**: Empresa verificada no Facebook Business Manager
4. **Numero de Telefone**: Um numero dedicado para a API (nao pode estar em uso no WhatsApp normal)
5. **Templates Aprovados**: Criar e ter templates de mensagem aprovados pela Meta

---

## Etapa 1: Alteracoes no Banco de Dados

### 1.1 Adicionar colunas na tabela `whatsapp_configs`

Novas colunas para armazenar credenciais da Meta:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `meta_phone_number_id` | text | ID do numero de telefone na Meta |
| `meta_access_token` | text | Token de acesso permanente |
| `meta_business_account_id` | text | ID da conta WhatsApp Business |
| `meta_app_id` | text | ID do aplicativo Meta |
| `meta_webhook_verify_token` | text | Token de verificacao do webhook |

### 1.2 Adicionar colunas na tabela `whatsapp_instances`

Para suportar multiplas instancias Meta:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `meta_phone_number_id` | text | ID do numero especifico |
| `meta_access_token` | text | Token da instancia |

### 1.3 Nova tabela: `whatsapp_meta_templates`

Para gerenciar templates aprovados pela Meta:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid | Identificador unico |
| `company_id` | uuid | Referencia a empresa |
| `template_name` | text | Nome do template na Meta |
| `template_id` | text | ID do template na Meta |
| `language` | text | Codigo do idioma (pt_BR) |
| `category` | text | Categoria (MARKETING, UTILITY, etc) |
| `status` | text | Status de aprovacao |
| `header_format` | text | Tipo do header (TEXT, IMAGE, etc) |
| `body_text` | text | Texto do corpo do template |
| `footer_text` | text | Texto do rodape |
| `buttons` | jsonb | Configuracao dos botoes |
| `variables` | jsonb | Variaveis do template |
| `synced_at` | timestamp | Ultima sincronizacao |
| `created_at` | timestamp | Data de criacao |

---

## Etapa 2: Edge Functions

### 2.1 `meta-whatsapp-webhook` (Nova)

Webhook dedicado para receber eventos da Meta Cloud API:

**Funcionalidades**:
- Verificacao inicial do webhook (GET com challenge)
- Recebimento de mensagens (text, image, audio, video, document)
- Notificacoes de status (sent, delivered, read, failed)
- Tratamento de respostas interativas
- Mapeamento para estrutura existente de conversas/mensagens

**Estrutura do payload Meta**:
```text
POST /meta-whatsapp-webhook
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "phone_number_id": "..." },
        "messages": [{ ... }]
      }
    }]
  }]
}
```

### 2.2 `send-meta-whatsapp-message` (Nova)

Funcao para enviar mensagens via Meta Cloud API:

**Endpoints utilizados**:
- `POST graph.facebook.com/v18.0/{phone_number_id}/messages`

**Tipos de mensagem**:
- Texto simples (apenas dentro da janela de 24h)
- Templates (a qualquer momento)
- Imagem, video, audio, documento
- Mensagens interativas (botoes, listas)

### 2.3 `sync-meta-templates` (Nova)

Sincronizacao de templates aprovados:

- Buscar templates via API da Meta
- Atualizar status de aprovacao
- Importar novos templates criados no Business Manager

### 2.4 `test-meta-whatsapp-connection` (Nova)

Testar conexao com a Meta:

- Validar access_token
- Verificar permissoes
- Obter informacoes do numero de telefone

### 2.5 Atualizacao: `send-whatsapp-notification`

Adicionar suporte ao provider "meta":

```text
if (provider === "meta") {
  // Verificar se esta dentro da janela de 24h
  // Se sim: enviar texto livre
  // Se nao: usar template
  
  POST graph.facebook.com/v18.0/{phone_number_id}/messages
  Headers:
    Authorization: Bearer {access_token}
    Content-Type: application/json
  Body:
    messaging_product: "whatsapp"
    to: "{recipient_phone}"
    type: "text" | "template"
    ...
}
```

---

## Etapa 3: Interface do Usuario

### 3.1 Novo Card de Configuracao: `MetaWhatsAppConnectionCard`

Card similar ao Z-API e UazapiGO para configurar a Meta:

**Campos**:
- Phone Number ID
- Access Token (permanente)
- Business Account ID
- App ID
- Webhook Verify Token (gerado automaticamente)

**Acoes**:
- Testar Conexao
- Salvar Configuracao
- Copiar URL do Webhook (para configurar na Meta)

### 3.2 Atualizacao: `WhatsAppProviderTabs`

Adicionar terceira aba "Meta (Oficial)":

```text
TabsList:
  - Z-API
  - UazapiGO  
  - Meta (Oficial) <-- NOVO
```

### 3.3 Novo Componente: `MetaTemplatesManager`

Gerenciador de templates aprovados:

**Funcionalidades**:
- Listar templates sincronizados
- Mostrar status de aprovacao (aprovado, pendente, rejeitado)
- Sincronizar templates da Meta
- Preview do template com variaveis
- Botao para abrir Business Manager

### 3.4 Atualizacao: `WhatsAppMessageInput`

Para instancias Meta, mostrar aviso quando fora da janela de 24h:

- Indicador visual da janela de conversacao
- Sugestao de usar template quando necessario
- Seletor de template integrado

---

## Etapa 4: Hooks e Logica

### 4.1 Novo Hook: `useMetaWhatsAppConfig`

Gerenciamento de configuracao Meta:

- Buscar/salvar configuracao
- Testar conexao
- Sincronizar templates

### 4.2 Atualizacao: `useWhatsAppConfig`

Adicionar mutations para Meta:

- `saveMetaConfigMutation`
- `testMetaConnectionMutation`

### 4.3 Novo Hook: `useMetaTemplates`

CRUD de templates:

- Listar templates
- Sincronizar com Meta
- Selecionar template para envio

---

## Etapa 5: Seguranca

### 5.1 Secrets Necessarios

Armazenar no Supabase Secrets:

| Secret | Descricao |
|--------|-----------|
| `META_WHATSAPP_APP_SECRET` | App Secret para validar webhooks |

### 5.2 Validacao do Webhook

O webhook da Meta requer validacao de assinatura:

```text
x-hub-signature-256: sha256=HASH
```

Implementar verificacao usando HMAC-SHA256 com o App Secret.

### 5.3 Politicas RLS

Aplicar mesmas politicas das tabelas existentes:

- `whatsapp_meta_templates`: Acesso por company_id

---

## Etapa 6: Fluxo de Configuracao do Usuario

### Passo a passo para o usuario:

1. Acessar /configuracoes/whatsapp
2. Selecionar aba "Meta (Oficial)"
3. Inserir credenciais da Meta
4. Clicar "Testar Conexao"
5. Copiar URL do Webhook
6. No Meta Business Manager:
   - Configurar Webhook com a URL copiada
   - Inserir o Verify Token gerado
   - Selecionar eventos: messages, message_status
7. Enviar mensagem de teste
8. Sincronizar templates

---

## Diagrama de Arquitetura

```text
+-------------------+     +-----------------------+
|   Meta Cloud API  |     |   Usuario WhatsApp    |
+--------+----------+     +-----------+-----------+
         |                            |
         | Webhook POST               | Mensagem
         v                            v
+--------+----------------------------+-----------+
|           Supabase Edge Function               |
|           meta-whatsapp-webhook                |
+------------------------------------------------+
         |                            |
         | Insert                     | Select
         v                            v
+--------+----------------------------+-----------+
|              Supabase Database                 |
|  whatsapp_conversations | whatsapp_messages    |
+------------------------------------------------+
         |                            
         | Realtime                   
         v                            
+--------+----------------------------+-----------+
|              Frontend React                    |
|  WhatsAppChatWindow | Notifications            |
+------------------------------------------------+
```

---

## Ordem de Implementacao

1. **Database**: Criar migrations para novas colunas/tabelas
2. **Secrets**: Configurar META_WHATSAPP_APP_SECRET
3. **Edge Functions**:
   - meta-whatsapp-webhook (recebimento)
   - test-meta-whatsapp-connection
   - send-meta-whatsapp-message
   - sync-meta-templates
4. **Atualizar**: send-whatsapp-notification
5. **Frontend**:
   - MetaWhatsAppConnectionCard
   - WhatsAppProviderTabs (3 abas)
   - MetaTemplatesManager
6. **Hooks**: useMetaWhatsAppConfig, useMetaTemplates
7. **Integracao**: Atualizar input de mensagens para templates
8. **Documentacao**: Instrucoes de configuracao na Meta

---

## Consideracoes Importantes

### Janela de Conversacao (24h)

A Meta permite mensagens de texto livre apenas dentro de 24 horas apos a ultima mensagem do cliente. Fora dessa janela, obrigatoriamente deve-se usar templates aprovados.

### Custos

A Meta cobra por conversa iniciada, nao por mensagem. Considerar isso ao planejar notificacoes automaticas.

### Aprovacao de Templates

Templates precisam de aprovacao da Meta (pode levar ate 24h). O sistema deve indicar claramente o status de cada template.

### Limite de Taxa

A API tem limites de requisicoes. Implementar retry com backoff exponencial para evitar bloqueios.

---

## Estimativa de Esforco

| Componente | Complexidade |
|------------|--------------|
| Database | Baixa |
| Webhook Meta | Alta |
| Envio de Mensagens | Media |
| Templates Manager | Media |
| UI de Configuracao | Media |
| Integracao Chat | Media |

**Total estimado**: Implementacao em fases ao longo de varios sprints.
