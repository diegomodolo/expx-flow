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

    const { 
      clientId, 
      period = '30', 
      syncCampaigns = true, 
      syncAdSets = false, 
      syncAds = false 
    } = requestBody

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

    console.log('Processing sync for client ID:', clientId, 'Sync options:', { syncCampaigns, syncAdSets, syncAds })

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

    // Check account balance and funding status
    console.log('Checking account balance for:', accountId)
    const balanceUrl = `https://graph.facebook.com/v20.0/act_${accountId}?fields=account_status,balance,spend_cap,disable_reason,funding_source_details&access_token=${accessToken}`
    console.log('Balance API URL (without token):', balanceUrl.replace(accessToken, '[REDACTED]'))
    
    try {
      const balanceResponse = await fetch(balanceUrl)
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        console.log('Balance data received:', balanceData)
        
        const balance = parseFloat(balanceData.balance || '0')
        const accountStatus = parseInt(balanceData.account_status || '1')
        const spendCap = parseFloat(balanceData.spend_cap || '0')
        const disableReason = balanceData.disable_reason || null
        const fundingSourceDetails = balanceData.funding_source_details || {}
        
        // Determine if account is prepaid based on funding source details
        // Prepaid accounts typically have balance > 0 and no automatic payment methods
        const isPrepaid = balance > 0 && (!fundingSourceDetails.coupon && !fundingSourceDetails.direct_debit && !fundingSourceDetails.credit_card)
        
        const hasFundingIssues = accountStatus !== 1 || balance <= 0 || (disableReason && disableReason.includes('FUNDING'))
        
        console.log('Account financial status:', {
          balance,
          accountStatus,
          spendCap,
          disableReason,
          fundingSourceDetails,
          isPrepaid,
          hasFundingIssues
        })
        
        
        // Update ad account with financial status
        const { error: adAccountUpdateError } = await supabase
          .from('facebook_ad_accounts')
          .update({
            balance,
            account_status: accountStatus,
            spend_cap: spendCap,
            disable_reason: disableReason,
            funding_source_details: fundingSourceDetails,
            is_prepaid: isPrepaid,
            has_funding_issues: hasFundingIssues,
            last_balance_check: new Date().toISOString()
          })
          .eq('id', adAccount.id)
        
        if (adAccountUpdateError) {
          console.error('Error updating account balance:', adAccountUpdateError)
        } else {
          console.log('Account balance updated successfully')
        }
      } else {
        console.warn('Failed to fetch account balance, status:', balanceResponse.status)
      }
    } catch (balanceError) {
      console.error('Error checking account balance:', balanceError)
    }

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
        dateParam = '.date_preset(maximum)'; // Using 'maximum' instead of 'lifetime' as per Facebook API v10.0+
        break;
      default:
        dateParam = '.date_preset(last_30d)'; // Default to 30 days
    }

    // Helper to sum conversions from various action types (lead, subscribe, complete_registration, pixel variants)
    const countConversionsFromActions = (actions: any[] | undefined) => {
      if (!actions || !Array.isArray(actions)) {
        console.log('No actions array found or invalid actions')
        return 0;
      }
      
      console.log('Processing actions:', JSON.stringify(actions, null, 2))
      
      let total = 0;
      const whitelist = [
        'lead',
        'complete_registration',
        'subscribe',
        'subscription',
        'offsite_conversion.fb_pixel_lead',
        'offsite_conversion.fb_pixel_complete_registration',
        'offsite_conversion.fb_pixel_subscribe',
        'offsite_conversion.custom',
        'onsite_conversion.lead_grouped',
        'onsite_conversion.subscribe',
        'onsite_conversion.subscription',
        'onsite_conversion.purchase',
        'website_lead',
        'app_custom_event.fb_mobile_subscribe',
        'mobile_app_install',
        'link_click',
      ];
      
      for (const a of actions) {
        const type = (a?.action_type || '').toLowerCase();
        const val = parseInt(a?.value || 0);
        
        console.log(`Processing action: type="${type}", value="${a?.value}", parsed_value=${val}`)
        
        if (!type || !Number.isFinite(val)) {
          console.log(`Skipping action: invalid type or value`)
          continue;
        }
        
        // Check whitelist or partial matches
        if (whitelist.includes(type) || 
            type.includes('subscribe') || 
            type.includes('subscription') || 
            type.includes('lead') || 
            type.includes('complete_registration') ||
            type.includes('custom')) {
          total += val;
          console.log(`Added ${val} from action type "${type}", total now: ${total}`)
        } else {
          console.log(`Ignored action type: "${type}"`)
        }
      }
      
      console.log(`Final conversion total: ${total}`)
      return total;
    };

    // Fetch campaigns from Facebook API with enhanced insights
    const facebookUrl = `https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=id,name,status,objective,insights${dateParam}.action_report_time(conversion).action_attribution_windows([\"7d_click\",\"1d_view\"])` +
      `{impressions,clicks,spend,actions,reach,frequency,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&access_token=${accessToken}`
    console.log('Facebook API URL (without token):', facebookUrl.replace(accessToken, '[REDACTED]'))
    const campaignsResponse = await fetch(facebookUrl)
    console.log('Facebook API response status:', campaignsResponse.status)

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text()
      console.error('Facebook API error response:', errorText)
      console.error('Facebook API status:', campaignsResponse.status)
      console.error('Facebook API statusText:', campaignsResponse.statusText)
      console.error('Period used:', period)
      console.error('Date param used:', dateParam)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch campaigns from Facebook. Status: ${campaignsResponse.status}. Error: ${errorText}` 
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

    // Clear existing data based on sync options
    if (syncCampaigns) {
      const { error: deleteCampaignsError } = await supabase
        .from('campaigns')
        .delete()
        .eq('client_id', clientId)
      
      if (deleteCampaignsError) {
        console.error('Error deleting existing campaigns:', deleteCampaignsError)
      } else {
        console.log('Cleared existing campaigns for client')
      }
    }

    if (syncAdSets) {
      const { error: deleteAdSetsError } = await supabase
        .from('ad_sets')
        .delete()
        .eq('client_id', clientId)
      
      if (deleteAdSetsError) {
        console.error('Error deleting existing ad sets:', deleteAdSetsError)
      } else {
        console.log('Cleared existing ad sets for client')
      }
    }

    if (syncAds) {
      const { error: deleteAdsError } = await supabase
        .from('ads')
        .delete()
        .eq('client_id', clientId)
      
      if (deleteAdsError) {
        console.error('Error deleting existing ads:', deleteAdsError)
      } else {
        console.log('Cleared existing ads for client')
      }
    }

    // Process each campaign if sync campaigns is enabled
    for (const campaign of campaigns) {
      console.log('Processing campaign:', campaign.name, 'Status:', campaign.status)
      
      const isActive = campaign.status === 'ACTIVE'
      if (isActive) {
        activeCampaigns++
      }

      let savedCampaign = null

      // Process campaign data if syncing campaigns
      if (syncCampaigns) {
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
          console.log('Clicks extracted from Facebook:', clicks, 'Type:', typeof clicks)
          
          // Count conversions from actions (lead, subscribe, complete_registration, and pixel variants)
          const conv = countConversionsFromActions(insights.actions);
          leads += conv;
          totalLeads += conv;
          console.log('Summed conversions for campaign', campaign.name, ':', conv)

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
          clicks: clicks,
          reach: reach,
          frequency: frequency,
          objective: campaign.objective || null,
          quality_ranking: qualityRanking,
          engagement_rate_ranking: engagementRateRanking,
          conversion_rate_ranking: conversionRateRanking,
          client_id: clientId,
          user_id: client.user_id,
          company_id: client.company_id,
          period: '30 dias'
        }

        const { data: insertedCampaign, error: campaignError } = await supabase
          .from('campaigns')
          .insert(campaignData)
          .select()
          .single()

        if (campaignError) {
          console.error('Error inserting campaign:', campaignError)
          continue
        } else {
          console.log('Campaign saved:', campaign.name)
          savedCampaign = insertedCampaign
        }
      } else {
        // If not syncing campaigns, try to find existing campaign for ad sets/ads sync
        if (syncAdSets || syncAds) {
          const { data: existingCampaign } = await supabase
            .from('campaigns')
            .select('id')
            .eq('client_id', clientId)
            .eq('name', campaign.name)
            .single()
          
          if (existingCampaign) {
            savedCampaign = existingCampaign
          }
        }
      }

      // Skip ad sets and ads if not syncing them or if no campaign reference
      if ((!syncAdSets && !syncAds) || !savedCampaign) {
        if (!syncAdSets && !syncAds) {
          console.log('Skipping ad sets and ads sync (not requested)')
        } else {
          console.log('Skipping ad sets and ads sync (no campaign reference)')
        }
        continue
      }

      // Fetch ad sets for this campaign if enabled
      if (syncAdSets) {
        try {
          console.log('Fetching ad sets for campaign:', campaign.id)
          const adSetsUrl = `https://graph.facebook.com/v20.0/${campaign.id}/adsets?fields=id,name,status,daily_budget,lifetime_budget,bid_strategy,optimization_goal,targeting,insights${dateParam}.action_report_time(conversion).action_attribution_windows([\"7d_click\",\"1d_view\"])` +
            `{impressions,clicks,spend,cpm,actions,reach,frequency,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&access_token=${accessToken}`
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
                const conv = countConversionsFromActions(adSetInsights.actions)
                adSetLeads += conv
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

            // Fetch ads for this ad set if enabled
            if (syncAds) {
              try {
                console.log('Fetching ads for ad set:', adSet.id)
                // Add actions and quality fields back
                const adsUrl = `https://graph.facebook.com/v20.0/${adSet.id}/ads?fields=id,name,status,creative{title,body,image_url,video_id,object_story_spec},insights${dateParam}.action_report_time(conversion).action_attribution_windows([\"7d_click\",\"1d_view\"])` +
                  `{impressions,clicks,spend,cpm,ctr,cpc,reach,frequency,actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&access_token=${accessToken}`
                console.log('Ads API URL (without token):', adsUrl.replace(accessToken, '[REDACTED]'))
                const adsResponse = await fetch(adsUrl)
                console.log('Ads API response status:', adsResponse.status)
              
              if (adsResponse.ok) {
                const adsData = await adsResponse.json()
                console.log('Ads API response for ad set:', adSet.id, 'found', adsData.data?.length || 0, 'ads')
                const ads = adsData.data || []
                
                // Log first ad response for debugging
                if (ads.length > 0) {
                  console.log('Sample ad data:', JSON.stringify(ads[0]))
                }
                
                // Process each ad
                for (const ad of ads) {
                  console.log('Processing ad:', ad.id, ad.name)
                  
                  // Extract creative information
                  const creative = ad.creative || {}
                  const objectStory = creative.object_story_spec || {}
                  const linkData = objectStory.link_data || {}
                  
                  // Helper function for robust creative type detection
                  const determineCreativeType = (creative: any, objectStory: any) => {
                    console.log('Determining creative type from:', JSON.stringify({ 
                      creative_video_id: creative.video_id,
                      creative_image_url: creative.image_url,
                      link_data_picture: linkData.picture,
                      link_data_video_id: linkData.video_id,
                      video_data: objectStory.video_data,
                      attachment_style: linkData.attachment_style
                    }, null, 2))
                    
                    // Check for video first
                    if (creative.video_id || 
                        linkData.video_id || 
                        objectStory.video_data ||
                        (linkData.attachment_style === 'video')) {
                      console.log('Detected as video creative')
                      return 'video'
                    }
                    
                    // Check for image in multiple possible fields
                    if (creative.image_url || 
                        linkData.picture || 
                        linkData.image_url ||
                        creative.thumbnail_url ||
                        (linkData.attachment_style === 'link' && linkData.link) ||
                        (linkData.attachment_style === 'photo')) {
                      console.log('Detected as image creative')
                      return 'image'
                    }
                    
                    console.log('Defaulting to text creative')
                    return 'text'
                  }
                  
                  // Helper function to extract media URLs
                  const extractMediaUrls = (creative: any, objectStory: any) => {
                    const imageUrl = creative.image_url || 
                                   linkData.picture || 
                                   linkData.image_url || 
                                   creative.thumbnail_url || 
                                   ''
                    
                    const videoUrl = creative.video_id 
                      ? `https://www.facebook.com/${creative.video_id}` 
                      : (linkData.video_id ? `https://www.facebook.com/${linkData.video_id}` : '')
                    
                    console.log('Extracted URLs - Image:', imageUrl, 'Video:', videoUrl)
                    return { imageUrl, videoUrl }
                  }
                  
                  const creativeType = determineCreativeType(creative, objectStory)
                  const { imageUrl, videoUrl } = extractMediaUrls(creative, objectStory)
                  
                  // Extract insights data
                  const adInsights = ad.insights?.data?.[0]
                  let adSpend = 0
                  let adClicks = 0
                  let adImpressions = 0
                  let adCtr = 0
                  let adCpc = 0
                  let adCpm = 0
                  let adReach = 0
                  let adFrequency = 0
                  let adLeads = 0
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
                    
                     // Extract conversions from actions
                     if (adInsights.actions) {
                       const conv = countConversionsFromActions(adInsights.actions)
                       adLeads += conv
                       console.log('Summed conversions for ad', ad.name, ':', conv)
                     } else {
                       console.log('No actions found for ad:', ad.name)
                     }
                  }
                   
                    // Save ad to database with complete data
                    const adData = {
                      facebook_id: ad.id,
                      ad_set_id: savedAdSet.id,
                      campaign_id: savedCampaign.id,
                      client_id: clientId,
                      user_id: client.user_id,
                      company_id: client.company_id,
                      name: ad.name,
                      status: ad.status?.toLowerCase() || 'unknown',
                      creative_type: creativeType,
                      creative_body: linkData.message || creative.body || '',
                      creative_title: linkData.name || creative.title || '',
                      creative_description: linkData.description || '',
                      image_url: imageUrl,
                      video_url: videoUrl,
                     link_url: linkData.link || '',
                     call_to_action: JSON.stringify(linkData.call_to_action || {}),
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
                     likes: 0,
                     comments: 0,
                     shares: 0,
                     video_views: 0,
                     video_view_percentage: 0,
                     video_completion_rate: 0,
                     negative_feedback: 0,
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
                const errorResponse = await adsResponse.text()
                console.error('Failed to fetch ads for ad set:', adSet.id, 'Status:', adsResponse.status, 'Response:', errorResponse)
              }
              } catch (adsError) {
                console.error('Error fetching ads for ad set:', adSet.id, adsError)
              }
            } else {
              console.log('Skipping ads sync for ad set:', adSet.id, '(not requested)')
            }
          }
          } else {
            console.error('Failed to fetch ad sets for campaign:', campaign.id)
          }
        } catch (adSetsError) {
          console.error('Error fetching ad sets for campaign:', campaign.id, adSetsError)
        }
      } else {
        console.log('Skipping ad sets sync for campaign:', campaign.id, '(not requested)')
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
      status: clientStatus,
      last_sync_at: new Date().toISOString(),
      last_sync_period: period
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