import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-gateway.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptId, message } = await req.json();

    console.log("Refining script:", scriptId);

    if (!scriptId || !message) {
      throw new Error("Script ID and message are required");
    }

    // Fetch current script
    const { data: script, error: scriptError } = await supabase
      .from("youtube_scripts")
      .select("*")
      .eq("id", scriptId)
      .single();

    if (scriptError || !script) {
      throw new Error("Script not found");
    }

    // Fetch chat history
    const { data: messages } = await supabase
      .from("youtube_script_messages")
      .select("*")
      .eq("script_id", scriptId)
      .order("created_at", { ascending: true });

    // Build conversation history
    const chatHistory = (messages || []).map((m: unknown) => ({
      role: m.role,
      content: m.content,
    }));

    // Save user message
    await supabase.from("youtube_script_messages").insert({
      script_id: scriptId,
      role: "user",
      content: message,
    });

    // Generate AI response
    const systemPromptContent = `Você é um assistente especializado em roteiros de vídeo para YouTube.

Seu trabalho é ajudar a refinar e melhorar roteiros. Você tem acesso ao roteiro atual:

---
TÍTULO: ${script.title}

ROTEIRO ATUAL:
${script.script_content}
---

Quando solicitado, você pode:
1. Sugerir melhorias específicas para seções
2. Reescrever partes do roteiro
3. Adicionar novos elementos (exemplos, transições, ganchos)
4. Ajustar tom e linguagem
5. Otimizar para melhor retenção de audiência

IMPORTANTE:
- Quando reescrever algo, forneça o texto completo da seção modificada
- Seja específico sobre onde as mudanças devem ser aplicadas
- Mantenha a estrutura e formatação do roteiro
- Use markdown para formatar suas respostas`;

    const fullMessages = [
      { role: "system", content: systemPromptContent },
      ...chatHistory,
      { role: "user", content: message },
    ];

    const aiResult = await callAI({
      functionName: "refine-script-chat",
      systemPrompt: systemPromptContent,
      userPrompt: message,
      messages: fullMessages,
      maxTokens: 2000,
      temperature: 0.7,
    });

    const assistantMessage = aiResult.content;

    // Save assistant message
    await supabase.from("youtube_script_messages").insert({
      script_id: scriptId,
      role: "assistant",
      content: assistantMessage,
    });

    // Check if the response contains a script update suggestion
    // Look for markers like "ROTEIRO ATUALIZADO:" or code blocks with the new content
    let updatedContent = null;
    const updateMatch = assistantMessage.match(
      /```(?:markdown)?\n([\s\S]*?)```/,
    );
    if (updateMatch && updateMatch[1].includes("## ")) {
      // Looks like a script section, ask if user wants to apply
      updatedContent = updateMatch[1];
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: assistantMessage,
        hasUpdate: !!updatedContent,
        updatedContent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in refine-script-chat:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
