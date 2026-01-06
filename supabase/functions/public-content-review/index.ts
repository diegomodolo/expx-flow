import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const method = req.method;

    // GET - Fetch plan data by token
    if (method === "GET" && token) {
      console.log("Fetching plan with token:", token);

      const { data: plan, error: planError } = await supabase
        .from("content_plans")
        .select(`
          id,
          name,
          status,
          month,
          year,
          public_token,
          clients (
            id,
            name,
            company,
            avatar
          )
        `)
        .eq("public_token", token)
        .single();

      if (planError || !plan) {
        console.error("Plan not found:", planError);
        return new Response(
          JSON.stringify({ error: "Planejamento não encontrado ou link inválido" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only allow access if plan is in review
      if (plan.status !== "em_revisao") {
        return new Response(
          JSON.stringify({ error: "Este planejamento não está em revisão" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch posts
      const { data: posts, error: postsError } = await supabase
        .from("content_plan_posts")
        .select("*")
        .eq("content_plan_id", plan.id)
        .order("order_index", { ascending: true });

      if (postsError) {
        console.error("Error fetching posts:", postsError);
        throw postsError;
      }

      // Fetch slides for carousel posts
      const postIds = (posts || []).map(p => p.id);
      let slides: any[] = [];
      
      if (postIds.length > 0) {
        const { data: slidesData, error: slidesError } = await supabase
          .from("content_plan_slides")
          .select("*")
          .in("post_id", postIds)
          .order("order_index", { ascending: true });

        if (slidesError) {
          console.error("Error fetching slides:", slidesError);
        } else {
          slides = slidesData || [];
        }
      }

      // Attach slides to their posts
      const postsWithSlides = (posts || []).map(post => ({
        ...post,
        slides: slides.filter(s => s.post_id === post.id)
      }));

      return new Response(
        JSON.stringify({ plan, posts: postsWithSlides }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Update post review status
    if (method === "POST") {
      const body = await req.json();
      const { postId, reviewStatus, reviewFeedback, planToken } = body;

      console.log("Updating post review:", { postId, reviewStatus, planToken });

      if (!postId || !reviewStatus || !planToken) {
        return new Response(
          JSON.stringify({ error: "Dados incompletos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate token and get plan
      const { data: plan, error: planError } = await supabase
        .from("content_plans")
        .select("id, status")
        .eq("public_token", planToken)
        .single();

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ error: "Link inválido" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (plan.status !== "em_revisao") {
        return new Response(
          JSON.stringify({ error: "Este planejamento não está mais em revisão" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate post belongs to plan
      const { data: post, error: postError } = await supabase
        .from("content_plan_posts")
        .select("id")
        .eq("id", postId)
        .eq("content_plan_id", plan.id)
        .single();

      if (postError || !post) {
        return new Response(
          JSON.stringify({ error: "Post não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate rejected requires feedback
      if (reviewStatus === "rejected" && !reviewFeedback?.trim()) {
        return new Response(
          JSON.stringify({ error: "Feedback é obrigatório quando rejeitado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update post review status
      const { error: updateError } = await supabase
        .from("content_plan_posts")
        .update({
          review_status: reviewStatus,
          review_feedback: reviewStatus === "rejected" ? reviewFeedback : null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (updateError) {
        console.error("Error updating post:", updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("public-content-review error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
