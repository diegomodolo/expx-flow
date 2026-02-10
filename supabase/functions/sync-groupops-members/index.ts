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

    // ---- STEP 1: Fetch group participants ----
    let participants: any[] = [];
    const attemptLogs: string[] = [];
    const groupId = group_jid.replace("@g.us", "");

    const endpointsToTry = [
      { url: `${endpoint}/group/info`, method: "POST", body: { groupJid: group_jid } },
      { url: `${endpoint}/group/participants`, method: "POST", body: { groupJid: group_jid } },
      { url: `${endpoint}/group/metadata`, method: "POST", body: { groupJid: group_jid } },
    ];

    for (const ep of endpointsToTry) {
      try {
        console.log(`[sync-groupops-members] Trying ${ep.method} ${ep.url}`);
        const response = await fetch(ep.url, {
          method: ep.method,
          headers,
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });
        if (!response.ok) {
          attemptLogs.push(`❌ ${ep.url}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`[sync-groupops-members] Response keys from ${ep.url}:`, Object.keys(data));

        // Extract participants (PascalCase for UazapiGO)
        const found =
          data.Participants || data.participants ||
          data.data?.Participants || data.data?.participants ||
          data.groupMetadata?.Participants || data.groupMetadata?.participants ||
          data.result?.Participants || data.result?.participants ||
          data.members || [];

        if (Array.isArray(found) && found.length > 0) {
          participants = found;
          attemptLogs.push(`✅ ${ep.url}: ${found.length} participants`);
          console.log(`[sync-groupops-members] Sample:`, JSON.stringify(found[0]).substring(0, 500));
          break;
        } else {
          attemptLogs.push(`⚠️ ${ep.url}: OK but no participants`);
        }
      } catch (err) {
        attemptLogs.push(`❌ ${ep.url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ---- STEP 2: Fetch contacts/chats to enrich with names & photos ----
    // Build a phone→{name, image} lookup from /chat/find
    const contactLookup: Record<string, { name: string; image: string }> = {};

    try {
      console.log(`[sync-groupops-members] Fetching contacts for name enrichment...`);
      const chatResp = await fetch(`${endpoint}/chat/find`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });

      if (chatResp.ok) {
        const chats = await chatResp.json();
        const chatList = Array.isArray(chats) ? chats : chats?.data || chats?.chats || [];

        for (const c of chatList) {
          // Extract phone from chat
          const chatPhone = (c.phone || c.wa_chatid || c.id || "")
            .replace("@s.whatsapp.net", "")
            .replace("@c.us", "")
            .replace(/\D/g, "");

          if (!chatPhone || chatPhone.length < 8) continue;

          const chatName = c.wa_contactName || c.lead_name || c.lead_fullName || c.name || c.wa_name || "";
          const chatImage = c.image || c.imagePreview || c.profilePicUrl || "";

          if (chatName || chatImage) {
            contactLookup[chatPhone] = {
              name: chatName || "",
              image: chatImage || "",
            };
          }
        }
        console.log(`[sync-groupops-members] Contact lookup built with ${Object.keys(contactLookup).length} entries`);
      } else {
        console.log(`[sync-groupops-members] chat/find returned ${chatResp.status}, skipping enrichment`);
      }
    } catch (err) {
      console.log(`[sync-groupops-members] Error fetching contacts for enrichment:`, err);
    }

    console.log(`[sync-groupops-members] Attempts:`, attemptLogs);

    // ---- STEP 3: Upsert members ----
    let synced = 0;
    const errors: string[] = [];

    for (const p of participants) {
      try {
        // Extract participant data - PascalCase (UazapiGO) + camelCase
        const jid = p.JID || p.id?._serialized || p.id || p.jid || p.wa_user_id || "";
        const phoneRaw = p.PhoneNumber || p.phoneNumber || "";
        const phoneFromJid = (typeof jid === "string" ? jid : "")
          .replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@lid", "").replace(/\D/g, "");
        const phoneFromField = (typeof phoneRaw === "string" ? phoneRaw : "")
          .replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
        const phone = phoneFromField || phoneFromJid;

        if (!phone || phone.length < 8) continue;

        // Name from participant data
        const participantName = p.DisplayName || p.name || p.pushName || p.notify || p.displayName || p.shortName || p.Name || "";

        // Enrich from contact lookup
        const contact = contactLookup[phone] || null;
        const finalName = participantName || contact?.name || null;
        const profilePic = contact?.image || null;

        const isAdmin = p.IsAdmin || p.admin === "admin" || p.admin === "superadmin" || p.isAdmin || false;
        const isSuperAdmin = p.IsSuperAdmin || p.admin === "superadmin" || p.isSuperAdmin || false;
        const role = isSuperAdmin ? "dono" : isAdmin ? "admin" : "membro";

        // Upsert by wa_user_id + group_id OR phone + group_id
        const { data: existingByJid } = await supabase
          .from("groupops_members")
          .select("id")
          .eq("group_id", groupops_group_id)
          .eq("wa_user_id", jid)
          .maybeSingle();

        const existing = existingByJid || (
          await supabase
            .from("groupops_members")
            .select("id")
            .eq("group_id", groupops_group_id)
            .eq("phone_e164", phone)
            .maybeSingle()
        ).data;

        const memberData: Record<string, any> = {
          phone_e164: phone,
          role,
          status: "active",
          wa_user_id: jid,
        };
        // Only update name/pic if we have actual data
        if (finalName) memberData.display_name = finalName;
        if (profilePic) {
          // Store profile pic in privacy_flags JSON (reusing existing column)
          memberData.privacy_flags = { profile_pic: profilePic };
        }

        if (existing) {
          await supabase.from("groupops_members").update(memberData).eq("id", existing.id);
        } else {
          await supabase.from("groupops_members").insert({
            company_id,
            group_id: groupops_group_id,
            ...memberData,
            display_name: finalName,
            silent_days: 0,
            streak_days: 0,
          });
        }
        synced++;
      } catch (err: any) {
        errors.push(err.message || "unknown error");
      }
    }

    // Create MEMBER_SYNC event
    if (synced > 0) {
      await supabase.from("groupops_events").insert({
        company_id,
        group_id: groupops_group_id,
        type: "MEMBER_SYNC",
        payload_json: {
          synced,
          total_participants: participants.length,
          errors: errors.length,
          contacts_enriched: Object.keys(contactLookup).length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[sync-groupops-members] Synced ${synced}/${participants.length}, ${errors.length} errors, ${Object.keys(contactLookup).length} contacts enriched`);

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