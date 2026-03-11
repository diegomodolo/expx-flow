import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-gateway.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getNowInBrasilia(): Date {
  const now = new Date();
  return new Date(now.getTime() + BRASILIA_OFFSET_MS);
}

function brasiliaToUTC(brasiliaDate: Date): Date {
  return new Date(brasiliaDate.getTime() - BRASILIA_OFFSET_MS);
}

function calculateNextPostTime(
  scheduledDays: number[],
  scheduledHours: number[],
  afterDate?: Date,
): Date {
  if (!scheduledDays.length || !scheduledHours.length) {
    throw new Error("No scheduled days or hours configured");
  }

  const nowBrasilia = afterDate
    ? new Date(afterDate.getTime() + BRASILIA_OFFSET_MS)
    : getNowInBrasilia();
  const currentDay = nowBrasilia.getDay();
  const currentHour = nowBrasilia.getHours();

  console.log(
    `Calculating next post after Brasília time: ${nowBrasilia.toISOString()}, day: ${currentDay}, hour: ${currentHour}`,
  );

  const sortedHours = [...scheduledHours].sort((a, b) => a - b);

  if (scheduledDays.includes(currentDay)) {
    for (const hour of sortedHours) {
      if (hour > currentHour) {
        const nextPost = new Date(nowBrasilia);
        nextPost.setHours(hour, 0, 0, 0);
        console.log(`Next post in Brasília: ${nextPost.toISOString()}`);
        return brasiliaToUTC(nextPost);
      }
    }
  }

  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const futureDay = (currentDay + daysAhead) % 7;
    if (scheduledDays.includes(futureDay)) {
      const nextPost = new Date(nowBrasilia);
      nextPost.setDate(nowBrasilia.getDate() + daysAhead);
      nextPost.setHours(sortedHours[0], 0, 0, 0);
      console.log(`Next post in Brasília: ${nextPost.toISOString()}`);
      return brasiliaToUTC(nextPost);
    }
  }

  throw new Error("Could not calculate next post time");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { configId, clientId, companyId } = await req.json();

    console.log("Generating WordPress auto post for config:", configId);

    if (!configId) {
      throw new Error("Config ID is required");
    }

    // Fetch config with optional client data
    const { data: config, error: configError } = await supabase
      .from("wordpress_auto_post_configs")
      .select(
        `
        *,
        clients (
          id,
          name,
          sector,
          ai_briefing,
          target_audience
        ),
        wordpress_sites (
          id,
          name,
          site_url
        )
      `,
      )
      .eq("id", configId)
      .single();

    if (configError || !config) {
      console.error("Error fetching config:", configError);
      throw new Error("Config not found");
    }

    const client = config.clients;
    const clientName = client?.name || config.name || "Blog";
    const clientSector = client?.sector || "Geral";
    const clientTargetAudience = client?.target_audience || "Geral";

    console.log("Config loaded:", clientName, "| Has client:", !!client);

    // Find the last scheduled post to calculate next available slot
    const { data: existingPosts } = await supabase
      .from("wordpress_auto_posts")
      .select("scheduled_at")
      .eq("config_id", configId)
      .in("status", ["pending", "publishing"])
      .order("scheduled_at", { ascending: false })
      .limit(1);

    let afterDate: Date | undefined;
    if (existingPosts && existingPosts.length > 0) {
      afterDate = new Date(existingPosts[0].scheduled_at);
      console.log("Last scheduled post at:", afterDate.toISOString());
    }

    const scheduledAt = calculateNextPostTime(
      config.scheduled_days,
      config.scheduled_hours,
      afterDate,
    );
    console.log("Next post scheduled at:", scheduledAt.toISOString());

    // Generate article title with AI Gateway
    console.log("Generating article title...");
    const titleResult = await callAI({
      functionName: "generate-wordpress-auto-post",
      companyId: companyId || config.company_id,
      systemPrompt: `Você é um especialista em SEO e criação de títulos para blogs.
Crie títulos que:
- São atraentes e geram cliques
- Contêm palavras-chave relevantes
- Têm entre 50-60 caracteres idealmente
- Usam números quando apropriado (ex: "7 Dicas para...")
- Prometem valor ao leitor`,
      userPrompt: `Crie UM título de artigo de blog sobre:

BRIEFING: ${config.post_briefing}
SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

Responda APENAS com o título, sem aspas ou explicações.`,
      maxTokens: 100,
    });

    const title = titleResult.content.trim();
    console.log("Title generated:", title);

    // Generate article content with AI Gateway
    console.log("Generating article content...");
    const contentResult = await callAI({
      functionName: "generate-wordpress-auto-post",
      companyId: companyId || config.company_id,
      systemPrompt: `Você é um redator de blog profissional especializado em SEO.
Crie artigos que:
- Usam HTML semântico (h2, h3, p, ul, li, strong, em)
- Têm entre 800-1500 palavras
- Incluem introdução envolvente
- Dividem o conteúdo em seções com subtítulos (h2, h3)
- Usam listas quando apropriado
- Incluem call-to-action no final
- São otimizados para SEO
- Mantêm tom profissional mas acessível`,
      userPrompt: `Escreva um artigo completo para blog:

TÍTULO: ${title}
BRIEFING: ${config.post_briefing}
SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

Responda APENAS com o HTML do artigo (sem tags html, head, body - apenas o conteúdo).
NÃO inclua o título no conteúdo (h1), ele será inserido separadamente.`,
      maxTokens: 4000,
    });

    const content = contentResult.content.trim();
    console.log("Content generated, length:", content.length);

    // Generate excerpt and meta description
    console.log("Generating excerpt and meta description...");
    let excerpt = "";
    let metaDescription = "";

    try {
      const metaResult = await callAI({
        functionName: "generate-wordpress-auto-post",
        companyId: companyId || config.company_id,
        systemPrompt:
          "Você é um especialista em SEO. Crie resumos e meta descriptions otimizados.",
        userPrompt: `Com base neste artigo, crie:

TÍTULO: ${title}
RESUMO DO CONTEÚDO: ${content.substring(0, 500)}...

Responda em JSON com:
{
  "excerpt": "resumo de 150-200 caracteres para preview do post",
  "meta_description": "meta description de 150-160 caracteres otimizada para SEO"
}

Responda APENAS com o JSON válido.`,
        maxTokens: 300,
      });

      const metaContent = metaResult.content.trim();
      const metaJson = JSON.parse(metaContent);
      excerpt = metaJson.excerpt || "";
      metaDescription = metaJson.meta_description || "";
    } catch (e) {
      console.warn("Failed to generate/parse meta, using defaults");
    }

    // Generate featured image with AI Gateway
    console.log("Generating featured image...");

    let imageUrl = "";

    try {
      const imagePromptResult = await callAI({
        functionName: "generate-wordpress-auto-post",
        companyId: companyId || config.company_id,
        systemPrompt: `Você é um especialista em direção de arte para blogs.
Crie prompts para imagens de destaque de artigos:
- Formato horizontal 16:9 para blogs
- Imagens profissionais e modernas
- Sem texto na imagem
- Cores vibrantes mas profissionais
- Relacionadas ao tema do artigo`,
        userPrompt: `Crie um prompt em INGLÊS para gerar uma imagem de destaque para este artigo:

TÍTULO: ${title}
SETOR: ${clientSector}

Responda APENAS com o prompt em inglês.`,
        maxTokens: 200,
      });

      const imagePrompt = imagePromptResult.content.trim();
      console.log("Image prompt:", imagePrompt.substring(0, 100) + "...");

      const geminiResult = await callAI({
        functionName: "generate-wordpress-auto-post",
        companyId: companyId || config.company_id,
        systemPrompt: "",
        userPrompt: `Generate a horizontal 16:9 blog featured image.

${imagePrompt}

Professional, modern, no text in the image. Return image only.`,
        messages: [
          {
            role: "user",
            content: `Generate a horizontal 16:9 blog featured image.\n\n${imagePrompt}\n\nProfessional, modern, no text in the image. Return image only.`,
          },
        ],
      });

      const base64Url = geminiResult.content;

      if (base64Url && base64Url.startsWith("data:image/")) {
        const matches = base64Url.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const extension = matches[1] || "png";
          const base64Data = matches[2];
          const fileName = `wordpress-auto-posts/${configId}/${Date.now()}.${extension}`;

          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const { error: uploadError } = await supabase.storage
            .from("ai-generated-images")
            .upload(fileName, bytes, {
              contentType: `image/${extension}`,
              upsert: true,
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("ai-generated-images")
              .getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
            console.log("Image uploaded:", imageUrl);
          }
        }
      }
    } catch (imageError) {
      console.warn("Failed to generate featured image:", imageError);
    }

    // Save to wordpress_auto_posts
    const { data: newPost, error: postError } = await supabase
      .from("wordpress_auto_posts")
      .insert({
        config_id: configId,
        client_id: clientId || config.client_id,
        company_id: companyId || config.company_id,
        title: title,
        content: content,
        featured_image_url: imageUrl,
        excerpt: excerpt,
        meta_description: metaDescription,
        status: "pending",
        scheduled_at: scheduledAt.toISOString(),
      })
      .select()
      .single();

    if (postError) {
      console.error("Error saving post:", postError);
      throw new Error("Failed to save post");
    }

    console.log("Post saved with ID:", newPost.id);

    // Update next_post_at in config
    await supabase
      .from("wordpress_auto_post_configs")
      .update({ next_post_at: scheduledAt.toISOString() })
      .eq("id", configId);

    return new Response(
      JSON.stringify({
        success: true,
        post: newPost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error generating WordPress post:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to generate post",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
