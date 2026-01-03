import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid Facebook CTAs
const VALID_FACEBOOK_CTAS = [
  'APPLY_NOW',
  'BOOK_TRAVEL',
  'CALL_NOW',
  'CONTACT_US',
  'DOWNLOAD',
  'GET_DIRECTIONS',
  'GET_OFFER',
  'GET_QUOTE',
  'GET_SHOWTIMES',
  'INSTALL_APP',
  'LEARN_MORE',
  'LISTEN_NOW',
  'MESSAGE_PAGE',
  'NO_BUTTON',
  'OPEN_LINK',
  'ORDER_NOW',
  'PLAY_GAME',
  'REQUEST_TIME',
  'SAVE',
  'SEE_MENU',
  'SHOP_NOW',
  'SIGN_UP',
  'SUBSCRIBE',
  'WATCH_MORE',
  'WHATSAPP_MESSAGE',
];

interface AdGenerationSchedule {
  id: string;
  client_id: string;
  company_id: string;
  ads_per_day: number;
  clone_percentage: number;
  concept_percentage: number;
  iteration_percentage: number;
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
  ai_reference_image_1: string | null;
  ai_reference_image_2: string | null;
  ai_reference_image_3: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { client_id, company_id, user_id, generation_type, count } = await req.json();

    console.log('[daily-ad-generator] Starting generation:', { client_id, company_id, generation_type, count });

    // Fetch client data including AI reference images
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('[daily-ad-generator] Client not found:', clientError);
      throw new Error('Client not found');
    }

    console.log('[daily-ad-generator] Client data loaded:', client.name, 'Has reference images:', !!client.ai_reference_image_1);

    // Get generation schedule or use defaults
    const { data: schedule } = await supabase
      .from('ad_generation_schedules')
      .select('*')
      .eq('client_id', client_id)
      .single();

    const adsToGenerate = count || schedule?.ads_per_day || 10;
    const clonePercentage = schedule?.clone_percentage || 20;
    const conceptPercentage = schedule?.concept_percentage || 50;
    const iterationPercentage = schedule?.iteration_percentage || 30;

    // Calculate distribution
    const cloneCount = Math.round(adsToGenerate * clonePercentage / 100);
    const conceptCount = Math.round(adsToGenerate * conceptPercentage / 100);
    const iterationCount = adsToGenerate - cloneCount - conceptCount;

    console.log('[daily-ad-generator] Distribution:', { cloneCount, conceptCount, iterationCount });

    const generatedAds: any[] = [];
    const errors: string[] = [];

    // Generate based on type or all types
    if (!generation_type || generation_type === 'clone') {
      const targetCount = generation_type === 'clone' ? (count || 1) : cloneCount;
      const clones = await generateCloneAds(supabase, client, targetCount);
      generatedAds.push(...clones);
      if (clones.length === 0 && targetCount > 0) {
        errors.push('Nenhum anúncio de concorrente encontrado para clone.');
      }
    }

    if (!generation_type || generation_type === 'concept') {
      const targetCount = generation_type === 'concept' ? (count || 1) : conceptCount;
      const concepts = await generateConceptAds(supabase, client, targetCount);
      generatedAds.push(...concepts);
    }

    if (!generation_type || generation_type === 'iteration') {
      const targetCount = generation_type === 'iteration' ? (count || 1) : iterationCount;
      const iterations = await generateIterationAds(supabase, client, targetCount);
      generatedAds.push(...iterations);
      if (iterations.length === 0 && targetCount > 0) {
        errors.push('Nenhum anúncio vencedor encontrado para iteração.');
      }
    }

    // Insert all generated ads into the queue
    if (generatedAds.length > 0) {
      const adsToInsert = generatedAds.map(ad => {
        // Normalize quality_score to fit NUMERIC(3,2) - max value 9.99
        // Convert from 0-100 scale to 0-9.99 scale
        let normalizedScore = null;
        if (ad.quality_score != null) {
          normalizedScore = Math.min(9.99, Math.max(0, ad.quality_score / 10));
          normalizedScore = Math.round(normalizedScore * 100) / 100; // Round to 2 decimals
        }
        
        return {
          client_id,
          company_id,
          user_id,
          generation_type: ad.type,
          source_ad_id: ad.source_ad_id || null,
          source_competitor_id: ad.source_competitor_id || null,
          generated_content: ad.content,
          concept_description: ad.concept_description || null,
          research_sources: ad.research_sources || null,
          quality_score: normalizedScore,
          status: 'pending',
          scheduled_for: new Date().toISOString(),
        };
      });

      const { error: insertError } = await supabase
        .from('ad_generation_queue')
        .insert(adsToInsert);

      if (insertError) {
        console.error('[daily-ad-generator] Error inserting ads:', insertError);
        throw insertError;
      }

      console.log('[daily-ad-generator] Inserted', adsToInsert.length, 'ads into queue');
    }

    // Update schedule last_generation_at
    if (schedule) {
      await supabase
        .from('ad_generation_schedules')
        .update({
          last_generation_at: new Date().toISOString(),
          next_generation_at: getNextGenerationTime(schedule.generation_time),
        })
        .eq('id', schedule.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedAds.length,
        errors: errors.length > 0 ? errors : undefined,
        distribution: {
          clones: generatedAds.filter(a => a.type === 'clone').length,
          concepts: generatedAds.filter(a => a.type === 'concept').length,
          iterations: generatedAds.filter(a => a.type === 'iteration').length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[daily-ad-generator] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Get reference images from client
function getClientReferenceImages(client: ClientData): string[] {
  const images: string[] = [];
  if (client.ai_reference_image_1) images.push(client.ai_reference_image_1);
  if (client.ai_reference_image_2) images.push(client.ai_reference_image_2);
  if (client.ai_reference_image_3) images.push(client.ai_reference_image_3);
  return images;
}

// Generate creative image using Nano banana model
async function generateCreativeImage(client: ClientData, adContent: any): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const referenceImages = getClientReferenceImages(client);
  
  // Build image generation prompt based on client branding and ad content
  const imagePrompt = `
Crie uma imagem publicitária profissional para um anúncio de Facebook/Instagram.

MARCA: ${client.company}
PRODUTO: ${client.product_name || client.company}
SETOR: ${client.sector}
HEADLINE DO ANÚNCIO: ${adContent.headline || ''}
CONCEITO: ${adContent.concept_explanation || adContent.concept_adapted || ''}

DIRETRIZES DE ESTILO:
- Use cores vibrantes e profissionais
- Estilo moderno e clean
- Foco em conversão
- Formato quadrado (1:1) ideal para redes sociais
- Não inclua texto na imagem (será adicionado separadamente)

${adContent.image_prompt ? `SUGESTÃO ADICIONAL: ${adContent.image_prompt}` : ''}
`;

  try {
    // If client has reference images, use image editing to maintain style
    if (referenceImages.length > 0) {
      console.log('[daily-ad-generator] Generating image based on reference:', referenceImages[0]);
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Crie uma nova imagem publicitária inspirada nesta referência visual, mantendo o mesmo estilo, cores e identidade visual.

${imagePrompt}

IMPORTANTE: Mantenha a consistência visual com a imagem de referência, mas crie uma composição NOVA e ORIGINAL para o anúncio.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: referenceImages[0],
                  },
                },
              ],
            },
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (imageUrl) {
          console.log('[daily-ad-generator] Image generated successfully (with reference)');
          return imageUrl;
        }
      } else {
        const errorText = await response.text();
        console.error('[daily-ad-generator] Image generation error (with reference):', errorText);
      }
    }
    
    // Fallback: Generate without reference image
    console.log('[daily-ad-generator] Generating image without reference');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: imagePrompt,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        console.log('[daily-ad-generator] Image generated successfully (without reference)');
        return imageUrl;
      }
    } else {
      const errorText = await response.text();
      console.error('[daily-ad-generator] Image generation error:', errorText);
    }
  } catch (error) {
    console.error('[daily-ad-generator] Error generating creative image:', error);
  }

  return null;
}

// Validate and normalize CTA to Facebook-allowed values
function normalizeCTA(cta: string): string {
  if (!cta) return 'LEARN_MORE';
  
  // Clean and normalize
  const normalized = cta.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  
  // Check if it's already valid
  if (VALID_FACEBOOK_CTAS.includes(normalized)) {
    return normalized;
  }
  
  // Map common variations to valid CTAs
  const ctaMapping: Record<string, string> = {
    'SAIBA_MAIS': 'LEARN_MORE',
    'SABER_MAIS': 'LEARN_MORE',
    'VER_MAIS': 'LEARN_MORE',
    'COMPRAR': 'SHOP_NOW',
    'COMPRE_AGORA': 'SHOP_NOW',
    'COMPRAR_AGORA': 'SHOP_NOW',
    'INSCREVA_SE': 'SIGN_UP',
    'CADASTRE_SE': 'SIGN_UP',
    'CADASTRAR': 'SIGN_UP',
    'BAIXAR': 'DOWNLOAD',
    'BAIXE_AGORA': 'DOWNLOAD',
    'INSTALAR': 'INSTALL_APP',
    'LIGAR': 'CALL_NOW',
    'LIGUE_AGORA': 'CALL_NOW',
    'CONTATO': 'CONTACT_US',
    'FALE_CONOSCO': 'CONTACT_US',
    'ENTRE_EM_CONTATO': 'CONTACT_US',
    'AGENDAR': 'REQUEST_TIME',
    'AGENDE': 'REQUEST_TIME',
    'RESERVAR': 'BOOK_TRAVEL',
    'RESERVE': 'BOOK_TRAVEL',
    'PEDIR': 'ORDER_NOW',
    'PEÇA_AGORA': 'ORDER_NOW',
    'VER_MENU': 'SEE_MENU',
    'CARDAPIO': 'SEE_MENU',
    'ASSISTIR': 'WATCH_MORE',
    'ASSISTA': 'WATCH_MORE',
    'OUVIR': 'LISTEN_NOW',
    'OUÇA': 'LISTEN_NOW',
    'SALVAR': 'SAVE',
    'MENSAGEM': 'MESSAGE_PAGE',
    'WHATSAPP': 'WHATSAPP_MESSAGE',
    'ORCAMENTO': 'GET_QUOTE',
    'COTACAO': 'GET_QUOTE',
    'OFERTA': 'GET_OFFER',
    'VER_OFERTA': 'GET_OFFER',
    'APLICAR': 'APPLY_NOW',
    'CANDIDATAR': 'APPLY_NOW',
    'JOGAR': 'PLAY_GAME',
    'ABRIR': 'OPEN_LINK',
  };
  
  if (ctaMapping[normalized]) {
    return ctaMapping[normalized];
  }
  
  // Default fallback
  return 'LEARN_MORE';
}

// Generate clone ads from competitor winning ads
async function generateCloneAds(supabase: any, client: ClientData, count: number): Promise<any[]> {
  if (count <= 0) return [];

  console.log('[daily-ad-generator] Generating', count, 'clone ads for client:', client.id);

  // Fetch competitor ads - prioritize those running longer (older date_spotted = proven winners)
  const { data: competitorAds, error: competitorError } = await supabase
    .from('competitor_ads')
    .select('*, competitors(name, company_name)')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .order('date_spotted', { ascending: true })
    .limit(count * 2);

  if (competitorError) {
    console.error('[daily-ad-generator] Error fetching competitor ads:', competitorError);
  }

  console.log('[daily-ad-generator] Found competitor ads:', competitorAds?.length || 0);

  if (!competitorAds || competitorAds.length === 0) {
    console.log('[daily-ad-generator] No competitor ads found, generating placeholder clones');
    return await generateAICloneAds(supabase, client, count);
  }

  const ads: any[] = [];
  const usedAds = new Set();

  for (let i = 0; i < Math.min(count, competitorAds.length); i++) {
    const sourceAd = competitorAds[i];
    if (usedAds.has(sourceAd.id)) continue;
    usedAds.add(sourceAd.id);

    // Generate adapted version using AI
    const adaptedAd = await adaptCompetitorAd(supabase, client, sourceAd);
    
    // Generate creative image
    const creativeImageUrl = await generateCreativeImage(client, adaptedAd);
    if (creativeImageUrl) {
      adaptedAd.creative_image_url = creativeImageUrl;
    }
    
    ads.push({
      type: 'clone',
      source_ad_id: sourceAd.id,
      source_competitor_id: sourceAd.competitor_id,
      content: adaptedAd,
      concept_description: `Clone do anúncio do concorrente ${sourceAd.competitors?.company_name || 'desconhecido'}. Conceito original: ${sourceAd.ad_title || sourceAd.ad_copy?.substring(0, 100)}`,
      quality_score: 75,
    });
  }

  return ads;
}

// Generate concept ads from market research
async function generateConceptAds(supabase: any, client: ClientData, count: number): Promise<any[]> {
  if (count <= 0) return [];

  console.log('[daily-ad-generator] Generating', count, 'concept ads');

  // Fetch market research insights
  const { data: insights } = await supabase
    .from('market_research_insights')
    .select('*')
    .eq('client_id', client.id)
    .order('relevance_score', { ascending: false })
    .limit(count);

  const ads: any[] = [];
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  for (let i = 0; i < count; i++) {
    const insight = insights?.[i % (insights?.length || 1)];
    
    const conceptPrompt = buildConceptPrompt(client, insight);

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em marketing digital e criação de anúncios para Facebook/Instagram. 
Gere anúncios criativos, persuasivos e que convertem.
IMPORTANTE: O campo "call_to_action" DEVE ser um destes valores exatos: ${VALID_FACEBOOK_CTAS.join(', ')}
Responda APENAS em JSON válido.`,
            },
            {
              role: 'user',
              content: conceptPrompt,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        try {
          const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
          const adContent = JSON.parse(cleanJson);
          
          // Normalize CTA
          adContent.call_to_action = normalizeCTA(adContent.call_to_action);
          
          // Ensure body content exists
          if (!adContent.body && adContent.primary_text) {
            adContent.body = adContent.primary_text;
          }
          
          // Generate creative image
          const creativeImageUrl = await generateCreativeImage(client, adContent);
          if (creativeImageUrl) {
            adContent.creative_image_url = creativeImageUrl;
          }
          
          ads.push({
            type: 'concept',
            content: adContent,
            concept_description: adContent.concept_explanation || `Conceito baseado em pesquisa de mercado: ${insight?.topic || 'análise geral'}`,
            research_sources: insight ? [insight] : null,
            quality_score: 80,
          });
        } catch (parseError) {
          console.error('[daily-ad-generator] JSON parse error:', parseError, 'Content:', content);
        }
      } else {
        const errorText = await response.text();
        console.error('[daily-ad-generator] AI response error:', response.status, errorText);
      }
    } catch (error) {
      console.error('[daily-ad-generator] AI generation error:', error);
    }
  }

  return ads;
}

// Generate iteration ads from winning client ads
async function generateIterationAds(supabase: any, client: ClientData, count: number): Promise<any[]> {
  if (count <= 0) return [];

  console.log('[daily-ad-generator] Generating', count, 'iteration ads');

  // Fetch winning ads from the client
  const { data: winnerAds } = await supabase
    .from('ad_performance_winners')
    .select('*')
    .eq('client_id', client.id)
    .eq('is_winner', true)
    .order('ctr', { ascending: false })
    .limit(10);

  const ads: any[] = [];
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!winnerAds || winnerAds.length === 0) {
    console.log('[daily-ad-generator] No winner ads found, skipping iterations');
    return [];
  }

  for (let i = 0; i < count; i++) {
    const sourceAd = winnerAds[i % winnerAds.length];
    
    const iterationPrompt = buildIterationPrompt(client, sourceAd);

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em otimização de anúncios. 
Crie variações de anúncios vencedores mantendo a essência mas testando novos ângulos.
IMPORTANTE: O campo "call_to_action" DEVE ser um destes valores exatos: ${VALID_FACEBOOK_CTAS.join(', ')}
Responda APENAS em JSON válido.`,
            },
            {
              role: 'user',
              content: iterationPrompt,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        try {
          const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
          const adContent = JSON.parse(cleanJson);
          
          // Normalize CTA
          adContent.call_to_action = normalizeCTA(adContent.call_to_action);
          
          // Ensure body content exists
          if (!adContent.body && adContent.primary_text) {
            adContent.body = adContent.primary_text;
          }
          
          // Generate creative image
          const creativeImageUrl = await generateCreativeImage(client, adContent);
          if (creativeImageUrl) {
            adContent.creative_image_url = creativeImageUrl;
          }
          
          ads.push({
            type: 'iteration',
            source_ad_id: sourceAd.ad_id,
            content: adContent,
            concept_description: `Iteração do anúncio vencedor: ${sourceAd.ad_name}. Variação: ${adContent.variation_type || 'otimização'}`,
            quality_score: 85,
          });
        } catch (parseError) {
          console.error('[daily-ad-generator] JSON parse error:', parseError);
        }
      }
    } catch (error) {
      console.error('[daily-ad-generator] AI generation error:', error);
    }
  }

  return ads;
}

// Helper: Adapt competitor ad for client
async function adaptCompetitorAd(supabase: any, client: ClientData, sourceAd: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const prompt = `
Adapte este anúncio do concorrente para o cliente:

ANÚNCIO ORIGINAL DO CONCORRENTE:
- Título: ${sourceAd.ad_title || 'N/A'}
- Copy: ${sourceAd.ad_copy || 'N/A'}
- CTA: ${sourceAd.call_to_action || 'N/A'}
- Tipo: ${sourceAd.ad_type || 'imagem'}

DADOS DO CLIENTE:
- Empresa: ${client.company}
- Produto: ${client.product_name || client.company}
- Setor: ${client.sector}
- Público-alvo: ${client.target_audience || 'não especificado'}
- Tom de voz: ${client.voice_tone || 'profissional'}
- Briefing: ${client.ai_briefing?.substring(0, 500) || 'não disponível'}

Crie um anúncio adaptado mantendo o CONCEITO mas usando a identidade do cliente.

IMPORTANTE: O campo "call_to_action" DEVE ser um destes valores exatos: ${VALID_FACEBOOK_CTAS.join(', ')}

Responda em JSON:
{
  "headline": "título chamativo e curto (máximo 40 caracteres)",
  "body": "texto principal do anúncio com 2-3 parágrafos persuasivos, explicando benefícios e criando urgência (125-250 caracteres idealmente)",
  "primary_text": "mesmo que body",
  "description": "descrição curta para link (máximo 30 caracteres)",
  "call_to_action": "CTA_VALIDO",
  "ad_type": "image|video|carousel",
  "concept_adapted": "descrição breve do conceito adaptado",
  "image_prompt": "prompt detalhado para gerar imagem do anúncio mantendo a identidade visual da marca"
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um especialista em criação de anúncios. Responda APENAS em JSON válido.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
      const adContent = JSON.parse(cleanJson);
      
      // Normalize CTA
      adContent.call_to_action = normalizeCTA(adContent.call_to_action);
      
      // Ensure body exists
      if (!adContent.body && adContent.primary_text) {
        adContent.body = adContent.primary_text;
      }
      
      return adContent;
    }
  } catch (error) {
    console.error('[daily-ad-generator] Error adapting competitor ad:', error);
  }

  // Fallback
  return {
    headline: `${client.product_name || client.company} - Transforme sua vida`,
    body: `Descubra como ${client.company} pode ajudar você a alcançar seus objetivos. Nossa solução foi desenvolvida pensando em você.`,
    primary_text: `Descubra como ${client.company} pode ajudar você a alcançar seus objetivos. Nossa solução foi desenvolvida pensando em você.`,
    description: client.company,
    call_to_action: 'LEARN_MORE',
    ad_type: 'image',
  };
}

// Helper: Build prompt for concept generation
function buildConceptPrompt(client: ClientData, insight: any): string {
  return `
Crie um anúncio ORIGINAL e CRIATIVO para:

CLIENTE:
- Empresa: ${client.company}
- Produto: ${client.product_name || client.company}
- Setor: ${client.sector}
- Público-alvo: ${client.target_audience || 'não especificado'}
- Tom de voz: ${client.voice_tone || 'profissional'}
- Briefing: ${client.ai_briefing?.substring(0, 500) || 'não disponível'}

${insight ? `
INSIGHT DE MERCADO PARA EXPLORAR:
- Tópico: ${insight.topic}
- Pain point: ${insight.pain_point || 'não especificado'}
- Oportunidade: ${insight.opportunity || 'não especificada'}
- Citações: ${JSON.stringify(insight.extracted_quotes || [])}
` : ''}

Crie um anúncio que:
1. Ataque diretamente uma dor do público
2. Apresente a solução de forma clara
3. Tenha um CTA forte
4. Tenha um BODY/PRIMARY_TEXT com pelo menos 2 parágrafos persuasivos

IMPORTANTE: O campo "call_to_action" DEVE ser um destes valores exatos: ${VALID_FACEBOOK_CTAS.join(', ')}

Responda em JSON:
{
  "headline": "título chamativo e curto (máximo 40 caracteres)",
  "body": "texto principal do anúncio com 2-3 parágrafos persuasivos, explicando benefícios e criando urgência (125-250 caracteres idealmente)",
  "primary_text": "mesmo que body",
  "description": "descrição curta para link (máximo 30 caracteres)",
  "call_to_action": "CTA_VALIDO",
  "ad_type": "image|video|carousel",
  "concept_explanation": "explicação breve do conceito",
  "target_emotion": "emoção alvo (medo, desejo, curiosidade, etc)",
  "image_prompt": "prompt detalhado para gerar imagem do anúncio mantendo a identidade visual da marca"
}`;
}

// Helper: Build prompt for iteration generation
function buildIterationPrompt(client: ClientData, winnerAd: any): string {
  return `
Crie uma VARIAÇÃO do seguinte anúncio vencedor:

ANÚNCIO VENCEDOR:
- Nome: ${winnerAd.ad_name}
- CTR: ${winnerAd.ctr}%
- Conversões: ${winnerAd.conversions}
- Dias rodando: ${winnerAd.days_running}

CLIENTE:
- Empresa: ${client.company}
- Produto: ${client.product_name || client.company}
- Tom de voz: ${client.voice_tone || 'profissional'}

Crie uma variação que:
1. Mantenha a essência que fez o anúncio funcionar
2. Teste um novo ângulo (headline diferente, abordagem diferente, etc)
3. Potencialmente escale ainda mais os resultados
4. Tenha um BODY/PRIMARY_TEXT com pelo menos 2 parágrafos persuasivos

Tipos de variação a considerar:
- Headline diferente
- Ângulo emocional diferente
- CTA mais forte
- Formato diferente (imagem vs carrossel)

IMPORTANTE: O campo "call_to_action" DEVE ser um destes valores exatos: ${VALID_FACEBOOK_CTAS.join(', ')}

Responda em JSON:
{
  "headline": "título chamativo e curto (máximo 40 caracteres)",
  "body": "texto principal do anúncio com 2-3 parágrafos persuasivos, explicando benefícios e criando urgência (125-250 caracteres idealmente)",
  "primary_text": "mesmo que body",
  "description": "descrição curta para link (máximo 30 caracteres)",
  "call_to_action": "CTA_VALIDO",
  "ad_type": "image|video|carousel",
  "variation_type": "tipo da variação (headline_test, emotion_test, cta_test, format_test)",
  "what_changed": "o que foi mudado e por quê",
  "image_prompt": "prompt detalhado para gerar imagem do anúncio"
}`;
}

// Helper: Generate AI clone ads when no competitor data exists
async function generateAICloneAds(supabase: any, client: ClientData, count: number): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const ads: any[] = [];

  for (let i = 0; i < count; i++) {
    const prompt = `
Crie um anúncio no estilo de grandes marcas do setor ${client.sector}:

CLIENTE:
- Empresa: ${client.company}
- Produto: ${client.product_name || client.company}
- Público-alvo: ${client.target_audience || 'não especificado'}
- Tom de voz: ${client.voice_tone || 'profissional'}
- Briefing: ${client.ai_briefing?.substring(0, 300) || 'não disponível'}

Inspire-se em estratégias de sucesso do mercado.

IMPORTANTE: O campo "call_to_action" DEVE ser um destes valores exatos: ${VALID_FACEBOOK_CTAS.join(', ')}

Responda em JSON:
{
  "headline": "título chamativo e curto (máximo 40 caracteres)",
  "body": "texto principal do anúncio com 2-3 parágrafos persuasivos (125-250 caracteres idealmente)",
  "primary_text": "mesmo que body",
  "description": "descrição curta para link (máximo 30 caracteres)",
  "call_to_action": "CTA_VALIDO",
  "ad_type": "image",
  "inspired_by": "tipo de estratégia (urgência, prova social, exclusividade, etc)",
  "image_prompt": "prompt detalhado para gerar imagem"
}`;

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é um especialista em marketing. Responda APENAS em JSON válido.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
        const adContent = JSON.parse(cleanJson);
        
        // Normalize CTA
        adContent.call_to_action = normalizeCTA(adContent.call_to_action);
        
        // Ensure body exists
        if (!adContent.body && adContent.primary_text) {
          adContent.body = adContent.primary_text;
        }
        
        // Generate creative image
        const creativeImageUrl = await generateCreativeImage(client, adContent);
        if (creativeImageUrl) {
          adContent.creative_image_url = creativeImageUrl;
        }
        
        ads.push({
          type: 'clone',
          content: adContent,
          concept_description: `Clone baseado em estratégias de sucesso: ${adContent.inspired_by}`,
          quality_score: 70,
        });
      }
    } catch (error) {
      console.error('[daily-ad-generator] Error generating AI clone:', error);
    }
  }

  return ads;
}

// Helper: Calculate next generation time
function getNextGenerationTime(generationTime: string): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [hours, minutes] = generationTime.split(':');
  tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return tomorrow.toISOString();
}
