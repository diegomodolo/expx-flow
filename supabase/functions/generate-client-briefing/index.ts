import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.29.3';

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
    const { clientId, websiteUrl } = await req.json();

    if (!clientId || !websiteUrl) {
      return new Response(
        JSON.stringify({ error: 'clientId e websiteUrl são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize services
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!firecrawlApiKey || !openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Chaves da API Firecrawl ou OpenAI não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Iniciando análise do website:', websiteUrl);

    // Normalize URL
    let normalizedUrl = websiteUrl;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    console.log('URL normalizada:', normalizedUrl);

    // Step 1: Scrape website with Firecrawl (with retry logic)
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
    
    let crawlResponse;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`Tentativa ${retryCount + 1} de scraping da URL:`, normalizedUrl);
        
        const startTime = Date.now();
        
        // First attempt with optimized settings
        if (retryCount === 0) {
          crawlResponse = await firecrawl.scrapeUrl(normalizedUrl, {
            formats: ['markdown'],
            onlyMainContent: true,
            timeout: 15000, // 15 seconds timeout
            waitFor: 1000,  // Wait 1 second for page load
            skipTlsVerification: false,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; FirecrawlBot/1.0)'
            }
          });
        } else {
          // Fallback attempt with simpler settings
          console.log('Tentando com configurações simplificadas...');
          crawlResponse = await firecrawl.scrapeUrl(normalizedUrl, {
            formats: ['markdown'],
            onlyMainContent: true,
            timeout: 10000, // 10 seconds timeout
            waitFor: 500,   // Wait only 0.5 second
            includeHtml: false,
            screenshot: false
          });
        }
        
        const endTime = Date.now();
        console.log(`Scraping concluído em ${endTime - startTime}ms`);
        break; // Success, exit retry loop
        
      } catch (error) {
        retryCount++;
        console.error(`Erro na tentativa ${retryCount}:`, error.message);
        
        if (retryCount > maxRetries) {
          console.error('Todas as tentativas falharam');
          return new Response(
            JSON.stringify({ 
              error: 'Não foi possível acessar o website. Verifique se a URL está correta e se o site está online. Se o problema persistir, tente novamente em alguns minutos.' 
            }),
            { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
      }
    }

    console.log('Resposta do Firecrawl:', JSON.stringify(crawlResponse, null, 2));

    if (!crawlResponse.success) {
      console.error('Erro no Firecrawl:', crawlResponse.error);
      return new Response(
        JSON.stringify({ error: 'Erro ao analisar o website. Verifique se a URL está correta e acessível.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different response structures from Firecrawl
    let websiteContent = '';
    
    if (crawlResponse.data && crawlResponse.data.markdown) {
      websiteContent = crawlResponse.data.markdown;
    } else if (crawlResponse.data && crawlResponse.data.content) {
      websiteContent = crawlResponse.data.content;
    } else if (crawlResponse.markdown) {
      websiteContent = crawlResponse.markdown;
    } else if (crawlResponse.content) {
      websiteContent = crawlResponse.content;
    } else {
      console.error('Estrutura de resposta inesperada do Firecrawl:', crawlResponse);
      return new Response(
        JSON.stringify({ error: 'Erro ao extrair conteúdo do website. Formato de resposta inesperado.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!websiteContent || websiteContent.trim().length === 0) {
      console.error('Conteúdo vazio extraído do website');
      return new Response(
        JSON.stringify({ error: 'Não foi possível extrair conteúdo útil do website.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Website analisado com sucesso, iniciando geração do briefing...');

    // Step 2: Generate briefing with OpenAI
    const prompt = `Você é um especialista em marketing digital e análise de negócios. Analise completamente o conteúdo do website fornecido e gere um briefing detalhado para criar campanhas de tráfego pago eficazes.

CONTEÚDO DO WEBSITE:
${websiteContent}

Gere um briefing completo seguindo esta estrutura exata em markdown:

# Briefing do Cliente - Análise Completa

## 📋 Resumo Executivo
- Descrição do negócio em 2-3 frases
- Proposta de valor principal
- Posicionamento no mercado

## 🎯 Análise do Público-Alvo

### Público Primário
- **Demografia**: Idade, gênero, localização, renda
- **Psicografia**: Interesses, valores, estilo de vida
- **Comportamentos**: Hábitos de compra, canais preferidos
- **Dores e necessidades**: Principais problemas que o produto/serviço resolve

### Público Secundário
- Segmentos adicionais com potencial
- Características e motivações

## 🚀 Estratégias de Tráfego Recomendadas

### Plataformas Prioritárias
1. **Facebook/Instagram Ads**
   - Justificativa
   - Tipos de campanha recomendados
   
2. **Google Ads**
   - Justificativa
   - Tipos de campanha recomendados
   
3. **Outras plataformas** (se aplicável)

### Objetivos de Campanha
- Awareness/Conhecimento
- Consideração/Interesse
- Conversão/Vendas
- Retenção/Fidelização

## 🎨 Diretrizes Criativas

### Tom de Voz
- Estilo de comunicação ideal
- Palavras-chave para usar
- Palavras para evitar

### Argumentos de Venda
- Principais benefícios a destacar
- Prova social relevante
- Call-to-actions eficazes

### Formatos Recomendados
- Tipos de criativos (imagem, vídeo, carrossel)
- Mensagens para cada formato

## 🎲 Segmentações Sugeridas

### Facebook/Instagram
- Interesses específicos
- Comportamentos
- Lookalike audiences
- Custom audiences

### Google Ads
- Palavras-chave principais
- Tipos de correspondência
- Audiências do Google
- Temas/tópicos

## 📊 KPIs e Metas

### Métricas Primárias
- CPA alvo estimado
- ROAS esperado
- Volume de conversões

### Métricas Secundárias
- CTR benchmark
- CPM esperado
- Qualidade do tráfego

## ⚠️ Considerações Importantes
- Sazonalidades do negócio
- Concorrência principal
- Oportunidades especiais
- Restrições ou limitações

## 💡 Oportunidades Identificadas
- Nichos inexplorados
- Parcerias potenciais
- Expansão de produtos/serviços
- Melhorias no funil de vendas

Seja específico, prático e focado em resultados. Use dados e insights do website para fundamentar suas recomendações.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em marketing digital com mais de 10 anos de experiência em tráfego pago. Seja preciso, estratégico e prático nas suas análises.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('Erro na OpenAI:', errorData);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar briefing com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const briefing = openaiData.choices[0].message.content;

    console.log('Briefing gerado com sucesso, salvando no banco...');

    // Step 3: Update client with generated briefing
    const { error: updateError } = await supabaseClient
      .from('clients')
      .update({
        ai_briefing: briefing,
        briefing_generated_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('Erro ao salvar briefing:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar briefing no banco de dados' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Briefing salvo com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        briefing: briefing,
        message: 'Briefing gerado e salvo com sucesso!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});