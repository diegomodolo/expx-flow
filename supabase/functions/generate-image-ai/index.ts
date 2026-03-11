import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const prompt = body.prompt || body.topic || "";
    const clientId = body.client_id || body.clientId;
    const companyId = body.company_id || body.companyId;
    const style = body.style || "professional marketing";

    // Accept direct client context from agent parameters
    const directClientName = body.client_name || body.clientName || "";
    const directBriefing = body.client_briefing || body.clientBriefing || "";
    const directVoiceTone = body.voice_tone || body.voiceTone || "";
    const directTargetAudience =
      body.target_audience || body.targetAudience || "";
    const directReferenceImages: string[] =
      body.reference_image_urls || body.referenceImageUrls || [];

    // Fetch client data from DB (enriches with stored info)
    let clientContext = "";
    const referenceImageUrls: string[] = [];
    let dbClientName = "";
    let dbVoiceTone = "";

    // Build supabase client for DB lookups
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Auto-resolve clientId from client_name if not provided
    let resolvedClientId = clientId;
    if (!resolvedClientId && directClientName && companyId) {
      console.log(
        `[generate-image-ai] Auto-resolving client by name: "${directClientName}"`,
      );
      const { data: foundClients } = await supabase
        .from("clients")
        .select("id")
        .eq("company_id", companyId)
        .or(
          `name.ilike.%${directClientName}%,company.ilike.%${directClientName}%`,
        )
        .limit(1);
      if (foundClients && foundClients.length > 0) {
        resolvedClientId = foundClients[0].id;
        console.log(
          `[generate-image-ai] Resolved client_id: ${resolvedClientId}`,
        );
      }
    }

    if (resolvedClientId) {
      const { data: client } = await supabase
        .from("clients")
        .select(
          "name, company, sector, ai_briefing, voice_tone, target_audience, ai_reference_image_1, ai_reference_image_2, ai_reference_image_3, avatar",
        )
        .eq("id", resolvedClientId)
        .single();

      if (client) {
        dbClientName = client.company || client.name || "";
        dbVoiceTone = client.voice_tone || "";

        // Build context from DB data
        const briefing = directBriefing || client.ai_briefing || "";
        const audience = directTargetAudience || client.target_audience || "";
        const tone = directVoiceTone || dbVoiceTone || "";
        const brandName = directClientName || dbClientName;

        let contextParts: string[] = [];
        if (brandName) contextParts.push(`Marca: ${brandName}`);
        if (client.sector) contextParts.push(`Setor: ${client.sector}`);
        if (briefing)
          contextParts.push(
            `Identidade visual e briefing: ${briefing.substring(0, 1000)}`,
          );
        if (tone) contextParts.push(`Tom de voz: ${tone}`);
        if (audience) contextParts.push(`Público-alvo: ${audience}`);
        clientContext = contextParts.join(". ");

        // Collect reference images: prefer direct params, fallback to DB
        if (directReferenceImages.length > 0) {
          referenceImageUrls.push(
            ...directReferenceImages.filter(
              (u: string) => u && u.startsWith("http"),
            ),
          );
        } else {
          for (const key of [
            "ai_reference_image_1",
            "ai_reference_image_2",
            "ai_reference_image_3",
          ] as const) {
            const url = client[key];
            if (url && typeof url === "string" && url.startsWith("http")) {
              referenceImageUrls.push(url);
            }
          }
        }
      }
    } else {
      // No client_id but may have direct params
      let contextParts: string[] = [];
      if (directClientName) contextParts.push(`Marca: ${directClientName}`);
      if (directBriefing)
        contextParts.push(`Briefing: ${directBriefing.substring(0, 1000)}`);
      if (directVoiceTone) contextParts.push(`Tom de voz: ${directVoiceTone}`);
      if (directTargetAudience)
        contextParts.push(`Público-alvo: ${directTargetAudience}`);
      clientContext = contextParts.join(". ");

      if (directReferenceImages.length > 0) {
        referenceImageUrls.push(
          ...directReferenceImages.filter(
            (u: string) => u && u.startsWith("http"),
          ),
        );
      }
    }

    // Build the message content - multimodal if we have reference images
    const textInstruction =
      referenceImageUrls.length > 0
        ? `Crie uma imagem no estilo "${style}" para: ${prompt}. ${clientContext}. 

INSTRUÇÕES CRÍTICAS DE ESTILO (PRIORIDADE MÁXIMA):
- As imagens de referência anexadas são a PRINCIPAL GUIA. A imagem gerada DEVE parecer da mesma marca.
- COPIE a paleta de cores exata das referências. NÃO invente cores novas.
- SIGA o mesmo estilo visual: se as referências usam flat design, use flat design. Se usam foto, use foto.
- REPLIQUE a tipografia, layout e elementos gráficos (ícones, formas, gradientes) das referências.
- A nova imagem deve ser INDISTINGUÍVEL em estilo das referências — como se fosse parte da mesma campanha.
- Alta qualidade, profissional, adequada para marketing em redes sociais.
- IMPORTANTE: Todo texto na imagem DEVE estar em português brasileiro correto, sem erros de ortografia ou gramática.`
        : `Create a ${style} image for: ${prompt}. ${clientContext}. High quality, professional, suitable for social media marketing. IMPORTANT: All text in the image MUST be in correct Brazilian Portuguese with no spelling or grammar errors.`;

    // Build message content array
    const messageContent: Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }> = [{ type: "text", text: textInstruction }];

    // Helper: convert ArrayBuffer to base64 without stack overflow
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      const CHUNK_SIZE = 8192;
      let binary = "";
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }

    // Download reference images and convert to base64
    let imagesLoaded = 0;
    for (const imgUrl of referenceImageUrls) {
      try {
        console.log(
          `Downloading reference image: ${imgUrl.substring(0, 100)}...`,
        );
        const imgResponse = await fetch(imgUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(15000),
        });
        if (imgResponse.ok) {
          const imgBuffer = await imgResponse.arrayBuffer();
          // Skip images larger than 4MB to avoid memory issues
          if (imgBuffer.byteLength > 4 * 1024 * 1024) {
            console.warn(
              `Reference image too large (${(imgBuffer.byteLength / 1024 / 1024).toFixed(1)}MB), skipping`,
            );
            continue;
          }
          const base64 = arrayBufferToBase64(imgBuffer);
          const contentType =
            imgResponse.headers.get("content-type") || "image/jpeg";
          const dataUrl = `data:${contentType};base64,${base64}`;
          messageContent.push({
            type: "image_url",
            image_url: { url: dataUrl },
          });
          imagesLoaded++;
          console.log(
            `Reference image loaded successfully (${(imgBuffer.byteLength / 1024).toFixed(0)}KB)`,
          );
        } else {
          console.warn(
            `Failed to download reference image (${imgResponse.status}): ${imgUrl.substring(0, 80)}`,
          );
        }
      } catch (dlErr) {
        console.warn(`Error downloading reference image: ${dlErr.message}`);
      }
    }

    console.log(
      `Generating image with ${imagesLoaded}/${referenceImageUrls.length} reference images loaded. Prompt: ${textInstruction.substring(0, 200)}`,
    );

    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
    const imageResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [{ role: "user", content: messageContent }],
          modalities: ["image", "text"],
          max_tokens: 2048,
        }),
      },
    );

    if (!imageResponse.ok) {
      const errText = await imageResponse.text();
      throw new Error(
        `OpenRouter image error (${imageResponse.status}): ${errText}`,
      );
    }

    const imageData = await imageResponse.json();
    const choice = imageData.choices?.[0]?.message;
    // Image content may be in content array or directly as string
    let base64ImageUrl = "";
    if (Array.isArray(choice?.content)) {
      const imgPart = choice.content.find(
        (p: { type: string }) => p.type === "image_url",
      );
      base64ImageUrl = imgPart?.image_url?.url || "";
    } else if (typeof choice?.content === "string") {
      base64ImageUrl = choice.content;
    }

    if (!base64ImageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No image was generated. The model returned only text.",
          text: "",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    console.log(
      "Image generated successfully, base64 length:",
      base64ImageUrl.length,
    );

    // Upload to Supabase Storage so we have a persistent URL
    let persistentUrl = base64ImageUrl;
    if (base64ImageUrl.startsWith("data:image/")) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        // Extract base64 data
        const matches = base64ImageUrl.match(
          /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/,
        );
        if (matches) {
          const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
          const base64Data = matches[2];
          const binaryData = Uint8Array.from(atob(base64Data), (c) =>
            c.charCodeAt(0),
          );

          const fileName = `ai-generated/${clientId || "general"}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("ai-generated-images")
            .upload(fileName, binaryData, {
              contentType: `image/${matches[1]}`,
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("ai-generated-images")
              .getPublicUrl(fileName);
            persistentUrl = publicUrlData.publicUrl;
            console.log("Image uploaded to storage:", persistentUrl);
          } else {
            console.warn(
              "Failed to upload image to storage:",
              uploadError.message,
            );
          }
        }
      } catch (uploadErr) {
        console.warn("Error uploading generated image:", uploadErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        image_url: persistentUrl,
        reference_images_used: referenceImageUrls.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-image-ai:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
