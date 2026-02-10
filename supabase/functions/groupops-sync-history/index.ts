import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { group_id, instance_id, sync_mode, sync_value } = await req.json();
    // sync_mode: "quantity" | "date"
    // sync_value: number (msg count) or string (ISO date)

    if (!group_id || !instance_id) {
      return new Response(JSON.stringify({ error: "group_id and instance_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[groupops-sync-history] Starting sync for group ${group_id}, mode: ${sync_mode}, value: ${sync_value}`);

    // 1. Get group info
    const { data: group, error: groupErr } = await supabase
      .from("groupops_groups")
      .select("id, company_id, provider_group_id, name")
      .eq("id", group_id)
      .single();

    if (groupErr || !group) {
      throw new Error(`Group not found: ${groupErr?.message}`);
    }

    // 2. Get instance info
    const { data: instance, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_token, is_connected")
      .eq("id", instance_id)
      .single();

    if (instErr || !instance || !instance.is_connected) {
      throw new Error("Instance not found or not connected");
    }

    // 3. Get WhatsApp config
    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint")
      .eq("company_id", group.company_id)
      .eq("is_active", true)
      .single();

    if (!config?.uazapi_endpoint) {
      throw new Error("No WhatsApp config found");
    }

    const endpoint = config.uazapi_endpoint.replace(/\/$/, "");
    const token = instance.uazapi_token;
    const chatId = group.provider_group_id;

    if (!chatId) {
      throw new Error("Group has no provider_group_id");
    }

    // 4. Fetch messages from UazapiGO via POST /message/find
    const count = sync_mode === "quantity" ? (sync_value || 500) : 2000;

    console.log(`[groupops-sync-history] Fetching via POST /message/find, chatId: ${chatId}, limit: ${count}`);
    
    const msgResponse = await fetch(`${endpoint}/message/find`, {
      method: "POST",
      headers: {
        token: token || "",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ chatid: chatId, limit: count }),
    });

    if (!msgResponse.ok) {
      const errText = await msgResponse.text();
      console.error(`[groupops-sync-history] POST /message/find returned ${msgResponse.status}: ${errText}`);
      throw new Error(`UazapiGO /message/find error ${msgResponse.status}: ${errText}`);
    }

    const responseData = await msgResponse.json();
    console.log(`[groupops-sync-history] Response: type=${typeof responseData}, isArray=${Array.isArray(responseData)}, keys=${typeof responseData === 'object' && responseData ? Object.keys(responseData).join(',') : 'N/A'}, preview=${JSON.stringify(responseData).substring(0, 500)}`);

    let messages: any[] = [];
    if (Array.isArray(responseData)) {
      messages = responseData;
    } else if (responseData?.data && Array.isArray(responseData.data)) {
      messages = responseData.data;
    } else if (responseData?.messages && Array.isArray(responseData.messages)) {
      messages = responseData.messages;
    } else if (responseData?.records && Array.isArray(responseData.records)) {
      messages = responseData.records;
    }

    console.log(`[groupops-sync-history] Parsed ${messages.length} messages`);

    console.log(`[groupops-sync-history] Fetched ${messages.length} messages from API`);

    // 5. Filter by date if sync_mode is "date"
    if (sync_mode === "date" && sync_value) {
      const sinceDate = new Date(sync_value).getTime();
      messages = messages.filter((m: any) => {
        const ts = m.messageTimestamp || m.timestamp || m.message?.messageTimestamp;
        if (!ts) return false;
        const msgTime = typeof ts === "number" ? (ts > 1e12 ? ts : ts * 1000) : new Date(ts).getTime();
        return msgTime >= sinceDate;
      });
      console.log(`[groupops-sync-history] After date filter: ${messages.length} messages`);
    }

    // 6. Process messages: extract unique senders and build inserts
    const memberMap = new Map<string, { display_name: string; phone: string; last_message_at: string; message_count: number }>();
    const messageInserts: any[] = [];
    const now = new Date().toISOString();

    for (const msg of messages) {
      // Skip system messages
      const msgType = msg.messageType || msg.message?.messageType || msg.type || "";
      if (msgType === "protocolMessage" || msgType === "senderKeyDistributionMessage") continue;

      const sender = msg.sender || msg.message?.sender || msg.participant || "";
      const senderName = msg.senderName || msg.message?.senderName || msg.pushName || "";
      const text = msg.text || msg.content || msg.message?.text || msg.message?.content || "";
      const msgId = msg.id || msg.messageid || msg.message?.id || "";
      const timestamp = msg.messageTimestamp || msg.timestamp || msg.message?.messageTimestamp;

      if (!sender) continue;

      // Normalize phone from sender (remove @s.whatsapp.net, @lid, etc.)
      let phone = sender.replace(/@.*$/, "").replace(/[^0-9]/g, "");
      // Skip if it looks like a LID (not a phone number)
      const isLid = sender.includes("@lid");

      // Track member
      const memberKey = sender;
      const msgTimeMs = typeof timestamp === "number" ? (timestamp > 1e12 ? timestamp : timestamp * 1000) : Date.now();
      const msgTimeISO = new Date(msgTimeMs).toISOString();

      const existing = memberMap.get(memberKey);
      if (existing) {
        existing.message_count++;
        if (msgTimeISO > existing.last_message_at) {
          existing.last_message_at = msgTimeISO;
          if (senderName) existing.display_name = senderName;
        }
      } else {
        memberMap.set(memberKey, {
          display_name: senderName || phone || sender,
          phone: isLid ? "" : phone,
          last_message_at: msgTimeISO,
          message_count: 1,
        });
      }

      // Build message insert
      messageInserts.push({
        company_id: group.company_id,
        group_id: group.id,
        provider_message_id: msgId || null,
        text: typeof text === 'string' ? text.substring(0, 5000) : (text ? String(text).substring(0, 5000) : null),
        media_type: msgType === "imageMessage" ? "image" : msgType === "videoMessage" ? "video" : msgType === "audioMessage" ? "audio" : msgType === "documentMessage" ? "document" : null,
        timestamp: msgTimeISO,
      });
    }

    console.log(`[groupops-sync-history] Unique senders: ${memberMap.size}, Messages to insert: ${messageInserts.length}`);

    // 7. Upsert members
    const memberResults: any[] = [];
    for (const [senderKey, info] of memberMap) {
      // Check if member already exists in this group by wa_user_id or phone
      let existingMember = null;

      if (info.phone) {
        const phoneE164 = info.phone.startsWith("+") ? info.phone : `+${info.phone}`;
        const { data: byPhone } = await supabase
          .from("groupops_members")
          .select("id")
          .eq("group_id", group.id)
          .eq("phone_e164", phoneE164)
          .maybeSingle();
        existingMember = byPhone;
      }

      if (!existingMember) {
        const { data: byWaId } = await supabase
          .from("groupops_members")
          .select("id")
          .eq("group_id", group.id)
          .eq("wa_user_id", senderKey)
          .maybeSingle();
        existingMember = byWaId;
      }

      if (existingMember) {
        // Update last_message_at and name if newer
        await supabase
          .from("groupops_members")
          .update({
            last_message_at: info.last_message_at,
            display_name: info.display_name || undefined,
            updated_at: now,
          } as any)
          .eq("id", existingMember.id);
        memberResults.push({ id: existingMember.id, wa_user_id: senderKey, action: "updated" });
      } else {
        // Insert new member
        const phoneE164 = info.phone ? (info.phone.startsWith("+") ? info.phone : `+${info.phone}`) : null;
        const { data: newMember, error: insertErr } = await supabase
          .from("groupops_members")
          .insert({
            company_id: group.company_id,
            group_id: group.id,
            wa_user_id: senderKey,
            phone_e164: phoneE164,
            display_name: info.display_name || phoneE164 || senderKey,
            status: "active",
            last_message_at: info.last_message_at,
          } as any)
          .select("id")
          .single();

        if (insertErr) {
          console.warn(`[groupops-sync-history] Error inserting member ${senderKey}:`, insertErr.message);
        } else {
          memberResults.push({ id: newMember?.id, wa_user_id: senderKey, action: "created" });
        }
      }
    }

    // 8. Insert messages in batches (skip duplicates by provider_message_id)
    let messagesInserted = 0;
    const batchSize = 100;
    // Filter out messages without provider_message_id (can't dedup without it)
    const validInserts = messageInserts.filter(m => m.provider_message_id);
    console.log(`[groupops-sync-history] Valid messages with provider_message_id: ${validInserts.length} of ${messageInserts.length}`);
    
    for (let i = 0; i < validInserts.length; i += batchSize) {
      const batch = validInserts.slice(i, i + batchSize);
      const { error: msgErr } = await supabase
        .from("groupops_messages")
        .upsert(batch, { onConflict: "provider_message_id", ignoreDuplicates: true });

      if (msgErr) {
        console.warn(`[groupops-sync-history] Batch insert error:`, msgErr.message);
      } else {
        messagesInserted += batch.length;
      }
    }

    // 9. Calculate scores: silent_days and streak for each member
    const memberUpdates: string[] = [];
    for (const [senderKey, info] of memberMap) {
      const daysSinceLastMsg = Math.floor((Date.now() - new Date(info.last_message_at).getTime()) / (1000 * 60 * 60 * 24));
      const silentDays = daysSinceLastMsg;
      const riskLevel = silentDays > 14 ? "high" : silentDays > 7 ? "medium" : "low";

      // Find the member's DB id
      const memberResult = memberResults.find(m => m.wa_user_id === senderKey);
      if (memberResult?.id) {
        await supabase
          .from("groupops_members")
          .update({
            silent_days: silentDays,
            risk_level: riskLevel,
            updated_at: now,
          } as any)
          .eq("id", memberResult.id);
        memberUpdates.push(memberResult.id);
      }
    }

    const silentMembers = Array.from(memberMap.values()).filter(m => {
      const days = Math.floor((Date.now() - new Date(m.last_message_at).getTime()) / (1000 * 60 * 60 * 24));
      return days > 7;
    }).length;

    console.log(`[groupops-sync-history] Sync complete. Members: ${memberResults.length}, Messages: ${messagesInserted}, Silent: ${silentMembers}`);

    return new Response(JSON.stringify({
      success: true,
      members_processed: memberResults.length,
      members_created: memberResults.filter(m => m.action === "created").length,
      members_updated: memberResults.filter(m => m.action === "updated").length,
      messages_imported: messagesInserted,
      silent_members: silentMembers,
      scores_updated: memberUpdates.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[groupops-sync-history] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
