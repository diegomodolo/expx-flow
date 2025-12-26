import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProspectRequest {
  state: string;
  city: string;
  businessType: string;
  quantity?: number;
  requirePhone?: boolean;
  requireEmail?: boolean;
  requireWebsite?: boolean;
  requireAddress?: boolean;
}

interface ExtractedLead {
  nome_fantasia: string | null;
  razao_social: string | null;
  website: string | null;
  phone: string | null;
  phone_2: string | null;
  email: string | null;
  endereco: string | null;
  cnpj: string | null;
  source_url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      state, 
      city, 
      businessType, 
      quantity = 10,
      requirePhone = false,
      requireEmail = false,
      requireWebsite = false,
      requireAddress = false,
    }: ProspectRequest = await req.json();

    if (!state || !city || !businessType) {
      return new Response(
        JSON.stringify({ success: false, error: 'state, city e businessType são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable AI não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedLeads: ExtractedLead[] = [];
    let searchPage = 0;
    const maxPages = 5; // Limit to prevent infinite loops
    const searchVariations = [
      `${businessType} em ${city} ${state} contato telefone email`,
      `${businessType} ${city} ${state} site telefone`,
      `lista ${businessType} ${city} ${state}`,
      `${businessType} perto de ${city} ${state} endereço`,
      `melhores ${businessType} ${city} ${state} contato`,
    ];

    // Keep searching until we have enough leads or exhausted search variations
    while (extractedLeads.length < quantity && searchPage < maxPages) {
      const searchQuery = searchVariations[searchPage] || `${businessType} em ${city} ${state} página ${searchPage + 1}`;
      console.log(`Search page ${searchPage + 1}, query:`, searchQuery);

      // Search using Firecrawl
      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 20,
          lang: 'pt',
          country: 'BR',
          scrapeOptions: {
            formats: ['markdown'],
          },
        }),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Firecrawl search error:', searchResponse.status, errorText);
        searchPage++;
        continue;
      }

      const searchData = await searchResponse.json();
      console.log('Search results:', searchData.data?.length || 0, 'items');

      if (!searchData.data || searchData.data.length === 0) {
        searchPage++;
        continue;
      }

      // Process each result with Lovable AI
      for (const result of searchData.data) {
        if (extractedLeads.length >= quantity) break;
        if (!result.markdown && !result.description) continue;

        const content = result.markdown || result.description || '';
        const url = result.url || '';
        const title = result.title || '';

        // Skip if we already have a lead from this URL
        if (extractedLeads.some(l => l.source_url === url)) continue;

        console.log('Processing:', title);

        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `Você é um extrator de dados de empresas. Extraia informações de contato de empresas do conteúdo fornecido.
                  
IMPORTANTE:
- Extraia APENAS informações claramente visíveis no texto
- NÃO invente ou preencha informações não encontradas
- Retorne null para campos não encontrados
- Telefones devem estar no formato brasileiro (com DDD)
- Emails devem ser válidos
- CNPJ deve ter 14 dígitos (sem formatação)`
                },
                {
                  role: 'user',
                  content: `URL: ${url}
Título: ${title}
Conteúdo: ${content.substring(0, 3000)}

Extraia as informações da empresa.`
                }
              ],
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'extract_lead_data',
                    description: 'Extrai dados estruturados de uma empresa',
                    parameters: {
                      type: 'object',
                      properties: {
                        nome_fantasia: { type: 'string', description: 'Nome fantasia da empresa', nullable: true },
                        razao_social: { type: 'string', description: 'Razão social da empresa', nullable: true },
                        website: { type: 'string', description: 'URL do website', nullable: true },
                        phone: { type: 'string', description: 'Telefone principal com DDD', nullable: true },
                        phone_2: { type: 'string', description: 'Telefone secundário com DDD', nullable: true },
                        email: { type: 'string', description: 'Email de contato', nullable: true },
                        endereco: { type: 'string', description: 'Endereço completo', nullable: true },
                        cnpj: { type: 'string', description: 'CNPJ sem formatação (14 dígitos)', nullable: true },
                      },
                      required: ['nome_fantasia'],
                    }
                  }
                }
              ],
              tool_choice: { type: 'function', function: { name: 'extract_lead_data' } },
            }),
          });

          if (!aiResponse.ok) {
            console.error('AI extraction error:', aiResponse.status);
            continue;
          }

          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

          if (toolCall?.function?.arguments) {
            const extractedData = JSON.parse(toolCall.function.arguments);
            
            // Only add if we have at least a name
            if (extractedData.nome_fantasia) {
              const lead: ExtractedLead = {
                ...extractedData,
                source_url: url,
                website: extractedData.website || url,
              };

              // Check if lead meets filter requirements
              const meetsRequirements = 
                (!requirePhone || lead.phone) &&
                (!requireEmail || lead.email) &&
                (!requireWebsite || lead.website) &&
                (!requireAddress || lead.endereco);

              if (meetsRequirements) {
                extractedLeads.push(lead);
                console.log('Added lead:', extractedData.nome_fantasia, `(${extractedLeads.length}/${quantity})`);
              } else {
                console.log('Skipped lead (missing required fields):', extractedData.nome_fantasia);
              }
            }
          }
        } catch (aiError) {
          console.error('Error processing result:', aiError);
          continue;
        }
      }

      searchPage++;
    }

    console.log('Total leads extracted:', extractedLeads.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        leads: extractedLeads,
        total: extractedLeads.length,
        query: searchVariations[0],
        pagesSearched: searchPage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in prospect-google-leads:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
