import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const BUCKET = "visual-creatives";

interface CarouselSlide {
  slide_number: number;
  headline: string;
  body_text: string;
  visual_description: string;
  cta?: string;
  image_url?: string;
}

interface CarouselSchedule {
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
}

type StreamEvent =
  | { type: "started"; carousel_id: string; missing_count: number; missing_indices: number[] }
  | { type: "slide_start"; index: number; total: number }
  | { type: "slide_done"; index: number; total: number; image_url: string }
  | { type: "slide_error"; index: number; total: number; message: string }
  | { type: "completed"; carousel_id: string; success: boolean }
  | { type: "failed"; message: string };

function sseEvent(data: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function sseDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { carousel_id } = await req.json();

  if (!carousel_id) {
    return new Response(JSON.stringify({ error: "carousel_id é obrigatório" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[regenerate-carousel-images] Starting for carousel:", carousel_id);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(sseEvent(event));

      try {
        // Fetch carousel data
        const { data: carousel, error: carouselError } = await supabase
          .from("carousel_generation_queue")
          .select("*, clients!inner(id, name, company, sector)")
          .eq("id", carousel_id)
          .single();

        if (carouselError || !carousel) {
          console.error("[regenerate-carousel-images] Carousel not found:", carouselError);
          send({ type: "failed", message: "Carrossel não encontrado" });
          controller.enqueue(sseDone());
          controller.close();
          return;
        }

        const client = carousel.clients as ClientData;
        const slides = (carousel.slides || []) as CarouselSlide[];

        // Find slides without images
        const missingIndices: number[] = [];
        slides.forEach((slide, idx) => {
          if (!slide.image_url) {
            missingIndices.push(idx);
          }
        });

        if (missingIndices.length === 0) {
          send({ type: "completed", carousel_id, success: true });
          controller.enqueue(sseDone());
          controller.close();
          return;
        }

        console.log("[regenerate-carousel-images] Missing images at indices:", missingIndices);

        send({
          type: "started",
          carousel_id,
          missing_count: missingIndices.length,
          missing_indices: missingIndices.map(i => i + 1),
        });

        // Fetch schedule for style settings
        const { data: schedule } = await supabase
          .from("carousel_generation_schedules")
          .select("*")
          .eq("client_id", carousel.client_id)
          .maybeSingle();

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          throw new Error("LOVABLE_API_KEY not configured");
        }

        const styleContext = buildImageStylePrompt(schedule, client);
        const referenceImages = getReferenceImages(schedule);

        const updatedSlides = [...slides];
        let coverImageUrl = carousel.cover_image_url;

        for (let i = 0; i < missingIndices.length; i++) {
          const slideIdx = missingIndices[i];
          const slide = slides[slideIdx];

          send({ type: "slide_start", index: slideIdx + 1, total: slides.length });

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
              path: `carousels/${carousel.company_id}/${carousel.client_id}/${carousel_id}/slide-${slideIdx + 1}.png`,
            });

            updatedSlides[slideIdx] = { ...slide, image_url: publicUrl };

            // Update cover if this is the first slide
            if (slideIdx === 0) {
              coverImageUrl = publicUrl;
            }

            // Persist progress
            await supabase
              .from("carousel_generation_queue")
              .update({
                slides: updatedSlides,
                cover_image_url: coverImageUrl || null,
              })
              .eq("id", carousel_id);

            send({ type: "slide_done", index: slideIdx + 1, total: slides.length, image_url: publicUrl });

            // Small delay to avoid rate limits
            if (i < missingIndices.length - 1) {
              await new Promise((r) => setTimeout(r, 300));
            }
          } catch (e: any) {
            console.error("[regenerate-carousel-images] Slide error", { slideIdx: slideIdx + 1, err: e?.message });
            send({ type: "slide_error", index: slideIdx + 1, total: slides.length, message: e?.message || "Erro ao gerar imagem" });
          }
        }

        // Final save
        await supabase
          .from("carousel_generation_queue")
          .update({
            slides: updatedSlides,
            cover_image_url: coverImageUrl || null,
            status: "pending",
          })
          .eq("id", carousel_id);

        send({ type: "completed", carousel_id, success: true });
        controller.enqueue(sseDone());
        controller.close();
      } catch (e: any) {
        console.error("[regenerate-carousel-images] Failed:", e);
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
    console.error("[regenerate-carousel-images] Storage upload error:", uploadError);
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

  const meta = dataUrl.slice(5, commaIdx);
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
    console.log("[regenerate-carousel-images] Calling Nano Banana for image generation...");

    const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    for (const imgUrl of referenceImages) {
      if (imgUrl) {
        messageContent.push({
          type: "image_url",
          image_url: { url: imgUrl },
        });
      }
    }

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
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[regenerate-carousel-images] Image generation API error:", response.status, errorText);

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
    console.error("[regenerate-carousel-images] Error calling image generation API:", error);
    throw error;
  }
}
