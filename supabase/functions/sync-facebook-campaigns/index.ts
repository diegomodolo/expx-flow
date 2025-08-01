import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== Sync Facebook Campaigns Function Started ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )
    console.log('Supabase client created successfully')

    // Parse request body
    console.log('Parsing request body...')
    let requestBody
    try {
      const bodyText = await req.text()
      console.log('Raw request body:', bodyText)
      requestBody = JSON.parse(bodyText)
      console.log('Parsed request body:', requestBody)
    } catch (error) {
      console.error('Error parsing request body:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { clientId } = requestBody

    if (!clientId) {
      console.error('Client ID missing from request:', requestBody)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Client ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Processing sync for client ID:', clientId)

    // Get client info
    console.log('Fetching client data...')
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError) {
      console.error('Error fetching client:', clientError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error while fetching client' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!client) {
      console.error('Client not found for ID:', clientId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Client not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Client found:', { id: client.id, name: client.name, ad_account_id: client.ad_account_id })

    if (!client.ad_account_id) {
      console.log('No ad account linked to this client')
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          active_campaigns: 0, 
          avg_cpl: 0, 
          leads_generated: 0,
          status: 'red' // Emergencial - sem conta de anúncios
        })
        .eq('id', clientId)

      if (updateError) {
        console.error('Error updating client with default values:', updateError)
      }

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
      .maybeSingle()

    if (adAccountError) {
      console.error('Error fetching ad account:', adAccountError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error while fetching ad account' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!adAccount) {
      console.error('Ad account not found for ID:', client.ad_account_id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Ad account not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Ad account found:', { id: adAccount.id, account_id: adAccount.account_id, integration_id: adAccount.integration_id })

    // Get integration info
    console.log('Fetching integration data for ID:', adAccount.integration_id)
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('id', adAccount.integration_id)
      .maybeSingle()

    if (integrationError) {
      console.error('Error fetching integration:', integrationError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error while fetching integration' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!integration) {
      console.error('Integration not found for ID:', adAccount.integration_id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Facebook integration not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Integration found:', { id: integration.id, is_active: integration.is_active })

    if (!integration.is_active) {
      console.log('Integration is not active')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Facebook integration is not active' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const accessToken = integration.access_token
    const accountId = adAccount.account_id

    console.log('Fetching campaigns from Facebook for account:', accountId)

    // Fetch campaigns from Facebook API
    const facebookUrl = `https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=id,name,status,insights{impressions,clicks,spend,actions}&access_token=${accessToken}`
    console.log('Facebook API URL (without token):', facebookUrl.replace(accessToken, '[REDACTED]'))

    const campaignsResponse = await fetch(facebookUrl)
    console.log('Facebook API response status:', campaignsResponse.status)

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text()
      console.error('Facebook API error response:', errorText)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch campaigns from Facebook' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const campaignsData = await campaignsResponse.json()
    console.log('Facebook campaigns response data:', JSON.stringify(campaignsData, null, 2))

    if (campaignsData.error) {
      console.error('Facebook API error in response:', campaignsData.error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: campaignsData.error.message || 'Facebook API error' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const campaigns = campaignsData.data || []
    console.log('Number of campaigns found:', campaigns.length)
    
    // Calculate metrics
    let activeCampaigns = 0
    let totalSpend = 0
    let totalLeads = 0
    let totalClicks = 0

    campaigns.forEach((campaign: any) => {
      console.log('Processing campaign:', campaign.name, 'Status:', campaign.status)
      
      if (campaign.status === 'ACTIVE') {
        activeCampaigns++
      }

      const insights = campaign.insights?.data?.[0]
      if (insights) {
        const spend = parseFloat(insights.spend || 0)
        const clicks = parseInt(insights.clicks || 0)
        
        totalSpend += spend
        totalClicks += clicks
        
        console.log('Campaign insights:', { spend, clicks })
        
        // Count leads from actions
        if (insights.actions) {
          insights.actions.forEach((action: any) => {
            if (action.action_type === 'lead' || action.action_type === 'complete_registration') {
              const leads = parseInt(action.value || 0)
              totalLeads += leads
              console.log('Found leads:', leads, 'for action type:', action.action_type)
            }
          })
        }
      }
    })

    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0

    // Determine client status based on active campaigns
    let clientStatus = 'green' // Excelente
    if (activeCampaigns === 0) {
      clientStatus = 'red' // Emergencial
    } else if (activeCampaigns <= 2) {
      clientStatus = 'yellow' // Atenção
    }

    const metricsData = {
      active_campaigns: activeCampaigns,
      avg_cpl: avgCpl,
      leads_generated: totalLeads,
      status: clientStatus
    }

    console.log('Calculated metrics with status:', metricsData)

    // Update client with real data and status
    console.log('Updating client with new metrics and status...')
    const { error: updateError } = await supabase
      .from('clients')
      .update(metricsData)
      .eq('id', clientId)

    if (updateError) {
      console.error('Error updating client:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update client data' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Client updated successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaigns synced successfully',
        data: metricsData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== ERROR in sync-facebook-campaigns ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('=====================================')
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})