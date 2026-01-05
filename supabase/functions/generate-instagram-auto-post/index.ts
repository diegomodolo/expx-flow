import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Brasília timezone offset (UTC-3)
const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get current time in Brasília
function getNowInBrasilia(): Date {
  const now = new Date();
  return new Date(now.getTime() + BRASILIA_OFFSET_MS);
}

// Helper to convert Brasília time to UTC for storage
function brasiliaToUTC(brasiliaDate: Date): Date {
  return new Date(brasiliaDate.getTime() - BRASILIA_OFFSET_MS);
}

// Interface for schedule slot
interface ScheduleSlot {
  id: string;
  config_id: string;
  day_of_week: number;
  hour: number;
  post_type: 'single' | 'carousel';
  carousel_images: number;
  is_enabled: boolean;
}

// Helper function to find next available slot from schedule slots table
async function findNextScheduleSlot(configId: string, afterDate?: Date): Promise<{ scheduledAt: Date; slot: ScheduleSlot }> {
  // Fetch all enabled slots for this config
  const { data: slots, error } = await supabase
    .from('instagram_auto_post_schedules')
    .select('*')
    .eq('config_id', configId)
    .eq('is_enabled', true)
    .order('day_of_week')
    .order('hour');

  if (error || !slots || slots.length === 0) {
    throw new Error('No schedule slots configured for this automation');
  }

  const nowBrasilia = afterDate ? new Date(afterDate.getTime() + BRASILIA_OFFSET_MS) : getNowInBrasilia();
  const currentDay = nowBrasilia.getDay();
  const currentHour = nowBrasilia.getHours();

  console.log(`Finding next slot after Brasília time: ${nowBrasilia.toISOString()}, day: ${currentDay}, hour: ${currentHour}`);

  // Group slots by day for easier lookup
  const slotsByDay = slots.reduce((acc: Record<number, ScheduleSlot[]>, slot: ScheduleSlot) => {
    if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {});

  // Sort slots within each day by hour
  Object.values(slotsByDay).forEach((daySlots: ScheduleSlot[]) => {
    daySlots.sort((a, b) => a.hour - b.hour);
  });

  // Check today's remaining slots
  if (slotsByDay[currentDay]) {
    for (const slot of slotsByDay[currentDay]) {
      if (slot.hour > currentHour) {
        const nextPost = new Date(nowBrasilia);
        nextPost.setHours(slot.hour, 0, 0, 0);
        console.log(`Next slot found today: ${nextPost.toISOString()}, type: ${slot.post_type}`);
        return { scheduledAt: brasiliaToUTC(nextPost), slot };
      }
    }
  }

  // Check next 7 days
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const futureDay = (currentDay + daysAhead) % 7;
    if (slotsByDay[futureDay] && slotsByDay[futureDay].length > 0) {
      const firstSlot = slotsByDay[futureDay][0];
      const nextPost = new Date(nowBrasilia);
      nextPost.setDate(nowBrasilia.getDate() + daysAhead);
      nextPost.setHours(firstSlot.hour, 0, 0, 0);
      console.log(`Next slot found in ${daysAhead} days: ${nextPost.toISOString()}, type: ${firstSlot.post_type}`);
      return { scheduledAt: brasiliaToUTC(nextPost), slot: firstSlot };
    }
  }

  throw new Error('Could not find next available schedule slot');
}

// Legacy function for backwards compatibility (deprecated, but kept for fallback)
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

// Helper function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate a single image with Gemini (with retry logic)
async function generateSingleImage(
  imagePrompt: string,
  referenceImages: string[],
  scheduledDateFormatted: string,
  config: any,
  clientSector: string,
  clientTargetAudience: string,
  slideNumber?: number,
  totalSlides?: number,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const messageContent: any[] = [];
      
      for (const refImageUrl of referenceImages) {
        messageContent.push({
          type: 'image_url',
          image_url: { url: refImageUrl }
        });
      }
      
      const slideContext = slideNumber && totalSlides 
        ? `\n\nThis is SLIDE ${slideNumber} of ${totalSlides} in a carousel. Make sure it connects visually with other slides while having its own distinct focus.`
        : '';
      
      const geminiPrompt = `Generate a vertical 3:4 Instagram feed image (1080x1350 pixels).

${imagePrompt}${slideContext}

IMPORTANT - SCHEDULED POST DATE: ${scheduledDateFormatted}
If the image should contain a date (as indicated in the prompt), use EXACTLY this date: ${scheduledDateFormatted}

${referenceImages.length > 0 ? `CRITICAL - REFERENCE IMAGES PROVIDED (YOU MUST FOLLOW THESE):
I have provided ${referenceImages.length} reference image(s) above. You MUST:

1. ANALYZE each reference image carefully before generating
2. CREATE A VISUAL VARIATION that maintains the SAME aesthetic identity:
   - Use the EXACT SAME color palette (same hues, saturation, tones)
   - Match the typography style if text is present (same font weight, style)
   - Replicate the composition style (layout, spacing, visual hierarchy)
   - Keep the same background treatment (gradients, textures, patterns)
   - Match the overall mood and atmosphere
3. The generated image should look like it was created by the SAME designer/brand
4. Think of this as creating "another image from the same campaign"
5. DO NOT deviate from the visual identity established in the reference images

The goal is consistency: someone looking at the reference and generated image should immediately recognize they belong to the same visual family.` : ''}

Generate the image now. Return image only.`;

      messageContent.push({
        type: 'text',
        text: geminiPrompt
      });

      console.log(`Image generation attempt ${attempt}/${maxRetries} for slide ${slideNumber || 1}...`);

      const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{ role: 'user', content: messageContent }],
          modalities: ['image', 'text']
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error(`Gemini error on attempt ${attempt}:`, errorText);
        
        // If rate limited (429), wait longer before retry
        if (geminiResponse.status === 429) {
          console.log('Rate limited, waiting 5 seconds before retry...');
          await delay(5000);
        }
        
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      
      // Log full response for debugging
      console.log(`Gemini response for slide ${slideNumber || 1}:`, JSON.stringify({
        hasChoices: !!geminiData?.choices,
        choicesLength: geminiData?.choices?.length,
        hasMessage: !!geminiData?.choices?.[0]?.message,
        hasImages: !!geminiData?.choices?.[0]?.message?.images,
        imagesLength: geminiData?.choices?.[0]?.message?.images?.length,
        textContent: geminiData?.choices?.[0]?.message?.content?.substring?.(0, 100)
      }));
      
      const base64Url = geminiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;

      if (!base64Url) {
        // Log what we got instead
        console.error(`No image in response. Full structure:`, JSON.stringify(geminiData).substring(0, 500));
        throw new Error('No image generated from Gemini');
      }

      console.log(`Image for slide ${slideNumber || 1} generated successfully on attempt ${attempt}`);
      return base64Url;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt}/${maxRetries} failed for slide ${slideNumber || 1}:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff: 2s, 4s, 8s)
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }
  
  throw lastError || new Error('Failed to generate image after all retries');
}

// Upload base64 image to storage
async function uploadImageToStorage(base64Url: string, configId: string, index?: number): Promise<string> {
  const matches = base64Url.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Failed to parse base64 image data');
  }

  const extension = matches[1] || 'png';
  const base64Data = matches[2];
  const suffix = index !== undefined ? `_${index}` : '';
  const fileName = `instagram-auto-posts/${configId}/${Date.now()}${suffix}.${extension}`;

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

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    throw new Error('Failed to upload generated image');
  }

  const { data: urlData } = supabase.storage
    .from('ai-generated-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { configId, rssItemId, overridePostType, overrideCarouselImages } = await req.json();

    console.log('Generating Instagram auto post for config:', configId);

    if (!configId) {
      throw new Error('Config ID is required');
    }

    const { data: config, error: configError } = await supabase
      .from('instagram_auto_post_configs')
      .select(`
        *,
        clients (
          id,
          name,
          sector,
          ai_briefing,
          target_audience,
          ai_reference_image_1,
          ai_reference_image_2,
          ai_reference_image_3
        )
      `)
      .eq('id', configId)
      .single();

    if (configError || !config) {
      console.error('Error fetching config:', configError);
      throw new Error('Config not found');
    }

    const client = config.clients;
    const clientName = client?.name || config.name || 'Automação';
    const clientSector = client?.sector || 'Geral';
    const clientTargetAudience = client?.target_audience || 'Geral';

    // Fetch knowledge base: YouTube videos
    const { data: knowledgeVideos } = await supabase
      .from('instagram_autopost_knowledge_videos')
      .select('video_title, transcription')
      .eq('config_id', configId)
      .eq('is_selected', true)
      .not('transcription', 'is', null);

    // Fetch knowledge base: PDF files
    const { data: knowledgeFiles } = await supabase
      .from('instagram_autopost_knowledge_files')
      .select('file_name, content_text')
      .eq('config_id', configId)
      .eq('processing_status', 'completed')
      .not('content_text', 'is', null);

    // Fetch knowledge base: RSS items
    let rssItems: any[] | null = null;

    if (rssItemId) {
      const { data: singleRssItem, error: rssItemError } = await supabase
        .from('instagram_autopost_rss_items')
        .select('title, description, link, published_at')
        .eq('id', rssItemId)
        .single();

      if (rssItemError || !singleRssItem) {
        console.error('Error fetching RSS item:', rssItemError);
        throw new Error('RSS item not found');
      }

      rssItems = [singleRssItem];
    } else {
      const { data } = await supabase
        .from('instagram_autopost_rss_items')
        .select('title, description, link, published_at')
        .eq('config_id', configId)
        .eq('is_selected', true)
        .order('published_at', { ascending: false })
        .limit(20);

      rssItems = data || null;
    }

    // Build knowledge context
    // IMPORTANT: When generating from RSS (rssItemId present), we SKIP YouTube and PDF knowledge
    // The RSS article content is the ONLY source
    let knowledgeContext = '';
    
    // Only include YouTube transcripts if NOT RSS-based
    if (!rssItemId && knowledgeVideos && knowledgeVideos.length > 0) {
      knowledgeContext += '\n\n--- CONTEÚDO DE VÍDEOS DO YOUTUBE ---\n';
      for (const video of knowledgeVideos) {
        knowledgeContext += `\nVídeo: ${video.video_title}\n${video.transcription?.substring(0, 2000)}\n`;
      }
    }
    
    // Only include PDF files if NOT RSS-based
    if (!rssItemId && knowledgeFiles && knowledgeFiles.length > 0) {
      knowledgeContext += '\n\n--- CONTEÚDO DE ARQUIVOS PDF ---\n';
      for (const file of knowledgeFiles) {
        knowledgeContext += `\nArquivo: ${file.file_name}\n${file.content_text?.substring(0, 2000)}\n`;
      }
    }

    // RSS items are handled separately (only when not doing rssItemId-based generation)
    if (!rssItemId && rssItems && rssItems.length > 0) {
      knowledgeContext += '\n\n--- NOTÍCIAS E ARTIGOS RECENTES (RSS) ---\n';

      for (const item of rssItems) {
        knowledgeContext += `\nTítulo: ${item.title}\n`;
        if (item.description) {
          knowledgeContext += `Resumo: ${item.description.substring(0, 800)}\n`;
        }
        if (item.link) {
          knowledgeContext += `Link: ${item.link}\n`;
        }
        if (item.published_at) {
          knowledgeContext += `Data: ${new Date(item.published_at).toLocaleDateString('pt-BR')}\n`;
        }
      }
    }

    console.log('Knowledge context length:', knowledgeContext.length);
    if (rssItemId) {
      console.log('RSS-based generation: YouTube and PDF knowledge SKIPPED');
    }

    // Fetch a random theme from market_research_insights if available
    let selectedTheme: { topic: string; pain_point: string | null } | null = null;
    
    if (client?.id) {
      const { data: themes, error: themesError } = await supabase
        .from('market_research_insights')
        .select('topic, pain_point')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (!themesError && themes && themes.length > 0) {
        // Pick a random theme
        const randomIndex = Math.floor(Math.random() * themes.length);
        selectedTheme = themes[randomIndex];
        console.log('Selected random theme:', selectedTheme.topic);
      } else {
        console.log('No themes found for client, will generate without specific theme');
      }
    }

    // Use config reference images first, fallback to client images
    const hasConfigRefImages = config.reference_image_1 || config.reference_image_2 || config.reference_image_3;
    const referenceImages: string[] = [];
    
    if (hasConfigRefImages) {
      if (config.reference_image_1) referenceImages.push(config.reference_image_1);
      if (config.reference_image_2) referenceImages.push(config.reference_image_2);
      if (config.reference_image_3) referenceImages.push(config.reference_image_3);
    } else if (client) {
      if (client.ai_reference_image_1) referenceImages.push(client.ai_reference_image_1);
      if (client.ai_reference_image_2) referenceImages.push(client.ai_reference_image_2);
      if (client.ai_reference_image_3) referenceImages.push(client.ai_reference_image_3);
    }

    console.log('Reference images count:', referenceImages.length);

    // Find the last scheduled post to calculate next available slot
    const { data: existingPosts } = await supabase
      .from('instagram_auto_posts')
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

    // Use new schedule slots system - this determines post_type per slot
    let scheduledAt: Date;
    let postType: 'single' | 'carousel';
    let numberOfImages: number;

    try {
      // Try new flexible schedule slots first
      const { scheduledAt: slotScheduledAt, slot } = await findNextScheduleSlot(configId, afterDate);
      scheduledAt = slotScheduledAt;
      postType = slot.post_type as 'single' | 'carousel';
      numberOfImages = postType === 'carousel' ? slot.carousel_images : 1;
      console.log(`Using schedule slot: day=${slot.day_of_week}, hour=${slot.hour}, type=${postType}, images=${numberOfImages}`);
    } catch (slotError) {
      // Fallback to legacy scheduled_days/scheduled_hours if no slots configured
      console.log('No schedule slots found, falling back to legacy config');
      scheduledAt = calculateNextPostTime(config.scheduled_days, config.scheduled_hours, afterDate);
      postType = config.post_type || 'single';
      const carouselMinImages = config.carousel_min_images || 5;
      numberOfImages = postType === 'carousel' ? carouselMinImages : 1;
    }

    // Optional overrides (used by RSS generation)
    if (overridePostType === 'single' || overridePostType === 'carousel') {
      postType = overridePostType;
      if (postType === 'carousel') {
        const desired = Number(overrideCarouselImages);
        const safeDesired = Number.isFinite(desired) ? desired : numberOfImages;
        numberOfImages = Math.min(Math.max(safeDesired || 5, 1), 10);
      } else {
        numberOfImages = 1;
      }
      console.log(`Overrides applied: type=${postType}, images=${numberOfImages}`);
    }

    console.log('Config loaded:', clientName, '| Post type:', postType, '| Images:', numberOfImages);
    console.log('Next post scheduled at:', scheduledAt.toISOString());

    // Convert scheduledAt (UTC) to Brasília timezone to get correct day/date
    const scheduledAtBrasilia = new Date(scheduledAt.getTime() + BRASILIA_OFFSET_MS);
    const diasDaSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayOfWeek = diasDaSemana[scheduledAtBrasilia.getDay()];
    const scheduledDateFormatted = `${dayOfWeek}, ${String(scheduledAtBrasilia.getDate()).padStart(2, '0')}/${String(scheduledAtBrasilia.getMonth() + 1).padStart(2, '0')}/${scheduledAtBrasilia.getFullYear()}`;
    console.log('Post scheduled date for prompt:', scheduledDateFormatted);

    // Detect if this is an RSS-based generation (content comes from the news article)
    const isRSSBased = !!rssItemId && rssItems && rssItems.length > 0;
    const rssContent = isRSSBased ? rssItems[0] : null;
    
    console.log('Is RSS-based generation:', isRSSBased);
    if (rssContent) {
      console.log('RSS content title:', rssContent.title);
    }

    // Anti-hallucination instruction for RSS-based posts
    const antiHallucinationInstruction = isRSSBased ? `

IMPORTANTE - REGRA DE FIDELIDADE AO CONTEÚDO (ANTI-ALUCINAÇÃO):
Este post é baseado em uma NOTÍCIA/ARTIGO REAL. Você DEVE:
- Usar APENAS informações que estão EXPLICITAMENTE presentes no conteúdo do artigo abaixo
- NÃO inventar dados, números, estatísticas, nomes ou fatos que não estejam no artigo
- Se o artigo menciona "5 lições", liste EXATAMENTE as 5 lições mencionadas
- Se o artigo menciona uma empresa/produto, use EXATAMENTE o nome mencionado
- O conteúdo de cada slide/imagem deve refletir PONTOS REAIS do artigo original
- Se algo não foi mencionado no artigo, NÃO mencione no post` : '';

    // Generate image prompts based on post type
    let imagePrompts: string[] = [];
    
    if (postType === 'carousel') {
      // Build the content instruction based on whether it's RSS or not
      let contentInstruction: string;
      
      if (isRSSBased && rssContent) {
        // RSS-based: the news article is the PRIMARY source
        // Use config.rss_feed_prompt for style/structure (ignores carousel_prompt and single_post_prompt)
        const rssFeedPrompt = config.rss_feed_prompt || 'Crie um carrossel informativo e visualmente atraente baseado na notícia';
        
        contentInstruction = `CONTEÚDO DA NOTÍCIA (FONTE PRINCIPAL - baseie TODO o carrossel nisso):

TÍTULO DO ARTIGO: ${rssContent.title}

CONTEÚDO COMPLETO DO ARTIGO:
${rssContent.description || 'Sem conteúdo adicional disponível'}

${rssContent.link ? `LINK ORIGINAL: ${rssContent.link}` : ''}
${rssContent.published_at ? `DATA DE PUBLICAÇÃO: ${new Date(rssContent.published_at).toLocaleDateString('pt-BR')}` : ''}

---

REGRAS DE ESTILO/ESTRUTURA (use para formato visual, NÃO para inventar conteúdo):
${rssFeedPrompt}`;
      } else {
        // Normal flow: use the config prompt as primary, include selected theme if available
        const themeInstruction = selectedTheme 
          ? `\n\nTEMA SELECIONADO PARA ESTE POST (use como foco principal do conteúdo):
Tópico: ${selectedTheme.topic}
${selectedTheme.pain_point ? `Pontos a abordar: ${selectedTheme.pain_point}` : ''}`
          : '';
        
        contentInstruction = `BRIEFING DA POSTAGEM:
${config.carousel_prompt || config.post_briefing}${themeInstruction}
${knowledgeContext ? `\nBASE DE CONHECIMENTO (use como inspiração):${knowledgeContext.substring(0, 3000)}` : ''}`;
      }

      // Generate prompts for carousel slides
      const carouselPromptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Você é um especialista em direção de arte para carrosséis do Instagram.

Crie prompts para ${numberOfImages} slides de um carrossel que conta uma história coesa.
${antiHallucinationInstruction}

REGRAS:
- Cada slide deve ter seu próprio prompt em INGLÊS
- Mantenha consistência visual entre os slides (mesmas cores, estilo)
- Slide 1: Introdução/Gancho baseado no TÍTULO ou tema principal
- Slides do meio: Desenvolvimento do conteúdo REAL mencionado no artigo/briefing
- Último slide: Conclusão/CTA visual
- Formato vertical 3:4 para Instagram (1080x1350 pixels)
- Se o briefing menciona texto/frases específicas, inclua texto legível em cada slide
- Se menciona fotos/produtos, crie visuais sem texto
- CRÍTICO: O texto que aparece em cada slide deve refletir INFORMAÇÕES REAIS do artigo/briefing`
            },
            {
              role: 'user',
              content: `Crie ${numberOfImages} prompts de imagem para um carrossel do Instagram:

${contentInstruction}

SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

DATA DO POST (se necessário): ${scheduledDateFormatted}

Responda em formato JSON:
{
  "prompts": ["prompt slide 1 em inglês", "prompt slide 2 em inglês", ...]
}`
            }
          ],
          max_completion_tokens: 1500
        }),
      });

      if (!carouselPromptResponse.ok) {
        throw new Error('Failed to generate carousel prompts');
      }

      const carouselPromptData = await carouselPromptResponse.json();
      const responseContent = carouselPromptData.choices[0].message.content.trim();
      
      try {
        // Try to parse JSON response
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          imagePrompts = parsed.prompts || [];
        }
      } catch (e) {
        console.error('Failed to parse carousel prompts JSON, using fallback');
        // Fallback: generate same prompt for all slides
        const fallbackBriefing = isRSSBased && rssContent 
          ? `Título: ${rssContent.title}. ${rssContent.description?.substring(0, 500) || ''}`
          : (config.carousel_prompt || config.post_briefing);
          
        const singlePromptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: `Você é um especialista em direção de arte para Instagram. Gere prompts em inglês.${antiHallucinationInstruction}`
              },
              {
                role: 'user',
                content: `Crie UM prompt para gerar uma imagem de post Instagram baseado neste conteúdo: ${fallbackBriefing}. Responda APENAS com o prompt em inglês.`
              }
            ],
            max_completion_tokens: 300
          }),
        });
        const singleData = await singlePromptResponse.json();
        const basePrompt = singleData.choices[0].message.content.trim();
        imagePrompts = Array(numberOfImages).fill(basePrompt);
      }

      // Ensure we have the right number of prompts
      while (imagePrompts.length < numberOfImages) {
        imagePrompts.push(imagePrompts[0] || 'Professional Instagram post image');
      }
      imagePrompts = imagePrompts.slice(0, numberOfImages);

    } else {
      // Single image post - generate one prompt
      // Build the content instruction based on whether it's RSS or not
      let singleContentInstruction: string;
      
      if (isRSSBased && rssContent) {
        // RSS-based: the news article is the PRIMARY source
        // Use config.rss_feed_prompt for style (ignores single_post_prompt and carousel_prompt)
        const rssFeedPrompt = config.rss_feed_prompt || 'Crie uma imagem informativa e visualmente atraente baseada na notícia';
        
        singleContentInstruction = `CONTEÚDO DA NOTÍCIA (FONTE PRINCIPAL - baseie a imagem nisso):

TÍTULO DO ARTIGO: ${rssContent.title}

CONTEÚDO COMPLETO DO ARTIGO:
${rssContent.description || 'Sem conteúdo adicional disponível'}

---

REGRAS DE ESTILO (use para formato visual, NÃO para inventar conteúdo):
${rssFeedPrompt}`;
      } else {
        // Normal flow - include selected theme if available
        const themeInstruction = selectedTheme 
          ? `\n\nTEMA SELECIONADO PARA ESTE POST (use como foco principal do conteúdo):
Tópico: ${selectedTheme.topic}
${selectedTheme.pain_point ? `Pontos a abordar: ${selectedTheme.pain_point}` : ''}`
          : '';
        
        singleContentInstruction = `BRIEFING: ${config.single_post_prompt || config.post_briefing}${themeInstruction}
${knowledgeContext ? `\nBASE DE CONHECIMENTO (use como inspiração e fonte de dados):${knowledgeContext.substring(0, 3000)}` : ''}`;
      }

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
              content: `Você é um especialista em direção de arte para Instagram.
${antiHallucinationInstruction}

Analise o briefing e determine o TIPO de imagem:

TIPO A - TIPOGRÁFICO (quando menciona frases, citações, quotes, textos motivacionais):
- Descreva imagem com TEXTO visível
- Especifique: fundo, tipografia, cores, layout
- O TEXTO deve vir do CONTEÚDO REAL fornecido

TIPO B - VISUAL (quando pede fotos, produtos, cenários):
- Descreva elementos visuais SEM texto

REGRAS:
- Gere o prompt em INGLÊS
- Formato vertical 3:4 (1080x1350 pixels)
- Data do post se necessário: ${scheduledDateFormatted}`
            },
            {
              role: 'user',
              content: `Crie UM prompt para gerar uma imagem de post Instagram:

${singleContentInstruction}

SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}
DATA DO POST: ${scheduledDateFormatted}

Responda APENAS com o prompt em inglês.`
            }
          ],
          max_completion_tokens: 400
        }),
      });

      if (!imagePromptResponse.ok) {
        throw new Error('Failed to generate image prompt');
      }

      const imagePromptData = await imagePromptResponse.json();
      imagePrompts = [imagePromptData.choices[0].message.content.trim()];
    }

    console.log('Generated', imagePrompts.length, 'image prompts');

    // Generate all images IN PARALLEL for speed
    console.log(`Starting parallel generation of ${imagePrompts.length} images...`);
    
    const imageGenerationPromises = imagePrompts.map(async (prompt, i) => {
      console.log(`Starting image ${i + 1} of ${imagePrompts.length}...`);
      
      const base64Url = await generateSingleImage(
        prompt,
        referenceImages,
        scheduledDateFormatted,
        config,
        clientSector,
        clientTargetAudience,
        postType === 'carousel' ? i + 1 : undefined,
        postType === 'carousel' ? imagePrompts.length : undefined
      );
      
      const imageUrl = await uploadImageToStorage(base64Url, configId, postType === 'carousel' ? i : undefined);
      console.log(`Image ${i + 1} completed:`, imageUrl);
      return { index: i, url: imageUrl };
    });

    const results = await Promise.all(imageGenerationPromises);
    // Sort by index to maintain order
    results.sort((a, b) => a.index - b.index);
    const imageUrls = results.map(r => r.url);
    
    console.log(`All ${imageUrls.length} images generated successfully`);

    // Generate caption
    let captionPrompt: string;
    
    if (isRSSBased && rssContent) {
      // RSS-based caption: focus on summarizing/commenting the news article
      const rssAntiHallucination = `
REGRA DE FIDELIDADE (ANTI-ALUCINAÇÃO):
- A legenda deve RESUMIR ou COMENTAR a notícia/artigo
- Use APENAS informações presentes no artigo
- NÃO invente dados, números ou fatos que não estejam no conteúdo`;

      captionPrompt = postType === 'carousel'
        ? `Crie uma legenda para um CARROSSEL do Instagram com ${numberOfImages} slides baseado nesta NOTÍCIA:

TÍTULO DO ARTIGO: ${rssContent.title}

CONTEÚDO DO ARTIGO:
${rssContent.description?.substring(0, 2000) || 'Conteúdo não disponível'}
${rssAntiHallucination}

SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

ESTILO/TOM (do prompt RSS):
${config.rss_feed_prompt || 'Profissional e informativo'}

REQUISITOS:
- 150-400 caracteres
- 3-5 emojis estratégicos
- 3-5 hashtags relevantes (relacionadas ao tema da notícia)
- Mencione que é um carrossel (ex: "Deslize para ver mais →")
- A legenda deve COMENTAR ou RESUMIR a notícia, não inventar conteúdo
- NÃO inclua datas na legenda

Responda APENAS com a legenda pronta.`
        : `Crie uma legenda para post do Instagram baseado nesta NOTÍCIA:

TÍTULO DO ARTIGO: ${rssContent.title}

CONTEÚDO DO ARTIGO:
${rssContent.description?.substring(0, 2000) || 'Conteúdo não disponível'}
${rssAntiHallucination}

SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

ESTILO/TOM (do prompt RSS):
${config.rss_feed_prompt || 'Profissional e informativo'}

REQUISITOS:
- 150-300 caracteres
- 3-5 emojis estratégicos
- 3-5 hashtags relevantes (relacionadas ao tema da notícia)
- A legenda deve COMENTAR ou RESUMIR a notícia
- NÃO inclua datas na legenda

Responda APENAS com a legenda pronta.`;
    } else {
      // Normal caption generation (non-RSS) - include theme if available
      const themeForCaption = selectedTheme 
        ? `\nTEMA DO POST: ${selectedTheme.topic}${selectedTheme.pain_point ? `\nPontos do tema: ${selectedTheme.pain_point}` : ''}`
        : '';
      
      captionPrompt = postType === 'carousel'
        ? `Crie uma legenda para um CARROSSEL do Instagram com ${numberOfImages} slides:

BRIEFING: ${config.carousel_prompt || config.post_briefing}${themeForCaption}
${knowledgeContext ? `\nBASE DE CONHECIMENTO (use como referência para dados e informações):${knowledgeContext.substring(0, 2500)}` : ''}
SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

REQUISITOS:
- 150-350 caracteres (pode ser um pouco mais para carrossel)
- 3-5 emojis estratégicos
- 3-5 hashtags relevantes
- Mencione que é um carrossel (ex: "Deslize para ver mais →")
- Call-to-action para engajamento
- USE informações da base de conhecimento se disponível
- A legenda deve refletir o TEMA selecionado se fornecido
- NÃO inclua datas ou dias da semana na legenda, A MENOS que o briefing EXPLICITAMENTE peça para mencionar a data. Se pedir, use: ${scheduledDateFormatted}

Responda APENAS com a legenda pronta.`
        : `Crie uma legenda para post do Instagram:

BRIEFING: ${config.single_post_prompt || config.post_briefing}${themeForCaption}
${knowledgeContext ? `\nBASE DE CONHECIMENTO (use como referência para dados e informações):${knowledgeContext.substring(0, 2500)}` : ''}
SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

REQUISITOS:
- 150-280 caracteres
- 3-5 emojis estratégicos
- 3-5 hashtags relevantes
- Call-to-action sutil
- USE informações da base de conhecimento se disponível
- A legenda deve refletir o TEMA selecionado se fornecido
- NÃO inclua datas ou dias da semana na legenda, A MENOS que o briefing EXPLICITAMENTE peça para mencionar a data. Se pedir, use: ${scheduledDateFormatted}

Responda APENAS com a legenda pronta.`;
    }

    const captionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Você é um especialista em marketing para Instagram. Crie legendas envolventes em português brasileiro.'
          },
          { role: 'user', content: captionPrompt }
        ],
        max_completion_tokens: 400
      }),
    });

    if (!captionResponse.ok) {
      throw new Error('Failed to generate caption');
    }

    const captionData = await captionResponse.json();
    const caption = captionData.choices[0].message.content.trim();
    console.log('Caption generated:', caption.substring(0, 50) + '...');

    // Save to instagram_auto_posts
    const postData: any = {
      config_id: configId,
      client_id: config.client_id,
      company_id: config.company_id,
      caption: caption,
      status: 'pending',
      scheduled_at: scheduledAt.toISOString(),
      post_type: postType,
      grammar_validated: false,
      grammar_validation_attempts: 0,
      grammar_errors: null
    };

    if (postType === 'carousel') {
      postData.image_urls = imageUrls;
      postData.image_url = imageUrls[0]; // First image as thumbnail
    } else {
      postData.image_url = imageUrls[0];
    }

    const { data: newPost, error: postError } = await supabase
      .from('instagram_auto_posts')
      .insert(postData)
      .select()
      .single();

    if (postError) {
      console.error('Error saving post:', postError);
      throw new Error('Failed to save post');
    }

    console.log('Post saved with ID:', newPost.id, '| Type:', postType, '| Images:', imageUrls.length);

    // Validate text in images automatically
    console.log('Starting automatic grammar validation...');
    try {
      const validationResponse = await fetch(`${supabaseUrl}/functions/v1/validate-image-text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: imageUrls,
          postId: newPost.id
        }),
      });

      if (validationResponse.ok) {
        const validationResult = await validationResponse.json();
        console.log('Grammar validation completed:', validationResult);
        
        // Update post with validation result
        await supabase
          .from('instagram_auto_posts')
          .update({
            grammar_validated: true,
            grammar_validation_attempts: 1,
            grammar_errors: validationResult.hasErrors ? validationResult.errors : null
          })
          .eq('id', newPost.id);
      } else {
        console.error('Grammar validation failed:', await validationResponse.text());
      }
    } catch (validationError) {
      console.error('Error during grammar validation:', validationError);
      // Continue without validation - post is still valid
    }

    // Update config with next_post_at
    await supabase
      .from('instagram_auto_post_configs')
      .update({ next_post_at: scheduledAt.toISOString() })
      .eq('id', configId);

    return new Response(JSON.stringify({
      success: true,
      post: newPost
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-instagram-auto-post:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
