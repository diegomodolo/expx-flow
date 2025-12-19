import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { presentationId, clientId, companyId } = await req.json();

    if (!presentationId || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch presentation
    const { data: presentation, error: presError } = await supabase
      .from('campaign_presentations')
      .select('*')
      .eq('id', presentationId)
      .single();

    if (presError || !presentation) {
      console.error('Error fetching presentation:', presError);
      return new Response(
        JSON.stringify({ error: 'Presentation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch campaigns for the client
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', clientId)
      .order('spend', { ascending: false });

    if (campError) {
      console.error('Error fetching campaigns:', campError);
    }

    // Fetch top performing ads
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('*, campaigns!ads_campaign_id_fkey(name)')
      .eq('client_id', clientId)
      .order('conversions', { ascending: false })
      .limit(10);

    if (adsError) {
      console.error('Error fetching ads:', adsError);
    }

    // Calculate metrics snapshot
    const totalSpend = campaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
    const totalImpressions = campaigns?.reduce((sum, c) => sum + (c.impressions || 0), 0) || 0;
    const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
    const totalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

    const metricsSnapshot = {
      total_spend: totalSpend,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      avg_ctr: avgCtr,
      avg_cpc: avgCpc,
      avg_cpa: avgCpa,
      campaigns: campaigns?.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        spend: c.spend || 0,
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        conversions: c.conversions || 0,
        ctr: c.ctr || 0,
        cpc: c.cpc || 0,
        cpa: c.cpa || 0,
      })) || [],
      top_ads: ads?.map(a => ({
        id: a.id,
        name: a.name,
        campaign_name: (a.campaigns as any)?.name || '',
        image_url: a.image_url,
        video_url: a.video_url,
        creative_type: a.creative_type,
        creative_body: a.creative_body,
        spend: a.spend || 0,
        impressions: a.impressions || 0,
        clicks: a.clicks || 0,
        conversions: a.conversions || 0,
        ctr: a.ctr || 0,
      })) || [],
    };

    let executiveSummary = '';
    let actionPlan = '';
    let campaignAnalyses: any[] = [];

    // Generate AI analysis if OpenAI key is available
    if (openaiApiKey) {
      console.log('Generating AI analysis...');

      const campaignsSummary = campaigns?.slice(0, 10).map(c => 
        `- ${c.name}: R$${(c.spend || 0).toFixed(2)} investido, ${c.conversions || 0} conversões, CTR ${(c.ctr || 0).toFixed(2)}%, CPA R$${(c.cpa || 0).toFixed(2)}`
      ).join('\n') || 'Nenhuma campanha encontrada';

      const prompt = `Você é um especialista em marketing digital analisando resultados de campanhas para um cliente.

IMPORTANTE: Sua análise deve ser SEMPRE POSITIVA e CONSTRUTIVA. Nunca use linguagem negativa ou que possa ser usada contra a agência. Destaque os pontos fortes e apresente oportunidades de melhoria de forma otimista.

Dados do período:
- Investimento total: R$${totalSpend.toFixed(2)}
- Total de conversões: ${totalConversions}
- CTR médio: ${avgCtr.toFixed(2)}%
- CPC médio: R$${avgCpc.toFixed(2)}
- CPA médio: R$${avgCpa.toFixed(2)}

Campanhas:
${campaignsSummary}

Gere uma resposta em JSON com exatamente este formato:
{
  "executive_summary": "Um resumo executivo positivo de 2-3 parágrafos destacando os principais resultados e conquistas do período. Use linguagem profissional e otimista.",
  "action_plan": "Um plano de ação para o próximo período com 3-5 iniciativas estratégicas para potencializar ainda mais os resultados. Cada item deve ser apresentado de forma construtiva.",
  "campaign_analyses": [
    {
      "campaign_id": "ID_DA_CAMPANHA",
      "campaign_name": "NOME_DA_CAMPANHA",
      "highlights": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
      "opportunities": ["Oportunidade de melhoria 1", "Oportunidade 2"]
    }
  ]
}

Para cada campanha com conversões, inclua uma análise. Os highlights devem ser conquistas reais baseadas nos dados. As opportunities devem ser apresentadas de forma positiva como "oportunidades de potencializar" e nunca como "problemas" ou "falhas".`;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Você é um analista de marketing digital positivo e estratégico. Sempre apresente resultados de forma otimista e profissional, destacando conquistas e oportunidades de crescimento.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            response_format: { type: "json_object" }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          
          if (content) {
            try {
              const parsed = JSON.parse(content);
              executiveSummary = parsed.executive_summary || '';
              actionPlan = parsed.action_plan || '';
              campaignAnalyses = parsed.campaign_analyses || [];
              console.log('AI analysis generated successfully');
            } catch (parseError) {
              console.error('Error parsing AI response:', parseError);
            }
          }
        } else {
          console.error('OpenAI API error:', await response.text());
        }
      } catch (aiError) {
        console.error('Error calling OpenAI:', aiError);
      }
    } else {
      console.log('OpenAI API key not configured, skipping AI analysis');
      
      // Generate basic analysis without AI
      executiveSummary = `No período analisado, investimos R$${totalSpend.toFixed(2)} em campanhas de tráfego pago, alcançando ${totalConversions} conversões. O CTR médio ficou em ${avgCtr.toFixed(2)}%, demonstrando boa relevância dos anúncios para o público-alvo.`;
      
      actionPlan = `Para o próximo período, recomendamos:\n1. Manter investimento nas campanhas de melhor performance\n2. Testar novos criativos baseados nos que tiveram melhor resultado\n3. Expandir alcance para públicos similares aos convertidos\n4. Otimizar landing pages para aumentar taxa de conversão`;
      
      campaignAnalyses = campaigns?.slice(0, 5).map(c => ({
        campaign_id: c.id,
        campaign_name: c.name,
        highlights: [
          c.conversions > 0 ? `Gerou ${c.conversions} conversões no período` : 'Campanha em fase de aprendizado',
          c.ctr > 1 ? `CTR acima da média do mercado (${c.ctr.toFixed(2)}%)` : 'Alcance consistente do público-alvo',
          `Investimento de R$${(c.spend || 0).toFixed(2)} aplicado de forma estratégica`
        ],
        opportunities: [
          'Potencial para expandir o público-alvo',
          'Oportunidade de testar novos formatos de criativo'
        ]
      })) || [];
    }

    // Update presentation with metrics and AI analysis
    const { error: updateError } = await supabase
      .from('campaign_presentations')
      .update({
        metrics_snapshot: metricsSnapshot,
        executive_summary: executiveSummary,
        action_plan: actionPlan,
        campaign_analyses: campaignAnalyses,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', presentationId);

    if (updateError) {
      console.error('Error updating presentation:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update presentation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Presentation analysis generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Analysis generated successfully',
        hasAI: !!openaiApiKey
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-campaign-presentation-analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
