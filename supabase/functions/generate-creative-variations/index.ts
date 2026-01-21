import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VariationRequest {
  baseImage: string;
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
    const { baseImage, text, designGuidance, variationOptions, format, variationIndex } = body;

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

    // Build variation instructions based on options
    const variationInstructions: string[] = [];
    
    if (variationOptions.changePoseExpression) {
      variationInstructions.push("- Create a DIFFERENT pose and facial expression (but keep the person's identity EXACTLY the same)");
    } else {
      variationInstructions.push("- Maintain the EXACT same pose and expression as the reference");
    }
    
    if (variationOptions.varyComposition) {
      variationInstructions.push("- Vary the layout and composition of design elements");
    }
    
    if (variationOptions.alterColorPalette) {
      variationInstructions.push("- Use a different but harmonious color palette");
    } else {
      variationInstructions.push("- Keep similar colors to maintain brand consistency");
    }
    
    if (variationOptions.varyBackground) {
      variationInstructions.push("- Create a different, creative background");
    } else {
      variationInstructions.push("- Keep a similar background style");
    }

    // Build the prompt for image generation
    const prompt = `
CREATIVE VARIATION MODE - CRITICAL INSTRUCTIONS:

You are creating variation #${variationIndex + 1} of a marketing creative based on the reference image provided.

=== ABSOLUTE REQUIREMENTS (NEVER VIOLATE) ===
1. The person in the reference image MUST be 100% recognizable in the output
2. Maintain EXACT facial features, skin tone, hair color, and overall physical appearance
3. This is NOT a new person - it's the SAME person from the reference in a new creative

=== VARIATION INSTRUCTIONS ===
${variationInstructions.join("\n")}

=== DESIGN CONTEXT ===
Text to display on the image: "${text || 'No text overlay'}"
User's design guidance: "${designGuidance || 'Professional marketing style'}"
Format: ${format} (${aspectRatio} aspect ratio, ${dimensions.width}x${dimensions.height}px)

=== OUTPUT REQUIREMENTS ===
- Professional marketing/advertising quality
- If text is provided, make it clearly readable with good contrast
- Modern, clean aesthetic suitable for social media
- The person should be the main focus
- This is variation ${variationIndex + 1}, so make it visually distinct from other variations while maintaining the same person and brand identity

Generate a high-quality marketing creative that maintains the person's identity perfectly.
`.trim();

    console.log("Calling Gemini API for image generation...");

    // Call the Gemini API for image generation with the base image as reference
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: baseImage,
                },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini response received");

    // Extract the generated image
    const generatedImageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageBase64) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated by the API");
    }

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
