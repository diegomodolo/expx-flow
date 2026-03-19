# Encaminhar Mensagens WhatsApp — Design Spec

## Objetivo

Permitir encaminhar mensagens (texto, áudio, imagem, vídeo, documento) para até 5 conversas de uma vez.

## Fluxo do Usuário

1. Hover na mensagem → botão "Encaminhar" nas ações
2. Abre modal com lista de conversas da mesma instância
3. Busca por nome/telefone, seleciona até 5 conversas (checkboxes)
4. Preview da mensagem no topo do modal
5. Botão "Encaminhar" → envia para todas as conversas selecionadas
6. Toast de sucesso, modal fecha

## Tipos Suportados

- Texto: `/send/text` com `forward: true`
- Áudio/Imagem/Vídeo/Documento/Sticker: `/send/media` com `forward: true` e URL da mídia

## Componentes

1. **WhatsAppForwardDialog.tsx** (novo) — Modal com lista de conversas, busca, seleção múltipla (max 5)
2. **WhatsAppMessageBubble.tsx** (modificar) — Botão "Encaminhar" nas ações da mensagem
3. **useWhatsAppMessages.tsx** (modificar) — `forwardMessage()` que itera sobre os destinos
4. **WhatsAppChatWindow.tsx** (modificar) — Estado do dialog + wiring

## API

Reutiliza Edge Functions existentes:

- `send-whatsapp-notification` com `forward: true` para texto
- `send-whatsapp-media` com `forward: true` para mídia

Edge Functions precisam aceitar o campo `forward` no body e passá-lo à UAZAPI.

## Dados

- Sem migration — usa tabelas existentes
- Mensagens encaminhadas criadas como novas mensagens nas conversas de destino
- Conversas buscadas via useWhatsAppConversations, filtrada por instância

## Fora de Escopo

- Encaminhar para contatos que não têm conversa aberta
- Encaminhar enquetes (poll)
- Encaminhar para outras instâncias
