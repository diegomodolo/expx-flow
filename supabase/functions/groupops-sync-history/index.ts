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

    // 4. Fetch messages from UazapiGO
    const count = sync_mode === "quantity" ? (sync_value || 500) : 2000; // For date mode, fetch max and filter
    const fetchUrl = `${endpoint}/chat/messages/${encodeURIComponent(chatId)}/${count}`;
    console.log(`[groupops-sync-history] Fetching from: ${fetchUrl}`);

    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: { token: token || "" },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`UazapiGO API error ${response.status}: ${errText}`);
    }

    let messages = await response.json();
    console.log(`[groupops-sync-history] Fetched ${Array.isArray(messages) ? messages.length : 0} messages from API`);

    if (!Array.isArray(messages)) {
      // Some responses wrap in a data field
      messages = messages?.data || messages?.messages || [];
    }

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
        text: text?.substring(0, 5000) || null,
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
    for (let i = 0; i < messageInserts.length; i += batchSize) {
      const batch = messageInserts.slice(i, i + batchSize);
      // Filter out messages without provider_message_id (can't dedup)
      const { error: msgErr, count } = await supabase
        .from("groupops_messages")
        .upsert(batch, { onConflict: "provider_message_id", ignoreDuplicates: true })
        .select("id", { count: "exact", head: true });

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
