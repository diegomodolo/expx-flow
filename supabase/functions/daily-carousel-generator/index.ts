import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CarouselSchedule {
  id: string;
  client_id: string;
  company_id: string;
  carousels_per_day: number;
  slides_per_carousel: number;
  generation_time: string;
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

const CAROUSEL_TYPES = ['tutorial', 'comparison', 'behind_scenes', 'curated_list'] as const;

const CAROUSEL_TYPE_PROMPTS = {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { client_id, company_id, user_id, carousel_type, count } = body;

    console.log('[daily-carousel-generator] Starting generation:', { client_id, company_id, carousel_type, count });

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('[daily-carousel-generator] Client not found:', clientError);
      throw new Error('Client not found');
    }

    console.log('[daily-carousel-generator] Client loaded:', client.name);

    // Get generation schedule
    const { data: schedule } = await supabase
      .from('carousel_generation_schedules')
      .select('*')
      .eq('client_id', client_id)
      .single();

    const carouselsToGenerate = count || schedule?.carousels_per_day || 3;
    const slidesPerCarousel = schedule?.slides_per_carousel || 8;

    // Calculate type distribution
    const distribution = calculateDistribution(carouselsToGenerate, schedule, carousel_type);
    console.log('[daily-carousel-generator] Distribution:', distribution);

    // Update last_generation_at
    if (schedule && !carousel_type) {
      await supabase
        .from('carousel_generation_schedules')
        .update({
          last_generation_at: new Date().toISOString(),
          next_generation_at: getNextGenerationTime(schedule.generation_time),
        })
        .eq('id', schedule.id);
    }

    // Importante: NÃO retornar o conteúdo completo (inclui imagens em base64) na resposta,
    // senão o payload fica enorme e o navegador pode derrubar a conexão.
    const generatedCarousels: Array<{ id: string; type: string; theme: string | null }> = [];
    const errors: string[] = [];

    // Generate carousels based on distribution
    for (const [type, typeCount] of Object.entries(distribution)) {
      for (let i = 0; i < typeCount; i++) {
        try {
          console.log(`[daily-carousel-generator] Generating ${type} carousel ${i + 1}/${typeCount}`);
          
          const carousel = await generateCarousel(
            supabase,
            client,
            schedule,
            type as typeof CAROUSEL_TYPES[number],
            slidesPerCarousel
          );

          if (carousel) {
            // Generate images for slides
            console.log('[daily-carousel-generator] Generating images for carousel slides...');
            const carouselWithImages = await generateCarouselImages(carousel, client, schedule);

            // Save to queue
            const { data: savedCarousel, error: insertError } = await supabase
              .from('carousel_generation_queue')
              .insert({
                client_id,
                company_id,
                user_id,
                carousel_type: type,
                theme: carouselWithImages.theme,
                slides: carouselWithImages.slides,
                caption: carouselWithImages.caption,
                hashtags: carouselWithImages.hashtags,
                cta_text: carouselWithImages.cta_text,
                cover_image_url: carouselWithImages.cover_image_url || null,
                generated_content: carouselWithImages,
                schedule_id: schedule?.id || null,
                status: 'pending',
              })
              .select('id')
              .single();

            if (insertError) {
              console.error('[daily-carousel-generator] Error saving carousel:', insertError);
              errors.push(`Failed to save ${type} carousel: ${insertError.message}`);
            } else {
              console.log('[daily-carousel-generator] Saved carousel:', savedCarousel?.id);
              if (savedCarousel?.id) {
                generatedCarousels.push({
                  id: savedCarousel.id,
                  type,
                  theme: carouselWithImages.theme ?? null,
                });
              }
            }
          }
        } catch (error: any) {
          console.error(`[daily-carousel-generator] Error generating ${type}:`, error);
          errors.push(`${type}: ${error.message}`);
        }
      }
    }

    console.log('[daily-carousel-generator] Generation completed:', {
      generated: generatedCarousels.length,
      errors: errors.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedCarousels.length,
        carousels: generatedCarousels,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[daily-carousel-generator] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateDistribution(
  total: number,
  schedule: CarouselSchedule | null,
  specificType?: string
): Record<string, number> {
  if (specificType) {
    return { [specificType]: total };
  }

  const distribution: Record<string, number> = {
    tutorial: 0,
    comparison: 0,
    behind_scenes: 0,
    curated_list: 0,
  };

  if (!schedule) {
    // Equal distribution by default
    const each = Math.floor(total / 4);
    const remainder = total % 4;
    distribution.tutorial = each + (remainder > 0 ? 1 : 0);
    distribution.comparison = each + (remainder > 1 ? 1 : 0);
    distribution.behind_scenes = each + (remainder > 2 ? 1 : 0);
    distribution.curated_list = each;
    return distribution;
  }

  // Weighted distribution based on percentages
  const totalPercentage = 
    schedule.tutorial_percentage + 
    schedule.comparison_percentage + 
    schedule.behind_scenes_percentage + 
    schedule.curated_list_percentage;

  if (totalPercentage === 0) {
    return { tutorial: total };
  }

  let remaining = total;
  const types = [
    { key: 'tutorial', pct: schedule.tutorial_percentage },
    { key: 'comparison', pct: schedule.comparison_percentage },
    { key: 'behind_scenes', pct: schedule.behind_scenes_percentage },
    { key: 'curated_list', pct: schedule.curated_list_percentage },
  ];

  for (let i = 0; i < types.length; i++) {
    if (i === types.length - 1) {
      distribution[types[i].key] = remaining;
    } else {
      const count = Math.round(total * types[i].pct / totalPercentage);
      distribution[types[i].key] = Math.min(count, remaining);
      remaining -= distribution[types[i].key];
    }
  }

  return distribution;
}

function getNextGenerationTime(generationTime: string): string {
  const now = new Date();
  const [hours, minutes] = generationTime.split(':').map(Number);
  
  const next = new Date(now);
  next.setUTCHours(hours + 3, minutes, 0, 0); // Convert BRT to UTC
  
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next.toISOString();
}

async function generateCarouselImages(
  carousel: GeneratedCarousel,
  client: ClientData,
  schedule: CarouselSchedule | null
): Promise<GeneratedCarousel> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    console.warn('[daily-carousel-generator] LOVABLE_API_KEY not set, skipping image generation');
    return carousel;
  }

  const updatedSlides: CarouselSlide[] = [];
  let coverImageUrl: string | undefined;

  // Build style context for image generation
  const styleContext = buildImageStylePrompt(schedule, client);

  for (let i = 0; i < carousel.slides.length; i++) {
    const slide = carousel.slides[i];
    
    try {
      console.log(`[daily-carousel-generator] Generating image for slide ${i + 1}/${carousel.slides.length}`);
      
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
- Cores que combinem com a identidade da marca ${client.company}
- Ultra high resolution`;

      const imageUrl = await generateImageWithNanoBanana(imagePrompt, LOVABLE_API_KEY);
      
      updatedSlides.push({
        ...slide,
        image_url: imageUrl || undefined,
      });

      // Use first slide's image as cover
      if (i === 0 && imageUrl) {
        coverImageUrl = imageUrl;
      }

      // Small delay between image generations to avoid rate limiting
      if (i < carousel.slides.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[daily-carousel-generator] Error generating image for slide ${i + 1}:`, error);
      updatedSlides.push(slide);
    }
  }

  return {
    ...carousel,
    slides: updatedSlides,
    cover_image_url: coverImageUrl,
  };
}

async function generateImageWithNanoBanana(prompt: string, apiKey: string): Promise<string | null> {
  try {
    console.log('[daily-carousel-generator] Calling Nano Banana (gemini-3-pro-image-preview) for image generation...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[daily-carousel-generator] Image generation API error:', response.status, errorText);
      
      if (response.status === 429) {
        console.warn('[daily-carousel-generator] Rate limit hit for image generation');
        return null;
      }
      if (response.status === 402) {
        console.warn('[daily-carousel-generator] Payment required for image generation');
        return null;
      }
      return null;
    }

    const data = await response.json();
    const images = data.choices?.[0]?.message?.images;
    
    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl) {
        console.log('[daily-carousel-generator] Image generated successfully (base64)');
        return imageUrl;
      }
    }

    console.warn('[daily-carousel-generator] No image returned from API');
    return null;
  } catch (error) {
    console.error('[daily-carousel-generator] Error calling image generation API:', error);
    return null;
  }
}

function buildImageStylePrompt(schedule: CarouselSchedule | null, client: ClientData): string {
  const styles: string[] = [];
  
  styles.push(`Marca: ${client.company}`);
  styles.push(`Setor: ${client.sector}`);
  
  if (schedule) {
    if (schedule.use_dark_mode) {
      styles.push('Estilo: Dark mode com fundo escuro (#1a1a2e ou similar) e texto claro');
    } else {
      styles.push('Estilo: Light mode com fundo claro e texto escuro');
    }

    if (schedule.show_ui_screenshots) {
      styles.push('Incluir elementos de interface/mockups quando apropriado');
    }

    if (schedule.include_proof_social) {
      styles.push('Incluir elementos de prova social (ícones de check, números, badges)');
    }

    if (schedule.custom_image_prompt) {
      styles.push(`Instrução adicional: ${schedule.custom_image_prompt}`);
    }
  } else {
    styles.push('Estilo: Moderno, clean, com alto contraste');
  }

  return styles.join('\n');
}

async function generateCarousel(
  supabase: any,
  client: ClientData,
  schedule: CarouselSchedule | null,
  carouselType: typeof CAROUSEL_TYPES[number],
  slidesCount: number
): Promise<GeneratedCarousel | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Get research theme for context
  const { data: themes } = await supabase
    .from('market_research_insights')
    .select('*')
    .eq('client_id', client.id)
    .limit(10);

  const theme = themes && themes.length > 0 
    ? themes[Math.floor(Math.random() * themes.length)]
    : null;

  const themeContext = theme 
    ? `TEMA DE PESQUISA PARA BASEAR O CONTEÚDO:
Título: ${theme.title || theme.topic}
Insight: ${theme.insight || theme.description || ''}`
    : '';

  // Build visual style context
  const visualStyle = buildVisualStyleContext(schedule);

  const typePrompt = CAROUSEL_TYPE_PROMPTS[carouselType];

  const systemPrompt = `Você é um especialista em criação de carrosseis para Instagram e LinkedIn.
Crie carrosseis altamente engajantes seguindo as melhores práticas de design e copywriting para redes sociais.

REGRAS IMPORTANTES:
- Todos os textos DEVEM ser 100% em português do Brasil
- Headlines devem ser curtas e impactantes (máx 10 palavras)
- Body text deve ser conciso e escaneável
- Use emojis estrategicamente para aumentar engajamento
- Cada slide deve ter valor individual mas construir uma narrativa
- O último slide SEMPRE deve ter um CTA claro`;

  const userPrompt = `Crie um carrossel para a marca "${client.company}" (${client.sector}).

${typePrompt}

${themeContext}

BRIEFING DA MARCA: ${client.ai_briefing || 'Criar conteúdo relevante e engajante'}
PÚBLICO-ALVO: ${client.target_audience || 'Público geral interessado no setor'}
TOM DE VOZ: ${client.voice_tone || 'Profissional mas acessível'}
PRODUTO/SERVIÇO: ${client.product_name || client.company}

${visualStyle}

QUANTIDADE DE SLIDES: ${slidesCount}

Responda APENAS em JSON válido com esta estrutura:
{
  "theme": "Tema principal do carrossel",
  "cover_headline": "Headline chamativa para o primeiro slide",
  "slides": [
    {
      "slide_number": 1,
      "headline": "Headline do slide",
      "body_text": "Texto complementar curto",
      "visual_description": "Descrição do visual/imagem do slide",
      "cta": "CTA se for o último slide"
    }
  ],
  "caption": "Legenda completa para o post (máx 400 caracteres)",
  "hashtags": "10-15 hashtags relevantes separadas por espaço",
  "cta_text": "Texto do CTA principal"
}`;

  console.log('[daily-carousel-generator] Calling AI for carousel generation...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[daily-carousel-generator] AI API error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content || '';

  console.log('[daily-carousel-generator] AI response received, parsing...');

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const carousel = JSON.parse(jsonMatch[0]) as GeneratedCarousel;
    carousel.carousel_type = carouselType;

    // Validate slides
    if (!carousel.slides || carousel.slides.length === 0) {
      throw new Error('No slides generated');
    }

    console.log('[daily-carousel-generator] Carousel parsed successfully:', carousel.theme);
    return carousel;
  } catch (parseError: any) {
    console.error('[daily-carousel-generator] Parse error:', parseError, responseText);
    throw new Error(`Failed to parse carousel: ${parseError.message}`);
  }
}

function buildVisualStyleContext(schedule: CarouselSchedule | null): string {
  if (!schedule) {
    return 'ESTILO VISUAL: Dark mode moderno com alto contraste';
  }

  const styles: string[] = [];
  
  if (schedule.use_dark_mode) {
    styles.push('Dark mode com fundo escuro e texto claro');
  } else {
    styles.push('Light mode com fundo claro e texto escuro');
  }

  if (schedule.show_ui_screenshots) {
    styles.push('Incluir mockups de interface/telas quando relevante');
  }

  if (schedule.include_proof_social) {
    styles.push('Incluir elementos de prova social (números, depoimentos, logos)');
  }

  if (schedule.include_save_bait) {
    styles.push('Incluir elementos "save bait" (dicas práticas, listas, templates)');
  }

  if (schedule.custom_image_prompt) {
    styles.push(`INSTRUÇÃO PERSONALIZADA: ${schedule.custom_image_prompt}`);
  }

  return `ESTILO VISUAL:\n${styles.join('\n')}`;
}
