import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== Sync Period Comparison Function Started ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders });
  }

  let comparisonId: string | null = null

  try {
    console.log('Processing period comparison sync request...')
    
    // Parse request body
    const requestBody = await req.json()
    comparisonId = requestBody.comparisonId
    console.log('Comparison ID:', comparisonId)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update sync status to processing
    console.log('Updating comparison status to syncing...')
    await supabase
      .from('period_comparisons')
      .update({ 
        status: 'syncing',
        sync_progress: 10,
        error_message: null 
      })
      .eq('id', comparisonId)

    // Get comparison data
    console.log('Fetching comparison data...')
    const { data: comparison, error: comparisonError } = await supabase
      .from('period_comparisons')
      .select('*')
      .eq('id', comparisonId)
      .single()

    if (comparisonError || !comparison) {
      console.error('Error fetching comparison:', comparisonError)
      throw new Error('Comparison not found')
    }

    console.log('Comparison data:', {
      id: comparison.id,
      client_id: comparison.client_id,
      period_1_start: comparison.period_1_start,
      period_1_end: comparison.period_1_end,
      period_2_start: comparison.period_2_start,
      period_2_end: comparison.period_2_end
    })

    // Get client data
    console.log('Fetching client data...')
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', comparison.client_id)
      .single()

    if (clientError || !client) {
      console.error('Error fetching client:', clientError)
      throw new Error('Client not found')
    }

    console.log('Client found:', client.name)

    if (!client.ad_account_id) {
      console.log('No ad account linked to this client')
      throw new Error('No ad account linked to client')
    }

    // Get ad account info
    console.log('Fetching ad account data for ID:', client.ad_account_id)
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('*')
      .eq('id', client.ad_account_id)
      .single()

    if (adAccountError || !adAccount) {
      console.error('Error fetching ad account:', adAccountError)
      throw new Error('Ad account not found')
    }

    console.log('Ad account found:', { id: adAccount.id, account_id: adAccount.account_id })

    // Get integration info
    console.log('Fetching integration data for ID:', adAccount.integration_id)
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('id', adAccount.integration_id)
      .single()

    if (integrationError || !integration) {
      console.error('Error fetching integration:', integrationError)
      throw new Error('Facebook integration not found')
    }

    console.log('Integration found, is_active:', integration.is_active)

    if (!integration.is_active) {
      console.log('Integration is not active')
      throw new Error('Facebook integration is not active')
    }

    const accessToken = integration.access_token
    const accountId = adAccount.account_id

    // Helper function to count conversions (adapted from sync-facebook-campaigns)
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
        const candidates = [sumCv, val, click, view].map(n => (Number.isFinite(n) ? n : 0))
        const best = Math.max(...candidates, 0)
        return Math.round(best > 0 ? best : 0)
      }
      
      console.log(`Processing conversions for campaign: ${campaignName} (${campaignObjective})`)
      
      const isLeadObjective = (campaignObjective || '').toUpperCase().includes('LEAD')

      if (isLeadObjective) {
        const leadPriorityTypes = [
          'lead',
          'offsite_conversion.fb_pixel_lead',
          'offsite_conversion.fb_pixel_custom',
          'onsite_conversion.lead',
          'omni_lead',
          'on_facebook_lead',
          'onsite_conversion.lead_grouped',
          'website_lead'
        ]

        const normalized = actions.map(a => ({ type: norm(a?.action_type), val: getVal(a) }))

        for (const priorityType of leadPriorityTypes) {
          const found = normalized.find(n => n.type === priorityType && n.val > 0)
          if (found) {
            console.log(`Using priority: "${priorityType}" = ${found.val}`)
            return found.val
          }
        }

        const leadCandidates = normalized.filter(n => n.type.includes('lead') && n.val > 0)
        if (leadCandidates.length > 0) {
          const maxVal = Math.max(...leadCandidates.map(n => n.val))
          console.log(`Fallback lead actions, max: ${maxVal}`)
          return maxVal
        }

        return 0
      } else {
        const subscriptionConversions = [
          'subscribe', 'subscription', 'complete_registration', 'lead',
          'offsite_conversion.fb_pixel_subscribe', 'offsite_conversion.fb_pixel_complete_registration',
          'offsite_conversion.fb_pixel_lead', 'offsite_conversion.fb_pixel_custom',
          'onsite_conversion.subscribe', 'onsite_conversion.subscription',
          'onsite_conversion.lead_grouped', 'website_lead'
        ]
        
        const excludedTypes = [
          'link_click', 'landing_page_view', 'page_engagement', 'post_engagement',
          'video_view', 'post_reaction', 'like', 'comment', 'share', 'post', 'omni_landing_page_view'
        ]
        
        let total = 0
        
        for (const a of actions) {
          const type = norm(a?.action_type)
          const val = getVal(a)
          
          if (!type || !Number.isFinite(val)) continue
          
          if (excludedTypes.some(excluded => type.includes(excluded))) continue
          
          const isSubscriptionConversion = subscriptionConversions.some(sub => type.includes(sub)) ||
                                           type.includes('subscribe') ||
                                           type.includes('subscription') ||
                                           (type.includes('lead') && !type.includes('link')) ||
                                           type.includes('complete_registration')
          
          if (isSubscriptionConversion) {
            total += val
            console.log(`Added: ${val} from "${type}", total: ${total}`)
          }
        }
        
        return total
      }
    }

    // Function to fetch campaigns for a specific period
    const fetchCampaignsForPeriod = async (startDate: string, endDate: string, periodLabel: string) => {
      console.log(`\n=== Fetching campaigns for ${periodLabel} (${startDate} to ${endDate}) ===`)
      
      // Properly encode the time_range parameter
      const timeRangeParam = encodeURIComponent(`{"since":"${startDate}","until":"${endDate}"}`)
      const campaignsUrl = `https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=id,name,status,objective,insights.time_range(${timeRangeParam}).action_report_time(conversion).action_attribution_windows(["7d_click","1d_view"]){spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions}&access_token=${accessToken}`
      
      console.log('Facebook API URL (without token):', campaignsUrl.replace(accessToken, '[REDACTED]'))
      
      try {
        const response = await fetch(campaignsUrl)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Facebook API error (${response.status}):`, errorText)
          throw new Error(`Facebook API error: ${response.status} - ${errorText}`)
        }
        
        const data = await response.json()
        console.log(`Campaigns data received for ${periodLabel}:`, {
          campaignCount: data.data?.length || 0,
          hasNext: !!data.paging?.next
        })
        
        const campaigns = []
        
        for (const campaign of data.data || []) {
          console.log(`\nProcessing campaign: ${campaign.name} (${campaign.id})`)
          
          const insights = campaign.insights?.data?.[0]
          if (!insights) {
            console.log('No insights data for this campaign, skipping...')
            continue
          }
          
          const spend = parseFloat(insights.spend || '0')
          const impressions = parseInt(insights.impressions || '0')
          const clicks = parseInt(insights.clicks || '0')
          const reach = parseInt(insights.reach || '0')
          const frequency = parseFloat(insights.frequency || '0')
          const ctr = parseFloat(insights.ctr || '0')
          const cpc = parseFloat(insights.cpc || '0')
          const cpm = parseFloat(insights.cpm || '0')
          
          const conversions = countConversionsFromActions(insights.actions, campaign.objective, campaign.name)
          const cpa = conversions > 0 ? spend / conversions : 0
          
          console.log('Campaign metrics:', {
            spend, impressions, clicks, reach, frequency, ctr, cpc, cpm, conversions, cpa
          })
          
          campaigns.push({
            facebook_campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            spend,
            impressions,
            clicks,
            conversions,
            reach,
            frequency,
            ctr,
            cpc,
            cpa,
            cpm
          })
        }
        
        console.log(`Total campaigns processed for ${periodLabel}: ${campaigns.length}`)
        return campaigns
        
      } catch (fetchError) {
        console.error(`Error fetching campaigns for ${periodLabel}:`, fetchError)
        throw new Error(`Failed to fetch campaigns for ${periodLabel}: ${fetchError.message}`)
      }
    }

    // Clear existing data for this comparison
    console.log('Clearing existing comparison data...')
    await supabase
      .from('period_comparison_campaigns')
      .delete()
      .eq('comparison_id', comparisonId)

    // Update progress
    await supabase
      .from('period_comparisons')
      .update({ sync_progress: 30 })
      .eq('id', comparisonId)

    // Fetch campaigns for Period 1
    console.log('\n=== Starting Period 1 Sync ===')
    let period1Campaigns = []
    try {
      period1Campaigns = await fetchCampaignsForPeriod(
        comparison.period_1_start,
        comparison.period_1_end,
        comparison.period_1_label
      )
    } catch (period1Error) {
      console.warn('Period 1 fetch failed, will continue with empty data:', period1Error.message)
      period1Campaigns = []
    }

    // Save Period 1 campaigns
    if (period1Campaigns.length > 0) {
      const period1Inserts = period1Campaigns.map(campaign => ({
        comparison_id: comparisonId,
        period_number: 1,
        ...campaign
      }))

      const { error: insertError1 } = await supabase
        .from('period_comparison_campaigns')
        .insert(period1Inserts)

      if (insertError1) {
        console.error('Error inserting period 1 campaigns:', insertError1)
        throw new Error(`Failed to insert period 1 campaigns: ${insertError1.message}`)
      }

      console.log(`Successfully saved ${period1Campaigns.length} campaigns for Period 1`)
    }

    // Update progress
    await supabase
      .from('period_comparisons')
      .update({ sync_progress: 65 })
      .eq('id', comparisonId)

    // Fetch campaigns for Period 2
    console.log('\n=== Starting Period 2 Sync ===')
    let period2Campaigns = []
    try {
      period2Campaigns = await fetchCampaignsForPeriod(
        comparison.period_2_start,
        comparison.period_2_end,
        comparison.period_2_label
      )
    } catch (period2Error) {
      console.warn('Period 2 fetch failed, will continue with empty data:', period2Error.message)
      period2Campaigns = []
    }

    // Save Period 2 campaigns
    if (period2Campaigns.length > 0) {
      const period2Inserts = period2Campaigns.map(campaign => ({
        comparison_id: comparisonId,
        period_number: 2,
        ...campaign
      }))

      const { error: insertError2 } = await supabase
        .from('period_comparison_campaigns')
        .insert(period2Inserts)

      if (insertError2) {
        console.error('Error inserting period 2 campaigns:', insertError2)
        throw new Error(`Failed to insert period 2 campaigns: ${insertError2.message}`)
      }

      console.log(`Successfully saved ${period2Campaigns.length} campaigns for Period 2`)
    }

    // Mark as completed
    await supabase
      .from('period_comparisons')
      .update({ 
        status: 'completed',
        sync_progress: 100,
        error_message: null
      })
      .eq('id', comparisonId)

    console.log('=== Period Comparison Sync Completed Successfully ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Period comparison sync completed successfully',
        comparisonId: comparisonId,
        period1_campaigns: period1Campaigns.length,
        period2_campaigns: period2Campaigns.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in sync-period-comparison:', {
      message: error.message,
      stack: error.stack,
      comparisonId: comparisonId
    })
    
    // Try to update comparison with error status
    if (comparisonId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabase
          .from('period_comparisons')
          .update({ 
            status: 'error',
            error_message: error.message.substring(0, 500)
          })
          .eq('id', comparisonId)
      } catch (updateError) {
        console.error('Failed to update comparison with error status:', updateError)
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        details: error.stack,
        comparisonId: comparisonId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})