import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // For now, return mock data to test the integration
    const mockAds = [
      {
        ad_title: `Anúncio de teste - ${competitorName}`,
        ad_copy: 'Este é um anúncio de teste extraído da biblioteca de anúncios',
        call_to_action: 'Saiba Mais',
        ad_type: 'image',
        estimated_performance: 'medium',
        platforms: 'Facebook',
        notes: 'Anúncio de teste - funcionalidade em desenvolvimento'
      },
      {
        ad_title: `Segundo anúncio - ${competitorName}`,
        ad_copy: 'Outro exemplo de anúncio para testar a funcionalidade',
        call_to_action: 'Clique Aqui',
        ad_type: 'video',
        estimated_performance: 'high',
        platforms: 'Facebook, Instagram',
        notes: 'Anúncio de teste - funcionalidade em desenvolvimento'
      }
    ];

    console.log('Returning mock ads:', mockAds);

    return new Response(JSON.stringify({ 
      success: true, 
      ads: mockAds,
      originalUrl: url,
      competitorId: competitorId,
      message: 'Anúncios de teste retornados com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scrape-competitor-ads function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});