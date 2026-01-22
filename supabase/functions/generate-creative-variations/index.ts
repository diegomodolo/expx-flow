import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VariationOptions {
  changePoseExpression: boolean;
  varyComposition: boolean;
  alterColorPalette: boolean;
  varyBackground: boolean;
}

interface VariationRequest {
  baseImage: string;
  personImage?: string;
  text: string;
  designGuidance: string;
  variationOptions: VariationOptions;
  format: string;
  variationIndex: number;
  modelType?: "flash" | "pro";
}

// Generate image using Gemini API
async function generateImage(
  apiKey: string,
  prompt: string,
  contentArray: any[],
  model: string
): Promise<string | null> {
  console.log(`Calling Gemini API with model: ${model}`);
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: contentArray,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status}`, errorText);
      
      // Check for rate limiting or payment required
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your account.");
      }
      
      return null;
    }

    // Safely parse JSON response
    let data: any;
    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.error('Empty response from Gemini API');
        return null;
      }
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return null;
    }

    const base64Url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Check if model refused to generate
    const finishReason = data?.choices?.[0]?.finish_reason;
    if (
      finishReason === "IMAGE_OTHER" ||
      finishReason === "content_filter" ||
      finishReason === "safety"
    ) {
      console.log(`Model refused: ${finishReason}`);
      return null;
    }

    return base64Url || null;
  } catch (error) {
    console.error("Error in generateImage:", error);
    throw error;
  }
}

// Generate with retry logic and exponential backoff
async function generateWithRetry(
  apiKey: string,
  prompts: string[],
  contentArrays: any[][],
  model: string,
  maxRetries: number = 2
): Promise<string | null> {
  for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
    const prompt = prompts[promptIndex];
    const contentArray = contentArrays[promptIndex];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Prompt ${promptIndex + 1}/${prompts.length}, Attempt ${attempt}/${maxRetries}...`);
      
      try {
        const result = await generateImage(apiKey, prompt, contentArray, model);
        if (result) {
          console.log(`Success on prompt ${promptIndex + 1}, attempt ${attempt}`);
          return result;
        }
      } catch (error: any) {
        // If it's a rate limit or payment error, don't retry
        if (error.message?.includes("Rate limit") || error.message?.includes("Payment required")) {
          throw error;
        }
        console.error(`Attempt ${attempt} failed:`, error);
      }
      
      // Exponential backoff before retry
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500; // 1s, 2s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const body: VariationRequest = await req.json();
    const {
      baseImage,
      personImage,
      text,
      designGuidance,
      variationOptions,
      format,
      variationIndex,
      modelType = "flash",
    } = body;

    console.log(`Generating variation ${variationIndex + 1} for format: ${format}, model: ${modelType}`);

    // Select model based on type
    const model = modelType === "pro" 
      ? "google/gemini-3-pro-image-preview"  // Maximum quality
      : "google/gemini-2.5-flash-image";      // Fast generation

    console.log(`Using model: ${model}`);

    // Determine aspect ratio and dimensions based on format
    let aspectRatio = "4:5";
    let dimensions = { width: 1080, height: 1350 };

    if (format === "instagram_feed") {
      aspectRatio = "4:5";
      dimensions = { width: 1080, height: 1350 };
    } else if (format === "instagram_story" || format === "instagram_reels") {
      aspectRatio = "9:16";
      dimensions = { width: 1080, height: 1920 };
    }

    // Build specific variation instructions based on options
    const variationInstructions: string[] = [];
    
    // Add unique seed to ensure each variation is different
    const uniqueSeed = Math.random().toString(36).substring(2, 10);
    variationInstructions.push(`UNIQUE VARIATION SEED: ${uniqueSeed} - Use this to make this variation distinctly different from others.`);

    if (variationOptions.varyComposition) {
      variationInstructions.push(`
LAYOUT COMPOSITION - MUST BE DIFFERENT:
- Dramatically change the position of all elements
- If person/subject is on left → move to right or center
- If person/subject is on right → move to left or center
- If text is at top → move to bottom, middle, or side
- If text is at bottom → move to top or overlay on image
- Change the visual hierarchy (what's most prominent)
- Use different cropping, framing, or zoom level
- Alter spacing and margins between elements
- This variation #${variationIndex + 1} must have a NOTICEABLY different layout`);
    }

    if (variationOptions.varyBackground) {
      variationInstructions.push(`
BACKGROUND ENVIRONMENT - MUST BE DIFFERENT:
- Create a completely different background setting
- Change the environment (indoor/outdoor, urban/natural, etc.)
- Use different patterns, textures, or gradients
- Alter lighting conditions and atmosphere
- Keep professional marketing aesthetic
- Background must be visually distinct from reference`);
    }

    if (variationOptions.changePoseExpression) {
      variationInstructions.push(`
PERSON POSE/EXPRESSION - MUST BE DIFFERENT (if person is present):
- Use a noticeably different body pose or angle
- Change facial expression (smiling/serious/confident/friendly)
- Alter hand position, gesture, or body language
- Different head tilt or eye direction
- Maintain the person's identity but vary their presentation`);
    }

    if (variationOptions.alterColorPalette) {
      variationInstructions.push(`
COLOR PALETTE - MUST BE DIFFERENT:
- Use a distinctly different color scheme
- Change primary and accent colors
- Alter color temperature (warm/cool)
- Maintain professional marketing look
- Colors should be noticeably different from reference`);
    } else {
      variationInstructions.push(`
COLOR PALETTE - PRESERVE EXACTLY:
- Keep the exact same colors from the reference image
- Maintain the same color temperature and mood
- Do NOT change the color scheme`);
    }

    // Build the main prompt
    const textInstruction = text 
      ? `INCLUDE THIS TEXT IN THE IMAGE: "${text}" - Make the text clearly readable and well-integrated into the design.`
      : "Do NOT include any text in the image.";

    const designInstruction = designGuidance 
      ? `DESIGN STYLE GUIDANCE: ${designGuidance}`
      : "";

    const identityInstruction = personImage
      ? "IDENTITY PRESERVATION: Keep the person from the second reference image recognizable - same face, features, and identity."
      : "";

    const mainPrompt = `Create VARIATION #${variationIndex + 1} of this marketing image for ${format.replace('_', ' ')}.

OUTPUT REQUIREMENTS:
- Aspect ratio: ${aspectRatio}
- Dimensions: ${dimensions.width}x${dimensions.height}px
- Professional marketing quality

CRITICAL - THIS MUST BE A UNIQUE VARIATION:
${variationInstructions.join('\n\n')}

${textInstruction}

${designInstruction}

${identityInstruction}

IMPORTANT: This is variation number ${variationIndex + 1}. It MUST look visibly different from the original reference. 
Each variation should be unique while maintaining the core message and brand identity.

Generate a high-quality professional marketing image.`;

    // Build fallback prompt (simpler, more likely to succeed)
    const fallbackPrompt = `Create a professional marketing image variation.
Format: ${format.replace('_', ' ')}
Aspect ratio: ${aspectRatio}
Variation number: ${variationIndex + 1}

${text ? `Include text: "${text}"` : "No text needed."}
${designGuidance ? `Style: ${designGuidance}` : ""}

Make this variation unique and different from the reference.
Professional quality suitable for social media marketing.`;

    // Build minimal prompt (last resort)
    const minimalPrompt = `Professional ${format.replace('_', ' ')} marketing image, ${aspectRatio} aspect ratio, variation ${variationIndex + 1}. ${text ? `Text: "${text}".` : ""} Clean, modern design.`;

    // Build content arrays for each prompt
    const baseContent: any[] = [
      { type: "text", text: mainPrompt },
      { type: "image_url", image_url: { url: baseImage } },
    ];

    if (personImage) {
      baseContent.push({ type: "image_url", image_url: { url: personImage } });
    }

    const fallbackContent: any[] = [
      { type: "text", text: fallbackPrompt },
      { type: "image_url", image_url: { url: baseImage } },
    ];

    if (personImage) {
      fallbackContent.push({ type: "image_url", image_url: { url: personImage } });
    }

    const minimalContent: any[] = [
      { type: "text", text: minimalPrompt },
      { type: "image_url", image_url: { url: baseImage } },
    ];

    // Try generating with retry logic
    const base64Url = await generateWithRetry(
      LOVABLE_API_KEY,
      [mainPrompt, fallbackPrompt, minimalPrompt],
      [baseContent, fallbackContent, minimalContent],
      model,
      2 // 2 retries per prompt
    );

    if (!base64Url) {
      console.error("All generation attempts failed");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível gerar a imagem. Tente novamente.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upload to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to blob
    const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `variations/${Date.now()}-${variationIndex}-${format}.png`;

    const { error: uploadError } = await supabase.storage
      .from("ai-generated-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Return base64 URL if upload fails
      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: base64Url,
          format,
          variationIndex,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("ai-generated-images")
      .getPublicUrl(fileName);

    console.log(`Successfully generated variation ${variationIndex + 1}`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrlData.publicUrl,
        format,
        variationIndex,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-creative-variations:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
