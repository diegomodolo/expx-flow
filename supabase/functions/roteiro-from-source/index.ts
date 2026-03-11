import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') ?? 'https://controledetrafego.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, url } = await req.json();

    if (!url || !type) {
      return new Response(
        JSON.stringify({ error: 'type and url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let contentToAnalyze = '';
    let suggestedName = '';

    if (type === 'youtube') {
      // Extract video ID from YouTube URL
      const videoId = extractYouTubeId(url);
      if (!videoId) {
        return new Response(
          JSON.stringify({ error: 'URL do YouTube inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const API_BASE = 'https://refreshing-beauty-production-f560.up.railway.app';

      // Try Railway /info endpoint first for richer data
      try {
        const infoRes = await fetch(`${API_BASE}/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: youtubeUrl }),
        });

        if (infoRes.ok) {
          const info = await infoRes.json();
          suggestedName = info.title || '';
          contentToAnalyze = `Título do vídeo: ${info.title || ''}\nCanal: ${info.channel || ''}\nDuração: ${info.duration_string || ''}\nVisualizações: ${info.view_count || ''}\nDescrição: ${info.description || ''}`;
          console.log('Got video info from Railway API:', suggestedName);
        }
      } catch (e) {
        console.log('Railway /info failed, falling back to oEmbed:', e);
      }

      // Fallback: oEmbed + page scraping
      if (!suggestedName) {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${youtubeUrl}&format=json`);
        if (oembedRes.ok) {
          const oembed = await oembedRes.json();
          suggestedName = oembed.title || '';
          contentToAnalyze = `Título do vídeo: ${oembed.title}\nAutor: ${oembed.author_name}`;
        }

        try {
          const transcriptRes = await fetch(youtubeUrl);
          const html = await transcriptRes.text();
          const descMatch = html.match(/<meta name="description" content="([^"]*)">/);
          if (descMatch) contentToAnalyze += `\nDescrição: ${descMatch[1]}`;
          const kwMatch = html.match(/<meta name="keywords" content="([^"]*)">/);
          if (kwMatch) contentToAnalyze += `\nPalavras-chave: ${kwMatch[1]}`;
        } catch (e) {
          console.log('Could not fetch YouTube page details:', e);
        }
      }
    } else if (type === 'url') {
      // Try Firecrawl first if available
      const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
      
      if (firecrawlKey) {
        try {
          const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url,
              formats: ['markdown'],
              onlyMainContent: true,
            }),
          });

          if (scrapeRes.ok) {
            const scrapeData = await scrapeRes.json();
            contentToAnalyze = scrapeData.data?.markdown || scrapeData.markdown || '';
            suggestedName = scrapeData.data?.metadata?.title || scrapeData.metadata?.title || '';
          }
        } catch (e) {
          console.log('Firecrawl failed, falling back to basic fetch:', e);
        }
      }

      // Fallback: basic fetch
      if (!contentToAnalyze) {
        try {
          const pageRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' },
          });
          const html = await pageRes.text();

          // Extract title
          const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
          suggestedName = titleMatch?.[1]?.trim() || '';

          // Extract meta description
          const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
          
          // Extract text content (basic)
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          if (bodyMatch) {
            contentToAnalyze = bodyMatch[1]
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 5000);
          }

          if (metaDesc) {
            contentToAnalyze = `Descrição: ${metaDesc[1]}\n\n${contentToAnalyze}`;
          }
        } catch (e) {
          console.error('Failed to fetch URL:', e);
          return new Response(
            JSON.stringify({ error: 'Não foi possível acessar a URL fornecida' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Build a concise objetivo from the extracted content
    const objetivo = contentToAnalyze.slice(0, 2000);

    return new Response(
      JSON.stringify({
        nome: suggestedName.slice(0, 200),
        objetivo: objetivo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in roteiro-from-source:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar a fonte' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
