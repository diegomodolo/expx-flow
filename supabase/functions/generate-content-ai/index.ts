import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentType, clientId, theme, companyId } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Check for custom prompts first
    const { data: customPromptData } = await supabase
      .from('content_prompts')
      .select('custom_prompt')
      .eq('company_id', companyId)
      .eq('content_type', contentType)
      .eq('is_active', true)
      .maybeSingle();

    // Fetch client data for context
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('company_id', companyId)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      throw new Error('Cliente não encontrado');
    }

    // Fetch recent campaigns for context
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('name, objective')
      .eq('client_id', clientId)
      .limit(5);

    // Fetch competitors for context
    const { data: competitors } = await supabase
      .from('competitors')
      .select('name, description')
      .eq('client_id', clientId)
      .limit(3);

    // Build context for AI
    const clientContext = `
    Cliente: ${client.name} (${client.company})
    Setor: ${client.sector || 'Não especificado'}
    Público-alvo: ${client.target_audience || 'Não especificado'}
    Objetivos: ${client.objectives || 'Não especificado'}
    Tom de voz: ${client.voice_tone || 'Não especificado'}
    Briefing IA: ${client.ai_briefing || 'Não disponível'}
    `;

    const campaignsContext = campaigns && campaigns.length > 0 
      ? `Campanhas recentes: ${campaigns.map(c => c.name).join(', ')}`
      : 'Sem campanhas anteriores';

    const competitorsContext = competitors && competitors.length > 0
      ? `Concorrentes: ${competitors.map(c => c.name).join(', ')}`
      : 'Sem dados de concorrentes';

    // Content type specific prompts
    const contentPrompts = {
      'roteiro-tiktok': `Crie um roteiro envolvente para TikTok de 15-30 segundos sobre "${theme}". Inclua gancho inicial, desenvolvimento e CTA. Use linguagem jovem e dinâmica.`,
      'roteiro-youtube-shorts': `Desenvolva um roteiro para YouTube Shorts de 60 segundos sobre "${theme}". Inclua estrutura de introdução, desenvolvimento e conclusão com CTA.`,
      'titulos-youtube': `Gere 5 títulos atrativos para YouTube sobre "${theme}". Use gatilhos mentais, números e palavras de impacto. Cada título deve ter entre 40-60 caracteres.`,
      'ideias-instagram': `Crie 10 ideias criativas de conteúdo para Instagram sobre "${theme}". Varie entre posts, stories e reels. Seja específico sobre o formato e abordagem.`,
      'ideias-facebook': `Desenvolva 8 ideias de conteúdo para Facebook sobre "${theme}". Foque em engajamento e alcance orgânico. Inclua formato e estratégia de postagem.`,
      'ideias-linkedin': `Gere 6 ideias profissionais de conteúdo para LinkedIn sobre "${theme}". Foque em autoridade, networking e valor profissional.`,
      'ideias-blog': `Crie 10 ideias de artigos para blog sobre "${theme}". Inclua títulos, palavras-chave e estrutura básica de cada artigo.`,
      'artigo-blog': `Escreva um artigo completo para blog sobre "${theme}". Inclua introdução, desenvolvimento com subtítulos, conclusão e CTA. Mínimo 800 palavras.`,
      'email-marketing': `Crie um e-mail marketing persuasivo sobre "${theme}". Inclua assunto atrativo, abertura, corpo do e-mail e CTA convincente.`,
      'landing-page': `Desenvolva o copy completo para uma landing page sobre "${theme}". Inclua headline, subheadlines, benefícios, objeções e CTA.`,
      'texto-anuncio': `Crie um texto publicitário impactante sobre "${theme}". Máximo 125 caracteres para texto principal e 25 para headline.`,
      'google-ads-pesquisa': `Crie anúncios para Google Ads Pesquisa sobre "${theme}". Inclua 3 headlines (30 caracteres cada) e 2 descrições (90 caracteres cada).`,
      'google-ads-pmax': `Desenvolva assets para Google Ads Performance Max sobre "${theme}". Inclua headlines curtas/longas, descrições e CTAs variados.`,
      'google-ads-discovery': `Crie anúncios para Google Discovery sobre "${theme}". Foque em visual atrativo com headlines e descrições que despertem curiosidade.`,
      'google-ads-display': `Desenvolva copy para banners Display sobre "${theme}". Inclua headlines impactantes e descrições concisas para diferentes tamanhos.`,
      'google-ads-video': `Crie roteiro para anúncio em vídeo do Google sobre "${theme}". Inclua gancho inicial, desenvolvimento e CTA em 30 segundos.`,
      'google-ads-youtube': `Desenvolva roteiro para YouTube Ads sobre "${theme}". Versões de 15s, 30s e 60s com CTAs específicos.`,
      'facebook-ads': `Crie anúncios para Facebook sobre "${theme}". Inclua texto principal, headline e descrição com emojis e CTAs persuasivos.`,
      'instagram-ads-feed': `Desenvolva copy para anúncios no Feed do Instagram sobre "${theme}". Foque em visual e texto que pare o scroll.`,
      'instagram-ads-stories': `Crie copy para Instagram Stories Ads sobre "${theme}". Formato vertical, texto conciso e CTA claro.`,
      'instagram-ads-reels': `Desenvolva roteiro para anúncio em Reels sobre "${theme}". Inclua hook, desenvolvimento e CTA em formato vertical.`,
      'linkedin-ads': `Crie anúncios profissionais para LinkedIn sobre "${theme}". Tom corporativo mas envolvente, foque em valor profissional.`,
      'youtube-ads': `Desenvolva roteiro completo para YouTube Ads sobre "${theme}". Inclua diferentes durações e estratégias de segmentação.`,
      'tiktok-ads': `Crie roteiro nativo para TikTok Ads sobre "${theme}". Linguagem jovem, tendências atuais e integração natural com a plataforma.`,
      
      // ============= PROMPTS PARA OUTRAS IAs =============
      'prompt-gpt4-chatgpt': `Crie um prompt otimizado para ChatGPT/GPT-4 que gere conteúdo de alta qualidade sobre "${theme}". O prompt deve incluir contexto específico, instruções claras sobre tom de voz, formato desejado, e diretrizes para maximizar a qualidade da resposta. Baseie-se no perfil do cliente e objetivo comercial.`,
      
      'prompt-midjourney': `Gere um prompt técnico para Midjourney criar imagens sobre "${theme}". Inclua: descrição visual detalhada, estilo artístico, paleta de cores, iluminação, composição, qualidade (4K, 8K), proporção (--ar), versão (--v 6), estilização (--s), e parâmetros específicos para resultados comerciais profissionais.`,
      
      'prompt-dalle': `Crie um prompt detalhado para DALL·E gerar imagens sobre "${theme}". Use linguagem clara e específica, incluindo: estilo visual, cores, composição, elementos principais, ambiente, emoção desejada, e qualidade. Otimize para resultados comerciais e profissionais.`,
      
      'prompt-veo3': `Desenvolva um prompt completo para Veo 3 (Google) criar um vídeo sobre "${theme}". Inclua: descrição da cena inicial e final, movimento da câmera, iluminação, tempo/duração, estilo visual, transições, áudio ambiente, e elementos específicos que contem a história da marca/produto.`,
      
      'prompt-runwayml': `Crie comandos específicos para RunwayML produzir vídeo sobre "${theme}". Inclua: tipo de geração (Text to Video, Image to Video, etc.), descrição da cena, movimento desejado, estilo visual, duração, configurações de qualidade, e instruções para edição/refinamento.`,
      
      'prompt-elevenlabs': `Gere um script e configurações para ElevenLabs criar áudio sobre "${theme}". Inclua: texto para narração, tom de voz recomendado (profissional, amigável, etc.), velocidade de fala, emoção, tipo de voz (masculina/feminina), sotaque, e configurações técnicas para qualidade comercial.`,
      
      'prompt-pikalabs': `Desenvolva um prompt para Pika Labs transformar conteúdo sobre "${theme}" em vídeo animado. Inclua: descrição visual da cena, estilo de animação, movimento de câmera, transições, efeitos visuais, duração, e elementos que criem impacto visual para o público-alvo.`,
      
      'prompt-leonardo-ai': `Crie um prompt artístico para Leonardo AI gerar arte conceitual sobre "${theme}". Inclua: estilo artístico (realista, ilustração, concept art), composição, paleta de cores, iluminação, elementos principais, mood/atmosfera, resolução, e configurações para uso comercial profissional.`,
      
      'prompt-kaiber': `Gere instruções para Kaiber transformar imagens sobre "${theme}" em vídeo musical. Inclua: descrição das imagens base, estilo de transição, sincronização com música, efeitos visuais, movimento de câmera, duração, e elementos que conectem com a identidade da marca.`,
      
      'prompt-canva-magic': `Crie sugestões de prompts para Canva Magic Write sobre "${theme}". Inclua: tipo de conteúdo (post, apresentação, e-mail), tom de voz, pontos principais a abordar, CTA sugerido, formato específico, e diretrizes para manter consistência visual com a marca.`,
      
      'prompt-notion-ai': `Desenvolva prompts para Notion AI organizar e criar conteúdo sobre "${theme}". Inclua: estrutura de documento, seções principais, formato de apresentação, checklist de ações, templates sugeridos, e organização hierárquica para produtividade e clareza.`,
      'headline-anuncio': `Gere 10 headlines poderosas sobre "${theme}". Use gatilhos mentais, urgência e benefícios claros. Máximo 30 caracteres cada.`,
      'subheadline-anuncio': `Crie 5 subheadlines complementares sobre "${theme}". Reforce benefícios e credibilidade. Entre 50-90 caracteres cada.`,
      'cta-criativo': `Desenvolva 15 CTAs criativos sobre "${theme}". Varie entre urgência, curiosidade e benefício direto.`,
      'copy-remarketing': `Crie copy específico para remarketing sobre "${theme}". Foque em retomar interesse e vencer objeções.`,
      'copy-dm-direto': `Desenvolva mensagem direta persuasiva sobre "${theme}". Tom pessoal, valor claro e CTA suave.`,
      'copy-lead-isca': `Crie copy para capturar leads sobre "${theme}". Inclua isca digital atrativa e formulário persuasivo.`,
      'post-comemorativo': `Crie post comemorativo sobre "${theme}". Inclua contextualização da data, conexão com a marca e engajamento.`,
      'post-autoridade': `Desenvolva post de autoridade sobre "${theme}". Inclua dados, case ou prova social convincente.`,
      'post-engajamento': `Crie post com pergunta envolvente sobre "${theme}". Estimule comentários e interação da audiência.`,
      'post-bastidores': `Desenvolva post de bastidores sobre "${theme}". Mostre processos, equipe ou curiosidades da empresa.`,
      'post-educativo': `Crie post educativo sobre "${theme}". Tutorial passo a passo ou dica valiosa para a audiência.`,
      'post-curiosidade': `Desenvolva post com curiosidade sobre "${theme}". Fato interessante ou informação surpreendente do nicho.`,
      'post-desafio': `Crie post com desafio sobre "${theme}". Estimule participação ativa da audiência com hashtag própria.`,
      'carrossel-instagram': `Desenvolva roteiro para carrossel Instagram sobre "${theme}". 6-10 slides com sequência lógica e CTA final.`,
      'roteiro-podcast': `Crie roteiro completo para podcast sobre "${theme}". Inclua introdução, tópicos principais, perguntas e encerramento.`
    };

    const systemPrompt = `Você é um especialista em marketing digital e criação de conteúdo. Crie conteúdo profissional, persuasivo e adaptado ao cliente específico.

    CONTEXTO DO CLIENTE:
    ${clientContext}

    ${campaignsContext}
    ${competitorsContext}

    INSTRUÇÕES:
    - Use as informações do cliente para personalizar o conteúdo
    - Mantenha o tom de voz especificado pelo cliente
    - Seja criativo mas profissional
    - Inclua CTAs quando apropriado
    - Use emojis estrategicamente (quando adequado ao tipo de conteúdo)
    - Forneça conteúdo pronto para uso

    IMPORTANTE: Responda APENAS com o conteúdo solicitado, sem explicações adicionais.`;

    // Use custom prompt if available, otherwise use default
    let userPrompt = contentPrompts[contentType as keyof typeof contentPrompts] || 
      `Crie conteúdo sobre "${theme}" para o tipo: ${contentType}`;
    
    if (customPromptData?.custom_prompt) {
      userPrompt = customPromptData.custom_prompt
        .replace(/\$\{theme\}/g, theme)
        .replace(/\$\{clientContext\}/g, clientContext);
      console.log('Using custom prompt for content type:', contentType);
    }

    console.log('Generating content for:', { contentType, theme, clientName: client.name });

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Erro na API do OpenAI');
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Content generated successfully');

    return new Response(
      JSON.stringify({ 
        content: generatedContent,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-content-ai function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});