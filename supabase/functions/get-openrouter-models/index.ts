import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const fallbackApiKey = Deno.env.get("OPENROUTER_API_KEY") || "";

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
    const { companyId } = await req.json();

    // Resolve API key: company key > env var
    let apiKey = fallbackApiKey;
    if (companyId) {
      // Validate that the authenticated user belongs to the company
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseAuth = createClient(
          supabaseUrl,
          Deno.env.get("SUPABASE_ANON_KEY")!,
        );
        const token = authHeader.replace("Bearer ", "");
        const {
          data: { user },
        } = await supabaseAuth.auth.getUser(token);

        if (user) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          const { data: member } = await supabaseAdmin
            .from("company_members")
            .select("id")
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!member) {
            throw new Error("Acesso negado: você não pertence a esta empresa");
          }
        }
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: keyData } = await supabase
        .from("ai_api_keys")
        .select("openrouter_api_key")
        .eq("company_id", companyId)
        .maybeSingle();

      if (keyData?.openrouter_api_key) {
        apiKey = keyData.openrouter_api_key;
      }
    }

    if (!apiKey) {
      throw new Error("Nenhuma API key do OpenRouter configurada");
    }

    // Fetch models from OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter and map to essential fields
    const models = (data.data || []).map((m: Record<string, unknown>) => ({
      id: m.id,
      name: m.name,
      context_length: m.context_length,
      pricing: m.pricing,
      architecture: m.architecture,
    }));

    return new Response(JSON.stringify({ success: true, models }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
