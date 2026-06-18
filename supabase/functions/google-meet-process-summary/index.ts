import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-gateway.ts";
import {
  getSystemConfig,
  resolveCredentialOptional,
} from "../_shared/getSystemConfig.ts";
import type { SystemConfigAI } from "../_shared/getSystemConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { meetingId } = await req.json();
    if (!meetingId) throw new Error("Missing meetingId");

    const { data: meeting, error: meetingError } = await supabaseClient
      .from("google_meet_meetings")
      .select("*")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) throw new Error("Meeting not found");
    if (!meeting.raw_transcript)
      throw new Error("No transcript available for this meeting");

    console.log(
      "Processing summary for meeting:",
      meeting.id,
      "transcript length:",
      meeting.raw_transcript.length,
    );

    // Call AI for summary
    const summaryResult = await callAI({
      functionName: "google-meet-process-summary",
      systemPrompt: `Você é um assistente especializado em analisar transcrições de reuniões de negócios.
Analise a transcrição fornecida e extraia as seguintes informações de forma estruturada:

1. **Resumo Executivo**: Um resumo conciso dos principais pontos discutidos (máximo 300 palavras)
2. **Decisões Tomadas**: Liste as decisões que foram tomadas durante a reunião
3. **Próximos Passos**: Liste os próximos passos acordados, com responsáveis quando mencionados
4. **Tarefas Sugeridas**: Liste tarefas específicas que podem ser criadas a partir da reunião

Responda em português brasileiro. Seja objetivo e profissional.`,
      userPrompt: `Aqui está a transcrição da reunião "${meeting.title}":\n\n${meeting.raw_transcript}`,
    });

    const aiSummary = summaryResult.content;

    console.log("AI summary generated, length:", aiSummary.length);

    // Extract action items using tool calling (kept as raw fetch — uses tools/tool_choice not supported by callAI)
    const aiCfg = await getSystemConfig<SystemConfigAI>(supabaseClient, "ai");
    const openrouterKey = resolveCredentialOptional(
      Deno.env.get("OPENROUTER_API_KEY"),
      aiCfg?.openrouter_api_key,
    );

    let actionItems = [];
    if (openrouterKey) {
      const actionItemsResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "Extraia as tarefas/ações mencionadas na transcrição da reunião. Retorne como uma lista estruturada.",
              },
              { role: "user", content: meeting.raw_transcript },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_action_items",
                  description: "Extract action items from meeting transcript",
                  parameters: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: {
                              type: "string",
                              description: "Task title",
                            },
                            responsible: {
                              type: "string",
                              description: "Person responsible",
                            },
                            priority: {
                              type: "string",
                              enum: ["low", "medium", "high"],
                            },
                            deadline: {
                              type: "string",
                              description: "Deadline if mentioned",
                            },
                          },
                          required: ["title", "priority"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["items"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: {
              type: "function",
              function: { name: "extract_action_items" },
            },
          }),
        },
      );

      if (actionItemsResponse.ok) {
        const actionData = await actionItemsResponse.json();
        const toolCall = actionData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            actionItems = parsed.items || [];
          } catch (e) {
            console.warn("Failed to parse action items:", e);
          }
        }
      }
    }

    // Save to database
    await supabaseClient
      .from("google_meet_meetings")
      .update({
        ai_summary: aiSummary,
        ai_action_items: actionItems,
      })
      .eq("id", meetingId);

    console.log("Summary and action items saved for meeting:", meetingId);

    return new Response(
      JSON.stringify({
        success: true,
        summary: aiSummary,
        actionItems,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in google-meet-process-summary:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
