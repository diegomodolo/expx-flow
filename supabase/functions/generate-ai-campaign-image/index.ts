import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  clientId: string;
  prompt: string;
  productName?: string;
  sector?: string;
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
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { clientId, prompt, productName, sector } = body;

    // Build a professional ad image prompt
    const imagePrompt = prompt || `Create a professional, high-quality advertisement image for ${productName || 'a product'} in the ${sector || 'business'} sector. 
The image should be:
- Clean and modern design
- Professional color scheme
- Suitable for Facebook/Instagram ads
- Eye-catching but not cluttered
- High resolution, 1080x1080 aspect ratio
- No text overlays (text will be added separately)
- Lifestyle or product-focused imagery
Ultra high resolution`;

    console.log("Generating image with prompt:", imagePrompt);

    // Use Nano Banana (Gemini 2.5 Flash Image Preview) to generate the image
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: imagePrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Image generation API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes para geração de imagem." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Image generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response structure:", JSON.stringify(Object.keys(aiData)));

    // Extract the image from the response
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiData).substring(0, 500));
      throw new Error("Nenhuma imagem gerada pela IA");
    }

    // The image is in base64 format (data:image/png;base64,...)
    // We need to upload it to Supabase Storage

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Formato de imagem inválido");
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Generate unique filename
    const fileName = `ai-generated/${clientId}/${Date.now()}-campaign.${imageFormat}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("campaign-creatives")
      .upload(fileName, bytes, {
        contentType: `image/${imageFormat}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      
      // If bucket doesn't exist, try to create it
      if (uploadError.message?.includes("Bucket not found")) {
        // Create bucket and retry
        await supabase.storage.createBucket("campaign-creatives", {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });

        const { error: retryError } = await supabase.storage
          .from("campaign-creatives")
          .upload(fileName, bytes, {
            contentType: `image/${imageFormat}`,
            upsert: false,
          });

        if (retryError) {
          throw new Error(`Erro ao salvar imagem: ${retryError.message}`);
        }
      } else {
        throw new Error(`Erro ao salvar imagem: ${uploadError.message}`);
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("campaign-creatives")
      .getPublicUrl(fileName);

    console.log("Image uploaded successfully:", urlData.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: urlData.publicUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-ai-campaign-image:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro ao gerar imagem",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
