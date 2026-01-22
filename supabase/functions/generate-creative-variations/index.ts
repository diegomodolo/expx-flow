import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VariationRequest {
  baseImage: string;
  personImage?: string;
  text: string;
  designGuidance: string;
  variationOptions: {
    changePoseExpression: boolean;
    varyComposition: boolean;
    alterColorPalette: boolean;
    varyBackground: boolean;
  };
  format: string;
  variationIndex: number;
}

async function generateImage(
  apiKey: string,
  prompt: string,
  contentArray: any[]
): Promise<string | null> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: contentArray,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("Gemini API error:", responseText);
    return null;
  }

  if (!responseText || responseText.trim() === '') {
    console.error("Gemini API returned empty response");
    return null;
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", responseText.substring(0, 500));
    return null;
  }

  // Check for refusal or non-image finish reasons
  const finishReason = data.choices?.[0]?.finish_reason || data.choices?.[0]?.native_finish_reason;
  if (finishReason === "IMAGE_OTHER" || finishReason === "content_filter" || finishReason === "safety") {
    console.log("Model refused to generate image, finish_reason:", finishReason);
    return null;
  }

  // Extract the generated image - check multiple possible locations
  const generatedImageBase64 = 
    data.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
    data.choices?.[0]?.message?.content?.[0]?.image_url?.url ||
    data.images?.[0]?.url;

  return generatedImageBase64 || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const body: VariationRequest = await req.json();
    const { baseImage, personImage, text, designGuidance, variationOptions, format, variationIndex } = body;

    console.log(`Generating variation ${variationIndex + 1} for format ${format}`);

    // Determine aspect ratio based on format
    let aspectRatio = "1:1";
    let dimensions = { width: 1080, height: 1080 };
    
    if (format === "instagram_story" || format === "instagram_reels") {
      aspectRatio = "9:16";
      dimensions = { width: 1080, height: 1920 };
    } else if (format === "instagram_feed") {
      aspectRatio = "1:1";
      dimensions = { width: 1080, height: 1080 };
    }

    // Build simple variation instructions
    const variationNotes: string[] = [];
    if (variationOptions.changePoseExpression) variationNotes.push("different pose");
    if (variationOptions.varyComposition) variationNotes.push("varied layout");
    if (variationOptions.alterColorPalette) variationNotes.push("alternative colors");
    if (variationOptions.varyBackground) variationNotes.push("different background");

    // Build simplified prompt - less complex = higher success rate
    const simplePrompt = `Create a professional ${format.replace('_', ' ')} marketing image (${aspectRatio} ratio).

Based on the reference image(s), create variation #${variationIndex + 1}.

${personImage ? 'IMPORTANT: Two images provided. First is the design reference. Second is the person - keep their exact appearance.' : ''}

Requirements:
- Professional marketing/advertising quality
- ${variationNotes.length > 0 ? variationNotes.join(', ') : 'Similar style to reference'}
${text ? `- Include text: "${text}"` : '- No text needed'}
${designGuidance ? `- Style guidance: ${designGuidance}` : ''}

Create a high-quality social media marketing image.`;

    // Build content array with images
    const contentArray: any[] = [
      {
        type: "text",
        text: simplePrompt,
      },
      {
        type: "image_url",
        image_url: {
          url: baseImage,
        },
      },
    ];

    // Add person image as second reference if provided
    if (personImage) {
      console.log("Person image provided - adding as identity reference");
      contentArray.push({
        type: "image_url",
        image_url: {
          url: personImage,
        },
      });
    }

    console.log("Calling Gemini API for image generation (attempt 1)...");
    
    // First attempt with simplified prompt
    let generatedImageBase64 = await generateImage(LOVABLE_API_KEY, simplePrompt, contentArray);

    // If first attempt fails, try with even simpler prompt (no text requirement)
    if (!generatedImageBase64) {
      console.log("First attempt failed, trying with simpler prompt (attempt 2)...");
      
      const fallbackPrompt = `Create a professional ${format.replace('_', ' ')} marketing image in ${aspectRatio} aspect ratio.

Use the provided image(s) as reference. Create a visually appealing marketing creative suitable for social media.

${personImage ? 'Keep the person from the second reference image recognizable.' : ''}

Style: Modern, clean, professional marketing aesthetic.
NO TEXT in the image.`;

      const fallbackContentArray: any[] = [
        {
          type: "text",
          text: fallbackPrompt,
        },
        {
          type: "image_url",
          image_url: {
            url: baseImage,
          },
        },
      ];

      if (personImage) {
        fallbackContentArray.push({
          type: "image_url",
          image_url: {
            url: personImage,
          },
        });
      }

      generatedImageBase64 = await generateImage(LOVABLE_API_KEY, fallbackPrompt, fallbackContentArray);
    }

    // If still no image, try one more time with minimal prompt
    if (!generatedImageBase64) {
      console.log("Second attempt failed, trying minimal prompt (attempt 3)...");
      
      const minimalPrompt = `Generate a professional marketing image for social media. ${aspectRatio} aspect ratio. Modern and clean design.`;
      
      const minimalContentArray: any[] = [
        {
          type: "text",
          text: minimalPrompt,
        },
        {
          type: "image_url",
          image_url: {
            url: baseImage,
          },
        },
      ];

      generatedImageBase64 = await generateImage(LOVABLE_API_KEY, minimalPrompt, minimalContentArray);
    }

    if (!generatedImageBase64) {
      throw new Error("Failed to generate image after multiple attempts. The AI model may be temporarily unavailable or the reference image may not be suitable for variation generation. Please try again with a different image.");
    }

    console.log("Image generated successfully");

    // Upload the image to Supabase Storage
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Convert base64 to blob
    const base64Data = generatedImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `variations/${Date.now()}-${format}-${variationIndex}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("ai-generated-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("ai-generated-images")
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;
    console.log(`Image uploaded successfully: ${imageUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        format,
        variationIndex,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-creative-variations:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
