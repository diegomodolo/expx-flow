import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramFollower {
  pk: string;
  username: string;
  full_name: string;
  is_private: boolean;
  is_verified: boolean;
  profile_pic_url: string;
  biography?: string;
  external_url?: string;
  emails?: string[];
  phones?: string[];
  social_links?: string[];
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
  instagram_username: string;
  profile_url: string;
  is_verified: boolean;
  is_business: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      targetUsername, 
      maxResults = 50, 
      extractContacts = true,
      requireEmail = false,
      requirePhone = false,
      instagramCookies 
    } = await req.json();

    console.log(`Starting Instagram follower extraction for @${targetUsername}`);
    console.log(`Max results: ${maxResults}, Extract contacts: ${extractContacts}`);

    if (!targetUsername) {
      return new Response(
        JSON.stringify({ success: false, error: "Username do perfil alvo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const APIFY_API_TOKEN = Deno.env.get('APIFY_API_TOKEN');
    if (!APIFY_API_TOKEN) {
      console.error('APIFY_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: "Token da API Apify não configurado" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse cookies if provided as string
    let parsedCookies = instagramCookies;
    if (typeof instagramCookies === 'string') {
      try {
        parsedCookies = JSON.parse(instagramCookies);
      } catch {
        console.error('Failed to parse cookies as JSON');
        return new Response(
          JSON.stringify({ success: false, error: "Formato de cookies inválido. Use JSON válido." }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate cookies structure
    if (!parsedCookies || !Array.isArray(parsedCookies) || parsedCookies.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Cookies do Instagram são obrigatórios. Forneça um array com sessionid, csrftoken e ds_user_id." 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start Apify Actor run
    console.log('Starting Apify Instagram Followers Scraper actor...');
    
    const actorInput = {
      username: targetUsername.replace('@', ''),
      max_results: Math.min(maxResults, 1000), // Cap at 1000 for safety
      cookies: parsedCookies,
    };

    const startResponse = await fetch(
      `https://api.apify.com/v2/acts/logical_scrapers~instagram-followers-scraper/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actorInput),
      }
    );

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error('Failed to start Apify actor:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Falha ao iniciar scraper: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startData = await startResponse.json();
    const runId = startData.data?.id;
    
    if (!runId) {
      console.error('No run ID returned from Apify');
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao obter ID da execução" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Apify run started with ID: ${runId}`);

    // Poll for completion (max 5 minutes)
    const maxPollingTime = 5 * 60 * 1000; // 5 minutes
    const pollingInterval = 5000; // 5 seconds
    const startTime = Date.now();
    let runStatus = 'RUNNING';

    while (runStatus === 'RUNNING' || runStatus === 'READY') {
      if (Date.now() - startTime > maxPollingTime) {
        console.error('Polling timeout reached');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Tempo limite excedido. A extração pode ainda estar em andamento." 
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await new Promise(resolve => setTimeout(resolve, pollingInterval));

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );

      if (!statusResponse.ok) {
        console.error('Failed to check run status');
        continue;
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.data?.status;
      console.log(`Run status: ${runStatus}`);
    }

    if (runStatus !== 'SUCCEEDED') {
      console.error(`Run failed with status: ${runStatus}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Extração falhou com status: ${runStatus}. Verifique se os cookies são válidos.` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch results from dataset
    console.log('Fetching results from dataset...');
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
    );

    if (!datasetResponse.ok) {
      const errorText = await datasetResponse.text();
      console.error('Failed to fetch dataset:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao obter resultados do dataset" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const followers: InstagramFollower[] = await datasetResponse.json();
    console.log(`Retrieved ${followers.length} followers from dataset`);

    // Transform followers to leads format
    const leads: ExtractedLead[] = followers.map(follower => {
      // Extract email from biography if present
      const bioEmails = follower.biography?.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
      const allEmails = [...(follower.emails || []), ...bioEmails];
      
      // Extract phone from biography if present
      const bioPhones = follower.biography?.match(/[\+]?[(]?[0-9]{2,3}[)]?[-\s\.]?[0-9]{4,5}[-\s\.]?[0-9]{4,5}/g) || [];
      const allPhones = [...(follower.phones || []), ...bioPhones];

      // Detect if it's likely a business account (has external URL, email, or business keywords in bio)
      const businessKeywords = ['empresa', 'loja', 'store', 'shop', 'contato', 'contact', 'whatsapp', 'atendimento'];
      const hasBusiness = businessKeywords.some(kw => 
        follower.biography?.toLowerCase().includes(kw)
      ) || allEmails.length > 0 || follower.external_url;

      return {
        nome_fantasia: follower.full_name || follower.username,
        razao_social: null,
        website: follower.external_url || null,
        phone: allPhones[0] || null,
        phone_2: allPhones[1] || null,
        email: allEmails[0] || null,
        endereco: null,
        cnpj: null,
        instagram_username: follower.username,
        profile_url: `https://instagram.com/${follower.username}`,
        is_verified: follower.is_verified,
        is_business: !!hasBusiness,
      };
    });

    // Apply filters
    let filteredLeads = leads;

    if (requireEmail) {
      filteredLeads = filteredLeads.filter(lead => lead.email);
    }

    if (requirePhone) {
      filteredLeads = filteredLeads.filter(lead => lead.phone);
    }

    console.log(`Returning ${filteredLeads.length} leads after filtering`);

    return new Response(
      JSON.stringify({
        success: true,
        leads: filteredLeads,
        totalFound: followers.length,
        filtered: filteredLeads.length,
        targetUsername,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in prospect-instagram-followers:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro interno do servidor" 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
