import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { slideId, companyId } = await req.json();

    if (!slideId) {
      return new Response(
        JSON.stringify({ error: "slideId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-slide-image] Generating image for slide: ${slideId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get slide data
    const { data: slide, error: slideError } = await supabase
      .from("youtube_script_slides")
      .select("*, youtube_scripts!inner(company_id, client_id, title)")
      .eq("id", slideId)
      .single();

    if (slideError || !slide) {
      console.error("[generate-slide-image] Slide not found:", slideError);
      throw new Error("Slide not found");
    }

    // Update status to generating
    await supabase
      .from("youtube_script_slides")
      .update({ status: "generating" })
      .eq("id", slideId);

    const scriptInfo = slide.youtube_scripts as any;

    // Build detailed image prompt
    const imagePrompt = `Create a professional YouTube video presentation slide with 16:9 aspect ratio.

SLIDE DETAILS:
- Title: "${slide.title}"
- Content/Topic: ${slide.content || "Main presentation slide"}
- Visual Style: ${slide.visual_suggestion || "Clean, modern, professional design with bold typography"}

REQUIREMENTS:
- High contrast, readable text overlay
- Professional presentation style suitable for YouTube videos
- Bold, impactful typography for the title
- Visual hierarchy that draws attention to key points
- Modern gradient or solid color background
- Icons or visual elements that support the message
- Ultra high resolution, 16:9 aspect ratio presentation slide`;

    console.log(`[generate-slide-image] Generating image with prompt...`);

    // Generate image using Gemini
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          { role: "user", content: imagePrompt }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-slide-image] AI error:", errorText);
      
      await supabase
        .from("youtube_script_slides")
        .update({ status: "error" })
        .eq("id", slideId);
      
      throw new Error("Failed to generate image");
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("[generate-slide-image] No image in response");
      
      await supabase
        .from("youtube_script_slides")
        .update({ status: "error" })
        .eq("id", slideId);
      
      throw new Error("No image generated");
    }

    console.log(`[generate-slide-image] Image generated, uploading to storage...`);

    // Extract base64 data
    const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid image data format");
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    const imageBytes = base64ToUint8Array(base64Data);

    // Upload to storage
    const fileName = `slides/${scriptInfo.company_id}/${slide.script_id}/${slideId}.${imageFormat}`;
    
    const { error: uploadError } = await supabase.storage
      .from("ai-generated-images")
      .upload(fileName, imageBytes, {
        contentType: `image/${imageFormat}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-slide-image] Upload error:", uploadError);
      
      await supabase
        .from("youtube_script_slides")
        .update({ status: "error" })
        .eq("id", slideId);
      
      throw new Error("Failed to upload image");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("ai-generated-images")
      .getPublicUrl(fileName);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update slide with image URL and completed status
    const { error: updateError } = await supabase
      .from("youtube_script_slides")
      .update({ 
        image_url: publicUrl,
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", slideId);

    if (updateError) {
      console.error("[generate-slide-image] Update error:", updateError);
    }

    console.log(`[generate-slide-image] Successfully generated image for slide ${slideId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        slideId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[generate-slide-image] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
