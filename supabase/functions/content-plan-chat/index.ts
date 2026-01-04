import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, clientId, companyId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build comprehensive client context
    let clientContext = '';

    if (clientId) {
      // 1. Fetch client data
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (client) {
        clientContext += `
## DADOS DO CLIENTE
- Nome: ${client.name}
- Empresa: ${client.company}
- Setor: ${client.sector}
- Orçamento Mensal: R$ ${client.monthly_budget || 'Não definido'}
- Público-Alvo: ${client.target_audience || 'Não definido'}
- Produto/Serviço: ${client.product_name || 'Não definido'}
- Tom de Voz: ${client.voice_tone || 'Não definido'}
- Objetivos: ${client.objectives || 'Não definidos'}
- Plataformas Preferidas: ${client.preferred_platforms?.join(', ') || 'Não definidas'}
- Website: ${client.website_url || 'Não definido'}

### Briefing Completo:
${client.ai_briefing || 'Sem briefing configurado'}
`;
      }

      // 2. Fetch active campaigns with performance data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('spend', { ascending: false })
        .limit(10);

      if (campaigns && campaigns.length > 0) {
        clientContext += `
## CAMPANHAS ATIVAS (Últimas 10 por investimento)
`;
        campaigns.forEach((camp, i) => {
          clientContext += `
### ${i + 1}. ${camp.name}
- Status: ${camp.status}
- Objetivo: ${camp.objective || 'N/A'}
- Investimento: R$ ${camp.spend?.toFixed(2) || '0'}
- Impressões: ${camp.impressions?.toLocaleString() || '0'}
- Cliques: ${camp.clicks?.toLocaleString() || '0'}
- CTR: ${camp.ctr?.toFixed(2) || '0'}%
- CPC: R$ ${camp.cpc?.toFixed(2) || '0'}
- Conversões: ${camp.conversions || '0'}
- CPA: R$ ${camp.cpa?.toFixed(2) || 'N/A'}
`;
        });
      }

      // 3. Fetch top performing ads (last 30 days)
      const { data: topAds } = await supabase
        .from('ads')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('conversions', { ascending: false })
        .limit(5);

      if (topAds && topAds.length > 0) {
        clientContext += `
## TOP 5 CRIATIVOS COM MELHOR PERFORMANCE (por conversões)
`;
        topAds.forEach((ad, i) => {
          clientContext += `
### ${i + 1}. ${ad.name}
- Tipo: ${ad.creative_type || 'N/A'}
- Status: ${ad.status}
- Texto Principal: ${ad.creative_body?.substring(0, 200) || 'N/A'}${ad.creative_body && ad.creative_body.length > 200 ? '...' : ''}
- Título: ${ad.creative_title || 'N/A'}
- Descrição: ${ad.creative_description || 'N/A'}
- CTA: ${ad.call_to_action || 'N/A'}
- Link: ${ad.link_url || 'N/A'}
- Investimento: R$ ${ad.spend?.toFixed(2) || '0'}
- Impressões: ${ad.impressions?.toLocaleString() || '0'}
- Cliques: ${ad.clicks?.toLocaleString() || '0'}
- CTR: ${ad.ctr?.toFixed(2) || '0'}%
- Conversões: ${ad.conversions || '0'}
- CPA: R$ ${ad.cpa?.toFixed(2) || 'N/A'}
- Ranking de Qualidade: ${ad.quality_ranking || 'N/A'}
- Likes: ${ad.likes || '0'} | Comentários: ${ad.comments || '0'} | Compartilhamentos: ${ad.shares || '0'}
`;
        });
      }

      // 4. Fetch top ads by CTR
      const { data: topCtrAds } = await supabase
        .from('ads')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .gt('impressions', 100)
        .order('ctr', { ascending: false })
        .limit(5);

      if (topCtrAds && topCtrAds.length > 0) {
        clientContext += `
## TOP 5 CRIATIVOS POR CTR (Taxa de Clique)
`;
        topCtrAds.forEach((ad, i) => {
          clientContext += `
### ${i + 1}. ${ad.name} - CTR: ${ad.ctr?.toFixed(2)}%
- Texto: ${ad.creative_body?.substring(0, 150) || 'N/A'}${ad.creative_body && ad.creative_body.length > 150 ? '...' : ''}
- Título: ${ad.creative_title || 'N/A'}
- Cliques: ${ad.clicks?.toLocaleString() || '0'}
- Conversões: ${ad.conversions || '0'}
`;
        });
      }

      // 5. Fetch top ads by engagement (likes + comments + shares)
      const { data: engagementAds } = await supabase
        .from('ads')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('likes', { ascending: false })
        .limit(5);

      if (engagementAds && engagementAds.length > 0) {
        clientContext += `
## TOP 5 CRIATIVOS POR ENGAJAMENTO
`;
        engagementAds.forEach((ad, i) => {
          const totalEngagement = (ad.likes || 0) + (ad.comments || 0) + (ad.shares || 0);
          clientContext += `
### ${i + 1}. ${ad.name} - Total: ${totalEngagement} interações
- Likes: ${ad.likes || '0'} | Comentários: ${ad.comments || '0'} | Compartilhamentos: ${ad.shares || '0'}
- Texto: ${ad.creative_body?.substring(0, 150) || 'N/A'}${ad.creative_body && ad.creative_body.length > 150 ? '...' : ''}
`;
        });
      }

      // 6. Fetch themes from creative_generation_queue
      const { data: themes } = await supabase
        .from('creative_generation_queue')
        .select('theme')
        .eq('client_id', clientId)
        .not('theme', 'is', null)
        .limit(50);

      if (themes && themes.length > 0) {
        const uniqueThemes = [...new Set(themes.map(t => t.theme).filter(Boolean))];
        if (uniqueThemes.length > 0) {
          clientContext += `
## TEMAS CADASTRADOS PARA CRIATIVOS
${uniqueThemes.map((theme, i) => `${i + 1}. ${theme}`).join('\n')}
`;
        }
      }

      // 7. Fetch themes from visual_creatives
      const { data: visualThemes } = await supabase
        .from('visual_creatives')
        .select('theme, title, objective')
        .eq('client_id', clientId)
        .not('theme', 'is', null)
        .limit(50);

      if (visualThemes && visualThemes.length > 0) {
        const uniqueVisualThemes = [...new Set(visualThemes.map(t => t.theme).filter(Boolean))];
        if (uniqueVisualThemes.length > 0) {
          clientContext += `
## TEMAS DE CRIATIVOS VISUAIS
${uniqueVisualThemes.map((theme, i) => `${i + 1}. ${theme}`).join('\n')}
`;
        }
      }

      // 8. Fetch recent scheduled posts performance
      const { data: recentPosts } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(10);

      if (recentPosts && recentPosts.length > 0) {
        clientContext += `
## ÚLTIMOS 10 POSTS PUBLICADOS
`;
        recentPosts.forEach((post, i) => {
          clientContext += `
### ${i + 1}. Publicado em: ${new Date(post.published_at).toLocaleDateString('pt-BR')}
- Tipo: ${post.content_type || 'N/A'}
- Plataformas: ${post.platforms?.join(', ') || 'N/A'}
- Legenda: ${post.caption?.substring(0, 200) || 'N/A'}${post.caption && post.caption.length > 200 ? '...' : ''}
`;
        });
      }

      // 9. Fetch Instagram auto posts
      const { data: instaPosts } = await supabase
        .from('instagram_auto_posts')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(10);

      if (instaPosts && instaPosts.length > 0) {
        clientContext += `
## ÚLTIMOS 10 POSTS AUTOMÁTICOS DO INSTAGRAM
`;
        instaPosts.forEach((post, i) => {
          clientContext += `
### ${i + 1}. Publicado em: ${new Date(post.published_at).toLocaleDateString('pt-BR')}
- Tipo: ${post.post_type || 'N/A'}
- Legenda: ${post.caption?.substring(0, 200) || 'N/A'}${post.caption && post.caption.length > 200 ? '...' : ''}
`;
        });
      }

      // 10. Calculate overall performance metrics
      const { data: allAds } = await supabase
        .from('ads')
        .select('spend, impressions, clicks, conversions, cpa, ctr')
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (allAds && allAds.length > 0) {
        const totalSpend = allAds.reduce((sum, ad) => sum + (ad.spend || 0), 0);
        const totalImpressions = allAds.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
        const totalClicks = allAds.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
        const totalConversions = allAds.reduce((sum, ad) => sum + (ad.conversions || 0), 0);
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

        clientContext += `
## RESUMO DE PERFORMANCE GERAL
- Total Investido: R$ ${totalSpend.toFixed(2)}
- Total de Impressões: ${totalImpressions.toLocaleString()}
- Total de Cliques: ${totalClicks.toLocaleString()}
- Total de Conversões: ${totalConversions.toLocaleString()}
- CTR Médio: ${avgCtr.toFixed(2)}%
- CPA Médio: R$ ${avgCpa.toFixed(2)}
- Total de Anúncios Ativos: ${allAds.length}
`;
      }
    }

    // Build system prompt with all context
    const systemPrompt = `Você é um assistente de copywriting e estratégia de marketing digital especializado em criar conteúdo para redes sociais.

${clientContext}

## SUAS CAPACIDADES
Você tem acesso a todos os dados do cliente acima e pode:
1. Analisar quais criativos estão performando melhor (por conversões, CTR, engajamento)
2. Identificar padrões em textos e temas que geram mais resultados
3. Sugerir novos conteúdos baseados no que funciona
4. Recomendar melhorias baseadas nos dados de performance
5. Consultar os temas cadastrados para sugestões alinhadas
6. Analisar o histórico de posts e campanhas

## INSTRUÇÕES
- Seja criativo e estratégico nas suas sugestões
- Use linguagem adequada para redes sociais
- Baseie suas recomendações nos dados de performance quando disponíveis
- Inclua hashtags relevantes quando apropriado
- Forneça opções variadas quando solicitado
- Considere o tom de voz e público-alvo do cliente
- Responda em português brasileiro
- Quando perguntado sobre performance, cite dados específicos dos criativos
- Sugira temas baseados no que já foi cadastrado e no que performa bem`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: formattedMessages,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido, tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos esgotados, adicione mais créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ content: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in content-plan-chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
