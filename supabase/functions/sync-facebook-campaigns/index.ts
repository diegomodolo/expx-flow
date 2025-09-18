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
      syncAds = false,
      includeInactive = false
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

    console.log('Processing sync for client ID:', clientId, 'Sync options:', { syncCampaigns, syncAdSets, syncAds, includeInactive })

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

    // Check if client is inactive - skip sync only if not explicitly including inactive clients
    if (client.status === 'red' && client.inactive_reason && !includeInactive) {
      console.log('Client is inactive, skipping sync for:', client.name, 'Reason:', client.inactive_reason)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Client is inactive - sync skipped',
          data: { skipped: true, reason: client.inactive_reason }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If including inactive clients, log that we're processing an inactive client
    if (client.status === 'red' && client.inactive_reason && includeInactive) {
      console.log('Processing inactive client due to includeInactive=true:', client.name, 'Reason:', client.inactive_reason)
    }

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
        
        // Enhanced funding issues detection - more refined logic
        const hasFundingIssues = 
          accountStatus !== 1 || // Account is not active
          (disableReason && (
            disableReason.includes('FUNDING') || 
            disableReason.includes('PAYMENT') ||
            disableReason.includes('BILLING') ||
            disableReason.includes('SPEND_LIMIT')
          ));
          // Removed balance <= 0 check as it's too aggressive - many active accounts have 0 balance but work fine
        
        // Basic funding status logging
        console.log(`💰 Funding check - Account Status: ${accountStatus}, Balance: ${balance}, Has Issues: ${hasFundingIssues}`)
        
        
        // Update ad account with financial status
        console.log(`💾 Updating account ${adAccount.id}: funding_issues ${adAccount.has_funding_issues} → ${hasFundingIssues}`)
        
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
          console.error('❌ Error updating account balance:', adAccountUpdateError)
        } else {
          console.log('✅ Account updated - Balance:', balance, 'Status:', accountStatus, 'Funding Issues:', hasFundingIssues)
        }
      } else {
        console.warn('Failed to fetch account balance, status:', balanceResponse.status)
        const errorText = await balanceResponse.text()
        console.warn('Balance API error response:', errorText)
        
        // If we can't check balance, mark as potential funding issue to be safe
        const { error: fallbackUpdateError } = await supabase
          .from('facebook_ad_accounts')
          .update({
            has_funding_issues: true,
            last_balance_check: new Date().toISOString()
          })
          .eq('id', adAccount.id)
          
        if (fallbackUpdateError) {
          console.error('Error updating account with fallback funding issue flag:', fallbackUpdateError)
        } else {
          console.log('⚠️ Account marked with funding issues due to API access failure')
        }
      }
    } catch (balanceError) {
      console.error('Error checking account balance:', balanceError)
      
      // If there's an error checking balance, mark as potential funding issue for safety
      const { error: errorFallbackUpdateError } = await supabase
        .from('facebook_ad_accounts')
        .update({
          has_funding_issues: true,
          last_balance_check: new Date().toISOString()
        })
        .eq('id', adAccount.id)
        
      if (errorFallbackUpdateError) {
        console.error('Error updating account with error fallback funding issue flag:', errorFallbackUpdateError)
      } else {
        console.log('⚠️ Account marked with funding issues due to balance check error')
      }
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

    // Helper to sum conversions based on campaign objective and action types
    const countConversionsFromActions = (actions: any[] | undefined, campaignObjective?: string, campaignName?: string) => {
      if (!actions || !Array.isArray(actions)) {
        console.log(`No actions array found for campaign: ${campaignName}`)
        return 0;
      }

      const norm = (s: any) => (s ?? '').toString().trim().toLowerCase()
      const getVal = (a: any) => {
        const toNum = (v: any) => (typeof v === 'string' ? parseFloat(v) : Number(v))
        const click = toNum(a?.['7d_click'])
        const view = toNum(a?.['1d_view'])
        const val = toNum(a?.value)
        const sumCv = (Number.isFinite(click) ? click : 0) + (Number.isFinite(view) ? view : 0)
        // Prefer the sum of 7d_click + 1d_view when available, but if Facebook already provides an aggregated "value",
        // take the max between the provided value and the sum to avoid undercounting
        const candidates = [sumCv, val, click, view].map(n => (Number.isFinite(n) ? n : 0))
        const best = Math.max(...candidates, 0)
        return Math.round(best > 0 ? best : 0)
      }
      
      console.log(`\n=== Processing conversions for campaign: ${campaignName} (${campaignObjective}) ===`)
      console.log('Available actions:', JSON.stringify(actions.map(a => ({ type: a.action_type, value: a.value, '7d_click': a?.['7d_click'], '1d_view': a?.['1d_view'] })), null, 2))
      
      // Only treat as lead campaign if the actual objective is LEADS
      const isLeadObjective = (campaignObjective || '').toUpperCase() === 'OUTCOME_LEADS'
      
      console.log(`Campaign objective check: ${campaignObjective} -> isLeadObjective: ${isLeadObjective}`)

      if (isLeadObjective) {
        // Lead campaigns: choose a single best source to avoid duplication
        console.log('LEAD CAMPAIGN DETECTED: Using priority hierarchy with 7d_click when available')
        
        // Priority order for lead actions (highest to lowest)
        const leadPriorityTypes = [
          'lead',                              // 1st priority: Direct lead
          'offsite_conversion.fb_pixel_lead',  // 2nd priority: Pixel lead (standard)
          'offsite_conversion.fb_pixel_custom',// 3rd priority: Custom pixel event mapped as conversion/lead
          'onsite_conversion.lead',            // 4th priority: Onsite lead
          'omni_lead',                         // 5th priority: Omni lead
          'on_facebook_lead',                  // 6th priority: Facebook lead
          'onsite_conversion.lead_grouped',    // 7th priority: Grouped lead
          'website_lead'                       // 8th priority: Website lead
        ]

        // Normalize once
        const normalized = actions.map(a => ({ type: norm(a?.action_type), val: getVal(a) }))

        // Find the highest priority lead action with value > 0
        for (const priorityType of leadPriorityTypes) {
          const found = normalized.find(n => n.type === priorityType && n.val > 0)
          if (found) {
            console.log(`  -> USING PRIORITY: "${priorityType}" = ${found.val} (highest priority found)`)
            console.log(`=== Final conversion total for ${campaignName}: ${found.val} (priority-based) ===\n`)
            return found.val
          }
        }

        // Fallback: any action type containing "lead" (use the maximum to avoid double-counting)
        const leadCandidates = normalized.filter(n => n.type.includes('lead') && n.val > 0)
        if (leadCandidates.length > 0) {
          const maxVal = Math.max(...leadCandidates.map(n => n.val))
          console.log('  -> FALLBACK lead-like actions:', leadCandidates)
          console.log(`=== Final conversion total for ${campaignName}: ${maxVal} (fallback max) ===\n`)
          return maxVal
        }

        console.log('  -> No lead actions found with values > 0')
        console.log(`=== Final conversion total for ${campaignName}: 0 (no valid leads) ===\n`)
        return 0

      } else {
        // Non-lead campaigns: sum only allowed conversion-like actions
        console.log('NON-LEAD CAMPAIGN: Using summing logic (preferring 7d_click)')
        
        const subscriptionConversions = [
          'subscribe',
          'subscription', 
          'complete_registration',
          'lead',
          'offsite_conversion.fb_pixel_subscribe',
          'offsite_conversion.fb_pixel_complete_registration',
          'offsite_conversion.fb_pixel_lead',
          'offsite_conversion.fb_pixel_custom',
          'onsite_conversion.subscribe',
          'onsite_conversion.subscription',
          'onsite_conversion.lead_grouped',
          'website_lead',
          // Add messaging conversation conversions
          'messaging_conversation_started',
          'messaging_conversation_started_7d',
          'on_facebook_conversation_started',
          'conversation_started'
        ]
        
        // Remove types that are not real conversions
        const excludedTypes = [
          'link_click',
          'landing_page_view', 
          'page_engagement',
          'post_engagement',
          'video_view',
          'post_reaction',
          'like',
          'comment',
          'share',
          'post',
          'omni_landing_page_view'
        ]
        
        let total = 0
        
        for (const a of actions) {
          const type = norm(a?.action_type)
          const val = getVal(a)
          
          console.log(`Checking action: "${type}" = ${val}`)
          
          if (!type || !Number.isFinite(val)) {
            console.log('  -> Skipped: invalid type or value')
            continue
          }
          
          // Exclude types that are definitely not conversions
          if (excludedTypes.some(excluded => type.includes(excluded))) {
            console.log(`  -> Excluded: "${type}" is not a conversion`)
            continue
          }
          
          const isSubscriptionConversion = subscriptionConversions.some(sub => type.includes(sub)) ||
                                           type.includes('subscribe') ||
                                           type.includes('subscription') ||
                                           (type.includes('lead') && !type.includes('link')) ||
                                           type.includes('complete_registration') ||
                                           type.includes('messaging_conversation') ||
                                           type.includes('conversation_started')
          
          if (isSubscriptionConversion) {
            total += val
            console.log(`  -> ADDED: ${val} from "${type}", total now: ${total}`)
          } else {
            console.log(`  -> Ignored: "${type}" not in allowed list for non-lead objective`)
          }
        }
        
        console.log(`=== Final conversion total for ${campaignName}: ${total} (summed) ===\n`)
        return total
      }
    };

    // Fetch campaigns from Facebook API with enhanced insights - using 7d_click + 1d_view attribution windows
    console.log('Using attribution windows: 7d_click + 1d_view')
    const baseCampaignsUrl = `https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=id,name,status,objective,insights${dateParam}.action_report_time(conversion).action_attribution_windows(["7d_click","1d_view"])` +
      `{impressions,clicks,spend,actions,conversions,conversion_values,action_values,reach,frequency,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&effective_status=["ACTIVE","PAUSED"]&limit=100&access_token=${accessToken}`
    console.log('Facebook API URL (without token):', baseCampaignsUrl.replace(accessToken, '[REDACTED]'))

    let campaigns: any[] = []
    let pageUrl: string | null = baseCampaignsUrl

    while (pageUrl) {
      console.log('Fetching campaigns page:', pageUrl.replace(accessToken, '[REDACTED]'))
      const response = await fetch(pageUrl)
      console.log('Facebook API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Facebook API error response:', errorText)
        console.error('Facebook API status:', response.status)
        console.error('Facebook API statusText:', response.statusText)
        console.error('Period used:', period)
        console.error('Date param used:', dateParam)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to fetch campaigns from Facebook. Status: ${response.status}. Error: ${errorText}` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const pageData = await response.json()
      console.log('Facebook campaigns page data count:', (pageData.data || []).length)

      if (pageData.error) {
        console.error('Facebook API error in page response:', pageData.error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: pageData.error.message || 'Facebook API error' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      campaigns = campaigns.concat(pageData.data || [])
      pageUrl = pageData.paging?.next || null
      if (pageUrl) {
        console.log('Next page detected, continuing pagination...')
      }
    }

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
          
          // Combine actions and conversions arrays to ensure we capture pixel leads
          const combinedMetrics = [
            ...(Array.isArray(insights.actions) ? insights.actions : []),
            ...(Array.isArray(insights.conversions) ? insights.conversions : [])
          ]

          const countedConversions = countConversionsFromActions(combinedMetrics, campaign.objective, campaign.name)
          const isLeadObjective = (campaign.objective || '').toUpperCase().includes('LEAD')

          const finalConversions = countedConversions || 0

          console.log(`Conversions for ${campaign.name}: objective=${campaign.objective}, counted=${countedConversions}, chosen=${finalConversions}`)

           leads += finalConversions
           totalLeads += finalConversions

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
      let campaignChildLeads = 0
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
            // Extract insights data for ad set
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

              // Count conversions from ad set to use as fallback for campaign-level leads
              const adSetCombinedMetrics = [
                ...(Array.isArray(adSetInsights.actions) ? adSetInsights.actions : []),
                ...(Array.isArray((adSetInsights as any).conversions) ? (adSetInsights as any).conversions : [])
              ]
              const adSetCounted = countConversionsFromActions(adSetCombinedMetrics, campaign.objective, `${campaign.name} → ${adSet.name}`)
              campaignChildLeads += adSetCounted

              // Still store 0 at ad set level to avoid duplication
              adSetLeads = 0
              console.log('Ad set conversions counted for campaign fallback (not saved at ad set):', adSet.name, adSetCounted)
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
                    
                     // Don't count conversions at ad level to avoid duplication
                     // Conversions are already counted at campaign level
                     adLeads = 0
                     console.log('Ad conversions set to 0 (counted at campaign level)', ad.name)
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

      // If no campaign-level leads, but found in child levels, update campaign totals
      if (savedCampaign && ((savedCampaign as any).conversions ?? 0) === 0 && campaignChildLeads > 0) {
        console.log('Updating campaign with leads from ad sets:', campaign.name, campaignChildLeads)
        const { data: updatedCampaign, error: updateConvError } = await supabase
          .from('campaigns')
          .update({
            conversions: campaignChildLeads,
            cpa: (savedCampaign as any).spend > 0 ? (savedCampaign as any).spend / campaignChildLeads : 0
          })
          .eq('id', (savedCampaign as any).id)
          .select()
          .single()
        if (updateConvError) {
          console.error('Error updating campaign conversions from children:', updateConvError)
        } else {
          savedCampaign = updatedCampaign
          totalLeads += campaignChildLeads
        }
      }
    }

    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0

    // Get updated ad account data to check for funding issues
    console.log('🔍 FETCHING UPDATED AD ACCOUNT DATA after financial status update...')
    console.log('Looking for account ID:', adAccount.id)
    const { data: updatedAdAccount, error: adAccountFetchError } = await supabase
      .from('facebook_ad_accounts')
      .select('has_funding_issues, account_status, balance, disable_reason')
      .eq('id', adAccount.id)
      .single()

    if (adAccountFetchError) {
      console.error('❌ Error fetching updated ad account data:', adAccountFetchError)
    } else {
      console.log('✅ Successfully fetched updated ad account data:')
      console.log('Updated ad account funding status:', {
        has_funding_issues: updatedAdAccount.has_funding_issues,
        account_status: updatedAdAccount.account_status,
        balance: updatedAdAccount.balance,
        disable_reason: updatedAdAccount.disable_reason
      })
      console.log('📊 Funding status comparison:', {
        'Should have funding issues?': adAccount.has_funding_issues || false,
        'Database says has funding issues?': updatedAdAccount.has_funding_issues,
        'Values match?': (adAccount.has_funding_issues || false) === updatedAdAccount.has_funding_issues
      })
    }

    // Determine client status based on funding issues first, then active campaigns
    let clientStatus = 'green' // Excelente
    let statusReason = 'Conta operando normalmente'

    console.log('🎯 DETERMINING CLIENT STATUS for:', clientData.name)
    console.log('Status determination inputs:', {
      activeCampaigns,
      hasUpdatedAdAccount: !!updatedAdAccount,
      adAccountHasFundingIssues: updatedAdAccount?.has_funding_issues,
      adAccountBalance: updatedAdAccount?.balance,
      adAccountStatus: updatedAdAccount?.account_status,
      adAccountDisableReason: updatedAdAccount?.disable_reason
    })

    // Priority 1: Funding issues (most critical)
    if (updatedAdAccount && updatedAdAccount.has_funding_issues) {
      clientStatus = 'red' // Emergencial
      if (updatedAdAccount.balance <= 0) {
        statusReason = 'Sem fundos na conta de anúncios'
      } else if (updatedAdAccount.account_status !== 1) {
        statusReason = 'Conta de anúncios desabilitada'
      } else if (updatedAdAccount.disable_reason) {
        statusReason = `Problema na conta: ${updatedAdAccount.disable_reason}`
      } else {
        statusReason = 'Problemas de financiamento detectados'
      }
      console.log('🔴 Client status set to RED due to funding issues:', statusReason)
    }
    // Priority 2: No active campaigns
    else if (activeCampaigns === 0) {
      clientStatus = 'red' // Emergencial
      statusReason = 'Nenhuma campanha ativa'
      console.log('🔴 Client status set to RED due to no active campaigns')
    }
    // Priority 3: Few active campaigns
    else if (activeCampaigns <= 2) {
      clientStatus = 'yellow' // Atenção
      statusReason = `Apenas ${activeCampaigns} campanha(s) ativa(s)`
      console.log('🟡 Client status set to YELLOW due to low campaign count:', activeCampaigns)
    }
    else {
      console.log('🟢 Client status remains GREEN - all metrics are healthy')
    }

    const metricsData = {
      active_campaigns: activeCampaigns,
      avg_cpl: avgCpl,
      leads_generated: totalLeads,
      status: clientStatus,
      last_sync_at: new Date().toISOString(),
      last_sync_period: period,
      // Set inactive_reason based on client status - clear it if not red
      inactive_reason: clientStatus === 'red' ? statusReason : null
    }

    console.log(`📊 Client Status: ${clientStatus} (${activeCampaigns} campaigns, funding issues: ${updatedAdAccount?.has_funding_issues})`)

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