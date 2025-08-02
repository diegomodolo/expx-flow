import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== SCRAPE FUNCTION STARTED ===');
  console.log('Method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Processing POST request ===');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { url, competitorId, competitorName } = requestBody;
    console.log('Extracted data:', { url, competitorId, competitorName });

    if (!url) {
      throw new Error('URL é obrigatória');
    }

    // Check if Firecrawl API key exists
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    console.log('API Key available:', !!firecrawlApiKey);

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not found');
      // Return mock data when API key is missing
      const mockAds = [
        {
          ad_title: `Mock Ad 1 - ${competitorName}`,
          ad_copy: 'Este é um anúncio de teste (chave API não configurada)',
          call_to_action: 'Saiba Mais',
          ad_type: 'image',
          estimated_performance: 'medium',
          platforms: 'Facebook',
          notes: 'Dados de teste - configure a chave FIRECRAWL_API_KEY'
        }
      ];

      return new Response(JSON.stringify({ 
        success: true, 
        ads: mockAds,
        originalUrl: url,
        competitorId: competitorId,
        message: 'Retornando dados de teste - configure FIRECRAWL_API_KEY'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to call Firecrawl API
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
          onlyMainContent: false,
          waitFor: 3000
        },
        extractorOptions: {
          mode: 'llm-extraction',
          extractionSchema: {
            type: "object",
            properties: {
              ads: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ad_title: {
                      type: "string",
                      description: "Título principal ou nome da empresa/produto no anúncio"
                    },
                    ad_copy: {
                      type: "string", 
                      description: "Todo o texto do anúncio (descrição, copy principal)"
                    },
                    call_to_action: {
                      type: "string",
                      description: "Texto do botão (ex: 'Saiba mais', 'Comprar', 'Inscreva-se')"
                    },
                    ad_type: {
                      type: "string",
                      description: "Tipo baseado no conteúdo (image, video, carousel)"
                    },
                    platforms: {
                      type: "string",
                      description: "Onde está rodando (Facebook, Instagram, etc)"
                    }
                  }
                }
              }
            }
          },
          extractionPrompt: "Analise esta página da Biblioteca de Anúncios do Facebook e extraia TODOS os anúncios individuais que encontrar. Para cada anúncio, identifique o título, texto do anúncio, call-to-action, tipo e plataformas onde está rodando."
        }
      }),
    });

    console.log('Firecrawl response status:', response.status);
    console.log('Firecrawl response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== FIRECRAWL API ERROR ===');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Response:', errorText);
      console.error('URL that failed:', url);
      
      // Try to parse error as JSON for more details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', errorJson);
        errorDetails = errorJson.error || errorJson.message || errorText;
      } catch {
        console.error('Error response is not JSON');
      }
      
      // Return mock data instead of throwing error
      const mockAds = [
        {
          ad_title: `${competitorName} - Erro API`,
          ad_copy: `Não foi possível extrair anúncios: ${errorDetails}`,
          call_to_action: 'Tentar novamente',
          ad_type: 'error',
          estimated_performance: 'low',
          platforms: 'Facebook',
          notes: `Erro ${response.status}: ${errorDetails}`
        }
      ];

      return new Response(JSON.stringify({ 
        success: true, 
        ads: mockAds,
        originalUrl: url,
        competitorId: competitorId,
        message: `Erro na API (${response.status}): ${errorDetails}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Firecrawl response data received');
    console.log('Success:', data.success);

    if (!data.success) {
      console.error('Firecrawl returned success=false:', data.error);
      throw new Error(data.error || 'Erro no Firecrawl');
    }

    // Process extracted data
    let extractedAds = [];
    
    // Try to parse the LLM extraction first
    if (data.data?.extract) {
      console.log('Raw extract data:', data.data.extract);
      
      try {
        const parsedExtract = typeof data.data.extract === 'string' 
          ? JSON.parse(data.data.extract) 
          : data.data.extract;
        
        // Check if the extracted data has the expected structure with 'ads' array
        if (parsedExtract && parsedExtract.ads && Array.isArray(parsedExtract.ads)) {
          extractedAds = parsedExtract.ads;
          console.log('Successfully parsed', extractedAds.length, 'ads from schema structure');
        } else if (Array.isArray(parsedExtract)) {
          extractedAds = parsedExtract;
          console.log('Successfully parsed', extractedAds.length, 'ads from array structure');
        } else if (parsedExtract && typeof parsedExtract === 'object') {
          extractedAds = [parsedExtract];
          console.log('Found single ad object from LLM extraction');
        }
      } catch (parseError) {
        console.error('Failed to parse LLM extraction:', parseError);
      }
    }

    // Fallback: extract from content if no ads found
    if (extractedAds.length === 0) {
      console.log('No ads from LLM extraction, trying content parsing');
      const content = data.data?.content || '';
      console.log('Content length:', content.length);

      if (content.length > 100) {
        // Split content into potential ad sections
        const sections = content.split(/\n\s*\n/).filter(section => 
          section.trim().length > 50 && 
          section.trim().length < 1500
        );
        
        console.log('Found', sections.length, 'content sections');
        
        // Extract more ads without artificial limit
        extractedAds = sections.slice(0, 15).map((section, index) => ({
          ad_title: `${competitorName} - Anúncio ${index + 1}`,
          ad_copy: section.trim().substring(0, 500) + (section.length > 500 ? '...' : ''),
          call_to_action: 'Ver mais',
          ad_type: 'text',
          estimated_performance: 'medium',
          platforms: 'Facebook',
          notes: 'Extraído do conteúdo da página'
        }));
      }
    }

    // Ensure we have at least one ad
    if (extractedAds.length === 0) {
      extractedAds = [{
        ad_title: `${competitorName} - Conteúdo extraído`,
        ad_copy: data.data?.content?.substring(0, 200) || 'Conteúdo não disponível',
        call_to_action: 'Ver anúncio',
        ad_type: 'unknown',
        estimated_performance: 'medium',
        platforms: 'Facebook',
        notes: 'Fallback - conteúdo básico extraído'
      }];
    }

    console.log('=== FINAL RESULT ===');
    console.log('Total ads extracted:', extractedAds.length);
    console.log('Ads:', extractedAds);

    return new Response(JSON.stringify({ 
      success: true, 
      ads: extractedAds,
      originalUrl: url,
      competitorId: competitorId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR IN FUNCTION ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      errorType: error.name
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});