import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const {
      conversationId,
      triggerId,
      flowId,
      companyId,
      igUserId,
      instagramAccountId,
      matchedKeyword,
    } = body;

    console.log("[instagram-automation-executor] Starting execution:", {
      triggerId,
      flowId,
      igUserId,
    });

    // Fetch the flow data
    const { data: flow, error: flowError } = await supabase
      .from("instagram_automation_flows")
      .select("*")
      .eq("id", flowId)
      .single();

    if (flowError || !flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    // Fetch conversation for context variables
    const { data: conversation } = await supabase
      .from("instagram_conversations")
      .select("ig_username, ig_profile_pic_url")
      .eq("id", conversationId)
      .single();

    // Fetch company name for variable substitution
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    const steps = flow.flow_data?.steps ?? [];
    let stepsExecuted = 0;
    let hasError = false;
    let errorMessage = "";

    for (const step of steps) {
      try {
        if (step.type === "message") {
          const messageContent = substituteVariables(step.content ?? "", {
            nome_usuario: conversation?.ig_username ?? igUserId,
            empresa: company?.name ?? "Nossa empresa",
          });

          // Optional initial delay
          if (step.delay_seconds && step.delay_seconds > 0) {
            await sleep(step.delay_seconds * 1000);
          }

          const { error: sendError } = await supabase.functions.invoke(
            "send-instagram-message",
            {
              body: {
                company_id: companyId,
                instagram_account_id: instagramAccountId,
                ig_user_id: igUserId,
                message: messageContent,
                conversation_id: conversationId,
              },
            },
          );

          if (sendError) {
            throw new Error(`Failed to send message: ${sendError.message}`);
          }

          stepsExecuted++;
        } else if (step.type === "delay") {
          const delayMs = (step.seconds ?? 1) * 1000;
          await sleep(delayMs);
          stepsExecuted++;
        }
      } catch (stepError: unknown) {
        console.error(`[instagram-automation-executor] Step error:`, stepError);
        hasError = true;
        errorMessage = stepError.message;
        break;
      }
    }

    // Log the execution
    await supabase.from("instagram_automation_logs").insert({
      company_id: companyId,
      trigger_id: triggerId,
      flow_id: flowId,
      conversation_id: conversationId,
      ig_user_id: igUserId,
      matched_keyword: matchedKeyword,
      status: hasError
        ? stepsExecuted > 0
          ? "partial"
          : "failed"
        : "completed",
      steps_executed: stepsExecuted,
      error_message: hasError ? errorMessage : null,
    });

    console.log(
      `[instagram-automation-executor] Completed. Steps: ${stepsExecuted}, Error: ${hasError}`,
    );

    return new Response(
      JSON.stringify({ success: !hasError, steps_executed: stepsExecuted }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("[instagram-automation-executor] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function substituteVariables(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{([^}]+)\}/g, (match, key) => {
    return vars[key.trim()] ?? match;
  });
}
