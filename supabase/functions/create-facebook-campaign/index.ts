import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateCampaignRequest {
  clientId: string
  name: string
  objective: string
  status: 'PAUSED' | 'ACTIVE'
  dailyBudget?: number
  lifetimeBudget?: number
  specialAdCategories?: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: CreateCampaignRequest = await req.json()
    const { clientId, name, objective, status, dailyBudget, lifetimeBudget, specialAdCategories } = body

    console.log('Create campaign request:', { clientId, name, objective, status })

    if (!clientId || !name || !objective) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientId, name, objective' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client with ad account
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, ad_account_id, company_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('Client not found:', clientError)
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!client.ad_account_id) {
      return new Response(
        JSON.stringify({ error: 'Cliente não possui conta de anúncios configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get ad account details
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('facebook_account_id, integration_id')
      .eq('id', client.ad_account_id)
      .single()

    if (adAccountError || !adAccount) {
      console.error('Ad account not found:', adAccountError)
      return new Response(
        JSON.stringify({ error: 'Conta de anúncios não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Facebook integration token
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token, token_expires_at')
      .eq('id', adAccount.integration_id)
      .single()

    if (integrationError || !integration) {
      console.error('Facebook integration not found:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Integração do Facebook não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check token expiration
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token do Facebook expirado. Por favor, reconecte a integração.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build campaign params for Meta API
    const campaignParams: Record<string, string> = {
      name,
      objective,
      status,
      access_token: integration.access_token,
    }

    // Add special ad categories if provided
    if (specialAdCategories && specialAdCategories.length > 0) {
      campaignParams.special_ad_categories = JSON.stringify(specialAdCategories)
    } else {
      campaignParams.special_ad_categories = JSON.stringify([])
    }

    // Add campaign budget optimization (CBO) with budget at campaign level
    if (dailyBudget && dailyBudget > 0) {
      campaignParams.daily_budget = String(Math.round(dailyBudget * 100)) // Meta uses cents
    }
    if (lifetimeBudget && lifetimeBudget > 0) {
      campaignParams.lifetime_budget = String(Math.round(lifetimeBudget * 100)) // Meta uses cents
    }

    console.log('Creating campaign on Meta:', { 
      adAccountId: adAccount.facebook_account_id,
      name,
      objective,
      dailyBudget,
      lifetimeBudget
    })

    // Create campaign on Meta
    const metaUrl = `https://graph.facebook.com/v21.0/act_${adAccount.facebook_account_id}/campaigns`
    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(campaignParams).toString()
    })

    const metaResult = await metaResponse.json()

    if (metaResult.error) {
      console.error('Meta API error:', metaResult.error)
      return new Response(
        JSON.stringify({ 
          error: `Erro ao criar campanha no Meta: ${metaResult.error.message}`,
          details: metaResult.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Campaign created on Meta:', metaResult)

    // Save campaign to local database
    const campaignData = {
      facebook_id: metaResult.id,
      client_id: clientId,
      company_id: client.company_id,
      user_id: user.id,
      name,
      status: status === 'ACTIVE' ? 'active' : 'paused',
      is_active: status === 'ACTIVE',
      objective,
      platforms: 'Meta',
      period: '30 dias',
      daily_budget: dailyBudget || null,
      lifetime_budget: lifetimeBudget || null,
      cpc: 0,
      ctr: 0,
      conversions: 0,
      spend: 0,
    }

    const { data: savedCampaign, error: saveError } = await supabase
      .from('campaigns')
      .insert(campaignData)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving campaign to database:', saveError)
      // Campaign was created on Meta but failed to save locally
      return new Response(
        JSON.stringify({ 
          success: true,
          warning: 'Campanha criada no Meta mas houve erro ao salvar localmente',
          facebook_id: metaResult.id,
          error: saveError.message
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Campaign saved to database:', savedCampaign.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaign: savedCampaign,
        facebook_id: metaResult.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
