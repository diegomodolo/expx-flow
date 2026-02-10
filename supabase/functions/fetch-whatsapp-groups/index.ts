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

    // Get company config
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

    // Get instance credentials
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

    const endpoint = config.uazapi_endpoint?.replace(/\/$/, "");
    const token = instance.uazapi_token;

    if (!endpoint || !token) {
      return new Response(
        JSON.stringify({ error: "Endpoint ou token não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to fetch groups from UazapiGO
    let groups: any[] = [];
    const attemptLogs: string[] = [];

    // First try: POST /group/findAll (UazapiGO preferred)
    const endpointsToTry = [
      { url: `${endpoint}/group/findAll`, method: "POST", body: {} },
      { url: `${endpoint}/group/find`, method: "POST", body: {} },
      { url: `${endpoint}/group/list`, method: "GET", body: null },
      { url: `${endpoint}/group/getAll`, method: "GET", body: null },
      { url: `${endpoint}/chat/find`, method: "POST", body: {} },
      { url: `${endpoint}/chat/findChats`, method: "POST", body: {} },
      { url: `${endpoint}/chats`, method: "GET", body: null },
    ];

    for (const ep of endpointsToTry) {
      try {
        console.log(`[fetch-whatsapp-groups] Trying ${ep.method} ${ep.url}`);
        const fetchOpts: RequestInit = {
          method: ep.method,
          headers: {
            "Content-Type": "application/json",
            "token": token,
          },
        };
        if (ep.body && ep.method === "POST") {
          fetchOpts.body = JSON.stringify(ep.body);
        }

        const response = await fetch(ep.url, fetchOpts);
        
        if (response.ok) {
          const data = await response.json();
          const rawList = Array.isArray(data) ? data : (data?.chats || data?.data || data?.result || data?.groups || []);
          
          if (Array.isArray(rawList) && rawList.length > 0) {
            // Filter only groups (JID ends with @g.us)
            groups = rawList
              .filter((chat: any) => {
                const id = chat.id?._serialized || chat.id || chat.jid || chat.chatId || "";
                return typeof id === "string" && id.includes("@g.us");
              })
              .map((chat: any) => {
                const jid = chat.id?._serialized || chat.id || chat.jid || chat.chatId || "";
                return {
                  jid,
                  name: chat.name || chat.subject || chat.pushName || chat.groupName || jid,
                  description: chat.description || chat.desc || null,
                  participants_count: chat.participants?.length || chat.participantsCount || chat.size || null,
                  profile_pic: chat.profilePicUrl || chat.imgUrl || chat.picture || null,
                };
              });

            attemptLogs.push(`✅ ${ep.url}: Found ${groups.length} groups`);
            console.log(`[fetch-whatsapp-groups] Success at ${ep.url}: ${groups.length} groups`);
            break;
          } else {
            attemptLogs.push(`⚠️ ${ep.url}: OK but no groups in response`);
          }
        } else {
          attemptLogs.push(`❌ ${ep.url}: HTTP ${response.status}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        attemptLogs.push(`❌ ${ep.url}: ${msg}`);
      }
    }

    console.log(`[fetch-whatsapp-groups] Attempts:`, attemptLogs);

    return new Response(
      JSON.stringify({ 
        success: true, 
        groups, 
        total: groups.length,
        attempts: attemptLogs 
      }),
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
