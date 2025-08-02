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
          includeHtml: false,
          includeRawHtml: false,
          onlyMainContent: true,
          waitFor: 2000
        }
      }),
    });

    console.log('Firecrawl response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firecrawl error:', errorText);
      
      // Return mock data on API error
      const mockAds = [
        {
          ad_title: `Anúncio de ${competitorName}`,
          ad_copy: 'Erro na API Firecrawl - dados de teste',
          call_to_action: 'Ver Mais',
          ad_type: 'unknown',
          estimated_performance: 'medium',
          platforms: 'Facebook',
          notes: `Erro da API: ${errorText}`
        }
      ];

      return new Response(JSON.stringify({ 
        success: true, 
        ads: mockAds,
        originalUrl: url,
        competitorId: competitorId,
        message: 'Retornando dados de teste devido a erro na API'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Firecrawl response data received');

    // Simple processing - create ads from content
    const content = data.data?.content || '';
    console.log('Content length:', content.length);

    const extractedAds = [
      {
        ad_title: `Anúncio extraído - ${competitorName}`,
        ad_copy: content.substring(0, 200) + '...',
        call_to_action: 'Ver Anúncio',
        ad_type: 'text',
        estimated_performance: 'medium',
        platforms: 'Facebook',
        notes: 'Extraído via Firecrawl'
      }
    ];

    console.log('=== RETURNING SUCCESS ===');
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