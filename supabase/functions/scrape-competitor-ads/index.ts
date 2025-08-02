import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

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
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { url, competitorId, competitorName } = requestBody;

    console.log('Scraping ads from URL:', url);
    console.log('Competitor ID:', competitorId);
    console.log('Competitor Name:', competitorName);
    console.log('API Key available:', !!firecrawlApiKey);

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not found in environment variables');
      throw new Error('FIRECRAWL_API_KEY não configurada');
    }

    if (!url) {
      throw new Error('URL é obrigatória');
    }

    // Fazer scraping da URL usando Firecrawl
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
          waitFor: 3000
        },
        extractorOptions: {
          mode: 'llm-extraction',
          extractionPrompt: `
            Extraia todos os anúncios desta página da biblioteca de anúncios do Facebook. Para cada anúncio encontrado, retorne:
            - ad_title: Título principal do anúncio
            - ad_copy: Texto/copy principal do anúncio 
            - call_to_action: Botão de call-to-action (se houver)
            - ad_type: Tipo do anúncio (image, video, carousel, etc)
            - date_started: Data de início do anúncio (se disponível)
            - platforms: Plataformas onde está rodando (Facebook, Instagram, etc)
            - estimated_performance: Com base nos elementos visuais, estime se parece ser "high", "medium" ou "low" performance
            
            Retorne um array JSON com todos os anúncios encontrados.
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
      const htmlContent = data.data?.html || '';
      
      // Buscar padrões comuns em bibliotecas de anúncios
      const adPatterns = [
        /data-testid="[^"]*ad[^"]*"/gi,
        /class="[^"]*ad[^"]*"/gi,
        /aria-label="[^"]*"/gi
      ];

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
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});