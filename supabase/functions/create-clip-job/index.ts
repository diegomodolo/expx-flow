import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const {
      inputUrl,
      inputStoragePath,
      maxClips = 3,
      format = "9:16",
      companyId,
      clientId,
    } = await req.json();

    if (!inputUrl && !inputStoragePath) {
      return new Response(
        JSON.stringify({ error: "inputUrl ou inputStoragePath é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create job
    const { data: job, error: insertError } = await supabase
      .from("clip_jobs")
      .insert({
        user_id: user.id,
        company_id: companyId || null,
        client_id: clientId || null,
        input_url: inputUrl ?? null,
        input_storage_path: inputStoragePath ?? null,
        status: "pending",
        progress: 0,
        progress_message: "Job criado, aguardando processamento...",
        max_clips: maxClips,
        format: format,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger external processing service (fire and forget)
    const processingServiceUrl = Deno.env.get("PROCESSING_SERVICE_URL");
    const processingServiceSecret = Deno.env.get("PROCESSING_SERVICE_SECRET");

    if (processingServiceUrl) {
      fetch(`${processingServiceUrl}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${processingServiceSecret}`,
        },
        body: JSON.stringify({
          jobId: job.id,
          userId: user.id,
          inputUrl,
          inputStoragePath,
          maxClips,
          format,
          supabaseUrl,
          supabaseServiceKey,
        }),
      }).catch((err) => {
        console.error("Failed to trigger processing service:", err);
      });
    } else {
      // If no processing service, update job to error
      await supabase
        .from("clip_jobs")
        .update({
          status: "error",
          error_message:
            "Serviço de processamento não configurado (PROCESSING_SERVICE_URL)",
        })
        .eq("id", job.id);
    }

    return new Response(JSON.stringify({ jobId: job.id, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-clip-job error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
