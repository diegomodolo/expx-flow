import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId, configId } = await req.json();

    if (!itemId || !configId) {
      throw new Error('itemId e configId são obrigatórios');
    }

    console.log(`Generating post from RSS item: ${itemId}`);

    // Fetch the RSS item
    const { data: rssItem, error: itemError } = await supabase
      .from('instagram_autopost_rss_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !rssItem) {
      throw new Error(`Item RSS não encontrado: ${itemError?.message}`);
    }

    if (rssItem.post_generated) {
      throw new Error('Post já foi gerado para este item');
    }

    // Fetch the feed configuration
    const { data: feed, error: feedError } = await supabase
      .from('instagram_autopost_rss_feeds')
      .select('*')
      .eq('id', rssItem.feed_id)
      .single();

    if (feedError || !feed) {
      throw new Error(`Feed não encontrado: ${feedError?.message}`);
    }

    // Fetch the autopost configuration
    const { data: config, error: configError } = await supabase
      .from('instagram_autopost_configs')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError || !config) {
      throw new Error(`Configuração não encontrada: ${configError?.message}`);
    }

    // Fetch client data for context
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', config.client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
    }

    // Build the prompt with RSS item content
    const postType = feed.post_type || 'carousel';
    const slidesCount = feed.carousel_images || 5;

    let systemPrompt = `Você é um especialista em criar conteúdo para Instagram. 
Seu trabalho é transformar notícias e artigos em posts atraentes para Instagram.
${client?.voice_tone ? `Tom de voz: ${client.voice_tone}` : ''}
${client?.target_audience ? `Público-alvo: ${client.target_audience}` : ''}
${client?.product_name ? `Produto/Serviço: ${client.product_name}` : ''}
${config.persona ? `Persona: ${config.persona}` : ''}
${config.content_style ? `Estilo de conteúdo: ${config.content_style}` : ''}`;

    let userPrompt = '';
    
    if (postType === 'carousel') {
      userPrompt = `Transforme a seguinte notícia em um carrossel para Instagram com ${slidesCount} slides.

NOTÍCIA:
Título: ${rssItem.title}
${rssItem.description ? `Descrição: ${rssItem.description}` : ''}
Link original: ${rssItem.link}

INSTRUÇÕES:
1. Crie exatamente ${slidesCount} slides
2. Cada slide deve ter um texto curto e impactante
3. O primeiro slide deve chamar atenção (hook)
4. Os slides do meio desenvolvem o conteúdo
5. O último slide deve ter uma chamada para ação

Responda APENAS com um JSON válido no seguinte formato:
{
  "slides": [
    {"headline": "Texto do slide 1", "content": "Descrição breve opcional"},
    {"headline": "Texto do slide 2", "content": "Descrição breve opcional"}
  ],
  "caption": "Legenda para o post com hashtags relevantes"
}`;
    } else {
      userPrompt = `Transforme a seguinte notícia em um post de imagem única para Instagram.

NOTÍCIA:
Título: ${rssItem.title}
${rssItem.description ? `Descrição: ${rssItem.description}` : ''}
Link original: ${rssItem.link}

INSTRUÇÕES:
1. Crie um texto impactante para a imagem
2. Crie uma legenda engajadora com hashtags

Responda APENAS com um JSON válido no seguinte formato:
{
  "headline": "Texto principal para a imagem",
  "subheadline": "Texto secundário opcional",
  "caption": "Legenda para o post com hashtags relevantes"
}`;
    }

    // Call OpenAI to generate content
    console.log('Calling OpenAI to generate content...');
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const generatedText = openAIData.choices[0].message.content;

    console.log('Generated content:', generatedText);

    // Parse the generated content
    let parsedContent;
    try {
      // Extract JSON from markdown code block if present
      const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : generatedText.trim();
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parsing generated content:', parseError);
      throw new Error('Falha ao processar conteúdo gerado');
    }

    // Find the next available slot for this config
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingPosts } = await supabase
      .from('instagram_autopost_scheduled_posts')
      .select('scheduled_for')
      .eq('config_id', configId)
      .gte('scheduled_for', today.toISOString())
      .order('scheduled_for', { ascending: false })
      .limit(1);

    // Calculate next available date
    let scheduledDate = new Date();
    if (existingPosts && existingPosts.length > 0) {
      scheduledDate = new Date(existingPosts[0].scheduled_for);
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    scheduledDate.setHours(10, 0, 0, 0); // Default to 10 AM

    // Create the scheduled post
    const postData: any = {
      config_id: configId,
      scheduled_for: scheduledDate.toISOString(),
      post_type: postType,
      caption: parsedContent.caption || '',
      status: 'pending',
      rss_item_id: itemId,
    };

    if (postType === 'carousel' && parsedContent.slides) {
      postData.carousel_slides = parsedContent.slides;
    } else {
      postData.headline = parsedContent.headline || rssItem.title;
      postData.subheadline = parsedContent.subheadline || '';
    }

    const { data: createdPost, error: createError } = await supabase
      .from('instagram_autopost_scheduled_posts')
      .insert(postData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating post:', createError);
      throw new Error(`Erro ao criar post: ${createError.message}`);
    }

    // Mark the RSS item as generated
    await supabase
      .from('instagram_autopost_rss_items')
      .update({
        post_generated: true,
        generated_post_id: createdPost.id,
        generated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    console.log(`Post created successfully: ${createdPost.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        postId: createdPost.id,
        scheduledFor: scheduledDate.toISOString(),
        postType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-rss-post:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});