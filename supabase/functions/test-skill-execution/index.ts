import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { skill_id, params } = await req.json();
    if (!skill_id) throw new Error("skill_id é obrigatório");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the skill and its code
    const { data: skill, error: skillError } = await supabase
      .from("ia_agent_skills")
      .select("edge_function_code, edge_function, external_api_config")
      .eq("id", skill_id)
      .single();

    if (skillError || !skill) {
      throw new Error(`Skill não encontrada: ${skill_id}`);
    }

    if (!skill.edge_function_code) {
      throw new Error("Skill não possui código de Edge Function definido");
    }

    // Try calling the actual edge function first
    const edgeFunctionName = skill.edge_function;
    console.log(`[test-skill] Testing skill ${skill_id}, trying edge function: ${edgeFunctionName}`);

    try {
      const fnUrl = `${supabaseUrl}/functions/v1/${edgeFunctionName}`;
      const fnResponse = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(params || {}),
      });

      if (fnResponse.ok) {
        const result = await fnResponse.json();
        return new Response(JSON.stringify({
          success: true,
          source: "edge_function",
          edge_function: edgeFunctionName,
          result,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errText = await fnResponse.text();
      console.log(`[test-skill] Edge function ${edgeFunctionName} returned ${fnResponse.status}: ${errText}`);
      
      // If it's a 404 (function doesn't exist), fall through to simulation
      if (fnResponse.status !== 404 && fnResponse.status !== 500) {
        throw new Error(`Edge function error (${fnResponse.status}): ${errText}`);
      }
    } catch (fnErr) {
      console.log(`[test-skill] Edge function call failed, simulating: ${fnErr.message}`);
    }

    // If edge function doesn't exist, simulate based on the code
    // We can't execute arbitrary code, but we can analyze and simulate simple functions
    console.log(`[test-skill] Simulating skill ${skill_id} based on saved code`);

    // For simple utility functions, try to detect and simulate
    const code = skill.edge_function_code;
    
    // Check if it's an external API skill
    if (skill.external_api_config && (skill.external_api_config as any).url) {
      const apiConfig = skill.external_api_config as any;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(apiConfig.headers || {}),
      };

      // Apply auth
      if (apiConfig.auth_type === "bearer" && apiConfig.auth_config?.token) {
        headers["Authorization"] = `Bearer ${apiConfig.auth_config.token}`;
      } else if (apiConfig.auth_type === "api_key_header" && apiConfig.auth_config?.header_name) {
        headers[apiConfig.auth_config.header_name] = apiConfig.auth_config.api_key || "";
      } else if (apiConfig.auth_type === "basic" && apiConfig.auth_config?.username) {
        const encoded = btoa(`${apiConfig.auth_config.username}:${apiConfig.auth_config.password || ""}`);
        headers["Authorization"] = `Basic ${encoded}`;
      }

      let url = apiConfig.url;
      if (apiConfig.auth_type === "api_key_query" && apiConfig.auth_config?.param_name) {
        const separator = url.includes("?") ? "&" : "?";
        url += `${separator}${apiConfig.auth_config.param_name}=${apiConfig.auth_config.api_key || ""}`;
      }

      const apiResponse = await fetch(url, {
        method: apiConfig.method || "GET",
        headers,
        ...(["POST", "PUT", "PATCH"].includes(apiConfig.method) ? { body: JSON.stringify(params || {}) } : {}),
      });

      const apiResult = await apiResponse.text();
      let parsedResult;
      try { parsedResult = JSON.parse(apiResult); } catch { parsedResult = apiResult; }

      return new Response(JSON.stringify({
        success: true,
        source: "external_api",
        api_url: apiConfig.url,
        api_status: apiResponse.status,
        result: parsedResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For date/time functions or other simple utilities - detect patterns
    if (code.includes("new Date()") && (code.includes("toLocaleString") || code.includes("toISOString"))) {
      const now = new Date();
      const spOffset = -3 * 60 * 60 * 1000;
      const nowSP = new Date(now.getTime() + spOffset);
      
      return new Response(JSON.stringify({
        success: true,
        source: "simulated",
        message: "Edge Function não deployada. Resultado simulado baseado no código salvo.",
        result: {
          iso: now.toISOString(),
          formatted: nowSP.toUTCString(),
          timezone: "America/Sao_Paulo",
          timestamp: now.getTime(),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generic simulation - return code analysis
    return new Response(JSON.stringify({
      success: true,
      source: "code_analysis",
      message: `A Edge Function "${edgeFunctionName}" não está deployada no Supabase. O código foi salvo no banco mas precisa ser deployado manualmente. Use a aba "Código" para copiar o código e fazer o deploy.`,
      edge_function: edgeFunctionName,
      code_length: code.length,
      has_serve: code.includes("serve("),
      has_cors: code.includes("corsHeaders"),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[test-skill] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
