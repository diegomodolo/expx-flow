import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { company_id, instance_id } = await req.json();

    if (!company_id || !instance_id) {
      return new Response(
        JSON.stringify({ error: "company_id e instance_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-whatsapp-chats] Sincronizando chats para company: ${company_id}, instance: ${instance_id}`);

    // 1. Buscar configuração da empresa (endpoint UazapiGO)
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint, provider")
      .eq("company_id", company_id)
      .single();

    if (configError || !config) {
      console.error("[sync-whatsapp-chats] Erro ao buscar config:", configError);
      return new Response(
        JSON.stringify({ error: "Configuração WhatsApp não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (config.provider !== "uazapi") {
      return new Response(
        JSON.stringify({ error: "Sincronização disponível apenas para UazapiGO" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Buscar token da instância
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_token, instance_name")
      .eq("id", instance_id)
      .single();

    if (instanceError || !instance) {
      console.error("[sync-whatsapp-chats] Erro ao buscar instância:", instanceError);
      return new Response(
        JSON.stringify({ error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = config.uazapi_endpoint.replace(/\/$/, "");
    const token = instance.uazapi_token;

    console.log(`[sync-whatsapp-chats] Buscando chats de: ${endpoint}`);

    // 3. Chamar API UazapiGO para buscar chats
    // Tentamos diferentes endpoints que a API pode ter
    let chats: any[] = [];
    let apiResponse: Response;
    
    // Tentar endpoint /chats primeiro
    try {
      apiResponse = await fetch(`${endpoint}/chats`, {
        method: "GET",
        headers: {
          "token": token,
          "Content-Type": "application/json",
        },
      });

      if (apiResponse.ok) {
        const responseData = await apiResponse.json();
        console.log(`[sync-whatsapp-chats] Resposta /chats:`, JSON.stringify(responseData).substring(0, 500));
        
        // A resposta pode ser um array direto ou um objeto com propriedade data/chats
        if (Array.isArray(responseData)) {
          chats = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          chats = responseData.data;
        } else if (responseData.chats && Array.isArray(responseData.chats)) {
          chats = responseData.chats;
        } else if (responseData.response && Array.isArray(responseData.response)) {
          chats = responseData.response;
        }
      } else {
        console.log(`[sync-whatsapp-chats] /chats retornou ${apiResponse.status}, tentando /chat/findChats`);
        await apiResponse.text(); // Consume body
      }
    } catch (err) {
      console.log(`[sync-whatsapp-chats] Erro em /chats:`, err);
    }

    // Se /chats não funcionou, tentar /chat/findChats (POST)
    if (chats.length === 0) {
      try {
        apiResponse = await fetch(`${endpoint}/chat/findChats`, {
          method: "POST",
          headers: {
            "token": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (apiResponse.ok) {
          const responseData = await apiResponse.json();
          console.log(`[sync-whatsapp-chats] Resposta /chat/findChats:`, JSON.stringify(responseData).substring(0, 500));
          
          if (Array.isArray(responseData)) {
            chats = responseData;
          } else if (responseData.data && Array.isArray(responseData.data)) {
            chats = responseData.data;
          } else if (responseData.chats && Array.isArray(responseData.chats)) {
            chats = responseData.chats;
          } else if (responseData.response && Array.isArray(responseData.response)) {
            chats = responseData.response;
          }
        } else {
          console.log(`[sync-whatsapp-chats] /chat/findChats retornou ${apiResponse.status}`);
          await apiResponse.text(); // Consume body
        }
      } catch (err) {
        console.log(`[sync-whatsapp-chats] Erro em /chat/findChats:`, err);
      }
    }

    console.log(`[sync-whatsapp-chats] Total de chats encontrados: ${chats.length}`);

    // 4. Processar e sincronizar chats
    let syncedCount = 0;
    let errors: string[] = [];

    for (const chat of chats) {
      try {
        // Extrair informações do chat - diferentes formatos possíveis
        const rawId = chat.id || chat.jid || chat.remoteJid || "";
        
        // Ignorar grupos (terminam com @g.us)
        if (rawId.includes("@g.us") || rawId.includes("@broadcast")) {
          continue;
        }

        // Extrair número de telefone
        const phone = rawId
          .replace("@s.whatsapp.net", "")
          .replace("@c.us", "")
          .replace(/\D/g, "");

        if (!phone || phone.length < 8) {
          continue;
        }

        // Extrair nome do contato
        const contactName = chat.name || 
                           chat.pushName || 
                           chat.notify || 
                           chat.verifiedName || 
                           chat.formattedTitle ||
                           null;

        // Extrair preview da última mensagem
        let lastMessagePreview = null;
        let lastMessageAt = null;

        if (chat.lastMessage) {
          lastMessagePreview = chat.lastMessage.content || 
                              chat.lastMessage.body || 
                              chat.lastMessage.message || 
                              chat.lastMessage.text ||
                              null;
          
          const timestamp = chat.lastMessage.timestamp || 
                           chat.lastMessage.messageTimestamp ||
                           chat.lastMessage.t;
          
          if (timestamp) {
            // Timestamp pode ser em segundos ou milissegundos
            const ts = timestamp > 9999999999 ? timestamp : timestamp * 1000;
            lastMessageAt = new Date(ts).toISOString();
          }
        } else if (chat.conversationTimestamp || chat.t) {
          const ts = chat.conversationTimestamp || chat.t;
          const timestamp = ts > 9999999999 ? ts : ts * 1000;
          lastMessageAt = new Date(timestamp).toISOString();
        }

        // Contagem de não lidas
        const unreadCount = chat.unreadCount || chat.unreadMessages || 0;

        // Upsert na tabela de conversas
        const { error: upsertError } = await supabase
          .from("whatsapp_conversations")
          .upsert(
            {
              company_id,
              instance_id,
              phone,
              contact_name: contactName,
              last_message_preview: lastMessagePreview ? lastMessagePreview.substring(0, 255) : null,
              last_message_at: lastMessageAt,
              unread_count: unreadCount,
              is_archived: false,
            },
            {
              onConflict: "company_id,instance_id,phone",
              ignoreDuplicates: false,
            }
          );

        if (upsertError) {
          console.error(`[sync-whatsapp-chats] Erro ao upsert chat ${phone}:`, upsertError);
          errors.push(`${phone}: ${upsertError.message}`);
        } else {
          syncedCount++;
        }
      } catch (chatError) {
        console.error(`[sync-whatsapp-chats] Erro ao processar chat:`, chatError);
      }
    }

    console.log(`[sync-whatsapp-chats] Sincronização concluída: ${syncedCount} chats sincronizados`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        total_found: chats.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-whatsapp-chats] Erro geral:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
