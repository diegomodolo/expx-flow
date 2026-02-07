import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      scriptId,
      title,
      scriptContent,
      suggestedTitles,
      clientId,
      companyId,
      modelPhotos,
      referenceThumbnails,
      styleNotes,
    } = await req.json();

    console.log("Generating thumbnail for script:", scriptId);
    console.log("Title:", title);
    console.log("Model photos:", modelPhotos?.length || 0);
    console.log("Reference thumbnails:", referenceThumbnails?.length || 0);

    // Build the prompt for thumbnail generation
    const titlesContext = suggestedTitles?.length > 0 
      ? `\nTítulos sugeridos para o vídeo:\n${suggestedTitles.join('\n')}`
      : '';

    const styleContext = styleNotes 
      ? `\nNotas de estilo do usuário: ${styleNotes}`
      : '';

    const prompt = `Gere uma thumbnail profissional para um vídeo do YouTube.

TÍTULO DO VÍDEO: ${title}
${titlesContext}

CONTEXTO DO ROTEIRO (primeiros 500 caracteres):
${scriptContent?.substring(0, 500) || 'Não disponível'}

INSTRUÇÕES DE DESIGN:
- Crie uma thumbnail impactante no formato 16:9 (1280x720)
- Use cores vibrantes e alto contraste
- Se houver uma pessoa, mostre uma expressão facial impactante e chamativa
- O fundo deve complementar o tema do vídeo
- Evite excesso de elementos - mantenha o design limpo e focado
- A composição deve ser típica de thumbnails de sucesso do YouTube
${styleContext}

A thumbnail deve capturar a essência do vídeo e despertar curiosidade no espectador.
Gere uma imagem realista, profissional e altamente clicável.`;

    // Build messages array with optional reference images
    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
        ],
      },
    ];

    // Add model photos as references (max 3)
    if (modelPhotos && modelPhotos.length > 0) {
      const photosToUse = modelPhotos.slice(0, 3);
      for (const photoUrl of photosToUse) {
        messages[0].content.push({
          type: "image_url",
          image_url: { url: photoUrl },
        });
      }
      // Add instruction about the model
      messages[0].content[0].text += `\n\nIMPORTANTE: Use as fotos anexadas como referência para a pessoa que deve aparecer na thumbnail. Mantenha a consistência facial.`;
    }

    // Add reference thumbnails (max 3)
    if (referenceThumbnails && referenceThumbnails.length > 0) {
      const thumbsToUse = referenceThumbnails.slice(0, 3);
      for (const thumbUrl of thumbsToUse) {
        messages[0].content.push({
          type: "image_url",
          image_url: { url: thumbUrl },
        });
      }
      // Add instruction about references
      messages[0].content[0].text += `\n\nAs thumbnails de referência anexadas mostram o estilo visual desejado. Inspire-se nelas para composição, cores e layout.`;
    }

    console.log("Calling Gemini 3 Pro Image model...");

    // Call the Lovable AI Gateway with Gemini 3 Pro Image
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
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the generated image
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      throw new Error("No image was generated");
    }

    // Upload the image to Supabase Storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `youtube-thumbnails/${clientId}/${scriptId}_${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("visual-creatives")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload generated image");
    }

    const { data: { publicUrl } } = supabase.storage
      .from("visual-creatives")
      .getPublicUrl(fileName);

    console.log("Thumbnail uploaded to:", publicUrl);

    // Update the script with the thumbnail URL
    const { error: updateError } = await supabase
      .from("youtube_scripts")
      .update({ thumbnail_url: publicUrl })
      .eq("id", scriptId);

    if (updateError) {
      console.warn("Failed to update script with thumbnail URL:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
