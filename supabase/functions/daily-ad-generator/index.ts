import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('[daily-ad-generator] Client not found:', clientError);
      throw new Error('Client not found');
    }

    console.log('[daily-ad-generator] Client data loaded:', client.name);

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

    // Generate based on type or all types
    if (!generation_type || generation_type === 'clone') {
      const clones = await generateCloneAds(supabase, client, cloneCount);
      generatedAds.push(...clones);
    }

    if (!generation_type || generation_type === 'concept') {
      const concepts = await generateConceptAds(supabase, client, conceptCount);
      generatedAds.push(...concepts);
    }

    if (!generation_type || generation_type === 'iteration') {
      const iterations = await generateIterationAds(supabase, client, iterationCount);
      generatedAds.push(...iterations);
    }

    // Insert all generated ads into the queue
    if (generatedAds.length > 0) {
      const adsToInsert = generatedAds.map(ad => ({
        client_id,
        company_id,
        user_id,
        generation_type: ad.type,
        source_ad_id: ad.source_ad_id || null,
        source_competitor_id: ad.source_competitor_id || null,
        generated_content: ad.content,
        concept_description: ad.concept_description || null,
        research_sources: ad.research_sources || null,
        quality_score: ad.quality_score || null,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      }));

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

// Generate clone ads from competitor winning ads
async function generateCloneAds(supabase: any, client: ClientData, count: number): Promise<any[]> {
  if (count <= 0) return [];

  console.log('[daily-ad-generator] Generating', count, 'clone ads');

  // Fetch competitor ads that have been running for 30+ days (winners)
  const { data: competitorAds } = await supabase
    .from('competitor_ads')
    .select('*, competitors(name, company_name)')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .order('date_spotted', { ascending: true })
    .limit(count * 2); // Get more than needed to have variety

  if (!competitorAds || competitorAds.length === 0) {
    console.log('[daily-ad-generator] No competitor ads found, generating placeholder clones');
    // Generate placeholder clone concepts
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
    
    ads.push({
      type: 'clone',
      source_ad_id: sourceAd.id,
      source_competitor_id: sourceAd.competitor_id,
      content: adaptedAd,
      concept_description: `Clone do anúncio do concorrente ${sourceAd.competitors?.company_name || 'desconhecido'}. Conceito original: ${sourceAd.ad_title || sourceAd.ad_copy?.substring(0, 100)}`,
      quality_score: 0.75,
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

  // Use AI to generate new concepts
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
          // Clean JSON from markdown if present
          const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
          const adContent = JSON.parse(cleanJson);
          
          ads.push({
            type: 'concept',
            content: adContent,
            concept_description: adContent.concept_explanation || `Conceito baseado em pesquisa de mercado: ${insight?.topic || 'análise geral'}`,
            research_sources: insight ? [insight] : null,
            quality_score: 0.8,
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
          
          ads.push({
            type: 'iteration',
            source_ad_id: sourceAd.ad_id,
            content: adContent,
            concept_description: `Iteração do anúncio vencedor: ${sourceAd.ad_name}. Variação: ${adContent.variation_type || 'otimização'}`,
            quality_score: 0.85,
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

Responda em JSON:
{
  "headline": "...",
  "primary_text": "...",
  "description": "...",
  "call_to_action": "...",
  "ad_type": "image|video|carousel",
  "concept_adapted": "descrição breve do conceito adaptado",
  "image_prompt": "prompt para gerar imagem do anúncio"
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
      return JSON.parse(cleanJson);
    }
  } catch (error) {
    console.error('[daily-ad-generator] Error adapting competitor ad:', error);
  }

  // Fallback
  return {
    headline: `${client.product_name || client.company} - Transforme sua vida`,
    primary_text: sourceAd.ad_copy || 'Descubra como podemos ajudar você.',
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

Responda em JSON:
{
  "headline": "...",
  "primary_text": "...",
  "description": "...",
  "call_to_action": "...",
  "ad_type": "image|video|carousel",
  "concept_explanation": "explicação breve do conceito",
  "target_emotion": "emoção alvo (medo, desejo, curiosidade, etc)",
  "image_prompt": "prompt para gerar imagem do anúncio"
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

Tipos de variação a considerar:
- Headline diferente
- Ângulo emocional diferente
- CTA mais forte
- Formato diferente (imagem vs carrossel)

Responda em JSON:
{
  "headline": "...",
  "primary_text": "...",
  "description": "...",
  "call_to_action": "...",
  "ad_type": "image|video|carousel",
  "variation_type": "tipo da variação (headline_test, emotion_test, cta_test, format_test)",
  "what_changed": "o que foi mudado e por quê",
  "image_prompt": "prompt para gerar imagem do anúncio"
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

Responda em JSON:
{
  "headline": "...",
  "primary_text": "...",
  "description": "...",
  "call_to_action": "...",
  "ad_type": "image",
  "inspired_by": "tipo de estratégia (urgência, prova social, exclusividade, etc)",
  "image_prompt": "prompt para gerar imagem"
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
        
        ads.push({
          type: 'clone',
          content: adContent,
          concept_description: `Clone baseado em estratégias de sucesso: ${adContent.inspired_by}`,
          quality_score: 0.7,
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
