import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Edge function called with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing request...');
    
    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
    
    const { url, competitorId, competitorName } = requestBody;
    console.log('Extracted data:', { url, competitorId, competitorName });

    if (!url) {
      throw new Error('URL é obrigatória');
    }

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not found in environment variables');
      throw new Error('FIRECRAWL_API_KEY não configurada');
    }

    console.log('Making request to Firecrawl API...');
    const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        pageOptions: {
          includeHtml: true,
          waitFor: 5000,
          screenshot: false
        },
        extractorOptions: {
          mode: 'llm-extraction',
          extractionPrompt: `
            Você está analisando uma página da Biblioteca de Anúncios do Facebook. 
            Extraia TODOS os anúncios visíveis na página e retorne um array JSON com os seguintes campos para cada anúncio:
            
            Para cada anúncio encontrado, extraia:
            - ad_title: O título principal do anúncio (texto em destaque, título da empresa ou produto)
            - ad_copy: O texto principal/descrição do anúncio (todo o texto do corpo do anúncio)
            - call_to_action: Texto do botão de ação (ex: "Saiba mais", "Comprar agora", "Inscreva-se")
            - ad_type: Tipo do anúncio baseado no conteúdo (image, video, carousel, collection)
            - platforms: Em quais plataformas está rodando (Facebook, Instagram, Messenger, etc)
            - date_started: Data de início se disponível
            - estimated_performance: Baseado na presença de elementos visuais, estime "high", "medium" ou "low"
            
            IMPORTANTE: 
            - Analise cuidadosamente todo o HTML da página
            - Procure por divs que contenham anúncios individuais
            - Extraia o texto real dos anúncios, não invente conteúdo
            - Se um anúncio não tiver algum campo, deixe como null
            - Retorne APENAS o array JSON, sem texto adicional
            
            Exemplo de formato esperado:
            [
              {
                "ad_title": "Título real do anúncio",
                "ad_copy": "Texto completo do anúncio extraído da página",
                "call_to_action": "Saiba mais",
                "ad_type": "image",
                "platforms": "Facebook, Instagram",
                "date_started": null,
                "estimated_performance": "medium"
              }
            ]
          `
        }
      }),
    });

    console.log('Firecrawl API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firecrawl API error response:', errorText);
      throw new Error(`Firecrawl API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('Firecrawl API response data:', data);
    
    if (!data.success) {
      console.error('Firecrawl API returned success=false:', data);
      throw new Error(data.error || 'Erro ao fazer scraping da página');
    }

    console.log('Scraping successful, extracted data:', data.data?.extract);

    // Processar dados extraídos
    let extractedAds = [];
    try {
      if (data.data?.extract) {
        // Tentar parsear como JSON
        extractedAds = typeof data.data.extract === 'string' 
          ? JSON.parse(data.data.extract) 
          : data.data.extract;
      }
    } catch (parseError) {
      console.error('Error parsing extracted data:', parseError);
      // Se não conseguir parsear, criar um anúncio genérico com o conteúdo extraído
      extractedAds = [{
        ad_title: `Anúncio de ${competitorName}`,
        ad_copy: data.data?.extract || data.data?.content?.substring(0, 500) || 'Conteúdo extraído automaticamente',
        ad_type: 'unknown',
        estimated_performance: 'medium',
        notes: 'Extraído automaticamente da biblioteca de anúncios'
      }];
    }

    // Se não extraiu nenhum anúncio estruturado, tentar extrair do conteúdo HTML
    if (!extractedAds || extractedAds.length === 0) {
      console.log('No structured ads found, attempting to extract from content');
      
      const content = data.data?.content || '';
      
      let foundAds = [];
      const lines = content.split('\n').filter(line => line.trim().length > 20);
      
      // Criar anúncios baseados em linhas de texto significativas
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].trim();
        if (line.length > 30 && line.length < 300) {
          foundAds.push({
            ad_title: `Anúncio ${i + 1} - ${competitorName}`,
            ad_copy: line,
            ad_type: 'text',
            estimated_performance: 'medium',
            notes: 'Extraído automaticamente do conteúdo da página'
          });
        }
      }

      extractedAds = foundAds.slice(0, 5); // Limitar a 5 anúncios
    }

    console.log('Processed ads:', extractedAds);

    return new Response(JSON.stringify({ 
      success: true, 
      ads: Array.isArray(extractedAds) ? extractedAds : [extractedAds],
      originalUrl: url,
      competitorId: competitorId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scrape-competitor-ads function:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      errorType: error.name,
      errorStack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});