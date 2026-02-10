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

    const { company_id, instance_id, group_jid, groupops_group_id } = await req.json();

    if (!company_id || !instance_id || !group_jid || !groupops_group_id) {
      return new Response(
        JSON.stringify({ error: "company_id, instance_id, group_jid e groupops_group_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-groupops-members] company: ${company_id}, group_jid: ${group_jid}`);

    // Get company config
    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint, provider, token")
      .eq("company_id", company_id)
      .maybeSingle();

    if (!config || config.provider !== "uazapi") {
      return new Response(
        JSON.stringify({ error: "Configuração UazapiGO não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get instance
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_token, instance_name, uazapi_instance_id")
      .eq("id", instance_id)
      .maybeSingle();

    if (!instance) {
      return new Response(
        JSON.stringify({ error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = (config.uazapi_endpoint || "").replace(/\/$/, "");
    const token = instance.uazapi_token;

    if (!endpoint || !token) {
      return new Response(
        JSON.stringify({ error: "Endpoint ou token não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "token": token,
      "apikey": (config as any)?.token || token,
      "Authorization": `Bearer ${token}`,
    };

    // Try to fetch group participants
    let participants: any[] = [];
    const attemptLogs: string[] = [];

    // Clean group JID for API calls
    const groupId = group_jid.replace("@g.us", "");

    const endpointsToTry = [
      // UazapiGO group info endpoints
      { url: `${endpoint}/group/participants`, method: "POST", body: { groupJid: group_jid } },
      { url: `${endpoint}/group/participants`, method: "POST", body: { id: group_jid } },
      { url: `${endpoint}/group/findParticipants`, method: "POST", body: { groupJid: group_jid } },
      { url: `${endpoint}/group/metadata`, method: "POST", body: { groupJid: group_jid } },
      { url: `${endpoint}/group/info`, method: "POST", body: { groupJid: group_jid } },
      { url: `${endpoint}/group/info`, method: "POST", body: { id: group_jid } },
      { url: `${endpoint}/group/${groupId}`, method: "GET", body: null },
      { url: `${endpoint}/group/find`, method: "POST", body: { groupJid: group_jid } },
      // Chat-based fallback 
      { url: `${endpoint}/chat/find`, method: "POST", body: { where: { id: group_jid } } },
    ];

    for (const ep of endpointsToTry) {
      try {
        console.log(`[sync-groupops-members] Trying ${ep.method} ${ep.url}`);
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
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          attemptLogs.push(`❌ ${ep.url}: invalid JSON`);
          continue;
        }

        console.log(`[sync-groupops-members] Response from ${ep.url}:`, JSON.stringify(data).substring(0, 1000));

        // Extract participants from various response formats
        let found: any[] = [];
        if (Array.isArray(data)) {
          found = data;
        } else if (data.participants && Array.isArray(data.participants)) {
          found = data.participants;
        } else if (data.data?.participants && Array.isArray(data.data.participants)) {
          found = data.data.participants;
        } else if (data.groupMetadata?.participants) {
          found = data.groupMetadata.participants;
        } else if (data.result?.participants) {
          found = data.result.participants;
        } else if (data.members && Array.isArray(data.members)) {
          found = data.members;
        }
        // Also check if response is a single chat with participants inside
        if (found.length === 0 && Array.isArray(data)) {
          const chat = data.find((c: any) => {
            const cid = c.wa_chatid || c.id?._serialized || c.id || "";
            return typeof cid === "string" && cid.includes(groupId);
          });
          if (chat?.participants) found = chat.participants;
          if (chat?.groupMetadata?.participants) found = chat.groupMetadata.participants;
        }

        if (found.length > 0) {
          participants = found;
          attemptLogs.push(`✅ ${ep.url}: ${found.length} participants`);
          console.log(`[sync-groupops-members] Found ${found.length} participants`);
          if (found.length > 0) {
            console.log(`[sync-groupops-members] Sample participant:`, JSON.stringify(found[0]).substring(0, 300));
          }
          break;
        } else {
          attemptLogs.push(`⚠️ ${ep.url}: OK but no participants found`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        attemptLogs.push(`❌ ${ep.url}: ${msg}`);
      }
    }

    console.log(`[sync-groupops-members] Attempts:`, attemptLogs);

    // Upsert members into groupops_members
    let synced = 0;
    let errors: string[] = [];

    for (const p of participants) {
      try {
        // Extract participant data from various formats
        const jid = p.id?._serialized || p.id || p.jid || p.wa_user_id || "";
        const phone = (typeof jid === "string" ? jid : "")
          .replace("@s.whatsapp.net", "")
          .replace("@c.us", "")
          .replace(/\D/g, "");
        
        const name = p.name || p.pushName || p.notify || p.displayName || p.shortName || null;
        const isAdmin = p.admin === "admin" || p.admin === "superadmin" || p.isAdmin || p.isSuperAdmin || false;
        const role = p.admin === "superadmin" || p.isSuperAdmin ? "owner" : isAdmin ? "admin" : "member";

        if (!phone || phone.length < 8) continue;

        // Upsert: use wa_user_id + group_id as unique key
        const { data: existing } = await supabase
          .from("groupops_members")
          .select("id")
          .eq("group_id", groupops_group_id)
          .eq("wa_user_id", jid)
          .maybeSingle();

        if (existing) {
          // Update existing member
          await supabase
            .from("groupops_members")
            .update({
              display_name: name || undefined,
              phone_e164: phone,
              role,
              status: "active",
            })
            .eq("id", existing.id);
        } else {
          // Insert new member
          await supabase
            .from("groupops_members")
            .insert({
              company_id,
              group_id: groupops_group_id,
              wa_user_id: jid,
              phone_e164: phone,
              display_name: name,
              role,
              status: "active",
              silent_days: 0,
              streak_days: 0,
            });
        }
        synced++;
      } catch (err: any) {
        errors.push(err.message || "unknown error");
      }
    }

    // Also create a MEMBER_SYNC event
    if (synced > 0) {
      await supabase.from("groupops_events").insert({
        company_id,
        group_id: groupops_group_id,
        type: "MEMBER_SYNC",
        payload_json: { synced, total_participants: participants.length, errors: errors.length },
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[sync-groupops-members] Synced ${synced}/${participants.length} members, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ success: true, synced, total: participants.length, errors: errors.length, attempts: attemptLogs }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[sync-groupops-members] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
