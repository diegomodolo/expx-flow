import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skill_id, edge_function_name, code, external_api_config } = await req.json();

    if (!skill_id || !edge_function_name) {
      throw new Error("skill_id e edge_function_name são obrigatórios");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Validate the code
    console.log(`[deploy-skill] Validating code for skill: ${skill_id}`);
    
    if (!code || code.trim().length === 0) {
      throw new Error("O código da Edge Function não pode estar vazio");
    }

    // Basic validation - check for serve() call
    if (!code.includes("serve(") && !code.includes("Deno.serve(")) {
      throw new Error("O código deve conter uma função serve() ou Deno.serve()");
    }

    // Step 2: If external API config is provided, inject it into the code
    let finalCode = code;
    
    if (external_api_config && external_api_config.url) {
      console.log(`[deploy-skill] External API config detected for: ${external_api_config.url}`);
      // Store the API config in the skill's config column for runtime use
    }

    // Step 3: Save the code and config to the skill record
    console.log(`[deploy-skill] Saving code to skill record: ${skill_id}`);
    const { error: updateError } = await supabase
      .from("ia_agent_skills")
      .update({
        edge_function_code: finalCode,
        external_api_config: external_api_config || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", skill_id);

    if (updateError) {
      console.error("[deploy-skill] Error saving to DB:", updateError);
      throw new Error(`Erro ao salvar no banco: ${updateError.message}`);
    }

    // Step 4: Note about deployment
    // In a real scenario, you'd use the Supabase Management API to deploy the function
    // For now, we save the code in the database for reference and manual deployment
    console.log(`[deploy-skill] Skill ${skill_id} code saved successfully`);

    return new Response(JSON.stringify({
      success: true,
      message: `Skill "${skill_id}" salva com sucesso. Código da Edge Function "${edge_function_name}" armazenado.`,
      edge_function: edge_function_name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[deploy-skill] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
