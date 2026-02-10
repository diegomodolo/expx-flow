import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// São Paulo timezone helper using only UTC methods (no runtime timezone dependency)
function getSaoPauloTime(): { hours: number; minutes: number; day: number; date: number; baseDate: Date } {
  const now = new Date();
  const spTotalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() - 180; // UTC-3
  const dayShift = spTotalMinutes < 0 ? -1 : spTotalMinutes >= 1440 ? 1 : 0;
  const normalizedMinutes = ((spTotalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  const baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayShift));
  return { hours, minutes, day: baseDate.getUTCDay(), date: baseDate.getUTCDate(), baseDate };
}

// Convert São Paulo HH:MM on a given base date to UTC ISO string
function spTimeToUTC(base: Date, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(base);
  d.setUTCHours(h + 3, m, 0, 0); // São Paulo + 3h = UTC
  return d.toISOString();
}

function getNextExecution(
  frequency: string,
  times: string[],
  daysOfWeek: number[] | null,
  dayOfMonth: number | null
): string | null {
  const sp = getSaoPauloTime();
  const currentHHMM = `${String(sp.hours).padStart(2, "0")}:${String(sp.minutes).padStart(2, "0")}`;
  const sortedTimes = [...times].sort();

  if (frequency === "daily") {
    const nextTimeToday = sortedTimes.find((t) => t > currentHHMM);
    if (nextTimeToday) {
      return spTimeToUTC(sp.baseDate, nextTimeToday);
    }
    const tomorrow = new Date(sp.baseDate);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return spTimeToUTC(tomorrow, sortedTimes[0]);
  }

  if (frequency === "weekly" && daysOfWeek && daysOfWeek.length > 0) {
    const sortedDays = [...daysOfWeek].sort();
    if (sortedDays.includes(sp.day)) {
      const nextTimeToday = sortedTimes.find((t) => t > currentHHMM);
      if (nextTimeToday) {
        return spTimeToUTC(sp.baseDate, nextTimeToday);
      }
    }
    for (let offset = 1; offset <= 7; offset++) {
      const checkDay = (sp.day + offset) % 7;
      if (sortedDays.includes(checkDay)) {
        const target = new Date(sp.baseDate);
        target.setUTCDate(target.getUTCDate() + offset);
        return spTimeToUTC(target, sortedTimes[0]);
      }
    }
  }

  if (frequency === "monthly" && dayOfMonth) {
    if (sp.date === dayOfMonth) {
      const nextTimeToday = sortedTimes.find((t) => t > currentHHMM);
      if (nextTimeToday) {
        return spTimeToUTC(sp.baseDate, nextTimeToday);
      }
    }
    const next = new Date(sp.baseDate);
    if (sp.date >= dayOfMonth) {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }
    next.setUTCDate(dayOfMonth);
    return spTimeToUTC(next, sortedTimes[0]);
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
        console.log(`[groupops-campaign-cron] Processing campaign: ${campaign.id} (type: ${campaign.type}, template_mode: ${campaign.template_mode})`);

        let template = campaign.groupops_templates;
        const group = campaign.groupops_groups;

        // If no direct template, resolve based on template_mode
        if (!template) {
          if (campaign.template_mode === 'random') {
            // Pick a random template matching the campaign type (category)
            const { data: randomTemplates, error: rtErr } = await supabase
              .from('groupops_templates')
              .select('id, title, body, placeholders, category, constraints_json')
              .eq('company_id', campaign.company_id)
              .eq('category', campaign.type);

            if (rtErr) {
              console.error(`[groupops-campaign-cron] Error fetching random templates:`, rtErr);
              continue;
            }

            if (!randomTemplates || randomTemplates.length === 0) {
              console.warn(`[groupops-campaign-cron] Campaign ${campaign.id}: no templates found for category ${campaign.type}, skipping`);
              continue;
            }

            // Pick one at random
            template = randomTemplates[Math.floor(Math.random() * randomTemplates.length)];
            console.log(`[groupops-campaign-cron] Randomly selected template: ${template.id} (${template.title})`);

          } else if (campaign.template_mode === 'selected' && campaign.selected_template_ids?.length > 0) {
            // Pick a random template from the selected list
            const randomId = campaign.selected_template_ids[Math.floor(Math.random() * campaign.selected_template_ids.length)];
            const { data: selTemplate } = await supabase
              .from('groupops_templates')
              .select('id, title, body, placeholders, category, constraints_json')
              .eq('id', randomId)
              .single();

            if (!selTemplate) {
              console.warn(`[groupops-campaign-cron] Campaign ${campaign.id}: selected template ${randomId} not found, skipping`);
              continue;
            }

            template = selTemplate;
            console.log(`[groupops-campaign-cron] Using selected template: ${template.id} (${template.title})`);

          } else {
            console.warn(`[groupops-campaign-cron] Campaign ${campaign.id} has no template and no valid template_mode, skipping`);
            continue;
          }
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
        messageBody = messageBody.replace(/\{\{dia_semana\}\}/g, daysOfWeek[spNow.day]);

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
              // Send as regular text message (UazapiGO uses "number" and "text")
              sendResponse = await fetch(`${endpoint}/send/text`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  token: token || "",
                },
                body: JSON.stringify({
                  number: groupJid,
                  text: messageBody,
                }),
              });
            }

            const sendResult = await sendResponse.json();
            console.log(`[groupops-campaign-cron] Send result:`, JSON.stringify(sendResult));

            const deliveryStatus = sendResponse.ok ? "sent" : "error";
            if (sendResponse.ok) {
              executed++;
            } else {
              errors.push(`Campaign ${campaign.id}: ${JSON.stringify(sendResult)}`);
            }

            // Get cycle number
            const { count: prevCount } = await supabase
              .from("groupops_campaign_send_log")
              .select("id", { count: "exact", head: true })
              .eq("campaign_id", campaign.id);
            const cycleNumber = (prevCount ?? 0) + 1;

            // Log the send attempt (success or error)
            await supabase.from("groupops_campaign_send_log").insert({
              company_id: campaign.company_id,
              campaign_id: campaign.id,
              template_id: template.id,
              group_id: campaign.group_id,
              sent_at: new Date().toISOString(),
              cycle_number: cycleNumber,
              message_preview: messageBody.substring(0, 200),
              delivery_status: deliveryStatus,
              metadata: { send_result: sendResult, template_title: template.title },
            });
            console.log(`[groupops-campaign-cron] Send log saved (status: ${deliveryStatus}, cycle: ${cycleNumber})`);
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
