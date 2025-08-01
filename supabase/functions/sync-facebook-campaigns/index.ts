import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    let requestBody
    try {
      requestBody = await req.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      throw new Error('Invalid request body')
    }

    const { clientId } = requestBody

    if (!clientId) {
      console.error('Client ID missing from request:', requestBody)
      throw new Error('Client ID is required')
    }

    console.log('Syncing campaigns for client:', clientId)

    // Get client info
    console.log('Fetching client data...')
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError) {
      console.error('Error fetching client:', clientError)
      throw new Error('Client not found')
    }

    console.log('Client found:', { id: client.id, name: client.name, ad_account_id: client.ad_account_id })

    if (!client.ad_account_id) {
      console.log('No ad account linked to this client')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No ad account linked',
          data: { active_campaigns: 0, avg_cpl: 0, leads_generated: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get ad account info
    console.log('Fetching ad account data for ID:', client.ad_account_id)
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('*')
      .eq('id', client.ad_account_id)
      .single()

    if (adAccountError) {
      console.error('Error fetching ad account:', adAccountError)
      throw new Error('Ad account not found')
    }

    console.log('Ad account found:', { id: adAccount.id, account_id: adAccount.account_id, integration_id: adAccount.integration_id })

    // Get integration info
    console.log('Fetching integration data for ID:', adAccount.integration_id)
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('id', adAccount.integration_id)
      .single()

    if (integrationError) {
      console.error('Error fetching integration:', integrationError)
      throw new Error('Facebook integration not found')
    }

    console.log('Integration found:', { id: integration.id, is_active: integration.is_active })

    const accessToken = integration.access_token
    const accountId = adAccount.account_id

    console.log('Fetching campaigns for account:', accountId)

    // Fetch campaigns from Facebook API
    const campaignsResponse = await fetch(
      `https://graph.facebook.com/v20.0/act_${accountId}/campaigns?fields=id,name,status,insights{impressions,clicks,spend,actions}&access_token=${accessToken}`
    )

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text()
      console.error('Facebook API error:', errorText)
      throw new Error('Failed to fetch campaigns from Facebook')
    }

    const campaignsData = await campaignsResponse.json()
    console.log('Facebook campaigns response:', campaignsData)

    if (campaignsData.error) {
      console.error('Facebook API error:', campaignsData.error)
      throw new Error(campaignsData.error.message || 'Facebook API error')
    }

    const campaigns = campaignsData.data || []
    
    // Calculate metrics
    let activeCampaigns = 0
    let totalSpend = 0
    let totalLeads = 0
    let totalClicks = 0

    campaigns.forEach((campaign: any) => {
      if (campaign.status === 'ACTIVE') {
        activeCampaigns++
      }

      const insights = campaign.insights?.data?.[0]
      if (insights) {
        totalSpend += parseFloat(insights.spend || 0)
        totalClicks += parseInt(insights.clicks || 0)
        
        // Count leads from actions
        if (insights.actions) {
          insights.actions.forEach((action: any) => {
            if (action.action_type === 'lead' || action.action_type === 'complete_registration') {
              totalLeads += parseInt(action.value || 0)
            }
          })
        }
      }
    })

    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0

    const metricsData = {
      active_campaigns: activeCampaigns,
      avg_cpl: avgCpl,
      leads_generated: totalLeads
    }

    console.log('Calculated metrics:', metricsData)

    // Update client with real data
    const { error: updateError } = await supabase
      .from('clients')
      .update(metricsData)
      .eq('id', clientId)

    if (updateError) {
      console.error('Error updating client:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaigns synced successfully',
        data: metricsData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sync-facebook-campaigns:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})