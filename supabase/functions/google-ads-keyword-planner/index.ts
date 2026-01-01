import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidGoogleAdsToken } from "../_shared/googleAdsTokenRefresh.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KeywordIdea {
  keyword: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: Array<{
    year: number;
    month: string;
    monthlySearches: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      action,
      companyId, 
      customerId,
      keywords = [], 
      pageUrl,
      language = '1014', // Portuguese
      geoTargetLocation = '2076', // Brazil
      includeAdultKeywords = false,
    } = await req.json();

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    console.log('Keyword Planner request:', { action, companyId, customerId, keywords, pageUrl });

    // Validar que o usuário tem acesso à empresa
    const { data: membership, error: membershipError } = await supabaseClient
      .from('company_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      console.error('User not a member of company:', { userId: user.id, companyId });
      return new Response(
        JSON.stringify({ error: 'You do not have access to this company' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar integração ativa
    const { data: integration, error: integrationError } = await supabaseClient
      .from('google_ads_integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Google Ads integration not found or inactive. Please connect your Google Ads account first.');
    }

    // Obter token válido (renova automaticamente se necessário)
    const { accessToken, wasRefreshed } = await getValidGoogleAdsToken(supabaseClient, integration);
    if (wasRefreshed) {
      console.log('Token was automatically refreshed');
    }

    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!developerToken) {
      throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN not configured');
    }

    // Buscar uma conta de ads válida para usar
    // IMPORTANTE: Keyword Planner não funciona em contas "manager" (MCC). Preferimos sempre uma conta não-manager.
    let targetCustomerId = customerId;
    let loginCustomerId: string | undefined;

    if (!targetCustomerId) {
      const { data: accounts, error: accountsError } = await supabaseClient
        .from('google_ads_accounts')
        .select('google_customer_id, is_manager, status, account_name, parent_customer_id, updated_at')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('status', 'ENABLED')
        .neq('is_manager', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (accountsError) {
        throw new Error('Failed to load Google Ads accounts for this company');
      }

      if (accounts && accounts.length > 0) {
        targetCustomerId = accounts[0].google_customer_id;
        loginCustomerId = accounts[0].parent_customer_id ?? undefined;
        console.log('Selected Google Ads account for Keyword Planner:', {
          google_customer_id: accounts[0].google_customer_id,
          account_name: accounts[0].account_name,
          status: accounts[0].status,
          is_manager: accounts[0].is_manager,
          parent_customer_id: accounts[0].parent_customer_id,
        });
      } else {
        throw new Error(
          'Nenhuma conta Google Ads ativa/ENABLED e "não-manager" encontrada. O Keyword Planner não é suportado em contas MCC (manager).'
        );
      }
    } else {
      // Se o frontend informou o customerId, tentamos descobrir o parent (login-customer-id)
      const { data: acct, error: acctError } = await supabaseClient
        .from('google_ads_accounts')
        .select('parent_customer_id, is_manager, status')
        .eq('company_id', companyId)
        .eq('google_customer_id', targetCustomerId)
        .maybeSingle();

      if (!acctError && acct) {
        if (acct.is_manager) {
          throw new Error('O Keyword Planner não é suportado em contas MCC (manager).');
        }
        if (acct.status && acct.status !== 'ENABLED') {
          throw new Error('A conta Google Ads selecionada não está ENABLED.');
        }
        loginCustomerId = acct.parent_customer_id ?? undefined;
      }
    }

    const cleanCustomerId = targetCustomerId.replace(/[-\s]/g, '');
    const cleanLoginCustomerId = loginCustomerId
      ? String(loginCustomerId).replace(/[-\s]/g, '')
      : undefined;

    console.log('Keyword Planner resolved ids:', {
      customerId: cleanCustomerId,
      loginCustomerId: cleanLoginCustomerId,
    });
    if (action === 'generateKeywordIdeas') {
      const result = await generateKeywordIdeas({
        accessToken,
        developerToken,
        customerId: cleanCustomerId,
        loginCustomerId: cleanLoginCustomerId,
        keywords,
        pageUrl,
        language,
        geoTargetLocation,
        includeAdultKeywords,
      });

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'getHistoricalMetrics') {
      const result = await getHistoricalMetrics({
        accessToken,
        developerToken,
        customerId: cleanCustomerId,
        loginCustomerId: cleanLoginCustomerId,
        keywords,
        language,
        geoTargetLocation,
      });

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action. Use "generateKeywordIdeas" or "getHistoricalMetrics"');

  } catch (error: any) {
    console.error('Error in google-ads-keyword-planner:', error);
    
    // Verificar se é um erro estruturado do Google Ads
    if (error?.isGoogleAdsError) {
      return new Response(
        JSON.stringify({
          error: 'Google Ads API error',
          google: error.google,
          meta: error.meta,
        }),
        { 
          status: 502, // Bad Gateway - erro de upstream
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateKeywordIdeas({
  accessToken,
  developerToken,
  customerId,
  loginCustomerId,
  keywords,
  pageUrl,
  language,
  geoTargetLocation,
  includeAdultKeywords,
}: {
  accessToken: string;
  developerToken: string;
  customerId: string;
  loginCustomerId?: string;
  keywords: string[];
  pageUrl?: string;
  language: string;
  geoTargetLocation: string;
  includeAdultKeywords: boolean;
}): Promise<KeywordIdea[]> {
  
  const requestBody: any = {
    language: `languageConstants/${language}`,
    geoTargetConstants: [`geoTargetConstants/${geoTargetLocation}`],
    includeAdultKeywords,
    keywordPlanNetwork: 'GOOGLE_SEARCH',
  };

  // Adicionar seed de keywords ou URL
  if (keywords.length > 0) {
    requestBody.keywordSeed = { keywords };
  } else if (pageUrl) {
    requestBody.urlSeed = { url: pageUrl };
  } else {
    throw new Error('Either keywords or pageUrl must be provided');
  }

  console.log('Generating keyword ideas with:', JSON.stringify(requestBody));

  // Use v18 of the API with the correct endpoint format
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };

  // Se estivermos acessando uma conta via MCC, isso costuma ser necessário
  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId;
  }

  const response = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}:generateKeywordIdeas`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Ads API Error (generateKeywordIdeas):', errorText);
    
    let googleError = {
      code: response.status,
      status: 'ERROR',
      message: 'Failed to generate keyword ideas',
    };
    
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error) {
        googleError = {
          code: errorJson.error.code || response.status,
          status: errorJson.error.status || 'ERROR',
          message: errorJson.error.message || 'Unknown error from Google Ads API',
        };
      }
    } catch {
      googleError.message = 'Please verify your Google Ads account has the Keyword Planner enabled.';
    }
    
    // Retornar erro estruturado com status 502 (upstream error)
    throw {
      isGoogleAdsError: true,
      google: googleError,
      meta: { customerId, loginCustomerId, action: 'generateKeywordIdeas' },
    };
  }

  const data = await response.json();
  console.log('Keyword ideas received:', data.results?.length || 0, 'results');

  if (!data.results) {
    return [];
  }

  return data.results.map((result: any) => {
    const metrics = result.keywordIdeaMetrics || {};
    
    return {
      keyword: result.text || '',
      avgMonthlySearches: parseInt(metrics.avgMonthlySearches || '0'),
      competition: metrics.competition || 'UNSPECIFIED',
      competitionIndex: parseInt(metrics.competitionIndex || '0'),
      lowTopOfPageBidMicros: parseInt(metrics.lowTopOfPageBidMicros || '0'),
      highTopOfPageBidMicros: parseInt(metrics.highTopOfPageBidMicros || '0'),
      monthlySearchVolumes: (metrics.monthlySearchVolumes || []).map((vol: any) => ({
        year: vol.year,
        month: vol.month,
        monthlySearches: parseInt(vol.monthlySearches || '0'),
      })),
    };
  });
}

async function getHistoricalMetrics({
  accessToken,
  developerToken,
  customerId,
  loginCustomerId,
  keywords,
  language,
  geoTargetLocation,
}: {
  accessToken: string;
  developerToken: string;
  customerId: string;
  loginCustomerId?: string;
  keywords: string[];
  language: string;
  geoTargetLocation: string;
}): Promise<KeywordIdea[]> {
  
  if (keywords.length === 0) {
    throw new Error('Keywords are required for historical metrics');
  }

  const requestBody = {
    keywords,
    language: `languageConstants/${language}`,
    geoTargetConstants: [`geoTargetConstants/${geoTargetLocation}`],
    keywordPlanNetwork: 'GOOGLE_SEARCH',
  };

  console.log('Getting historical metrics for:', keywords);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };

  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId;
  }

  const response = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}:generateKeywordHistoricalMetrics`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Ads API Error (getHistoricalMetrics):', errorText);
    
    let googleError = {
      code: response.status,
      status: 'ERROR',
      message: 'Failed to get historical metrics',
    };
    
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error) {
        googleError = {
          code: errorJson.error.code || response.status,
          status: errorJson.error.status || 'ERROR',
          message: errorJson.error.message || 'Unknown error from Google Ads API',
        };
      }
    } catch {
      googleError.message = 'Please verify your Google Ads account has the Keyword Planner enabled.';
    }
    
    throw {
      isGoogleAdsError: true,
      google: googleError,
      meta: { customerId, loginCustomerId, action: 'getHistoricalMetrics' },
    };
  }

  const data = await response.json();
  console.log('Historical metrics received:', data.results?.length || 0, 'results');

  if (!data.results) {
    return [];
  }

  return data.results.map((result: any) => {
    const metrics = result.keywordMetrics || {};
    
    return {
      keyword: result.text || '',
      avgMonthlySearches: parseInt(metrics.avgMonthlySearches || '0'),
      competition: metrics.competition || 'UNSPECIFIED',
      competitionIndex: parseInt(metrics.competitionIndex || '0'),
      lowTopOfPageBidMicros: parseInt(metrics.lowTopOfPageBidMicros || '0'),
      highTopOfPageBidMicros: parseInt(metrics.highTopOfPageBidMicros || '0'),
      monthlySearchVolumes: (metrics.monthlySearchVolumes || []).map((vol: any) => ({
        year: vol.year,
        month: vol.month,
        monthlySearches: parseInt(vol.monthlySearches || '0'),
      })),
    };
  });
}
