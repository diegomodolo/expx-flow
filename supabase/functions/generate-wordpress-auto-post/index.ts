import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getNowInBrasilia(): Date {
  const now = new Date();
  return new Date(now.getTime() + BRASILIA_OFFSET_MS);
}

function brasiliaToUTC(brasiliaDate: Date): Date {
  return new Date(brasiliaDate.getTime() - BRASILIA_OFFSET_MS);
}

function calculateNextPostTime(scheduledDays: number[], scheduledHours: number[], afterDate?: Date): Date {
  if (!scheduledDays.length || !scheduledHours.length) {
    throw new Error('No scheduled days or hours configured');
  }

  const nowBrasilia = afterDate ? new Date(afterDate.getTime() + BRASILIA_OFFSET_MS) : getNowInBrasilia();
  const currentDay = nowBrasilia.getDay();
  const currentHour = nowBrasilia.getHours();

  console.log(`Calculating next post after Brasília time: ${nowBrasilia.toISOString()}, day: ${currentDay}, hour: ${currentHour}`);

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

  throw new Error('Could not calculate next post time');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { configId, clientId, companyId } = await req.json();

    console.log('Generating WordPress auto post for config:', configId);

    if (!configId) {
      throw new Error('Config ID is required');
    }

    // Fetch config with optional client data
    const { data: config, error: configError } = await supabase
      .from('wordpress_auto_post_configs')
      .select(`
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
      `)
      .eq('id', configId)
      .single();

    if (configError || !config) {
      console.error('Error fetching config:', configError);
      throw new Error('Config not found');
    }

    const client = config.clients;
    const clientName = client?.name || config.name || 'Blog';
    const clientSector = client?.sector || 'Geral';
    const clientTargetAudience = client?.target_audience || 'Geral';

    console.log('Config loaded:', clientName, '| Has client:', !!client);

    // Find the last scheduled post to calculate next available slot
    const { data: existingPosts } = await supabase
      .from('wordpress_auto_posts')
      .select('scheduled_at')
      .eq('config_id', configId)
      .in('status', ['pending', 'publishing'])
      .order('scheduled_at', { ascending: false })
      .limit(1);

    let afterDate: Date | undefined;
    if (existingPosts && existingPosts.length > 0) {
      afterDate = new Date(existingPosts[0].scheduled_at);
      console.log('Last scheduled post at:', afterDate.toISOString());
    }

    const scheduledAt = calculateNextPostTime(config.scheduled_days, config.scheduled_hours, afterDate);
    console.log('Next post scheduled at:', scheduledAt.toISOString());

    // Generate article title with GPT
    console.log('Generating article title...');
    const titleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em SEO e criação de títulos para blogs.
Crie títulos que:
- São atraentes e geram cliques
- Contêm palavras-chave relevantes
- Têm entre 50-60 caracteres idealmente
- Usam números quando apropriado (ex: "7 Dicas para...")
- Prometem valor ao leitor`
          },
          {
            role: 'user',
            content: `Crie UM título de artigo de blog sobre:

BRIEFING: ${config.post_briefing}
SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

Responda APENAS com o título, sem aspas ou explicações.`
          }
        ],
        max_completion_tokens: 100
      }),
    });

    if (!titleResponse.ok) {
      throw new Error('Failed to generate title');
    }

    const titleData = await titleResponse.json();
    const title = titleData.choices[0].message.content.trim();
    console.log('Title generated:', title);

    // Generate article content with GPT
    console.log('Generating article content...');
    const contentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Você é um redator de blog profissional especializado em SEO.
Crie artigos que:
- Usam HTML semântico (h2, h3, p, ul, li, strong, em)
- Têm entre 800-1500 palavras
- Incluem introdução envolvente
- Dividem o conteúdo em seções com subtítulos (h2, h3)
- Usam listas quando apropriado
- Incluem call-to-action no final
- São otimizados para SEO
- Mantêm tom profissional mas acessível`
          },
          {
            role: 'user',
            content: `Escreva um artigo completo para blog:

TÍTULO: ${title}
BRIEFING: ${config.post_briefing}
SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

Responda APENAS com o HTML do artigo (sem tags html, head, body - apenas o conteúdo).
NÃO inclua o título no conteúdo (h1), ele será inserido separadamente.`
          }
        ],
        max_completion_tokens: 4000
      }),
    });

    if (!contentResponse.ok) {
      throw new Error('Failed to generate content');
    }

    const contentData = await contentResponse.json();
    const content = contentData.choices[0].message.content.trim();
    console.log('Content generated, length:', content.length);

    // Generate excerpt and meta description
    console.log('Generating excerpt and meta description...');
    const metaResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em SEO. Crie resumos e meta descriptions otimizados.'
          },
          {
            role: 'user',
            content: `Com base neste artigo, crie:

TÍTULO: ${title}
RESUMO DO CONTEÚDO: ${content.substring(0, 500)}...

Responda em JSON com:
{
  "excerpt": "resumo de 150-200 caracteres para preview do post",
  "meta_description": "meta description de 150-160 caracteres otimizada para SEO"
}

Responda APENAS com o JSON válido.`
          }
        ],
        max_completion_tokens: 300
      }),
    });

    let excerpt = '';
    let metaDescription = '';

    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      try {
        const metaContent = metaData.choices[0].message.content.trim();
        const metaJson = JSON.parse(metaContent);
        excerpt = metaJson.excerpt || '';
        metaDescription = metaJson.meta_description || '';
      } catch (e) {
        console.warn('Failed to parse meta JSON, using defaults');
      }
    }

    // Generate featured image with Gemini
    console.log('Generating featured image...');
    
    const imagePromptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em direção de arte para blogs.
Crie prompts para imagens de destaque de artigos:
- Formato horizontal 16:9 para blogs
- Imagens profissionais e modernas
- Sem texto na imagem
- Cores vibrantes mas profissionais
- Relacionadas ao tema do artigo`
          },
          {
            role: 'user',
            content: `Crie um prompt em INGLÊS para gerar uma imagem de destaque para este artigo:

TÍTULO: ${title}
SETOR: ${clientSector}

Responda APENAS com o prompt em inglês.`
          }
        ],
        max_completion_tokens: 200
      }),
    });

    let imageUrl = '';

    if (imagePromptResponse.ok) {
      const promptData = await imagePromptResponse.json();
      const imagePrompt = promptData.choices[0].message.content.trim();
      console.log('Image prompt:', imagePrompt.substring(0, 100) + '...');

      const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [
            {
              role: 'user',
              content: `Generate a horizontal 16:9 blog featured image.

${imagePrompt}

Professional, modern, no text in the image. Return image only.`
            }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const base64Url = geminiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (base64Url && base64Url.startsWith('data:image/')) {
          const matches = base64Url.match(/^data:image\/(\w+);base64,(.+)$/);
          if (matches) {
            const extension = matches[1] || 'png';
            const base64Data = matches[2];
            const fileName = `wordpress-auto-posts/${configId}/${Date.now()}.${extension}`;

            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const { error: uploadError } = await supabase.storage
              .from('ai-generated-images')
              .upload(fileName, bytes, {
                contentType: `image/${extension}`,
                upsert: true
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('ai-generated-images')
                .getPublicUrl(fileName);
              imageUrl = urlData.publicUrl;
              console.log('Image uploaded:', imageUrl);
            }
          }
        }
      }
    }

    // Save to wordpress_auto_posts
    const { data: newPost, error: postError } = await supabase
      .from('wordpress_auto_posts')
      .insert({
        config_id: configId,
        client_id: clientId || config.client_id,
        company_id: companyId || config.company_id,
        title: title,
        content: content,
        featured_image_url: imageUrl,
        excerpt: excerpt,
        meta_description: metaDescription,
        status: 'pending',
        scheduled_at: scheduledAt.toISOString()
      })
      .select()
      .single();

    if (postError) {
      console.error('Error saving post:', postError);
      throw new Error('Failed to save post');
    }

    console.log('Post saved with ID:', newPost.id);

    // Update next_post_at in config
    await supabase
      .from('wordpress_auto_post_configs')
      .update({ next_post_at: scheduledAt.toISOString() })
      .eq('id', configId);

    return new Response(
      JSON.stringify({
        success: true,
        post: newPost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating WordPress post:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate post'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
