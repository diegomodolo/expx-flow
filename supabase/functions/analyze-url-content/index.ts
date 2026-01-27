import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  score: number;
  compatible: boolean;
  summary: string;
  issues: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url_id, url_ids, company_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine which URLs to analyze
    let urlsToAnalyze: string[] = [];
    
    if (url_id) {
      urlsToAnalyze = [url_id];
    } else if (url_ids && Array.isArray(url_ids)) {
      urlsToAnalyze = url_ids;
    } else if (company_id) {
      // Get all active URLs with status 'ok' that have clients with briefing
      const { data: urls, error } = await supabase
        .from('client_urls')
        .select('id')
        .eq('company_id', company_id)
        .eq('is_active', true)
        .eq('validation_status', 'ok');
      
      if (error) throw error;
      urlsToAnalyze = (urls || []).map(u => u.id);
    }

    if (urlsToAnalyze.length === 0) {
      return new Response(
        JSON.stringify({ success: true, analyzed: 0, message: 'Nenhuma URL para analisar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${urlsToAnalyze.length} URLs`);

    const results: { url_id: string; success: boolean; score?: number; error?: string }[] = [];

    for (const urlId of urlsToAnalyze) {
      try {
        // Get URL and client info
        const { data: urlData, error: urlError } = await supabase
          .from('client_urls')
          .select(`
            id,
            url,
            client_id,
            clients!inner(id, name, ai_briefing)
          `)
          .eq('id', urlId)
          .single();

        if (urlError || !urlData) {
          console.error(`URL not found: ${urlId}`);
          results.push({ url_id: urlId, success: false, error: 'URL não encontrada' });
          continue;
        }

        const client = urlData.clients as any;
        const aiBriefing = client?.ai_briefing;

        if (!aiBriefing || aiBriefing.trim().length < 20) {
          console.log(`Client ${client?.name} has no briefing, skipping`);
          results.push({ 
            url_id: urlId, 
            success: false, 
            error: 'Cliente sem briefing configurado' 
          });
          continue;
        }

        console.log(`Scraping URL: ${urlData.url}`);

        // Scrape the URL using Firecrawl
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: urlData.url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          console.error(`Firecrawl error: ${scrapeResponse.status} - ${errorText}`);
          results.push({ 
            url_id: urlId, 
            success: false, 
            error: `Erro ao extrair conteúdo: ${scrapeResponse.status}` 
          });
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const pageContent = scrapeData.data?.markdown || scrapeData.markdown || '';

        if (!pageContent || pageContent.length < 50) {
          console.log(`No content found for URL: ${urlData.url}`);
          
          // Update with suspicious status due to no content
          await supabase
            .from('client_urls')
            .update({
              content_match_score: 0,
              content_analysis_summary: 'Página sem conteúdo legível detectado',
              content_analyzed_at: new Date().toISOString(),
              validation_status: 'suspicious',
            })
            .eq('id', urlId);

          results.push({ url_id: urlId, success: true, score: 0 });
          continue;
        }

        console.log(`Content extracted (${pageContent.length} chars), analyzing with AI...`);

        // Truncate content if too long (max ~8000 chars)
        const truncatedContent = pageContent.length > 8000 
          ? pageContent.substring(0, 8000) + '\n\n[... conteúdo truncado ...]'
          : pageContent;

        // Analyze with Lovable AI
        const analysisPrompt = `Você é um analista de segurança de marketing digital especializado em detectar páginas hackeadas ou com conteúdo incompatível.

BRIEFING DO CLIENTE (${client.name}):
${aiBriefing}

CONTEÚDO DA PÁGINA:
${truncatedContent}

Analise se o conteúdo da página é compatível com o briefing do cliente.

CRITÉRIOS DE ANÁLISE:
1. O conteúdo fala sobre o mesmo produto/serviço mencionado no briefing?
2. A linguagem e tom estão adequados ao negócio do cliente?
3. Há sinais de hacking? (conteúdo de apostas, cassinos, farmácias, produtos ilegais, links suspeitos, spam)
4. O domínio/marca mencionado corresponde ao esperado?
5. O conteúdo parece autêntico e profissional para o negócio?

IMPORTANTE: Seja rigoroso! Qualquer conteúdo que não faça sentido para o negócio do cliente deve reduzir significativamente o score.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Você responde APENAS em JSON válido, sem markdown ou texto adicional.' },
              { role: 'user', content: analysisPrompt }
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'analyze_content',
                  description: 'Retorna a análise de compatibilidade do conteúdo da página com o briefing do cliente',
                  parameters: {
                    type: 'object',
                    properties: {
                      score: { 
                        type: 'number', 
                        description: 'Score de 0-100. 80-100 = compatível, 50-79 = parcialmente, 0-49 = suspeito/incompatível' 
                      },
                      compatible: { 
                        type: 'boolean', 
                        description: 'true se o conteúdo é compatível com o briefing' 
                      },
                      summary: { 
                        type: 'string', 
                        description: 'Resumo em 1-2 frases explicando a análise' 
                      },
                      issues: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Lista de problemas encontrados (vazio se nenhum)' 
                      }
                    },
                    required: ['score', 'compatible', 'summary', 'issues'],
                    additionalProperties: false
                  }
                }
              }
            ],
            tool_choice: { type: 'function', function: { name: 'analyze_content' } }
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI error: ${aiResponse.status} - ${errorText}`);
          results.push({ 
            url_id: urlId, 
            success: false, 
            error: `Erro na análise de IA: ${aiResponse.status}` 
          });
          continue;
        }

        const aiData = await aiResponse.json();
        console.log('AI Response:', JSON.stringify(aiData, null, 2));

        // Extract the analysis from tool call
        let analysis: AnalysisResult;
        
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            analysis = JSON.parse(toolCall.function.arguments);
          } catch (parseError) {
            console.error('Failed to parse tool call arguments:', parseError);
            // Try to extract from content as fallback
            const content = aiData.choices?.[0]?.message?.content || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysis = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('Could not parse AI response');
            }
          }
        } else {
          // Fallback: try to parse from content
          const content = aiData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid response from AI');
          }
        }

        console.log(`Analysis result for ${urlData.url}: score=${analysis.score}, compatible=${analysis.compatible}`);

        // Determine new validation status
        const newStatus = analysis.score < 50 ? 'suspicious' : 
          (urlData as any).validation_status === 'suspicious' ? 'ok' : undefined;

        // Update the URL with analysis results
        const updateData: any = {
          content_match_score: analysis.score,
          content_analysis_summary: analysis.summary + (analysis.issues?.length > 0 ? ` Problemas: ${analysis.issues.join('; ')}` : ''),
          content_analyzed_at: new Date().toISOString(),
        };

        if (newStatus) {
          updateData.validation_status = newStatus;
        }

        await supabase
          .from('client_urls')
          .update(updateData)
          .eq('id', urlId);

        results.push({ url_id: urlId, success: true, score: analysis.score });

      } catch (urlError) {
        console.error(`Error analyzing URL ${urlId}:`, urlError);
        results.push({ 
          url_id: urlId, 
          success: false, 
          error: urlError instanceof Error ? urlError.message : 'Unknown error' 
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const suspicious = results.filter(r => r.success && r.score !== undefined && r.score < 50).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        analyzed: successful,
        suspicious: suspicious,
        total: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-url-content:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
