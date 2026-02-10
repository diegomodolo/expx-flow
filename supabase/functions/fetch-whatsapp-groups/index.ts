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

    const { company_id, instance_id } = await req.json();

    if (!company_id || !instance_id) {
      return new Response(
        JSON.stringify({ error: "company_id e instance_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[fetch-whatsapp-groups] company: ${company_id}, instance: ${instance_id}`);

    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint, provider, instance_id, token")
      .eq("company_id", company_id)
      .maybeSingle();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "Configuração WhatsApp não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (config.provider !== "uazapi") {
      return new Response(
        JSON.stringify({ error: "Listagem de grupos só é suportada para UazapiGO" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_token, instance_name, uazapi_instance_id")
      .eq("id", instance_id)
      .maybeSingle();

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = (config.uazapi_endpoint || "").replace(/\/$/, "");
    const token = instance.uazapi_token;
    const instanceIdentifier = instance.uazapi_instance_id || instance.instance_name;

    if (!endpoint || !token) {
      return new Response(
        JSON.stringify({ error: "Endpoint ou token não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the same chat listing approach as sync-whatsapp-chats (proven to work)
    let allChats: any[] = [];
    const attemptLogs: string[] = [];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "token": token,
      "apikey": (config as any)?.token || token,
      "Authorization": `Bearer ${token}`,
      "x-instance-name": String(instance.instance_name || ""),
      "x-instance-id": String(instanceIdentifier || ""),
    };

    type Attempt = { url: string; method: "GET" | "POST"; body: any | null };
    const endpointsToTry: Attempt[] = [];
    const add = (url: string, method: "GET" | "POST", body: any | null) => {
      endpointsToTry.push({ url, method, body });
    };

    // Priority: POST /chat/find (proven working with UazapiGO)
    add(`${endpoint}/chat/find`, "POST", {});
    add(`${endpoint}/chat/find`, "POST", { where: {} });
    add(`${endpoint}/chat/find`, "GET", null);
    add(`${endpoint}/chat/findChats`, "POST", {});
    add(`${endpoint}/chat/findChats`, "POST", { where: {} });
    add(`${endpoint}/chat/findChats`, "GET", null);
    add(`${endpoint}/chat/list`, "GET", null);
    add(`${endpoint}/chat/list`, "POST", {});
    add(`${endpoint}/chat/getAll`, "GET", null);
    add(`${endpoint}/chats`, "GET", null);

    for (const ep of endpointsToTry) {
      try {
        console.log(`[fetch-whatsapp-groups] Trying ${ep.method} ${ep.url}`);
        const fetchOpts: RequestInit = { method: ep.method, headers };
        if (ep.body && ep.method === "POST") {
          fetchOpts.body = JSON.stringify(ep.body);
        }

        const response = await fetch(ep.url, fetchOpts);
        if (!response.ok) {
          attemptLogs.push(`❌ ${ep.url}: HTTP ${response.status}`);
          continue;
        }

        const responseText = await response.text();
        let responseData: any;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          attemptLogs.push(`❌ ${ep.url}: invalid JSON`);
          continue;
        }

        // Extract array from various response formats (same logic as sync-whatsapp-chats)
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
        } else if (typeof responseData === 'object' && !Array.isArray(responseData)) {
          const keys = Object.keys(responseData).filter(k => k.includes('@'));
          if (keys.length > 0) {
            foundChats = keys.map(jid => ({ jid, ...responseData[jid] }));
          }
        }

        if (foundChats.length > 0) {
          allChats = foundChats;
          attemptLogs.push(`✅ ${ep.url}: ${foundChats.length} chats found`);
          console.log(`[fetch-whatsapp-groups] Success: ${foundChats.length} total chats`);
          if (foundChats.length > 0) {
            console.log(`[fetch-whatsapp-groups] First chat keys: ${Object.keys(foundChats[0]).join(', ')}`);
            console.log(`[fetch-whatsapp-groups] First chat sample: ${JSON.stringify(foundChats[0]).substring(0, 500)}`);
          }
          break;
        } else {
          attemptLogs.push(`⚠️ ${ep.url}: OK but empty`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        attemptLogs.push(`❌ ${ep.url}: ${msg}`);
      }
    }

    // Filter only groups (@g.us)
    const groups = allChats
      .filter((chat: any) => {
        const id = chat.wa_chatid || chat.id?._serialized || chat.id || chat.jid || chat.remoteJid || chat.chatId || "";
        const idStr = typeof id === "string" ? id : JSON.stringify(id);
        return idStr.includes("@g.us");
      })
      .map((chat: any) => {
        const rawId = chat.wa_chatid || chat.id?._serialized || chat.id || chat.jid || chat.remoteJid || chat.chatId || "";
        const jid = typeof rawId === "string" ? rawId : JSON.stringify(rawId);
        return {
          jid,
          name: chat.name || chat.subject || chat.pushName || chat.groupName || chat.wa_chatname || jid,
          description: chat.description || chat.desc || null,
          participants_count: chat.participants?.length || chat.participantsCount || chat.size || null,
          profile_pic: chat.profilePicUrl || chat.imgUrl || chat.image || chat.imagePreview || chat.picture || chat.wa_profilepicurl || null,
        };
      });

    console.log(`[fetch-whatsapp-groups] Filtered ${groups.length} groups from ${allChats.length} total chats`);
    console.log(`[fetch-whatsapp-groups] Attempts:`, attemptLogs);

    return new Response(
      JSON.stringify({ success: true, groups, total: groups.length, attempts: attemptLogs }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[fetch-whatsapp-groups] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
