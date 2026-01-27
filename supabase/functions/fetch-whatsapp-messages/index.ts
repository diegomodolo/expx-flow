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

    const { conversation_id, company_id, phone, instance_id } = await req.json();

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
    console.log(`[fetch-whatsapp-messages] Phone: ${targetPhone}`);

    // 4. Buscar mensagens da API UazapiGO
    // Formatar número para o formato correto
    const formattedPhone = targetPhone.replace(/\D/g, "");
    const chatId = `${formattedPhone}@s.whatsapp.net`;

    let messages: any[] = [];
    const attemptLogs: string[] = [];

    // Endpoints para tentar (UazapiGO v2)
    const endpointsToTry = [
      // GET /chat/findMessages com query params
      { 
        url: `${endpoint}/chat/findMessages?key=${chatId}&count=100`, 
        method: "GET", 
        body: null 
      },
      // POST /chat/findMessages
      { 
        url: `${endpoint}/chat/findMessages`, 
        method: "POST", 
        body: { key: chatId, count: 100 } 
      },
      // Alternative: messages endpoint
      { 
        url: `${endpoint}/messages/${chatId}`, 
        method: "GET", 
        body: null 
      },
      // Alternative: chat/messages
      { 
        url: `${endpoint}/chat/messages`, 
        method: "POST", 
        body: { chatId, limit: 100 } 
      },
      // UazapiGO v2: /message/findMessages
      { 
        url: `${endpoint}/message/findMessages`, 
        method: "POST", 
        body: { where: { key: { remoteJid: chatId } }, count: 100 } 
      },
    ];

    for (const ep of endpointsToTry) {
      try {
        console.log(`[fetch-whatsapp-messages] Tentando: ${ep.method} ${ep.url}`);
        
        const fetchOptions: RequestInit = {
          method: ep.method,
          headers: {
            "token": token,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        };
        
        if (ep.body !== null && ep.method === "POST") {
          fetchOptions.body = JSON.stringify(ep.body);
        }

        const apiResponse = await fetch(ep.url, fetchOptions);
        const responseText = await apiResponse.text();
        
        console.log(`[fetch-whatsapp-messages] Status: ${apiResponse.status}`);
        console.log(`[fetch-whatsapp-messages] Response preview: ${responseText.substring(0, 500)}`);

        if (apiResponse.ok) {
          try {
            const responseData = JSON.parse(responseText);
            
            let foundMessages: any[] = [];
            
            if (Array.isArray(responseData)) {
              foundMessages = responseData;
            } else if (responseData.data && Array.isArray(responseData.data)) {
              foundMessages = responseData.data;
            } else if (responseData.messages && Array.isArray(responseData.messages)) {
              foundMessages = responseData.messages;
            } else if (responseData.response && Array.isArray(responseData.response)) {
              foundMessages = responseData.response;
            } else if (responseData.result && Array.isArray(responseData.result)) {
              foundMessages = responseData.result;
            } else if (responseData.rows && Array.isArray(responseData.rows)) {
              foundMessages = responseData.rows;
            }

            if (foundMessages.length > 0) {
              messages = foundMessages;
              attemptLogs.push(`✅ ${ep.url}: ${messages.length} mensagens encontradas`);
              break;
            } else {
              attemptLogs.push(`⚠️ ${ep.url}: OK mas sem mensagens`);
            }
          } catch (parseErr) {
            attemptLogs.push(`❌ ${ep.url}: Erro ao parsear JSON`);
          }
        } else {
          attemptLogs.push(`❌ ${ep.url}: ${apiResponse.status}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        attemptLogs.push(`❌ ${ep.url}: ${errorMsg}`);
        console.log(`[fetch-whatsapp-messages] Erro em ${ep.url}:`, err);
      }
    }

    console.log(`[fetch-whatsapp-messages] Tentativas:`, attemptLogs);
    console.log(`[fetch-whatsapp-messages] Total de mensagens encontradas: ${messages.length}`);

    // 5. Processar e salvar mensagens no banco
    let savedCount = 0;
    const processedMessages: any[] = [];

    for (const msg of messages) {
      try {
        // Extrair informações da mensagem - diferentes formatos possíveis
        const externalId = msg.id || msg.key?.id || msg.messageId || null;
        const timestamp = msg.messageTimestamp || msg.timestamp || msg.t || msg.key?.timestamp;
        
        // Determinar direção
        const fromMe = msg.key?.fromMe || msg.fromMe || msg.isFromMe || false;
        const direction = fromMe ? "outgoing" : "incoming";
        
        // Extrair conteúdo
        let content = "";
        let messageType = "text";
        let mediaUrl = null;

        // Mensagem de texto
        if (msg.message?.conversation) {
          content = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
          content = msg.message.extendedTextMessage.text;
        } else if (msg.content) {
          content = msg.content;
        } else if (msg.body) {
          content = msg.body;
        } else if (msg.text) {
          content = msg.text;
        }

        // Mensagem de mídia
        if (msg.message?.imageMessage) {
          messageType = "image";
          content = msg.message.imageMessage.caption || "[Imagem]";
          mediaUrl = msg.message.imageMessage.url || null;
        } else if (msg.message?.videoMessage) {
          messageType = "video";
          content = msg.message.videoMessage.caption || "[Vídeo]";
          mediaUrl = msg.message.videoMessage.url || null;
        } else if (msg.message?.audioMessage) {
          messageType = "audio";
          content = "[Áudio]";
          mediaUrl = msg.message.audioMessage.url || null;
        } else if (msg.message?.documentMessage) {
          messageType = "document";
          content = msg.message.documentMessage.fileName || "[Documento]";
          mediaUrl = msg.message.documentMessage.url || null;
        } else if (msg.message?.stickerMessage) {
          messageType = "sticker";
          content = "[Sticker]";
        }

        // Se não conseguiu extrair conteúdo, pular
        if (!content) continue;

        // Calcular timestamp
        let sentAt = new Date().toISOString();
        if (timestamp) {
          const ts = timestamp > 9999999999 ? timestamp : timestamp * 1000;
          sentAt = new Date(ts).toISOString();
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
          content,
          message_type: messageType,
          media_url: mediaUrl,
          status,
          external_id: externalId,
          sent_at: sentAt,
        };

        // Upsert mensagem (evitar duplicados)
        if (externalId) {
          const { error: upsertError } = await supabase
            .from("whatsapp_messages")
            .upsert(messageData, {
              onConflict: "external_id",
              ignoreDuplicates: true,
            });

          if (!upsertError) {
            savedCount++;
          }
        } else {
          // Sem external_id, tentar insert
          const { error: insertError } = await supabase
            .from("whatsapp_messages")
            .insert(messageData);

          if (!insertError) {
            savedCount++;
          }
        }

        processedMessages.push(messageData);
      } catch (msgError) {
        console.error(`[fetch-whatsapp-messages] Erro ao processar mensagem:`, msgError);
      }
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
