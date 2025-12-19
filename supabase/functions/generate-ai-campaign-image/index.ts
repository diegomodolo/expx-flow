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

// Helper function to fetch image and convert to base64
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binaryString);
    
    // Detect content type from response headers or URL
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error converting image to base64:`, error);
    return null;
  }
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

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch client reference images
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("ai_reference_image_1, ai_reference_image_2, ai_reference_image_3, product_name, sector")
      .eq("id", clientId)
      .single();

    if (clientError) {
      console.error("Error fetching client:", clientError);
    }

    // Get reference images
    const referenceImages: string[] = [];
    if (clientData) {
      if (clientData.ai_reference_image_1) referenceImages.push(clientData.ai_reference_image_1);
      if (clientData.ai_reference_image_2) referenceImages.push(clientData.ai_reference_image_2);
      if (clientData.ai_reference_image_3) referenceImages.push(clientData.ai_reference_image_3);
    }

    const effectiveProductName = productName || clientData?.product_name || 'a product';
    const effectiveSector = sector || clientData?.sector || 'business';

    // Build the prompt with reference image instructions
    let imagePrompt = prompt || `Create a professional, high-quality advertisement image for ${effectiveProductName} in the ${effectiveSector} sector. 
The image should be:
- Clean and modern design
- Professional color scheme
- Suitable for Facebook/Instagram ads
- Eye-catching but not cluttered
- High resolution, 1080x1080 aspect ratio
- No text overlays (text will be added separately)
- Lifestyle or product-focused imagery
Ultra high resolution`;

    // If there are reference images, add style instructions
    if (referenceImages.length > 0) {
      imagePrompt += `\n\nIMPORTANT: Use the provided reference images as style inspiration. Match the following aspects from the reference images:
- Color palette and color scheme
- Typography style and font choices
- Overall visual aesthetic and mood
- Design elements and layout patterns
- Brand identity elements visible in the references

Generate a NEW image that follows the same visual identity and style as the reference images.`;
    }

    console.log("Generating image with prompt:", imagePrompt);
    console.log("Reference images count:", referenceImages.length);

    // Build the messages array with reference images
    const messageContent: any[] = [
      {
        type: "text",
        text: imagePrompt,
      }
    ];

    // Add reference images to the message if available
    for (let i = 0; i < referenceImages.length; i++) {
      const base64Image = await imageUrlToBase64(referenceImages[i]);
      if (base64Image) {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: base64Image
          }
        });
        console.log(`Added reference image ${i + 1}`);
      }
    }

    // Use Nano Banana (Gemini 2.5 Flash Image Preview) to generate the image
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: messageContent,
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
