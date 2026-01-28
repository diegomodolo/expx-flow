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
      .select("uazapi_endpoint, provider, instance_id, token")
      .eq("company_id", company_id)
      .maybeSingle();

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

    // 2. Buscar token e ID da instância
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_token, instance_name, uazapi_instance_id")
      .eq("id", instance_id)
      .maybeSingle();

    if (instanceError || !instance) {
      console.error("[sync-whatsapp-chats] Erro ao buscar instância:", instanceError);
      return new Response(
        JSON.stringify({ error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = config.uazapi_endpoint.replace(/\/$/, "");
    const token = instance.uazapi_token;
    const instanceIdentifier = instance.uazapi_instance_id || instance.instance_name;

    console.log(`[sync-whatsapp-chats] Buscando chats de: ${endpoint}`);
    console.log(`[sync-whatsapp-chats] Instance ID: ${instanceIdentifier}`);
    console.log(`[sync-whatsapp-chats] Token: ${token?.substring(0, 8)}...`);

    // 3. Chamar API UazapiGO para buscar chats
    // A UazapiGO v2 usa o header "token" para autenticar
    // O token identifica automaticamente a instância, então não precisa de instância na URL
    let chats: any[] = [];
    const attemptLogs: string[] = [];
    
    // Lista de endpoints para tentar (UazapiGO / proxies / variações de basePath)
    // Observação: em alguns servidores o endpoint real fica atrás de /api, /v1, /v2, etc.
    const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

    const baseCandidates = uniq(
      [
        endpoint,
        // Alguns provedores expõem a API sob /whatsapp (ex.: /whatsapp/chat/findChats)
        `${endpoint}/whatsapp`,
        `${endpoint}/whatsapp/api`,
        `${endpoint}/whatsapp/api/v1`,
        `${endpoint}/whatsapp/api/v2`,
        `${endpoint}/whatsapp/v1`,
        `${endpoint}/whatsapp/v2`,
        `${endpoint}/api`,
        `${endpoint}/api/v1`,
        `${endpoint}/api/v2`,
        `${endpoint}/v1`,
        `${endpoint}/v2`,
      ].filter(Boolean)
    );

    const instanceCandidates = uniq(
      [
        instanceIdentifier,
        instance.instance_name,
        instance.uazapi_instance_id,
        config.instance_id,
      ].filter(Boolean)
    );

    type EndpointAttempt = { url: string; method: "GET" | "POST"; body: any | null };
    const endpointsToTry: EndpointAttempt[] = [];
    const add = (url: string, method: "GET" | "POST", body: any | null) => {
      endpointsToTry.push({ url, method, body });
    };

    for (const base of baseCandidates) {
      // *** ENDPOINT PRIORITÁRIO: POST /chat/find conforme docs.uazapi.com ***
      add(`${base}/chat/find`, "POST", {});
      add(`${base}/chat/find`, "POST", { where: {} });
      add(`${base}/chat/find`, "GET", null);

      // Outros endpoints de listagem de chats
      add(`${base}/chat/findChats`, "POST", {});
      add(`${base}/chat/findChats`, "POST", { where: {} });
      add(`${base}/chat/findChats`, "GET", null);
      add(`${base}/chat/list`, "GET", null);
      add(`${base}/chat/list`, "POST", {});
      add(`${base}/chat/getAll`, "GET", null);
      add(`${base}/chats`, "GET", null);
      add(`${base}/chat`, "GET", null);
      add(`${base}/user/contacts`, "GET", null);

      // Com instância na URL/body (Evolution API / proxies compatíveis)
      for (const inst of instanceCandidates) {
        // POST /chat/find com instância (caso precise)
        add(`${base}/chat/find/${inst}`, "POST", {});
        add(`${base}/chat/find/${inst}`, "GET", null);
        add(`${base}/chat/find`, "POST", { instanceName: inst });
        add(`${base}/chat/find`, "POST", { instance: inst });

        // findChats com instância
        add(`${base}/chat/findChats/${inst}`, "POST", {});
        add(`${base}/chat/findChats/${inst}`, "GET", null);
        add(`${base}/chat/findChats`, "POST", { instanceName: inst });
        add(`${base}/chat/findChats`, "POST", { instance: inst });
        add(`${base}/chat/findChats`, "POST", { instanceName: inst, where: {} });
      }
    }

    for (const ep of endpointsToTry) {
      try {
        console.log(`[sync-whatsapp-chats] Tentando: ${ep.method} ${ep.url}`);
        
        const apiKeyHeader = (config as any)?.token || token;

        const fetchOptions: RequestInit = {
          method: ep.method,
          headers: {
            "token": token,
            "apikey": apiKeyHeader,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
            // Alguns proxies/implementações olham instância via header
            "x-instance-name": String(instance.instance_name || ""),
            "x-instance-id": String(instanceIdentifier || ""),
          },
        };
        
        if (ep.body !== null && ep.method === "POST") {
          fetchOptions.body = JSON.stringify(ep.body);
        }

        const apiResponse = await fetch(ep.url, fetchOptions);
        const responseText = await apiResponse.text();
        
        console.log(`[sync-whatsapp-chats] Status: ${apiResponse.status}`);
        console.log(`[sync-whatsapp-chats] Response preview: ${responseText.substring(0, 2000)}`);

        if (apiResponse.ok) {
          try {
            const responseData = JSON.parse(responseText);
            
            // A resposta pode estar em diferentes formatos
            let foundChats: any[] = [];
            
            if (Array.isArray(responseData)) {
              foundChats = responseData;
            } else if (responseData.data && Array.isArray(responseData.data)) {
              foundChats = responseData.data;
            } else if (responseData.chats && Array.isArray(responseData.chats)) {
              foundChats = responseData.chats;
            } else if (responseData.response && Array.isArray(responseData.response)) {
              foundChats = responseData.response;
            } else if (responseData.result && Array.isArray(responseData.result)) {
              foundChats = responseData.result;
            } else if (responseData.rows && Array.isArray(responseData.rows)) {
              foundChats = responseData.rows;
            } else if (responseData.contacts && Array.isArray(responseData.contacts)) {
              foundChats = responseData.contacts;
            } else if (typeof responseData === 'object' && !Array.isArray(responseData)) {
              // Pode ser um objeto com JIDs como chaves (formato wuzapi /user/contacts)
              const keys = Object.keys(responseData).filter(k => k.includes('@'));
              if (keys.length > 0) {
                foundChats = keys.map(jid => ({ jid, ...responseData[jid] }));
              }
            }

            if (foundChats.length > 0) {
              chats = foundChats;
              attemptLogs.push(`✅ ${ep.url}: ${chats.length} chats encontrados`);
              // Log detalhado das chaves do primeiro chat para identificar campos de timestamp
              console.log(`[sync-whatsapp-chats] Primeiro chat KEYS:`, Object.keys(foundChats[0]).join(', '));
              console.log(`[sync-whatsapp-chats] Primeiro chat FULL:`, JSON.stringify(foundChats[0]));
              break;
            } else {
              // Log da resposta completa para debug
              console.log(`[sync-whatsapp-chats] Resposta completa (sem chats):`, responseText.substring(0, 1000));
              attemptLogs.push(`⚠️ ${ep.url}: OK mas sem chats na resposta`);
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
        console.log(`[sync-whatsapp-chats] Erro em ${ep.url}:`, err);
      }
    }

    console.log(`[sync-whatsapp-chats] Tentativas:`, attemptLogs);
    console.log(`[sync-whatsapp-chats] Total de chats encontrados: ${chats.length}`);

    if (chats.length === 0) {
      // Se não achou chats, devolve erro explícito (pra UI conseguir orientar)
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Não consegui listar suas conversas antigas na API do UazapiGO. Normalmente isso acontece quando o uazapi_endpoint precisa incluir /api (ou /api/v1, /api/v2) ou quando o servidor não expõe endpoint de listagem de chats.",
          attempts: attemptLogs,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Processar e sincronizar chats
    let syncedCount = 0;
    let errors: string[] = [];

    for (const chat of chats) {
      try {
        // Extrair informações do chat - diferentes formatos possíveis
        // UazapiGO format: { id, phone, name, wa_chatid, ... }
        const rawId = chat.wa_chatid || chat.id || chat.jid || chat.remoteJid || "";
        const chatPhone = chat.phone || "";
        
        // Ignorar grupos (terminam com @g.us)
        if (rawId.includes("@g.us") || rawId.includes("@broadcast") || chat.wa_isGroup) {
          continue;
        }

        // Extrair número de telefone
        let phone = "";
        if (rawId) {
          phone = rawId.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
        } else if (chatPhone) {
          phone = chatPhone.replace(/\D/g, "");
        }

        if (!phone || phone.length < 8) {
          continue;
        }

        // Extrair nome do contato
        const contactName = chat.name || 
                           chat.wa_contactName ||
                           chat.pushName || 
                           chat.notify || 
                           chat.verifiedName || 
                           chat.formattedTitle ||
                           null;

        // Extrair preview da última mensagem
        let lastMessagePreview = chat.wa_lastMessageTextVote || null;
        let lastMessageAt = null;

        // Timestamp pode estar em diferentes campos
        const timestamp = chat.wa_lastMsgTimestamp || 
                         chat.lastMessage?.timestamp || 
                         chat.lastMessage?.messageTimestamp ||
                         chat.conversationTimestamp ||
                         chat.t;
        
        if (timestamp) {
          // Timestamp pode ser em segundos ou milissegundos
          const ts = timestamp > 9999999999 ? timestamp : timestamp * 1000;
          lastMessageAt = new Date(ts).toISOString();
        }

        // Contagem de não lidas vinda do provedor
        const apiUnreadCount = chat.wa_unreadCount || chat.unreadCount || chat.unreadMessages || 0;

        // Extrair foto de perfil do contato
        // UazapiGO pode retornar em diferentes campos
        const profilePicUrl = chat.imagePreview || 
                              chat.image || 
                              chat.profilePicUrl ||
                              chat.profilePictureUrl ||
                              chat.wa_profilePic ||
                              chat.imgUrl ||
                              chat.avatar ||
                              chat.contact?.profilePicUrl ||
                              chat.contact?.imgUrl ||
                              null;

        // Verificar se a conversa já existe para preservar dados locais
        // Isso evita sobrescrever mensagens que o usuário já marcou como lidas localmente
        // e também preserva o preview de mensagens enviadas localmente (ex: áudios)
        const { data: existingConversation } = await supabase
          .from("whatsapp_conversations")
          .select("id, unread_count, last_message_preview, last_message_at")
          .eq("company_id", company_id)
          .eq("instance_id", instance_id)
          .eq("phone", phone)
          .maybeSingle();

        // Lógica para decidir o unread_count final:
        // - Se a conversa NÃO existe: usar o valor da API
        // - Se a conversa EXISTE e unread_count local é 0 (já lido): manter 0
        // - Se a conversa EXISTE e a API reporta mais não lidas: usar valor da API
        let finalUnreadCount = apiUnreadCount;
        // Lógica para decidir o last_message_preview final:
        // - Se a API traz um preview válido: usar ele
        // - Se a API não traz preview mas temos um local: preservar o local
        let finalLastMessagePreview = lastMessagePreview ? lastMessagePreview.substring(0, 255) : null;
        let finalLastMessageAt = lastMessageAt || "2000-01-01T00:00:00.000Z";
        
        if (existingConversation) {
          const localUnreadCount = existingConversation.unread_count || 0;
          // Se usuário marcou como lido (local = 0), não sobrescrever
          // A menos que a API reporte novas mensagens (valor maior que 0)
          // Nesse caso, usamos o valor da API apenas se for MAIOR que o local
          // para capturar novas mensagens chegando
          if (localUnreadCount === 0 && apiUnreadCount > 0) {
            // Provedor pode estar desatualizado, manter como lido
            // A contagem real será incrementada pelo webhook de novas mensagens
            finalUnreadCount = 0;
          } else if (apiUnreadCount > localUnreadCount) {
            // Novas mensagens chegaram - usar valor da API
            finalUnreadCount = apiUnreadCount;
          } else {
            // Manter valor local
            finalUnreadCount = localUnreadCount;
          }
          
          // Preservar preview local se a API não retornar um
          // Isso é importante para áudios/mídias enviados localmente que a API não reporta
          if (!lastMessagePreview && existingConversation.last_message_preview) {
            finalLastMessagePreview = existingConversation.last_message_preview;
          }
          
          // Preservar timestamp local se for mais recente que o da API
          // (mensagens enviadas localmente podem ter timestamp mais recente)
          if (existingConversation.last_message_at) {
            const localTimestamp = new Date(existingConversation.last_message_at).getTime();
            const apiTimestamp = lastMessageAt ? new Date(lastMessageAt).getTime() : 0;
            if (localTimestamp > apiTimestamp) {
              finalLastMessageAt = existingConversation.last_message_at;
              // Se o timestamp local é mais recente, também preservar o preview local
              if (existingConversation.last_message_preview) {
                finalLastMessagePreview = existingConversation.last_message_preview;
              }
            }
          }
        }

        // Upsert na tabela de conversas
        const { error: upsertError } = await supabase
          .from("whatsapp_conversations")
          .upsert(
            {
              company_id,
              instance_id,
              phone,
              contact_name: contactName,
              profile_pic_url: profilePicUrl || null,
              last_message_preview: finalLastMessagePreview,
              last_message_at: finalLastMessageAt,
              unread_count: finalUnreadCount,
              is_archived: chat.wa_archived || false,
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
        attempts: attemptLogs,
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
