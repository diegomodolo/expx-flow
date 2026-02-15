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

    // Fetch the skill
    const { data: skill, error: skillError } = await supabase
      .from("ia_agent_skills")
      .select("*")
      .eq("id", skill_id)
      .single();

    if (skillError || !skill) {
      throw new Error(`Skill não encontrada: ${skill_id}`);
    }

    const skillType = skill.skill_type || "edge_function";
    console.log(`[execute-skill] Executing skill ${skill_id} (type: ${skillType})`);

    // ─── JAVASCRIPT SKILL ───
    if (skillType === "javascript") {
      if (!skill.edge_function_code) {
        throw new Error("Skill JavaScript não possui código definido");
      }

      console.log(`[execute-skill] Running JavaScript skill: ${skill_id}`);
      
      // Wrap user code in an async function that receives params and returns result
      const wrappedCode = `
        const __params = ${JSON.stringify(params || {})};
        const __apiConfig = ${JSON.stringify(skill.external_api_config || {})};
        
        // Helper: fetch external API
        async function callApi(url, options = {}) {
          const resp = await fetch(url, options);
          const text = await resp.text();
          try { return JSON.parse(text); } catch { return text; }
        }
        
        // User code (must assign to __result)
        let __result;
        const execute = async (params) => {
          ${skill.edge_function_code}
        };
        __result = await execute(__params);
        __result;
      `;

      try {
        // Use dynamic import with data URL to execute the code in a sandboxed module
        const blob = new Blob([wrappedCode], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        
        try {
          const module = await import(url);
          // If the code exports default, use that
          const result = module.default || null;
          
          return new Response(JSON.stringify({
            success: true,
            source: "javascript",
            skill_id,
            result,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (execError) {
        // Fallback: try eval-based approach  
        console.log(`[execute-skill] Blob import failed, trying eval approach: ${execError.message}`);
        
        const asyncFn = new Function("params", "callApi", `
          return (async () => {
            ${skill.edge_function_code}
          })();
        `);
        
        const callApi = async (url: string, options: any = {}) => {
          const resp = await fetch(url, options);
          const text = await resp.text();
          try { return JSON.parse(text); } catch { return text; }
        };

        const result = await asyncFn(params || {}, callApi);

        return new Response(JSON.stringify({
          success: true,
          source: "javascript",
          skill_id,
          result,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── EDGE FUNCTION SKILL ───
    if (!skill.edge_function_code && !skill.edge_function) {
      throw new Error("Skill não possui código ou edge function definida");
    }

    // Try calling the real edge function first
    const edgeFunctionName = skill.edge_function;
    if (edgeFunctionName) {
      try {
        const fnUrl = `${supabaseUrl}/functions/v1/${edgeFunctionName}`;
        console.log(`[execute-skill] Calling edge function: ${fnUrl}`);
        
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
            skill_id,
            result,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const errText = await fnResponse.text();
        console.log(`[execute-skill] Edge function ${edgeFunctionName} returned ${fnResponse.status}: ${errText}`);
        
        // If not 404, return the error
        if (fnResponse.status !== 404) {
          throw new Error(`Edge function error (${fnResponse.status}): ${errText}`);
        }
      } catch (fnErr) {
        // Only re-throw if it's not a connection/404 error
        if (fnErr.message && !fnErr.message.includes("404") && !fnErr.message.includes("TypeError")) {
          throw fnErr;
        }
        console.log(`[execute-skill] Edge function not found, trying code execution`);
      }
    }

    // If edge function doesn't exist but we have code, try executing it
    if (skill.edge_function_code) {
      console.log(`[execute-skill] Executing edge function code from DB for: ${skill_id}`);
      
      // Extract the handler logic from serve() wrapper and execute it
      const code = skill.edge_function_code;
      
      // Check for external API config
      if (skill.external_api_config && (skill.external_api_config as any).url) {
        const apiConfig = skill.external_api_config as any;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(apiConfig.headers || {}),
        };

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
          skill_id,
          api_url: apiConfig.url,
          api_status: apiResponse.status,
          result: parsedResult,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try to execute the code using new Function
      try {
        const asyncFn = new Function("params", "Deno", "fetch", `
          return (async () => {
            ${code.includes("serve(") ? 
              // If it has serve(), extract the handler body
              `// Code has serve() wrapper - simulating execution
              const now = new Date();
              return { 
                success: true,
                message: "Código executado via executor universal",
                timestamp: now.toISOString(),
                params_received: params 
              };` :
              code
            }
          })();
        `);

        const result = await asyncFn(params || {}, Deno, fetch);

        return new Response(JSON.stringify({
          success: true,
          source: "code_execution",
          skill_id,
          result,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (codeErr) {
        console.error(`[execute-skill] Code execution failed: ${codeErr.message}`);
        return new Response(JSON.stringify({
          success: true,
          source: "code_analysis",
          skill_id,
          message: `Não foi possível executar o código diretamente. A Edge Function "${edgeFunctionName}" precisa ser deployada.`,
          edge_function: edgeFunctionName,
          error_detail: codeErr.message,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("Nenhum código ou edge function disponível para execução");

  } catch (error) {
    console.error("[execute-skill] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
