import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// São Paulo timezone offset helper
function getSaoPauloTime(): Date {
  const now = new Date();
  // São Paulo is UTC-3
  const spOffset = -3 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + spOffset * 60000);
}

function getNextExecution(
  frequency: string,
  times: string[],
  daysOfWeek: number[] | null,
  dayOfMonth: number | null
): string | null {
  const sp = getSaoPauloTime();
  const currentHHMM = `${String(sp.getHours()).padStart(2, "0")}:${String(sp.getMinutes()).padStart(2, "0")}`;
  const currentDay = sp.getDay(); // 0=Sun
  const currentDate = sp.getDate();

  // Sort times
  const sortedTimes = [...times].sort();

  if (frequency === "daily") {
    // Find the next time today or tomorrow
    const nextTimeToday = sortedTimes.find((t) => t > currentHHMM);
    if (nextTimeToday) {
      const [h, m] = nextTimeToday.split(":").map(Number);
      const next = new Date(sp);
      next.setHours(h, m, 0, 0);
      // Convert back to UTC: add 3 hours
      return new Date(next.getTime() + 3 * 3600000).toISOString();
    }
    // Tomorrow, first time
    const [h, m] = sortedTimes[0].split(":").map(Number);
    const next = new Date(sp);
    next.setDate(next.getDate() + 1);
    next.setHours(h, m, 0, 0);
    return new Date(next.getTime() + 3 * 3600000).toISOString();
  }

  if (frequency === "weekly" && daysOfWeek && daysOfWeek.length > 0) {
    const sortedDays = [...daysOfWeek].sort();
    // Check if today is a valid day and there's a time left
    if (sortedDays.includes(currentDay)) {
      const nextTimeToday = sortedTimes.find((t) => t > currentHHMM);
      if (nextTimeToday) {
        const [h, m] = nextTimeToday.split(":").map(Number);
        const next = new Date(sp);
        next.setHours(h, m, 0, 0);
        return new Date(next.getTime() + 3 * 3600000).toISOString();
      }
    }
    // Find next valid day
    for (let offset = 1; offset <= 7; offset++) {
      const checkDay = (currentDay + offset) % 7;
      if (sortedDays.includes(checkDay)) {
        const [h, m] = sortedTimes[0].split(":").map(Number);
        const next = new Date(sp);
        next.setDate(next.getDate() + offset);
        next.setHours(h, m, 0, 0);
        return new Date(next.getTime() + 3 * 3600000).toISOString();
      }
    }
  }

  if (frequency === "monthly" && dayOfMonth) {
    const [h, m] = sortedTimes[0].split(":").map(Number);
    if (currentDate === dayOfMonth) {
      const nextTimeToday = sortedTimes.find((t) => t > currentHHMM);
      if (nextTimeToday) {
        const [h2, m2] = nextTimeToday.split(":").map(Number);
        const next = new Date(sp);
        next.setHours(h2, m2, 0, 0);
        return new Date(next.getTime() + 3 * 3600000).toISOString();
      }
    }
    // Next month
    const next = new Date(sp);
    if (currentDate >= dayOfMonth) {
      next.setMonth(next.getMonth() + 1);
    }
    next.setDate(dayOfMonth);
    next.setHours(h, m, 0, 0);
    return new Date(next.getTime() + 3 * 3600000).toISOString();
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("[groupops-campaign-cron] Starting campaign check...");
    const now = new Date().toISOString();

    // Find active campaigns that are due for execution
    const { data: campaigns, error: campaignsError } = await supabase
      .from("groupops_campaigns")
      .select(`
        *,
        groupops_templates!groupops_campaigns_template_id_fkey (
          id, title, body, placeholders, category, constraints_json
        ),
        groupops_groups!groupops_campaigns_group_id_fkey (
          id, name, provider_group_id
        )
      `)
      .eq("status", "active")
      .not("next_execution_at", "is", null)
      .lte("next_execution_at", now);

    if (campaignsError) {
      console.error("[groupops-campaign-cron] Error fetching campaigns:", campaignsError);
      throw campaignsError;
    }

    console.log(`[groupops-campaign-cron] Found ${campaigns?.length ?? 0} campaigns to execute`);

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ success: true, executed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let executed = 0;
    const errors: string[] = [];

    for (const campaign of campaigns) {
      try {
        console.log(`[groupops-campaign-cron] Processing campaign: ${campaign.id} (type: ${campaign.type})`);

        const template = campaign.groupops_templates;
        const group = campaign.groupops_groups;

        if (!template) {
          console.warn(`[groupops-campaign-cron] Campaign ${campaign.id} has no template, skipping`);
          continue;
        }

        if (!group) {
          console.warn(`[groupops-campaign-cron] Campaign ${campaign.id} has no group, skipping`);
          continue;
        }

        // Determine which instance to use (campaign-level or fallback)
        const instanceId = campaign.instance_id;
        if (!instanceId) {
          console.warn(`[groupops-campaign-cron] Campaign ${campaign.id} has no instance configured, skipping`);
          continue;
        }

        // Get instance details
        const { data: instance } = await supabase
          .from("whatsapp_instances")
          .select("uazapi_token, uazapi_instance_id, instance_name, is_connected")
          .eq("id", instanceId)
          .single();

        if (!instance || !instance.is_connected) {
          console.warn(`[groupops-campaign-cron] Instance ${instanceId} not connected, skipping`);
          continue;
        }

        // Get company WhatsApp config
        const { data: config } = await supabase
          .from("whatsapp_configs")
          .select("uazapi_endpoint, provider")
          .eq("company_id", campaign.company_id)
          .eq("is_active", true)
          .single();

        if (!config) {
          console.warn(`[groupops-campaign-cron] No WhatsApp config for company ${campaign.company_id}`);
          continue;
        }

        // Fill placeholders with basic data (group-level, no per-member personalization for group messages)
        let messageBody = template.body;
        const spNow = getSaoPauloTime();
        const daysOfWeek = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
        messageBody = messageBody.replace(/\{\{grupo\}\}/g, group.name || "Grupo");
        messageBody = messageBody.replace(/\{\{dia_semana\}\}/g, daysOfWeek[spNow.getDay()]);

        // If delivery mode is 'group', send to the group JID
        if (campaign.delivery_mode === "group" || campaign.delivery_mode === "both") {
          const groupJid = group.provider_group_id;
          if (groupJid && config.provider === "uazapi") {
            const endpoint = config.uazapi_endpoint.replace(/\/$/, "");
            const token = instance.uazapi_token;

            console.log(`[groupops-campaign-cron] Sending to group: ${groupJid} (category: ${template.category})`);

            let sendResponse: Response;

            if (template.category === "POLL") {
              // Send as poll/enquete
              const pollData = template.constraints_json as any;
              const pollOptions = pollData?.poll_options ?? [];
              const selectableCount = pollData?.selectable_count ?? 1;

              sendResponse = await fetch(`${endpoint}/message/send-poll`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  token: token || "",
                },
                body: JSON.stringify({
                  phone: groupJid,
                  poll: {
                    name: messageBody,
                    options: pollOptions,
                    selectableCount: selectableCount,
                  },
                }),
              });
            } else {
              // Send as regular text message
              sendResponse = await fetch(`${endpoint}/message/send-text`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  token: token || "",
                },
                body: JSON.stringify({
                  phone: groupJid,
                  message: messageBody,
                }),
              });
            }

            const sendResult = await sendResponse.json();
            console.log(`[groupops-campaign-cron] Send result:`, JSON.stringify(sendResult));

            if (sendResponse.ok) {
              executed++;
            } else {
              errors.push(`Campaign ${campaign.id}: ${JSON.stringify(sendResult)}`);
            }
          }
        }

        // TODO: If delivery_mode is 'dm' or 'both', iterate members and send individual messages

        // Calculate next execution and update campaign
        const nextExec = getNextExecution(
          campaign.schedule_frequency || "daily",
          campaign.schedule_times || ["09:00"],
          campaign.schedule_days_of_week,
          campaign.schedule_day_of_month
        );

        await supabase
          .from("groupops_campaigns")
          .update({
            last_execution_at: now,
            next_execution_at: nextExec,
          })
          .eq("id", campaign.id);

        console.log(`[groupops-campaign-cron] Campaign ${campaign.id} next execution: ${nextExec}`);
      } catch (err: any) {
        console.error(`[groupops-campaign-cron] Error processing campaign ${campaign.id}:`, err);
        errors.push(`Campaign ${campaign.id}: ${err.message}`);
      }
    }

    console.log(`[groupops-campaign-cron] Completed. Executed: ${executed}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ success: true, executed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[groupops-campaign-cron] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
