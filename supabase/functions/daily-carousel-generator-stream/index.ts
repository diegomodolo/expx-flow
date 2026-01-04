import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const BUCKET = "visual-creatives";

interface CarouselSchedule {
  id: string;
  client_id: string;
  company_id: string;
  slides_per_carousel: number;
  tutorial_percentage: number;
  comparison_percentage: number;
  behind_scenes_percentage: number;
  curated_list_percentage: number;
  use_dark_mode: boolean;
  show_ui_screenshots: boolean;
  include_proof_social: boolean;
  include_save_bait: boolean;
  custom_image_prompt: string | null;
  reference_image_1: string | null;
  reference_image_2: string | null;
  reference_image_3: string | null;
  reference_image_4: string | null;
  reference_image_5: string | null;
  reference_image_6: string | null;
  reference_image_7: string | null;
  reference_image_8: string | null;
  reference_image_9: string | null;
  reference_image_10: string | null;
}

interface ClientData {
  id: string;
  name: string;
  company: string;
  sector: string;
  ai_briefing: string | null;
  target_audience: string | null;
  voice_tone: string | null;
  product_name: string | null;
  website_url: string | null;
}

interface CarouselSlide {
  slide_number: number;
  headline: string;
  body_text: string;
  visual_description: string;
  cta?: string;
  image_url?: string;
}

interface GeneratedCarousel {
  carousel_type: string;
  theme: string;
  cover_headline: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string;
  cta_text: string;
  cover_image_url?: string;
}

const CAROUSEL_TYPES = ["tutorial", "comparison", "behind_scenes", "curated_list"] as const;

type CarouselType = (typeof CAROUSEL_TYPES)[number];

type StreamEvent =
  | { type: "started"; carousel_id: string; carousel_type: CarouselType; slides_total: number; slides: Array<{ slide_number: number; headline: string }> }
  | { type: "slide_start"; index: number; total: number }
  | { type: "slide_done"; index: number; total: number; image_url: string }
  | { type: "slide_error"; index: number; total: number; message: string }
  | { type: "completed"; carousel_id: string; saved: boolean }
  | { type: "failed"; message: string };

const CAROUSEL_TYPE_PROMPTS: Record<CarouselType, string> = {
  tutorial: `Crie um carrossel EDUCATIVO no estilo "Tutorial" ou "Passo a Passo".
Estrutura recomendada:
- Slide 1: Gancho forte com problema/dor do público
- Slides 2-7: Passos práticos e acionáveis
- Slide final: CTA e próximo passo`,

  comparison: `Crie um carrossel de COMPARAÇÃO (Antes vs Depois, X vs Y, ou Mitos vs Verdades).
Estrutura recomendada:
- Slide 1: Apresentação do comparativo
- Slides 2-7: Comparações lado a lado
- Slide final: Conclusão e CTA`,

  behind_scenes: `Crie um carrossel "Bastidores" ou "Por Trás das Cenas".
Estrutura recomendada:
- Slide 1: Introdução curiosa/pessoal
- Slides 2-7: Revelações e insights exclusivos
- Slide final: Conexão emocional e CTA`,

  curated_list: `Crie um carrossel de LISTA CURADA (Top X, Melhores, Essenciais).
Estrutura recomendada:
- Slide 1: Título chamativo com número
- Slides 2-7: Items da lista com descrição breve
- Slide final: Bônus ou CTA`,
};

function sseEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

function sseDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { client_id, company_id, user_id, carousel_type } = body ?? {};
  if (!client_id || !company_id || !user_id) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[daily-carousel-generator-stream] Start", { client_id, company_id, user_id, carousel_type });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: StreamEvent) => controller.enqueue(sseEvent(ev));

      try {
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", client_id)
          .single();

        if (clientError || !client) {
          throw new Error("Client not found");
        }

        const { data: schedule } = await supabase
          .from("carousel_generation_schedules")
          .select("*")
          .eq("client_id", client_id)
          .single();

        const slidesPerCarousel = schedule?.slides_per_carousel || 8;
        const pickedType = (carousel_type as CarouselType | undefined) || pickTypeFromSchedule(schedule);

        const carousel = await generateCarousel(supabase, client, schedule, pickedType, slidesPerCarousel);
        if (!carousel) throw new Error("Failed to generate carousel");

        // Create DB stub first (so the UI can fetch it even if the stream closes)
        const generatedAt = new Date().toISOString();
        const { data: saved, error: insertError } = await supabase
          .from("carousel_generation_queue")
          .insert({
            client_id,
            company_id,
            user_id,
            carousel_type: pickedType,
            theme: carousel.theme,
            slides: carousel.slides,
            caption: carousel.caption,
            hashtags: carousel.hashtags,
            cta_text: carousel.cta_text,
            cover_image_url: null,
            generated_content: { ...carousel, slides: carousel.slides },
            schedule_id: schedule?.id || null,
            // 'generating' não é um status permitido pela tabela; usamos 'editing' durante a geração
            status: "editing",
            generated_at: generatedAt,
          })
          .select("id")
          .single();

        if (insertError || !saved?.id) {
          console.error("[daily-carousel-generator-stream] Insert error:", insertError);
          throw new Error("Failed to save carousel stub");
        }

        const carouselId = saved.id as string;

        send({
          type: "started",
          carousel_id: carouselId,
          carousel_type: pickedType,
          slides_total: carousel.slides.length,
          slides: carousel.slides.map((s) => ({ slide_number: s.slide_number, headline: s.headline })),
        });

        const updatedSlides: CarouselSlide[] = [];
        let coverImageUrl: string | undefined;

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          throw new Error("LOVABLE_API_KEY not configured");
        }

        const styleContext = buildImageStylePrompt(schedule, client);
        const referenceImages = getReferenceImages(schedule);
        
        console.log("[daily-carousel-generator-stream] Found reference images:", referenceImages.length);

        for (let i = 0; i < carousel.slides.length; i++) {
          send({ type: "slide_start", index: i + 1, total: carousel.slides.length });

          const slide = carousel.slides[i];
          try {
            const hasReferences = referenceImages.length > 0;
            const imagePrompt = `Crie uma imagem profissional para carrossel do Instagram no formato VERTICAL 3:4 (1080x1440 pixels).
${styleContext}

SLIDE ${slide.slide_number}:
Headline: ${slide.headline}
Texto: ${slide.body_text}
Descrição visual: ${slide.visual_description}

REGRAS OBRIGATÓRIAS:
- Formato VERTICAL 3:4 aspect ratio (altura maior que largura)
- Resolução ideal: 1080x1440 pixels
- Texto em PORTUGUÊS BRASILEIRO perfeito, sem erros ortográficos
- Texto legível, grande e bem posicionado
- Design moderno, clean e profissional
- NÃO incluir textos longos, apenas a headline curta e impactante
${hasReferences ? `- MUITO IMPORTANTE: Siga EXATAMENTE o estilo visual das imagens de referência anexadas
- REPRODUZA o logotipo/marca IDÊNTICO ao das referências (mesma fonte, cores, posição)
- MANTENHA a paleta de cores e estética das referências
- COPIE o estilo de layout, tipografia e composição` : ''}
- Ultra high resolution`;

            const dataUrl = await generateImageWithNanoBanana(imagePrompt, LOVABLE_API_KEY, referenceImages);
            if (!dataUrl) throw new Error("No image returned");

            const publicUrl = await uploadDataUrlToStorage({
              supabase,
              dataUrl,
              path: `carousels/${company_id}/${client_id}/${carouselId}/slide-${i + 1}.png`,
            });

            const nextSlide = { ...slide, image_url: publicUrl };
            updatedSlides.push(nextSlide);

            if (i === 0) coverImageUrl = publicUrl;

            // Persist progress
            await supabase
              .from("carousel_generation_queue")
              .update({
                slides: updatedSlides.concat(carousel.slides.slice(i + 1)),
                cover_image_url: coverImageUrl || null,
                generated_content: {
                  ...carousel,
                  cover_image_url: coverImageUrl,
                  slides: updatedSlides.concat(carousel.slides.slice(i + 1)),
                },
              })
              .eq("id", carouselId);

            send({ type: "slide_done", index: i + 1, total: carousel.slides.length, image_url: publicUrl });

            // Tiny spacing to reduce 429 bursts (sem alongar demais)
            if (i < carousel.slides.length - 1) {
              await new Promise((r) => setTimeout(r, 300));
            }
          } catch (e: any) {
            console.error("[daily-carousel-generator-stream] Slide error", { i: i + 1, err: e?.message });
            updatedSlides.push(slide);
            send({ type: "slide_error", index: i + 1, total: carousel.slides.length, message: e?.message || "Erro ao gerar imagem" });
          }
        }

        // Final save
        await supabase
          .from("carousel_generation_queue")
          .update({
            slides: updatedSlides,
            cover_image_url: coverImageUrl || null,
            status: "pending",
            generated_content: {
              ...carousel,
              cover_image_url: coverImageUrl,
              slides: updatedSlides,
            },
          })
          .eq("id", carouselId);

        send({ type: "completed", carousel_id: carouselId, saved: true });
        controller.enqueue(sseDone());
        controller.close();
      } catch (e: any) {
        console.error("[daily-carousel-generator-stream] Failed:", e);
        send({ type: "failed", message: e?.message || "Erro desconhecido" });
        controller.enqueue(sseDone());
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

function pickTypeFromSchedule(schedule: CarouselSchedule | null): CarouselType {
  if (!schedule) return "tutorial";

  const weights: Array<{ t: CarouselType; w: number }> = [
    { t: "tutorial", w: schedule.tutorial_percentage || 0 },
    { t: "comparison", w: schedule.comparison_percentage || 0 },
    { t: "behind_scenes", w: schedule.behind_scenes_percentage || 0 },
    { t: "curated_list", w: schedule.curated_list_percentage || 0 },
  ];

  const total = weights.reduce((acc, x) => acc + x.w, 0);
  if (total <= 0) return "tutorial";

  let r = Math.random() * total;
  for (const { t, w } of weights) {
    r -= w;
    if (r <= 0) return t;
  }
  return "tutorial";
}

async function uploadDataUrlToStorage({
  supabase,
  dataUrl,
  path,
}: {
  supabase: any;
  dataUrl: string;
  path: string;
}): Promise<string> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("Invalid image data");

  const { bytes, contentType } = parsed;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });

  if (uploadError) {
    console.error("[daily-carousel-generator-stream] Storage upload error:", uploadError);
    throw new Error("Falha ao salvar imagem no Storage");
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Falha ao obter URL pública");
  return data.publicUrl;
}

function parseDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  if (!dataUrl.startsWith("data:")) return null;
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx < 0) return null;

  const meta = dataUrl.slice(5, commaIdx); // e.g. image/png;base64
  const isBase64 = meta.includes("base64");
  const contentType = meta.split(";")[0] || "application/octet-stream";
  const payload = dataUrl.slice(commaIdx + 1);

  if (!isBase64) return null;

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

async function generateImageWithNanoBanana(
  prompt: string,
  apiKey: string,
  referenceImages: string[] = []
): Promise<string | null> {
  try {
    console.log("[daily-carousel-generator-stream] Calling Nano Banana for image generation...");
    console.log("[daily-carousel-generator-stream] Reference images count:", referenceImages.length);

    // Build the message content - text prompt + reference images
    const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // Add reference images first (if any) - the AI should use these as style/visual reference
    for (const imgUrl of referenceImages) {
      if (imgUrl) {
        messageContent.push({
          type: "image_url",
          image_url: { url: imgUrl },
        });
      }
    }

    // Enhanced prompt with strong reference instructions
    const enhancedPrompt = referenceImages.length > 0
      ? `${prompt}

REFERÊNCIAS VISUAIS OBRIGATÓRIAS (veja as imagens anexadas):
- SIGA FIELMENTE o estilo visual das imagens de referência anexadas
- REPRODUZA EXATAMENTE o logotipo/marca presente nas referências (cores, fonte, posicionamento)
- MANTENHA a paleta de cores das referências
- COPIE o estilo de layout e composição das referências
- USE a mesma tipografia ou estilo tipográfico das referências
- O logotipo deve aparecer no mesmo local e tamanho das referências`
      : prompt;

    messageContent.push({
      type: "text",
      text: enhancedPrompt,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[daily-carousel-generator-stream] Image generation API error:", response.status, errorText);

      if (response.status === 429) throw new Error("Rate limit (429). Tente novamente em alguns minutos.");
      if (response.status === 402) throw new Error("Créditos de IA esgotados (402). Adicione créditos.");
      throw new Error(`Erro na geração de imagem (${response.status})`);
    }

    const data = await response.json();
    const images = data.choices?.[0]?.message?.images;

    const imageUrl = images?.[0]?.image_url?.url as string | undefined;
    if (imageUrl) return imageUrl;

    return null;
  } catch (error: any) {
    console.error("[daily-carousel-generator-stream] Error calling image generation API:", error);
    throw error;
  }
}

function buildImageStylePrompt(schedule: CarouselSchedule | null, client: ClientData): string {
  const styles: string[] = [];

  styles.push(`Marca: ${client.company}`);
  styles.push(`Setor: ${client.sector}`);

  if (schedule) {
    if (schedule.use_dark_mode) {
      styles.push("Estilo: Dark mode com fundo escuro e texto claro");
    } else {
      styles.push("Estilo: Light mode com fundo claro e texto escuro");
    }

    if (schedule.show_ui_screenshots) {
      styles.push("Incluir elementos de interface/mockups quando apropriado");
    }

    if (schedule.include_proof_social) {
      styles.push("Incluir elementos de prova social (ícones, números, badges)");
    }

    if (schedule.include_save_bait) {
      styles.push("Incluir elementos 'save bait' (listas, templates, atalhos)");
    }

    if (schedule.custom_image_prompt) {
      styles.push(`Instrução adicional: ${schedule.custom_image_prompt}`);
    }
  } else {
    styles.push("Estilo: Moderno, clean, com alto contraste");
  }

  return styles.join("\n");
}

function getReferenceImages(schedule: CarouselSchedule | null): string[] {
  if (!schedule) return [];
  
  const refs: string[] = [];
  if (schedule.reference_image_1) refs.push(schedule.reference_image_1);
  if (schedule.reference_image_2) refs.push(schedule.reference_image_2);
  if (schedule.reference_image_3) refs.push(schedule.reference_image_3);
  if (schedule.reference_image_4) refs.push(schedule.reference_image_4);
  if (schedule.reference_image_5) refs.push(schedule.reference_image_5);
  if (schedule.reference_image_6) refs.push(schedule.reference_image_6);
  if (schedule.reference_image_7) refs.push(schedule.reference_image_7);
  if (schedule.reference_image_8) refs.push(schedule.reference_image_8);
  if (schedule.reference_image_9) refs.push(schedule.reference_image_9);
  if (schedule.reference_image_10) refs.push(schedule.reference_image_10);
  
  return refs;
}

async function generateCarousel(
  supabase: any,
  client: ClientData,
  schedule: CarouselSchedule | null,
  carouselType: CarouselType,
  slidesCount: number
): Promise<GeneratedCarousel | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const { data: themes } = await supabase
    .from("market_research_insights")
    .select("*")
    .eq("client_id", client.id)
    .limit(10);

  const theme = themes && themes.length > 0 ? themes[Math.floor(Math.random() * themes.length)] : null;

  const themeContext = theme
    ? `TEMA DE PESQUISA PARA BASEAR O CONTEÚDO:\nTítulo: ${theme.title || theme.topic}\nInsight: ${theme.insight || theme.description || ""}`
    : "";

  const visualStyle = buildVisualStyleContext(schedule);
  const typePrompt = CAROUSEL_TYPE_PROMPTS[carouselType];

  const systemPrompt = `Você é um especialista em criação de carrosseis para Instagram e LinkedIn.\n\nREGRAS IMPORTANTES:\n- Todos os textos DEVEM ser 100% em português do Brasil\n- Headlines devem ser curtas e impactantes (máx 10 palavras)\n- Body text deve ser conciso e escaneável\n- O último slide SEMPRE deve ter um CTA claro`;

  const userPrompt = `Crie um carrossel para a marca "${client.company}" (${client.sector}).\n\n${typePrompt}\n\n${themeContext}\n\nBRIEFING DA MARCA: ${client.ai_briefing || "Criar conteúdo relevante e engajante"}\nPÚBLICO-ALVO: ${client.target_audience || "Público geral interessado no setor"}\nTOM DE VOZ: ${client.voice_tone || "Profissional mas acessível"}\nPRODUTO/SERVIÇO: ${client.product_name || client.company}\n\n${visualStyle}\n\nQUANTIDADE DE SLIDES: ${slidesCount}\n\nResponda APENAS em JSON válido com esta estrutura:\n{\n  "theme": "Tema principal do carrossel",\n  "cover_headline": "Headline chamativa para o primeiro slide",\n  "slides": [\n    {\n      "slide_number": 1,\n      "headline": "Headline do slide",\n      "body_text": "Texto complementar curto",\n      "visual_description": "Descrição do visual/imagem do slide",\n      "cta": "CTA se for o último slide"\n    }\n  ],\n  "caption": "Legenda completa para o post (máx 400 caracteres)",\n  "hashtags": "10-15 hashtags relevantes separadas por espaço",\n  "cta_text": "Texto do CTA principal"\n}`;

  console.log("[daily-carousel-generator-stream] Calling AI for carousel generation...");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("[daily-carousel-generator-stream] AI API error:", response.status, t);

    if (response.status === 429) throw new Error("Rate limit (429). Tente novamente em alguns minutos.");
    if (response.status === 402) throw new Error("Créditos de IA esgotados (402). Adicione créditos.");
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content || "";

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  const carousel = JSON.parse(jsonMatch[0]) as GeneratedCarousel;
  carousel.carousel_type = carouselType;

  if (!carousel.slides || carousel.slides.length === 0) throw new Error("No slides generated");

  return carousel;
}

function buildVisualStyleContext(schedule: CarouselSchedule | null): string {
  if (!schedule) {
    return "ESTILO VISUAL: Dark mode moderno com alto contraste";
  }

  const styles: string[] = [];

  if (schedule.use_dark_mode) {
    styles.push("Dark mode com fundo escuro e texto claro");
  } else {
    styles.push("Light mode com fundo claro e texto escuro");
  }

  if (schedule.show_ui_screenshots) {
    styles.push("Incluir mockups de interface/telas quando relevante");
  }

  if (schedule.include_proof_social) {
    styles.push("Incluir elementos de prova social (números, depoimentos, logos)");
  }

  if (schedule.include_save_bait) {
    styles.push("Incluir elementos 'save bait' (dicas práticas, listas, templates)");
  }

  if (schedule.custom_image_prompt) {
    styles.push(`INSTRUÇÃO PERSONALIZADA: ${schedule.custom_image_prompt}`);
  }

  return `ESTILO VISUAL:\n${styles.join("\n")}`;
}
