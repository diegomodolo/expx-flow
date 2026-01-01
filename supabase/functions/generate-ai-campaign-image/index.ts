import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  clientId: string;
  prompt: string;
  productName?: string;
  sector?: string;
  placement?: 'feed' | 'stories' | 'reels'; // Novo parâmetro para formato
}

// Dimensões padrão do Meta Ads (novo formato 3:4 para feed)
const META_DIMENSIONS = {
  feed: { width: 1080, height: 1440, ratio: '3:4' },
  stories: { width: 1080, height: 1920, ratio: '9:16' },
  reels: { width: 1080, height: 1920, ratio: '9:16' },
} as const;

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

// Função para redimensionar imagem para o tamanho correto do Meta
async function resizeImageToMetaStandard(
  imageBytes: Uint8Array,
  targetWidth: number,
  targetHeight: number
): Promise<Uint8Array> {
  try {
    console.log(`Resizing image to ${targetWidth}x${targetHeight}...`);
    
    const image = await Image.decode(imageBytes);
    const originalWidth = image.width;
    const originalHeight = image.height;
    
    console.log(`Original image size: ${originalWidth}x${originalHeight}`);
    
    // Calcular a proporção de destino
    const targetRatio = targetWidth / targetHeight;
    const originalRatio = originalWidth / originalHeight;
    
    let resizedImage: Image;
    
    if (Math.abs(originalRatio - targetRatio) < 0.01) {
      // Proporção já está correta, apenas redimensionar
      resizedImage = image.resize(targetWidth, targetHeight);
    } else {
      // Precisa fazer crop para ajustar a proporção
      let cropWidth = originalWidth;
      let cropHeight = originalHeight;
      let cropX = 0;
      let cropY = 0;
      
      if (originalRatio > targetRatio) {
        // Imagem é mais larga que o necessário, cortar as laterais
        cropWidth = Math.round(originalHeight * targetRatio);
        cropX = Math.round((originalWidth - cropWidth) / 2);
      } else {
        // Imagem é mais alta que o necessário, cortar em cima e embaixo
        cropHeight = Math.round(originalWidth / targetRatio);
        cropY = Math.round((originalHeight - cropHeight) / 2);
      }
      
      console.log(`Cropping to ${cropWidth}x${cropHeight} from position (${cropX}, ${cropY})`);
      
      // Crop e depois redimensionar
      const croppedImage = image.crop(cropX, cropY, cropWidth, cropHeight);
      resizedImage = croppedImage.resize(targetWidth, targetHeight);
    }
    
    console.log(`Final image size: ${resizedImage.width}x${resizedImage.height}`);
    
    // Encode como PNG para manter qualidade
    const outputBytes = await resizedImage.encode();
    return outputBytes;
  } catch (error) {
    console.error("Error resizing image:", error);
    // Retornar a imagem original se o resize falhar
    return imageBytes;
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
    const { clientId, prompt, productName, sector, placement = 'feed' } = body;

    // Obter dimensões baseado no placement
    const dimensions = META_DIMENSIONS[placement] || META_DIMENSIONS.feed;
    console.log(`Generating image for placement: ${placement} (${dimensions.width}x${dimensions.height})`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch client reference images AND logo
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("ai_reference_image_1, ai_reference_image_2, ai_reference_image_3, product_name, sector, presentation_logo, avatar, company")
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

    // Get client logo (prioritize presentation_logo, fallback to avatar)
    const clientLogo = clientData?.presentation_logo || clientData?.avatar || null;
    const clientCompanyName = clientData?.company || 'a brand';
    console.log("Client logo URL:", clientLogo ? "Found" : "Not found");

    const effectiveProductName = productName || clientData?.product_name || 'a product';
    const effectiveSector = sector || clientData?.sector || 'business';

    // Build the prompt with EXPLICIT dimension requirements for Meta Ads
    let imagePrompt = prompt || `Create a professional, high-quality advertisement image for ${effectiveProductName} in the ${effectiveSector} sector.

=== CRITICAL IMAGE DIMENSION REQUIREMENTS ===
You MUST generate an image with these EXACT specifications:
- Dimensions: EXACTLY ${dimensions.width} pixels wide × ${dimensions.height} pixels tall
- Aspect ratio: MUST be ${dimensions.ratio} (${placement === 'feed' ? 'square' : 'vertical/portrait'})
- This is for Meta Ads (Facebook/Instagram) - dimensions are NON-NEGOTIABLE

=== DESIGN REQUIREMENTS ===
- Clean, modern, professional design
- High-quality, crisp imagery suitable for digital advertising
- Eye-catching but not cluttered
- Professional color scheme that matches the brand/sector
- Lifestyle or product-focused imagery
- No text overlays (text will be added separately)
- Ultra high resolution with sharp details

Generate the image at EXACTLY ${dimensions.width}x${dimensions.height} pixels.`;

    // Add LOGO instructions if client has a logo
    if (clientLogo) {
      imagePrompt += `

=== CRITICAL LOGO INSTRUCTIONS ===
IMPORTANT: The client's OFFICIAL LOGO is provided as a reference image below.
- If the design includes a logo, you MUST use the EXACT logo provided - DO NOT invent, modify, or create a new logo
- The logo provided is the official "${clientCompanyName}" logo - use it exactly as shown
- Preserve the logo's exact colors, proportions, and design elements
- If including the logo in the image, place it appropriately (corner or subtle placement)
- DO NOT generate any text that tries to replicate the brand name - use the actual logo image instead`;
    }

    // If there are reference images, add style instructions
    if (referenceImages.length > 0) {
      imagePrompt += `

=== STYLE REFERENCE ===
Use the provided reference images as style inspiration. Match:
- Color palette and color scheme
- Overall visual aesthetic and mood
- Design elements and layout patterns
- Brand identity elements visible in the references

Generate a NEW image that follows the same visual identity while maintaining the EXACT ${dimensions.width}x${dimensions.height} dimensions required.`;
    }

    console.log("Generating image with prompt:", imagePrompt);
    console.log("Reference images count:", referenceImages.length);
    console.log("Client logo included:", !!clientLogo);
    console.log("Target dimensions:", `${dimensions.width}x${dimensions.height}`);

    // Build the messages array with reference images
    const messageContent: any[] = [
      {
        type: "text",
        text: imagePrompt,
      }
    ];

    // Add CLIENT LOGO as the FIRST reference image (priority)
    if (clientLogo) {
      const logoBase64 = await imageUrlToBase64(clientLogo);
      if (logoBase64) {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: logoBase64
          }
        });
        console.log("Added client logo as reference");
      }
    }

    // Add style reference images
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

    // Use Gemini 3 Pro Image Preview to generate the image
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

    const base64Data = base64Match[2];

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // PÓS-PROCESSAMENTO: Redimensionar para garantir tamanho correto do Meta
    console.log("Starting post-processing to ensure Meta Ads dimensions...");
    const resizedBytes = await resizeImageToMetaStandard(bytes, dimensions.width, dimensions.height);
    
    // Usar PNG para a imagem final (melhor qualidade)
    const imageFormat = 'png';

    // Generate unique filename with placement info
    const fileName = `ai-generated/${clientId}/${Date.now()}-${placement}-${dimensions.width}x${dimensions.height}.${imageFormat}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("campaign-creatives")
      .upload(fileName, resizedBytes, {
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
          .upload(fileName, resizedBytes, {
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
    console.log(`Final image dimensions: ${dimensions.width}x${dimensions.height} (${placement})`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: urlData.publicUrl,
        dimensions: {
          width: dimensions.width,
          height: dimensions.height,
          placement: placement,
          ratio: dimensions.ratio,
        },
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
