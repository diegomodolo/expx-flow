import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreBreakdown {
  visual: number;
  copy: number;
  headline_cta: number;
  conformidade: number;
}

interface ScoreResult {
  overall_score: number;
  breakdown: ScoreBreakdown;
  explanation: string;
  flags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  try {
    const { ad_id } = await req.json();

    if (!ad_id) {
      throw new Error('ad_id is required');
    }

    console.log('[score-generated-ad] Scoring ad:', ad_id);

    // Fetch the ad from the queue
    const { data: ad, error: fetchError } = await supabase
      .from('ad_generation_queue')
      .select('*')
      .eq('id', ad_id)
      .single();

    if (fetchError || !ad) {
      console.error('[score-generated-ad] Ad not found:', fetchError);
      throw new Error('Ad not found');
    }

    const content = ad.generated_content as any;
    
    console.log('[score-generated-ad] Ad content:', {
      headline: content?.headline?.substring(0, 50),
      hasImage: !!content?.image_url,
      hasCta: !!content?.cta
    });

    // Build the scoring prompt
    const scoringPrompt = `Você é um especialista em anúncios do Meta (Facebook/Instagram) com profundo conhecimento das políticas e melhores práticas da plataforma.

Analise o seguinte anúncio e dê uma pontuação de 0 a 10 baseada nos critérios abaixo:

=== ANÚNCIO A AVALIAR ===
Headline: ${content?.headline || 'Não informado'}
Texto Principal (Body): ${content?.body || 'Não informado'}
Call to Action (CTA): ${content?.cta || 'Não informado'}
Conceito: ${ad.concept_description || content?.concept || 'Não informado'}
${content?.image_url ? `Imagem: ${content.image_url}` : 'Sem imagem gerada ainda'}

=== CRITÉRIOS DE AVALIAÇÃO ===

**FILTRO BINÁRIO (Nota 0 automática se violar):**
- Promessas enganosas (antes/depois agressivos, curas milagrosas, ganho fácil)
- Atributos pessoais negativos ("Você está gordo?", "Você é ansioso?")
- Botões falsos ou elementos enganosos

**1. VISUAL (Peso 40%)**
- Formato adequado para Meta Ads (3:4 ou 9:16)
- Imagem profissional e de alta qualidade
- Foco visual claro e único ponto focal
- Estética nativa (UGC ou design profissional limpo)
- Sem excesso de texto na imagem

**2. COPYWRITING (Peso 30%)**
- Gancho forte nas primeiras linhas (capta atenção antes do "ver mais")
- Clareza da oferta (entendível em 5 segundos)
- Foco em benefícios/transformação vs características do produto
- Linguagem persuasiva e apropriada ao público

**3. HEADLINE/CTA (Peso 20%)**
- Headline curta e impactante (4-5 palavras ideais)
- CTA congruente com a oferta
- Chamada para ação clara

**4. CONFORMIDADE TÉCNICA (Peso 10%)**
- Uso moderado de emojis
- Gramática e ortografia corretas
- Sem violação de políticas do Meta

=== ESCALA DE NOTAS ===
0: Viola políticas do Meta - risco de bloqueio
1-3: Baixa qualidade - imagem genérica, copy confusa, sem CTA
4-6: Funcional - segue regras mas não engaja, "chato"
7-8: Otimizado - mobile-first, copy com gancho, imagem de qualidade
9-10: Unicórnio - quebra de padrão visual, copy persuasiva, alinhamento perfeito

Responda usando a função score_ad.`;

    // Call Lovable AI with tool calling for structured output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: scoringPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'score_ad',
              description: 'Retorna a pontuação detalhada do anúncio',
              parameters: {
                type: 'object',
                properties: {
                  overall_score: {
                    type: 'number',
                    description: 'Nota final de 0 a 10 (pode ter decimal, ex: 7.5)'
                  },
                  breakdown: {
                    type: 'object',
                    properties: {
                      visual: { type: 'number', description: 'Nota de 0 a 10 para Visual' },
                      copy: { type: 'number', description: 'Nota de 0 a 10 para Copywriting' },
                      headline_cta: { type: 'number', description: 'Nota de 0 a 10 para Headline/CTA' },
                      conformidade: { type: 'number', description: 'Nota de 0 a 10 para Conformidade Técnica' }
                    },
                    required: ['visual', 'copy', 'headline_cta', 'conformidade']
                  },
                  explanation: {
                    type: 'string',
                    description: 'Explicação detalhada da nota em 2-3 frases, destacando pontos fortes e fracos'
                  },
                  flags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de alertas ou avisos sobre o anúncio (pode ser vazia)'
                  }
                },
                required: ['overall_score', 'breakdown', 'explanation', 'flags']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'score_ad' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[score-generated-ad] AI error:', errorText);
      throw new Error('Failed to get AI scoring');
    }

    const aiData = await response.json();
    console.log('[score-generated-ad] AI response:', JSON.stringify(aiData).substring(0, 500));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'score_ad') {
      console.error('[score-generated-ad] Invalid tool call response');
      throw new Error('Invalid AI response format');
    }

    const scoreResult: ScoreResult = JSON.parse(toolCall.function.arguments);
    console.log('[score-generated-ad] Score result:', scoreResult);

    // Normalize quality_score to fit NUMERIC(3,2) - max value 9.99
    const normalizedScore = Math.min(9.99, Math.max(0, scoreResult.overall_score));
    const roundedScore = Math.round(normalizedScore * 100) / 100;

    // Update the ad with scoring data
    const updatedContent = {
      ...content,
      score_breakdown: scoreResult.breakdown,
      score_explanation: scoreResult.explanation,
      score_flags: scoreResult.flags
    };

    const { error: updateError } = await supabase
      .from('ad_generation_queue')
      .update({
        quality_score: roundedScore,
        generated_content: updatedContent
      })
      .eq('id', ad_id);

    if (updateError) {
      console.error('[score-generated-ad] Update error:', updateError);
      throw new Error('Failed to update ad with score');
    }

    console.log('[score-generated-ad] Successfully scored ad:', ad_id, 'Score:', roundedScore);

    return new Response(
      JSON.stringify({
        success: true,
        ad_id,
        score: roundedScore,
        breakdown: scoreResult.breakdown,
        explanation: scoreResult.explanation,
        flags: scoreResult.flags
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[score-generated-ad] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
