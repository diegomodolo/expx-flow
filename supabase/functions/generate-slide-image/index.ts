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
    const { slideId, companyId, thumbnailUrl } = await req.json();

    if (!slideId) {
      return new Response(
        JSON.stringify({ error: "slideId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-slide-image] Generating image for slide: ${slideId}`);
    console.log(`[generate-slide-image] Using thumbnail reference: ${thumbnailUrl ? "yes" : "no"}`);

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
      .select("*, youtube_scripts!inner(company_id, client_id, title, thumbnail_url)")
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
    
    // Use the thumbnail URL from the request or from the script
    const referenceThumbnail = thumbnailUrl || scriptInfo.thumbnail_url;

    // Build detailed image prompt with style reference
    let imagePrompt = `Create a professional YouTube video presentation slide with 16:9 aspect ratio (1920x1080 pixels).

SLIDE DETAILS:
- Slide Number: ${slide.slide_order} of the presentation
- Title: "${slide.title}"
- Content/Topic: ${slide.content || "Main presentation slide"}
- Visual Style Suggestion: ${slide.visual_suggestion || "Clean, modern, professional design with bold typography"}

DESIGN REQUIREMENTS:
- High contrast, highly readable text overlay
- Professional presentation style suitable for YouTube videos
- Bold, impactful typography for the title
- Visual hierarchy that draws attention to key points
- Modern gradient or solid color background
- Icons or visual elements that support the message
- Ultra high resolution, 16:9 aspect ratio presentation slide

VIDEO CONTEXT: This is for the video "${scriptInfo.title}"`;

    // Build messages array
    const messages: any[] = [];
    const userContent: any[] = [];

    // Add reference thumbnail if available
    if (referenceThumbnail) {
      imagePrompt += `

CRITICAL STYLE INSTRUCTION:
The attached image is the thumbnail for this video. You MUST create the slide following the EXACT same visual style, including:
- Same color palette and gradients
- Same typography style and font appearance
- Same visual treatment (shadows, effects, overlays)
- Same overall mood and aesthetic
- Consistent brand identity with the thumbnail

The slide should look like it belongs to the same visual family as the thumbnail - someone looking at both should immediately know they're from the same video/presentation.`;

      userContent.push({
        type: "image_url",
        image_url: { url: referenceThumbnail },
      });
    }

    userContent.push({ type: "text", text: imagePrompt });

    messages.push({
      role: "user",
      content: userContent,
    });

    console.log(`[generate-slide-image] Generating image with Nano Banana Pro...`);

    // Retry logic for AI generation
    const MAX_RETRIES = 3;
    let imageUrl: string | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[generate-slide-image] Attempt ${attempt}/${MAX_RETRIES}...`);
      
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages,
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[generate-slide-image] AI error (attempt ${attempt}):`, response.status, errorText);
          
          if (response.status === 429) {
            await supabase
              .from("youtube_script_slides")
              .update({ status: "error" })
              .eq("id", slideId);

            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (response.status === 402) {
            await supabase
              .from("youtube_script_slides")
              .update({ status: "error" })
              .eq("id", slideId);

            return new Response(
              JSON.stringify({ error: "Payment required. Please add credits to continue." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          lastError = new Error(`API returned ${response.status}`);
          // Wait before retry with exponential backoff
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        } else {
          const data = await response.json();
          imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (imageUrl) {
            console.log(`[generate-slide-image] Image generated successfully on attempt ${attempt}`);
            break;
          } else {
            console.warn(`[generate-slide-image] No image in response on attempt ${attempt}`);
            lastError = new Error("No image in API response");
            // Wait before retry
            if (attempt < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
      } catch (fetchError: any) {
        console.error(`[generate-slide-image] Fetch error (attempt ${attempt}):`, fetchError);
        lastError = fetchError;
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!imageUrl) {
      console.error("[generate-slide-image] Failed to generate image after all retries:", lastError?.message);
      
      await supabase
        .from("youtube_script_slides")
        .update({ status: "error" })
        .eq("id", slideId);
      
      throw new Error(lastError?.message || "No image generated after retries");
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
    const fileName = `slides/${scriptInfo.company_id}/${slide.script_id}/${slideId}_${Date.now()}.${imageFormat}`;
    
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
