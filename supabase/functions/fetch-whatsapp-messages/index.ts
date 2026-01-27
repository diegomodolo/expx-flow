import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversation_id, company_id, phone, instance_id, limit = 100, offset = 0 } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!conversation_id && !phone) {
      return new Response(
        JSON.stringify({ error: "conversation_id ou phone é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[fetch-whatsapp-messages] Buscando mensagens para company: ${company_id}, conversation: ${conversation_id}, phone: ${phone}`);

    // 1. Buscar configuração da empresa
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint, provider")
      .eq("company_id", company_id)
      .maybeSingle();

    if (configError || !config) {
      console.error("[fetch-whatsapp-messages] Config não encontrada:", configError);
      return new Response(
        JSON.stringify({ error: "Configuração WhatsApp não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Se temos conversation_id, buscar dados da conversa
    let targetPhone = phone;
    let targetInstanceId = instance_id;

    if (conversation_id) {
      const { data: conversation, error: convError } = await supabase
        .from("whatsapp_conversations")
        .select("phone, instance_id")
        .eq("id", conversation_id)
        .single();

      if (convError || !conversation) {
        console.error("[fetch-whatsapp-messages] Conversa não encontrada:", convError);
        return new Response(
          JSON.stringify({ error: "Conversa não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetPhone = conversation.phone;
      targetInstanceId = conversation.instance_id;
    }

    // 3. Buscar instância
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_token, instance_name, uazapi_instance_id")
      .eq("id", targetInstanceId)
      .maybeSingle();

    if (instanceError || !instance) {
      console.error("[fetch-whatsapp-messages] Instância não encontrada:", instanceError);
      return new Response(
        JSON.stringify({ error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = config.uazapi_endpoint.replace(/\/$/, "");
    const token = instance.uazapi_token;

    console.log(`[fetch-whatsapp-messages] Buscando mensagens de: ${endpoint}`);
    console.log(`[fetch-whatsapp-messages] Phone: ${targetPhone}, Token: ${token?.substring(0, 8)}...`);

    // 4. Buscar mensagens da API UazapiGO
    // Formatar número para o formato correto
    const formattedPhone = targetPhone.replace(/\D/g, "");
    const chatId = `${formattedPhone}@s.whatsapp.net`;

    let messages: any[] = [];
    const attemptLogs: string[] = [];

    console.log(`[fetch-whatsapp-messages] chatId: ${chatId}`);

    // Formato correto da UazapiGO conforme documentação: POST /message/find
    // Body: { "chatid": "...", "limit": 20, "offset": 0 }
    const requestBody = {
      chatid: chatId,
      limit: limit,
      offset: offset
    };

    console.log(`[fetch-whatsapp-messages] Request body: ${JSON.stringify(requestBody)}`);

    try {
      const apiResponse = await fetch(`${endpoint}/message/find`, {
        method: "POST",
        headers: {
          "token": token,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await apiResponse.text();
      
      console.log(`[fetch-whatsapp-messages] Status: ${apiResponse.status}`);
      console.log(`[fetch-whatsapp-messages] Response preview: ${responseText.substring(0, 1000)}`);

      if (apiResponse.ok) {
        try {
          const responseData = JSON.parse(responseText);
          
          // UazapiGO retorna: { hasMore, limit, messages: [...] }
          if (responseData.messages && Array.isArray(responseData.messages)) {
            messages = responseData.messages;
            attemptLogs.push(`✅ /message/find: ${messages.length} mensagens encontradas`);
          } else if (Array.isArray(responseData)) {
            messages = responseData;
            attemptLogs.push(`✅ /message/find: ${messages.length} mensagens (array direto)`);
          } else {
            attemptLogs.push(`⚠️ /message/find: Formato inesperado - ${Object.keys(responseData).join(', ')}`);
            console.log(`[fetch-whatsapp-messages] Resposta completa:`, JSON.stringify(responseData).substring(0, 2000));
          }
        } catch (parseErr) {
          attemptLogs.push(`❌ /message/find: Erro ao parsear JSON`);
          console.error(`[fetch-whatsapp-messages] Parse error:`, parseErr);
        }
      } else {
        attemptLogs.push(`❌ /message/find: ${apiResponse.status} - ${responseText.substring(0, 200)}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      attemptLogs.push(`❌ /message/find: ${errorMsg}`);
      console.error(`[fetch-whatsapp-messages] Erro:`, err);
    }

    console.log(`[fetch-whatsapp-messages] Tentativas:`, attemptLogs);
    console.log(`[fetch-whatsapp-messages] Total de mensagens encontradas: ${messages.length}`);

    // Log primeira mensagem para debug
    if (messages.length > 0) {
      console.log(`[fetch-whatsapp-messages] Primeira mensagem (keys): ${Object.keys(messages[0]).join(', ')}`);
      console.log(`[fetch-whatsapp-messages] Primeira mensagem: ${JSON.stringify(messages[0]).substring(0, 1500)}`);
    }

    // 5. Processar e salvar mensagens no banco
    // IMPORTANTE: Filtrar mensagens apenas para o chatId solicitado
    let savedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      try {
        // Filtrar mensagens para garantir que são do chat correto
        const msgChatId = msg.chatid || msg.chatId || msg.key?.remoteJid || "";
        if (msgChatId && msgChatId !== chatId) {
          skippedCount++;
          continue;
        }

        // Formato UazapiGO:
        // { 
        //   "chatid": "5522999534424@s.whatsapp.net",
        //   "content": { "text": "mensagem aqui" },
        //   "fromMe": false,
        //   "id": "xxx",
        //   "timestamp": 1234567890,
        //   ...
        // }
        
        // Extrair ID da mensagem
        const externalId = msg.id || msg.key?.id || msg.messageId || null;
        
        // Se não tem ID externo válido, pular para evitar duplicados
        if (!externalId) {
          skippedCount++;
          continue;
        }
        
        // Extrair timestamp
        let timestamp = msg.timestamp || msg.messageTimestamp || msg.t || null;
        
        // Determinar direção - formato UazapiGO usa "fromMe" diretamente
        const fromMe = msg.fromMe === true || msg.key?.fromMe === true;
        const direction = fromMe ? "outgoing" : "incoming";
        
        // Extrair conteúdo - formato UazapiGO: content.text
        let content = "";
        let messageType = "text";
        let mediaUrl = null;

        // UazapiGO format: content object with text property
        if (msg.content) {
          if (typeof msg.content === "string") {
            content = msg.content;
          } else if (msg.content.text) {
            content = msg.content.text;
          } else if (msg.content.caption) {
            content = msg.content.caption;
          }
        }
        
        // Fallback para outros formatos
        if (!content) {
          if (msg.message?.conversation) {
            content = msg.message.conversation;
          } else if (msg.message?.extendedTextMessage?.text) {
            content = msg.message.extendedTextMessage.text;
          } else if (msg.body) {
            content = msg.body;
          } else if (msg.text) {
            content = msg.text;
          }
        }

        // Detectar tipo de mídia e definir placeholder se não tiver conteúdo
        if (msg.type) {
          messageType = msg.type;
          // Placeholder para mídias sem conteúdo textual
          if (!content) {
            switch (msg.type.toLowerCase()) {
              case "image":
              case "imageMessage":
                content = "[Imagem]";
                break;
              case "video":
              case "videoMessage":
                content = "[Vídeo]";
                break;
              case "audio":
              case "audioMessage":
              case "ptt":
                content = "[Áudio]";
                break;
              case "document":
              case "documentMessage":
                content = "[Documento]";
                break;
              case "sticker":
              case "stickerMessage":
                content = "[Sticker]";
                break;
              case "location":
              case "locationMessage":
                content = "[Localização]";
                break;
              case "contact":
              case "contactMessage":
                content = "[Contato]";
                break;
              default:
                content = `[${msg.type}]`;
            }
          }
        } else if (msg.message?.imageMessage || msg.content?.JPEGThumbnail) {
          messageType = "image";
          if (!content) content = "[Imagem]";
          mediaUrl = msg.message?.imageMessage?.url || msg.content?.url || null;
        } else if (msg.message?.videoMessage) {
          messageType = "video";
          if (!content) content = "[Vídeo]";
          mediaUrl = msg.message?.videoMessage?.url || null;
        } else if (msg.message?.audioMessage) {
          messageType = "audio";
          if (!content) content = "[Áudio]";
          mediaUrl = msg.message?.audioMessage?.url || null;
        } else if (msg.message?.documentMessage) {
          messageType = "document";
          if (!content) content = msg.message.documentMessage.fileName || "[Documento]";
          mediaUrl = msg.message?.documentMessage?.url || null;
        } else if (msg.message?.stickerMessage) {
          messageType = "sticker";
          if (!content) content = "[Sticker]";
        }

        // Se não conseguiu extrair conteúdo mesmo com placeholders, usar fallback
        if (!content) {
          content = "[Mensagem]";
        }

        // Calcular timestamp
        let sentAt: string;
        if (timestamp) {
          // Timestamp pode vir em segundos ou milissegundos
          const ts = timestamp > 9999999999 ? timestamp : timestamp * 1000;
          sentAt = new Date(ts).toISOString();
        } else {
          // Usar data antiga como fallback para não bagunçar ordenação
          sentAt = "2000-01-01T00:00:00.000Z";
        }

        // Status da mensagem
        let status = "received";
        if (direction === "outgoing") {
          const msgStatus = msg.status || msg.ack;
          if (msgStatus === 0 || msgStatus === "pending") status = "pending";
          else if (msgStatus === 1 || msgStatus === "sent" || msgStatus === "SERVER_ACK") status = "sent";
          else if (msgStatus === 2 || msgStatus === "delivered" || msgStatus === "DELIVERY_ACK") status = "delivered";
          else if (msgStatus === 3 || msgStatus === 4 || msgStatus === "read" || msgStatus === "READ" || msgStatus === "PLAYED") status = "read";
          else status = "sent";
        }

        const messageData = {
          conversation_id,
          company_id,
          direction,
          content: content.substring(0, 5000), // Limitar tamanho
          message_type: messageType,
          media_url: mediaUrl,
          status,
          external_id: externalId,
          sent_at: sentAt,
        };

        // Upsert mensagem usando a constraint (company_id, external_id)
        const { error: upsertError } = await supabase
          .from("whatsapp_messages")
          .upsert(messageData, {
            onConflict: "company_id,external_id",
            ignoreDuplicates: false, // Atualizar se já existir
          });

        if (upsertError) {
          if (errors.length < 5) {
            errors.push(`Upsert error: ${upsertError.message}`);
          }
          console.error(`[fetch-whatsapp-messages] Erro upsert:`, upsertError);
        } else {
          savedCount++;
        }
      } catch (msgError) {
        const errMsg = msgError instanceof Error ? msgError.message : String(msgError);
        if (errors.length < 5) {
          errors.push(`Process error: ${errMsg}`);
        }
        console.error(`[fetch-whatsapp-messages] Erro ao processar mensagem:`, msgError);
      }
    }

    console.log(`[fetch-whatsapp-messages] Salvos: ${savedCount}, Pulados: ${skippedCount}, Erros: ${errors.length}`);
    if (errors.length > 0) {
      console.log(`[fetch-whatsapp-messages] Primeiros erros:`, errors.slice(0, 5));
    }

    // 6. Retornar mensagens do banco (mais confiável)
    const { data: dbMessages, error: dbError } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("sent_at", { ascending: true });

    if (dbError) {
      console.error("[fetch-whatsapp-messages] Erro ao buscar mensagens do banco:", dbError);
    }

    console.log(`[fetch-whatsapp-messages] Mensagens salvas: ${savedCount}, Total no banco: ${dbMessages?.length || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        fetched: messages.length,
        saved: savedCount,
        skipped: skippedCount,
        errors: errors.slice(0, 10),
        messages: dbMessages || [],
        attempts: attemptLogs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[fetch-whatsapp-messages] Erro geral:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
