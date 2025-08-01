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

    const { clientId, period = '30', fullSync = false } = requestBody

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

    console.log('Processing sync for client ID:', clientId, 'Full sync:', fullSync)

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
    console.log('Using period:', period)
    
    // Map period to Facebook API parameters
    let dateParam = '';
    switch (period) {
      case '7':
        dateParam = '.date_preset(last_7d)';
        break;
      case '15':
        // For 15 days, we need to use time_range with specific dates
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const today = new Date();
        dateParam = `.time_range({"since":"${fifteenDaysAgo.toISOString().split('T')[0]}","until":"${today.toISOString().split('T')[0]}"})`;
        break;
      case '30':
        dateParam = '.date_preset(last_30d)';
        break;
      case '90':
        dateParam = '.date_preset(last_90d)';
        break;
      case 'lifetime':
        dateParam = '.date_preset(lifetime)';
        break;
      default:
        dateParam = '.date_preset(last_30d)'; // Default to 30 days
    }

    // Fetch campaigns from Facebook API with enhanced insights
    const facebookUrl = `https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=id,name,status,insights${dateParam}{impressions,clicks,spend,actions,reach,frequency,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&access_token=${accessToken}`
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
    
    // Calculate metrics and sync campaigns to database
    let activeCampaigns = 0
    let totalSpend = 0
    let totalLeads = 0
    let totalClicks = 0

    // First, remove existing data for this client
    const { error: deleteCampaignsError } = await supabase
      .from('campaigns')
      .delete()
      .eq('client_id', clientId)
    
    if (deleteCampaignsError) {
      console.error('Error deleting existing campaigns:', deleteCampaignsError)
    } else {
      console.log('Cleared existing campaigns for client')
    }

    // Only clear ad sets and ads if doing a full sync
    if (fullSync) {
      const { error: deleteAdSetsError } = await supabase
        .from('ad_sets')
        .delete()
        .eq('client_id', clientId)
      
      const { error: deleteAdsError } = await supabase
        .from('ads')
        .delete()
        .eq('client_id', clientId)
      
      if (deleteAdSetsError || deleteAdsError) {
        console.error('Error deleting existing ad sets/ads:', { deleteAdSetsError, deleteAdsError })
      } else {
        console.log('Cleared existing ad sets and ads for client')
      }
    }

    // Process each campaign
    for (const campaign of campaigns) {
      console.log('Processing campaign:', campaign.name, 'Status:', campaign.status)
      
      const isActive = campaign.status === 'ACTIVE'
      if (isActive) {
        activeCampaigns++
      }

      const insights = campaign.insights?.data?.[0]
      let spend = 0
      let clicks = 0
      let leads = 0
      let cpc = 0
      let ctr = 0
      let impressions = 0
      let reach = 0
      let frequency = 0
      let qualityRanking = null
      let engagementRateRanking = null
      let conversionRateRanking = null

      if (insights) {
        spend = parseFloat(insights.spend || 0)
        clicks = parseInt(insights.clicks || 0)
        impressions = parseInt(insights.impressions || 0)
        reach = parseInt(insights.reach || 0)
        frequency = parseFloat(insights.frequency || 0)
        qualityRanking = insights.quality_ranking || null
        engagementRateRanking = insights.engagement_rate_ranking || null
        conversionRateRanking = insights.conversion_rate_ranking || null
        
        totalSpend += spend
        totalClicks += clicks
        
        // Calculate CTR (Click Through Rate)
        ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
        
        console.log('Campaign insights:', { spend, clicks, impressions, reach, frequency, ctr })
        
        // Count leads from actions
        if (insights.actions) {
          insights.actions.forEach((action: any) => {
            if (action.action_type === 'lead' || action.action_type === 'complete_registration') {
              const actionLeads = parseInt(action.value || 0)
              leads += actionLeads
              totalLeads += actionLeads
              console.log('Found leads:', actionLeads, 'for action type:', action.action_type)
            }
          })
        }

        // Calculate CPC
        cpc = clicks > 0 ? spend / clicks : 0
      }

      // Save campaign to database
      const campaignData = {
        name: campaign.name,
        platforms: 'Facebook Ads',
        status: isActive ? 'active' : 'paused',
        is_active: isActive,
        ctr: ctr,
        cpc: cpc,
        cpa: leads > 0 ? spend / leads : 0,
        conversions: leads,
        spend: spend,
        impressions: impressions,
        reach: reach,
        frequency: frequency,
        quality_ranking: qualityRanking,
        engagement_rate_ranking: engagementRateRanking,
        conversion_rate_ranking: conversionRateRanking,
        client_id: clientId,
        user_id: client.user_id,
        company_id: client.company_id,
        period: '30 dias'
      }

      const { data: savedCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single()

      if (campaignError) {
        console.error('Error inserting campaign:', campaignError)
        continue
      } else {
        console.log('Campaign saved:', campaign.name)
      }

      // Only fetch ad sets and ads if doing a full sync
      if (!fullSync) {
        console.log('Skipping ad sets and ads sync (campaigns only)')
        continue
      }

      // Fetch ad sets for this campaign
      try {
        console.log('Fetching ad sets for campaign:', campaign.id)
        const adSetsUrl = `https://graph.facebook.com/v20.0/${campaign.id}/adsets?fields=id,name,status,daily_budget,lifetime_budget,bid_strategy,optimization_goal,targeting,insights${dateParam}{impressions,clicks,spend,cpm,actions,reach,frequency,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&access_token=${accessToken}`
        const adSetsResponse = await fetch(adSetsUrl)
        
        if (adSetsResponse.ok) {
          const adSetsData = await adSetsResponse.json()
          const adSets = adSetsData.data || []
          console.log('Found', adSets.length, 'ad sets for campaign:', campaign.name)
          
          // Process each ad set
          for (const adSet of adSets) {
            const adSetInsights = adSet.insights?.data?.[0]
            let adSetSpend = 0
            let adSetClicks = 0
            let adSetImpressions = 0
            let adSetLeads = 0
            let adSetCtr = 0
            let adSetCpc = 0
            let adSetCpm = 0
            let adSetReach = 0
            let adSetFrequency = 0
            let adSetQualityRanking = null
            let adSetEngagementRateRanking = null
            let adSetConversionRateRanking = null

            if (adSetInsights) {
              adSetSpend = parseFloat(adSetInsights.spend || 0)
              adSetClicks = parseInt(adSetInsights.clicks || 0)
              adSetImpressions = parseInt(adSetInsights.impressions || 0)
              adSetCpm = parseFloat(adSetInsights.cpm || 0)
              adSetReach = parseInt(adSetInsights.reach || 0)
              adSetFrequency = parseFloat(adSetInsights.frequency || 0)
              adSetQualityRanking = adSetInsights.quality_ranking || null
              adSetEngagementRateRanking = adSetInsights.engagement_rate_ranking || null
              adSetConversionRateRanking = adSetInsights.conversion_rate_ranking || null
              
              adSetCtr = adSetImpressions > 0 ? (adSetClicks / adSetImpressions) * 100 : 0
              adSetCpc = adSetClicks > 0 ? adSetSpend / adSetClicks : 0

              if (adSetInsights.actions) {
                adSetInsights.actions.forEach((action: any) => {
                  if (action.action_type === 'lead' || action.action_type === 'complete_registration') {
                    adSetLeads += parseInt(action.value || 0)
                  }
                })
              }
            }

            // Save ad set to database
            const adSetData = {
              facebook_id: adSet.id,
              campaign_id: savedCampaign.id,
              client_id: clientId,
              user_id: client.user_id,
              company_id: client.company_id,
              name: adSet.name,
              status: adSet.status?.toLowerCase() || 'unknown',
              daily_budget: parseFloat(adSet.daily_budget || 0),
              lifetime_budget: parseFloat(adSet.lifetime_budget || 0),
              bid_strategy: adSet.bid_strategy || '',
              optimization_goal: adSet.optimization_goal || '',
              targeting: JSON.stringify(adSet.targeting || {}),
              cpm: adSetCpm,
              ctr: adSetCtr,
              cpc: adSetCpc,
              spend: adSetSpend,
              impressions: adSetImpressions,
              clicks: adSetClicks,
              conversions: adSetLeads,
              cpa: adSetLeads > 0 ? adSetSpend / adSetLeads : 0,
              reach: adSetReach,
              frequency: adSetFrequency,
              quality_ranking: adSetQualityRanking,
              engagement_rate_ranking: adSetEngagementRateRanking,
              conversion_rate_ranking: adSetConversionRateRanking,
              is_active: adSet.status === 'ACTIVE'
            }

            const { data: savedAdSet, error: adSetError } = await supabase
              .from('ad_sets')
              .insert(adSetData)
              .select()
              .single()

            if (adSetError) {
              console.error('Error inserting ad set:', adSetError)
              continue
            } else {
              console.log('Ad set saved:', adSet.name)
            }

            // Fetch ads for this ad set
            try {
              console.log('Fetching ads for ad set:', adSet.id)
              const adsUrl = `https://graph.facebook.com/v20.0/${adSet.id}/ads?fields=id,name,status,creative{title,body,image_url,video_id,object_story_spec,call_to_action},insights${dateParam}{impressions,clicks,spend,cpm,ctr,cpc,actions,reach,frequency,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&access_token=${accessToken}`
              const adsResponse = await fetch(adsUrl)
              
              if (adsResponse.ok) {
                const adsData = await adsResponse.json()
                const ads = adsData.data || []
                console.log('Found', ads.length, 'ads for ad set:', adSet.name)
                
                // Process each ad
                for (const ad of ads) {
                  const adInsights = ad.insights?.data?.[0]
                  let adSpend = 0
                  let adClicks = 0
                  let adImpressions = 0
                  let adLeads = 0
                  let adCtr = 0
                  let adCpc = 0
                  let adCpm = 0
                  let adReach = 0
                  let adFrequency = 0
                  let adQualityRanking = null
                  let adEngagementRateRanking = null
                  let adConversionRateRanking = null

                  if (adInsights) {
                    adSpend = parseFloat(adInsights.spend || 0)
                    adClicks = parseInt(adInsights.clicks || 0)
                    adImpressions = parseInt(adInsights.impressions || 0)
                    adCtr = parseFloat(adInsights.ctr || 0)
                    adCpc = parseFloat(adInsights.cpc || 0)
                    adCpm = parseFloat(adInsights.cpm || 0)
                    adReach = parseInt(adInsights.reach || 0)
                    adFrequency = parseFloat(adInsights.frequency || 0)
                    adQualityRanking = adInsights.quality_ranking || null
                    adEngagementRateRanking = adInsights.engagement_rate_ranking || null
                    adConversionRateRanking = adInsights.conversion_rate_ranking || null

                    if (adInsights.actions) {
                      adInsights.actions.forEach((action: any) => {
                        if (action.action_type === 'lead' || action.action_type === 'complete_registration') {
                          adLeads += parseInt(action.value || 0)
                        }
                      })
                    }
                  }

                  // Extract creative information
                  const creative = ad.creative || {}
                  const objectStory = creative.object_story_spec || {}
                  const linkData = objectStory.link_data || {}
                  
                  // Save ad to database
                  const adData = {
                    facebook_id: ad.id,
                    ad_set_id: savedAdSet.id,
                    campaign_id: savedCampaign.id,
                    client_id: clientId,
                    user_id: client.user_id,
                    company_id: client.company_id,
                    name: ad.name,
                    status: ad.status?.toLowerCase() || 'unknown',
                    creative_type: creative.video_id ? 'video' : (creative.image_url ? 'image' : 'text'),
                    creative_body: linkData.message || creative.body || '',
                    creative_title: linkData.name || creative.title || '',
                    creative_description: linkData.description || '',
                    image_url: creative.image_url || '',
                    video_url: creative.video_id ? `https://www.facebook.com/${creative.video_id}` : '',
                    link_url: linkData.link || '',
                    call_to_action: JSON.stringify(linkData.call_to_action || creative.call_to_action || {}),
                    ctr: adCtr,
                    cpc: adCpc,
                    cpm: adCpm,
                    spend: adSpend,
                    impressions: adImpressions,
                    clicks: adClicks,
                    conversions: adLeads,
                    cpa: adLeads > 0 ? adSpend / adLeads : 0,
                    reach: adReach,
                    frequency: adFrequency,
                    quality_ranking: adQualityRanking,
                    engagement_rate_ranking: adEngagementRateRanking,
                    conversion_rate_ranking: adConversionRateRanking,
                    is_active: ad.status === 'ACTIVE'
                  }

                  const { error: adError } = await supabase
                    .from('ads')
                    .insert(adData)

                  if (adError) {
                    console.error('Error inserting ad:', adError)
                  } else {
                    console.log('Ad saved:', ad.name)
                  }
                }
              } else {
                console.error('Failed to fetch ads for ad set:', adSet.id)
              }
            } catch (adsError) {
              console.error('Error fetching ads for ad set:', adSet.id, adsError)
            }
          }
        } else {
          console.error('Failed to fetch ad sets for campaign:', campaign.id)
        }
      } catch (adSetsError) {
        console.error('Error fetching ad sets for campaign:', campaign.id, adSetsError)
      }
    }

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