
# Plano de Correção: Integração UazapiGO v2

## Resumo do Problema

A implementação atual está usando endpoints incorretos do padrão antigo/legado da UazapiGO. A API v2 oficial usa um modelo completamente diferente:

| Aspecto | Implementação Atual (Errada) | API v2 Oficial (Correta) |
|---------|------------------------------|-------------------------|
| Criar instância | Manual | `POST /instance/init` + admintoken |
| Conectar | `/session/start/{sessionId}` | `POST /instance/connect` + token |
| Status | `/session/status/{sessionId}` | `GET /instance/status` + token |
| QR Code | `/session/qrcode/image/{sessionId}` | Retornado em `/instance/connect` e `/instance/status` |
| Autenticação | Token único global | `admintoken` (admin) + `token` (por instância) |

## Mudanças Necessárias

### 1. Atualização do Modelo de Dados

O banco precisa armazenar o **token da instância** (retornado ao criar) e opcionalmente o **admintoken** para criação automática.

**Tabela `whatsapp_configs`** - Adicionar colunas:
- `uazapi_admintoken` (text, nullable) - Token admin para criar instâncias automaticamente

**Tabela `whatsapp_instances`** - Adicionar colunas:
- `uazapi_instance_id` (text) - ID da instância na UazapiGO (ex: "r183e2ef9")
- `uazapi_token` (text) - Token único desta instância
- `status` (text) - "disconnected" | "connecting" | "connected"
- `profile_name` (text, nullable) - Nome do perfil WhatsApp quando conectado
- `profile_pic_url` (text, nullable) - URL da foto do perfil

### 2. Reescrever Edge Functions

#### 2.1 `create-uazapi-instance` (nova)
Endpoint para criar instância automaticamente usando admintoken:
- Chama `POST /instance/init` com header `admintoken`
- Salva `id` e `token` retornados na tabela `whatsapp_instances`

#### 2.2 `get-uazapi-qrcode` (reescrever)
- Chama `POST /instance/connect` (sem body = gera QR code)
- Header: `token: {token_da_instancia}`
- QR code vem no campo `instance.qrcode` ou `instance.paircode`
- Se já conectado, retorna `connected: true`

#### 2.3 `test-uazapi-connection` (reescrever)
- Chama `GET /instance/status` com header `token`
- Resposta inclui:
  - `instance.status`: "disconnected" | "connecting" | "connected"
  - `instance.qrcode`: QR em base64 (se connecting)
  - `instance.profileName`: nome do WhatsApp (se connected)
  - `status.jid.user`: número do telefone conectado

#### 2.4 `disconnect-uazapi-instance` (nova, opcional)
- Chama `POST /instance/disconnect` para desconectar
- Chama `DELETE /instance` para remover completamente

#### 2.5 `send-whatsapp-notification` (atualizar)
- O endpoint de envio continua `/send/text`, mas o body deve incluir `number` (não `session` + `number`)
- Header: `token: {token_da_instancia}`

### 3. Atualizar Frontend

#### 3.1 `UazapiConnectionCard.tsx`
- Adicionar campo para `admintoken` (para criação automática de instâncias)
- Manter `endpoint` (URL base)

#### 3.2 `WhatsAppInstanceModal.tsx`
- Remover campo `session_id` manual
- Adicionar opção "Criar Nova Instância na UazapiGO" que chama a API
- Campo `instance_name` continua (nome amigável local)

#### 3.3 `WhatsAppInstanceCard.tsx`
- Mostrar `status` da instância (disconnected/connecting/connected)
- Mostrar `profile_name` e `profile_pic_url` quando conectado
- Botão "Conectar" que abre modal de QR Code

#### 3.4 `UazapiQRCodeModal.tsx`
- Usar nova edge function corrigida
- Lidar com estados: `disconnected` → `connecting` (mostra QR) → `connected`
- Auto-refresh a cada 5s para detectar conexão

### 4. Corrigir Webhook

O webhook atual já tenta detectar o campo `session`, mas a v2 envia `instance`:

```javascript
// Atual (errado)
if (payload.session) { ... }

// Correto (v2)
if (payload.instance) {
  const instanceId = payload.instance; // ID da instância
  // Buscar por uazapi_instance_id na tabela whatsapp_instances
}
```

## Detalhes Técnicos

### Estrutura de Chamadas API v2

**Criar Instância:**
```http
POST /instance/init
Headers:
  admintoken: {admintoken}
Body:
  { "name": "minha-instancia" }
Response:
  { "instance": { "id": "r183e2ef9", "token": "abc123xyz", "status": "disconnected" } }
```

**Conectar (gerar QR Code):**
```http
POST /instance/connect
Headers:
  token: {token_da_instancia}
Response:
  {
    "connected": false,
    "loggedIn": false,
    "instance": {
      "qrcode": "data:image/png;base64,...",
      "paircode": "1234-5678"
    }
  }
```

**Verificar Status:**
```http
GET /instance/status
Headers:
  token: {token_da_instancia}
Response:
  {
    "instance": {
      "status": "connected",
      "profileName": "Meu WhatsApp",
      "profilePicUrl": "https://..."
    },
    "status": {
      "connected": true,
      "loggedIn": true,
      "jid": { "user": "5511999999999" }
    }
  }
```

**Enviar Mensagem:**
```http
POST /send/text
Headers:
  token: {token_da_instancia}
Body:
  { "number": "5511999999999", "text": "Olá!" }
```

### Migração de Dados

Para instâncias já existentes que foram criadas no padrão antigo:
1. A migração não é automática - o usuário precisará recriar as instâncias
2. Ou importar manualmente o `id` e `token` de cada instância do painel UazapiGO

## Ordem de Implementação

1. **Migração do banco** - Adicionar novas colunas
2. **Edge Functions** - Criar/reescrever as 4 funções
3. **Frontend** - Atualizar componentes de configuração e modal
4. **Webhook** - Ajustar para usar `instance` ao invés de `session`
5. **Testes** - Validar fluxo completo: criar → conectar → enviar → receber

## Resultado Esperado

Após a implementação:
- O usuário configura apenas `endpoint` + `admintoken` uma vez
- Ao clicar "Nova Instância", o sistema cria automaticamente na UazapiGO
- O QR Code aparece corretamente no modal
- Após escanear, o status muda para "Conectado" com nome e foto do perfil
- Mensagens são enviadas e recebidas corretamente
