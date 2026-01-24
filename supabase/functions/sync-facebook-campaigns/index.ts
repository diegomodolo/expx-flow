// Deno.serve is available natively in modern Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { sendWhatsAppAlerts, buildAlertMessage } from '../_shared/whatsapp-alerts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to extract balance from display_string for prepaid accounts
function extractBalanceFromDisplayString(displayString: string): number | null {
  if (!displayString) return null
  
  // Match formats like "Saldo disponível (R$782,55 BRL)" or "R$ 782.55"
  const match = displayString.match(/R\$\s*([\d.,]+)/)
  if (!match) return null
  
  // Convert "782,55" to 782.55 (Brazilian format to US format)
  const cleanValue = match[1].replace(/\./g, '').replace(',', '.')
  return parseFloat(cleanValue)
}

// Helper functions
async function updateJobProgress(supabase: any, jobId: string, progress: any) {
  await supabase.from('sync_jobs').update({ progress }).eq('id', jobId)
}

async function completeJob(supabase: any, jobId: string, success: boolean, errorMessage?: string) {
  await supabase.from('sync_jobs').update({
    status: success ? 'completed' : 'error',
    error_message: errorMessage,
    completed_at: new Date().toISOString()
  }).eq('id', jobId)
}

Deno.serve(async (req) => {
  console.log('[sync-facebook-campaigns] version=2026-01-08-disable-reason-fix')
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
      includeInactive = false,
      campaignFacebookId = null, // Optional: sync only a specific campaign
      startDate = null, // Optional: custom period start (YYYY-MM-DD)
      endDate = null // Optional: custom period end (YYYY-MM-DD)
    } = requestBody

    // Log received sync options for debugging
    console.log('=== Sync Options ===')
    console.log('clientId:', clientId)
    console.log('syncCampaigns:', syncCampaigns)
    console.log('syncAdSets:', syncAdSets)
    console.log('syncAds:', syncAds)
    console.log('campaignFacebookId:', campaignFacebookId)
    console.log('period:', period)
    console.log('startDate:', startDate)
    console.log('endDate:', endDate)
    console.log('====================')

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

    console.log('Processing sync for client ID:', clientId, 'Sync options:', { syncCampaigns, syncAdSets, syncAds, includeInactive, campaignFacebookId, startDate, endDate })

    // Get client info for company_id
    console.log('Fetching client data...')
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('company_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create sync job
    const { data: job, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        client_id: clientId,
        company_id: client.company_id,
        status: 'pending',
        job_type: 'sync_campaigns',
        options: { period, syncCampaigns, syncAdSets, syncAds, includeInactive }
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Error creating sync job:', jobError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create sync job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Created sync job:', job.id)

    // Return job ID immediately
    const response = new Response(
      JSON.stringify({ success: true, job_id: job.id }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    // Continue processing in background
    processSync(supabase, job.id, clientId, period, syncCampaigns, syncAdSets, syncAds, includeInactive, campaignFacebookId, startDate, endDate)
      .catch(error => console.error('Background sync error:', error))

    return response
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processSync(
  supabase: any,
  jobId: string,
  clientId: string,
  period: string,
  syncCampaigns: boolean,
  syncAdSets: boolean,
  syncAds: boolean,
  includeInactive: boolean,
  campaignFacebookId: string | null = null,
  startDate: string | null = null,
  endDate: string | null = null
) {
  try {
    // Update job to processing
    await supabase.from('sync_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', jobId)

    // Get full client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError || !client) {
      await supabase.from('sync_jobs').update({
        status: 'error',
        error_message: 'Client not found',
        completed_at: new Date().toISOString()
      }).eq('id', jobId)
      return
    }

    console.log('Client found:', { id: client.id, name: client.name, ad_account_id: client.ad_account_id })

    // Check if client is paused or canceled - skip sync completely
    if (client.is_paused || client.is_canceled) {
      const reason = client.is_canceled ? 'Cliente cancelado' : (client.pause_reason || 'Cliente pausado')
      console.log('Client is paused/canceled, skipping sync for:', client.name, 'Reason:', reason)
      await completeJob(supabase, jobId, true)
      return
    }

    // Note: We no longer skip based on inactive_reason - we always sync account status
    // even if the client has no active campaigns
    if (client.status === 'red' && client.inactive_reason) {
      console.log('Client has inactive_reason but will still sync account status:', client.name, 'Reason:', client.inactive_reason)
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

      await completeJob(supabase, jobId, true)
      return
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
      await completeJob(supabase, jobId, false, 'Database error while fetching ad account')
      return
    }

    if (!adAccount) {
      console.error('Ad account not found for ID:', client.ad_account_id)
      await completeJob(supabase, jobId, false, 'Ad account not found')
      return
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
      await completeJob(supabase, jobId, false, 'Database error while fetching integration')
      return
    }

    if (!integration) {
      console.error('Integration not found for ID:', adAccount.integration_id)
      await completeJob(supabase, jobId, false, 'Facebook integration not found')
      return
    }

    console.log('Integration found:', { id: integration.id, is_active: integration.is_active })

    if (!integration.is_active) {
      console.log('Integration is not active')
      await completeJob(supabase, jobId, false, 'Facebook integration is not active')
      return
    }

    const accessToken = integration.access_token
    const accountId = adAccount.account_id

    // Check account balance, funding status, and restrictions
    console.log('Checking account balance for:', accountId)
    
    // Fetch basic account info (v20 - is_user_allowed_to_advertise doesn't exist, so we rely on account_status)
    const balanceUrl = `https://graph.facebook.com/v20.0/${accountId}?fields=account_status,balance,spend_cap,disable_reason,funding_source_details,is_prepay_account&access_token=${accessToken}`
    console.log('Balance API URL (v20, without token):', balanceUrl.replace(accessToken, '[REDACTED]'))
    
    try {
      const balanceResponse = await fetch(balanceUrl)
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        console.log('Balance data received:', balanceData)
        
        // Extract balance based on account type
        let balance = 0
        const isPrepaid = balanceData.funding_source_details?.type === 20
        
        if (isPrepaid && balanceData.funding_source_details?.display_string) {
          // For prepaid accounts, extract balance from display_string
          const extractedBalance = extractBalanceFromDisplayString(
            balanceData.funding_source_details.display_string
          )
          balance = extractedBalance || 0
          console.log('✅ Prepaid account - extracted balance from display_string:', balance)
        } else {
          // For postpaid accounts, use balance field (convert from cents)
          balance = parseFloat(balanceData.balance || '0') / 100
          console.log('💳 Postpaid account - balance from API:', balance)
        }
        
        const accountStatus = parseInt(balanceData.account_status || '1')
        const spendCap = parseFloat(balanceData.spend_cap || '0') / 100 // Converter centavos para reais
        // CRITICAL FIX: disable_reason can be a number, so always convert to string safely
        const disableReasonRaw = balanceData.disable_reason
        const disableReason: string | null = disableReasonRaw != null ? String(disableReasonRaw) : null
        const fundingSourceDetails = balanceData.funding_source_details || {}
        
        // Enhanced funding issues detection - more refined logic
        console.log('🔍 DETAILED FUNDING ANALYSIS:')
        console.log('  - Account Status:', accountStatus, '(1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, 7 = PENDING_RISK_REVIEW, 8 = PENDING_SETTLEMENT, 9 = IN_GRACE_PERIOD, 100 = PENDING_CLOSURE, 101 = CLOSED)')
        console.log('  - Balance:', balance)
        console.log('  - Disable Reason (raw):', disableReasonRaw, '(as string):', disableReason)
        console.log('  - Spend Cap:', spendCap)
        console.log('  - Funding Source Details:', fundingSourceDetails)
        console.log('  - Is Prepaid:', isPrepaid)
        
        // Check each condition separately for better debugging
        // Account statuses that indicate issues: 2 (DISABLED), 3 (UNSETTLED), 7 (PENDING_RISK_REVIEW), 8 (PENDING_SETTLEMENT), 100 (PENDING_CLOSURE), 101 (CLOSED)
        const restrictedStatuses = [2, 3, 7, 8, 100, 101]
        const isAccountInactive = restrictedStatuses.includes(accountStatus)
        
        // Safe string check for disable reason
        const hasDisableReasonIssues = disableReason && (
          disableReason.includes('FUNDING') || 
          disableReason.includes('PAYMENT') ||
          disableReason.includes('BILLING') ||
          disableReason.includes('SPEND_LIMIT')
        )
        const hasBalanceIssues = isPrepaid && balance <= 0 // Only for prepaid accounts
        
        console.log('  - Account Inactive (status in restricted list)?', isAccountInactive)
        console.log('  - Has Disable Reason Issues?', hasDisableReasonIssues)
        console.log('  - Has Balance Issues?', hasBalanceIssues, '(only applies to prepaid)')
        
        const hasFundingIssues = hasDisableReasonIssues || hasBalanceIssues
        
        console.log(`💰 FUNDING DECISION: Has Issues = ${hasFundingIssues}`)
        console.log(`  - Logic: disableReasonIssues(${hasDisableReasonIssues}) OR balanceIssues(${hasBalanceIssues})`)
        
        // Detect restricted accounts (cannot advertise)
        // Status codes that indicate restriction: 2 (DISABLED), 7 (PENDING_RISK_REVIEW), 100 (PENDING_CLOSURE), 101 (CLOSED)
        const isRestricted = restrictedStatuses.includes(accountStatus)
        
        // Determine restriction reason
        let restrictionReason: string | null = null
        if (isRestricted) {
          if (accountStatus === 2) {
            restrictionReason = disableReason || 'Conta desabilitada pelo Meta'
          } else if (accountStatus === 3) {
            restrictionReason = 'Conta com pagamentos pendentes'
          } else if (accountStatus === 7) {
            restrictionReason = 'Conta em análise de risco pelo Meta'
          } else if (accountStatus === 8) {
            restrictionReason = 'Conta com liquidação pendente'
          } else if (accountStatus === 100) {
            restrictionReason = 'Conta pendente de fechamento'
          } else if (accountStatus === 101) {
            restrictionReason = 'Conta encerrada permanentemente'
          } else {
            restrictionReason = disableReason || `Conta com restrições (status: ${accountStatus})`
          }
        }
        
        // Can advertise: account is active (1) or in grace period (9)
        const canAdvertise = [1, 9].includes(accountStatus)
        
        console.log('🚫 RESTRICTION ANALYSIS:')
        console.log('  - Account Status:', accountStatus)
        console.log('  - Is Restricted:', isRestricted)
        console.log('  - Restriction Reason:', restrictionReason)
        console.log('  - Can Advertise:', canAdvertise)
        
        // Update ad account with financial status
        console.log(`💾 UPDATING ACCOUNT ${adAccount.id}:`)
        console.log(`  - Previous funding_issues: ${adAccount.has_funding_issues}`)
        console.log(`  - New funding_issues: ${hasFundingIssues}`)
        console.log(`  - New is_restricted: ${isRestricted}`)
        console.log(`  - New can_advertise: ${canAdvertise}`)
        console.log(`  - New restriction_reason: ${restrictionReason}`)
        
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
            is_restricted: isRestricted,
            restriction_reason: restrictionReason,
            can_advertise: canAdvertise,
            last_balance_check: new Date().toISOString()
          })
          .eq('id', adAccount.id)
        
        if (adAccountUpdateError) {
          console.error('❌ ERROR UPDATING ACCOUNT BALANCE:', adAccountUpdateError)
          console.error('❌ Failed to update account:', adAccount.id)
          console.error('❌ Update data was:', {
            balance,
            account_status: accountStatus,
            has_funding_issues: hasFundingIssues,
            is_restricted: isRestricted,
            can_advertise: canAdvertise
          })
        } else {
          console.log('✅ ACCOUNT UPDATE SUCCESSFUL')
          console.log('✅ Updated account:', adAccount.id)
          console.log('✅ New values - Balance:', balance, 'Status:', accountStatus, 'Funding Issues:', hasFundingIssues, 'Restricted:', isRestricted, 'Can Advertise:', canAdvertise)
          
          // Verify the update was successful by reading it back
          console.log('🔍 VERIFYING DATABASE UPDATE...')
          const { data: verifyData, error: verifyError } = await supabase
            .from('facebook_ad_accounts')
            .select('has_funding_issues, account_status, balance, is_restricted, can_advertise, restriction_reason')
            .eq('id', adAccount.id)
            .single()
          
          if (verifyError) {
            console.error('❌ VERIFICATION FAILED:', verifyError)
          } else {
            console.log('✅ VERIFICATION SUCCESS - Database now contains:')
            console.log('  - has_funding_issues:', verifyData.has_funding_issues)
            console.log('  - account_status:', verifyData.account_status)
            console.log('  - balance:', verifyData.balance)
            console.log('  - is_restricted:', verifyData.is_restricted)
            console.log('  - can_advertise:', verifyData.can_advertise)
            console.log('  - restriction_reason:', verifyData.restriction_reason)
          }
        }
      } else {
        console.warn('❌ FAILED TO FETCH ACCOUNT BALANCE (v20)')
        console.warn('  - Status Code:', balanceResponse.status)
        const errorText = await balanceResponse.text()
        console.warn('  - Error Response:', errorText)
        console.warn('  - Account ID:', adAccount.id)
        
        // Check if this is a permission error vs field error
        // Only mark funding issues if it's a real API access error
        const isPermissionError = errorText.includes('permission') || errorText.includes('token') || errorText.includes('OAuthException')
        
        if (isPermissionError) {
          console.log('⚠️ PERMISSION ERROR: Setting has_funding_issues = true (API access problem)')
          const { error: fallbackUpdateError } = await supabase
            .from('facebook_ad_accounts')
            .update({
              has_funding_issues: true,
              last_balance_check: new Date().toISOString()
            })
            .eq('id', adAccount.id)
            
          if (fallbackUpdateError) {
            console.error('❌ FALLBACK UPDATE FAILED:', fallbackUpdateError)
          } else {
            console.log('✅ FALLBACK UPDATE SUCCESS - Account marked as having funding issues due to API access error')
          }
        } else {
          console.log('⚠️ Non-permission error, not marking funding issues. Updating last check time only.')
          await supabase
            .from('facebook_ad_accounts')
            .update({ last_balance_check: new Date().toISOString() })
            .eq('id', adAccount.id)
        }
      }
    } catch (balanceError) {
      console.error('🚨 EXCEPTION DURING BALANCE CHECK:')
      console.error('  - Account ID:', adAccount.id)
      console.error('  - Error Type:', balanceError.constructor.name)
      console.error('  - Error Message:', balanceError.message)
      console.error('  - Error Stack:', balanceError.stack)
      
      // Network/transient errors - mark funding issues for safety
      console.log('⚠️ EXCEPTION FALLBACK: Setting has_funding_issues = true (safety measure)')
      const { error: errorFallbackUpdateError } = await supabase
        .from('facebook_ad_accounts')
        .update({
          has_funding_issues: true,
          last_balance_check: new Date().toISOString()
        })
        .eq('id', adAccount.id)
        
      if (errorFallbackUpdateError) {
        console.error('❌ EXCEPTION FALLBACK UPDATE FAILED:', errorFallbackUpdateError)
      } else {
        console.log('✅ EXCEPTION FALLBACK UPDATE SUCCESS')
      }
    }

    console.log('Fetching campaigns from Facebook for account:', accountId)
    console.log('Using period:', period, 'Custom range:', startDate, '-', endDate)
    console.log('Campaign filter (if any):', campaignFacebookId)
    
    // Map period to Facebook API parameters
    let dateParam = '';
    
    // Check if custom date range is provided
    if (startDate && endDate) {
      dateParam = `.time_range({"since":"${startDate}","until":"${endDate}"})`;
      console.log('Using custom date range:', startDate, 'to', endDate);
    } else {
      // Standard period presets
      switch (period) {
        case '1':
          dateParam = '.date_preset(today)';
          break;
        case '3':
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const todayFor3 = new Date();
          dateParam = `.time_range({"since":"${threeDaysAgo.toISOString().split('T')[0]}","until":"${todayFor3.toISOString().split('T')[0]}"})`;
          break;
        case '5':
          const fiveDaysAgo = new Date();
          fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
          const todayFor5 = new Date();
          dateParam = `.time_range({"since":"${fiveDaysAgo.toISOString().split('T')[0]}","until":"${todayFor5.toISOString().split('T')[0]}"})`;
          break;
        case '7':
          dateParam = '.date_preset(last_7d)';
          break;
        case '14':
          dateParam = '.date_preset(last_14d)';
          break;
        case '15':
          const fifteenDaysAgo = new Date();
          fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
          const today = new Date();
          dateParam = `.time_range({"since":"${fifteenDaysAgo.toISOString().split('T')[0]}","until":"${today.toISOString().split('T')[0]}"})`;
          break;
        case '30':
          dateParam = '.date_preset(last_30d)';
          break;
        case '60':
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
          const todayFor60 = new Date();
          dateParam = `.time_range({"since":"${sixtyDaysAgo.toISOString().split('T')[0]}","until":"${todayFor60.toISOString().split('T')[0]}"})`;
          break;
        case '90':
          dateParam = '.date_preset(last_90d)';
          break;
        case 'lifetime':
          dateParam = '.date_preset(maximum)';
          break;
        default:
          dateParam = '.date_preset(last_30d)';
      }
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
          'messaging_conversation_started',    // 3rd priority: Message conversations
          'conversation_started',              // 4th priority: General conversations
          'offsite_conversion.fb_pixel_custom',// 5th priority: Custom pixel event mapped as conversion/lead
          'onsite_conversion.lead',            // 6th priority: Onsite lead
          'omni_lead',                         // 7th priority: Omni lead
          'on_facebook_lead',                  // 8th priority: Facebook lead
          'on_facebook_conversation_started',  // 9th priority: Facebook conversations
          'onsite_conversion.lead_grouped',    // 10th priority: Grouped lead
          'website_lead'                       // 11th priority: Website lead
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

        // Fallback: any action type containing "lead" or "conversation" (use the maximum to avoid double-counting)
        const leadCandidates = normalized.filter(n => (n.type.includes('lead') || n.type.includes('conversation')) && n.val > 0)
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
    
    let campaigns: any[] = []
    
    // Check if we're fetching a specific campaign or all campaigns
    if (campaignFacebookId) {
      // Fetch specific campaign by Facebook ID
      console.log('Fetching SPECIFIC campaign:', campaignFacebookId)
      const singleCampaignUrl = `https://graph.facebook.com/v20.0/${campaignFacebookId}?fields=id,name,status,objective,daily_budget,lifetime_budget,insights${dateParam}.action_report_time(conversion).action_attribution_windows(["7d_click","1d_view"])` +
        `{impressions,clicks,spend,actions,conversions,conversion_values,action_values,reach,frequency,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&access_token=${accessToken}`
      console.log('Facebook API URL (single campaign, without token):', singleCampaignUrl.replace(accessToken, '[REDACTED]'))
      
      try {
        const response = await fetch(singleCampaignUrl)
        console.log('Facebook API response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Facebook API error response:', errorText)
          await completeJob(supabase, jobId, false, `Failed to fetch campaign from Facebook: ${errorText}`)
          return
        }
        
        const campaignData = await response.json()
        if (campaignData.error) {
          console.error('Facebook API error:', campaignData.error)
          await completeJob(supabase, jobId, false, campaignData.error.message || 'Facebook API error')
          return
        }
        
        campaigns = [campaignData]
        console.log('Single campaign fetched:', campaignData.name)
      } catch (fetchError: any) {
        console.error('Network error fetching campaign:', fetchError)
        await completeJob(supabase, jobId, false, `Network error: ${fetchError.message}`)
        return
      }
    } else {
      // Fetch all campaigns
      const baseCampaignsUrl = `https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,insights${dateParam}.action_report_time(conversion).action_attribution_windows(["7d_click","1d_view"])` +
        `{impressions,clicks,spend,actions,conversions,conversion_values,action_values,reach,frequency,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}&effective_status=["ACTIVE","PAUSED"]&limit=100&access_token=${accessToken}`
      console.log('Facebook API URL (without token):', baseCampaignsUrl.replace(accessToken, '[REDACTED]'))

      let pageUrl: string | null = baseCampaignsUrl

      while (pageUrl) {
        console.log('Fetching campaigns page:', pageUrl.replace(accessToken, '[REDACTED]'))
        
        let response;
        try {
          response = await fetch(pageUrl)
        } catch (fetchError: any) {
          console.error('Network error fetching campaigns:', fetchError)
          await completeJob(supabase, jobId, false, `Network error: ${fetchError.message}`)
          return
        }
        
        console.log('Facebook API response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Facebook API error response:', errorText)
          console.error('Facebook API status:', response.status)
          console.error('Facebook API statusText:', response.statusText)
          console.error('Period used:', period)
          console.error('Date param used:', dateParam)
          await completeJob(supabase, jobId, false, `Failed to fetch campaigns: ${errorText}`)
          return
        }

        const pageData = await response.json()
        console.log('Facebook campaigns page data count:', (pageData.data || []).length)

        if (pageData.error) {
          console.error('Facebook API error in page response:', pageData.error)
          await completeJob(supabase, jobId, false, pageData.error.message || 'Facebook API error')
          return
        }

        campaigns = campaigns.concat(pageData.data || [])
        pageUrl = pageData.paging?.next || null
        if (pageUrl) {
          console.log('Next page detected, continuing pagination...')
        }
      }
    }

    console.log('Number of campaigns found:', campaigns.length)
    
    // Calculate metrics and sync campaigns to database
    let activeCampaigns = 0
    let totalSpend = 0
    let totalLeads = 0
    let totalClicks = 0

    // Clear existing data based on sync options
    // IMPORTANT: when syncing a specific campaign, do NOT delete the campaign row.
    // Deleting it changes the internal UUID used by the UI route and breaks the editor URL.
    if (syncCampaigns) {
      if (campaignFacebookId) {
        console.log('Specific campaign sync: skipping campaign deletion to preserve internal campaign UUID:', campaignFacebookId)
      } else {
        // Delete all campaigns for the client (legacy full resync behavior)
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
    }

    if (syncAdSets) {
      if (campaignFacebookId) {
        // First get the internal campaign ID
        const { data: campaignRecord } = await supabase
          .from('campaigns')
          .select('id')
          .eq('facebook_id', campaignFacebookId)
          .eq('client_id', clientId)
          .single()
        
        if (campaignRecord) {
          const { error: deleteAdSetsError } = await supabase
            .from('ad_sets')
            .delete()
            .eq('campaign_id', campaignRecord.id)
          
          if (deleteAdSetsError) {
            console.error('Error deleting ad sets for campaign:', deleteAdSetsError)
          } else {
            console.log('Cleared ad sets for specific campaign')
          }
        }
      } else {
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
    }

    if (syncAds) {
      if (campaignFacebookId) {
        // First get the internal campaign ID
        const { data: campaignRecord } = await supabase
          .from('campaigns')
          .select('id')
          .eq('facebook_id', campaignFacebookId)
          .eq('client_id', clientId)
          .single()
        
        if (campaignRecord) {
          const { error: deleteAdsError } = await supabase
            .from('ads')
            .delete()
            .eq('campaign_id', campaignRecord.id)
          
          if (deleteAdsError) {
            console.error('Error deleting ads for campaign:', deleteAdsError)
          } else {
            console.log('Cleared ads for specific campaign')
          }
        }
      } else {
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
        // Budget values come from Facebook in cents, convert to real currency
        const dailyBudget = campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null
        const lifetimeBudget = campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null
        
        console.log(`Campaign budget for ${campaign.name}: daily=${dailyBudget}, lifetime=${lifetimeBudget}`)
        
        const campaignData = {
          facebook_id: campaign.id,
          name: campaign.name,
          platforms: 'Facebook Ads',
          status: isActive ? 'active' : 'paused',
          is_active: isActive,
          ctr: ctr,
          cpc: cpc,
          cpa: leads > 0 ? spend / leads : spend,
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
          daily_budget: dailyBudget,
          lifetime_budget: lifetimeBudget,
          client_id: clientId,
          user_id: client.user_id,
          company_id: client.company_id,
          period: '30 dias'
        }

        // Check if campaign already exists for this client
        const { data: existingCampaign } = await supabase
          .from('campaigns')
          .select('id')
          .eq('facebook_id', campaign.id)
          .eq('client_id', clientId)
          .maybeSingle()

        if (existingCampaign) {
          // Update existing campaign
          const { data: updatedCampaign, error: updateError } = await supabase
            .from('campaigns')
            .update(campaignData)
            .eq('id', existingCampaign.id)
            .select()
            .single()

          if (updateError) {
            console.error('Error updating campaign:', updateError)
            continue
          }
          console.log('Campaign updated:', campaign.name)
          savedCampaign = updatedCampaign
        } else {
          // Insert new campaign
          const { data: insertedCampaign, error: insertError } = await supabase
            .from('campaigns')
            .insert(campaignData)
            .select()
            .single()

          if (insertError) {
            console.error('Error inserting campaign:', insertError)
            continue
          }
          console.log('Campaign created:', campaign.name)
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
            // Added url_tags field to capture UTM parameters configured at adset level
            const adSetsUrl = `https://graph.facebook.com/v20.0/${campaign.id}/adsets?fields=id,name,status,daily_budget,lifetime_budget,bid_strategy,optimization_goal,targeting,promoted_object,url_tags,insights${dateParam}.action_report_time(conversion).action_attribution_windows([\"7d_click\",\"1d_view\"])` +
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

              // Save real conversions at ad set level for granular analysis
              adSetLeads = adSetCounted
              console.log('Ad set conversions saved:', adSet.name, adSetLeads)
            }

            // Extract pixel_id and conversion_event from promoted_object
            const promotedObject = adSet.promoted_object || {}
            const adSetPixelId = promotedObject.pixel_id || null
            const adSetConversionEvent = promotedObject.custom_event_type || null
            
            console.log('Ad set promoted_object:', JSON.stringify(promotedObject))
            console.log('Extracted pixel_id:', adSetPixelId, 'conversion_event:', adSetConversionEvent)
            
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
              pixel_id: adSetPixelId,
              conversion_event: adSetConversionEvent,
              cpm: adSetCpm,
              ctr: adSetCtr,
              cpc: adSetCpc,
              spend: adSetSpend,
              impressions: adSetImpressions,
              clicks: adSetClicks,
              conversions: adSetLeads,
              cpa: adSetLeads > 0 ? adSetSpend / adSetLeads : adSetSpend,
              reach: adSetReach,
              frequency: adSetFrequency,
              quality_ranking: adSetQualityRanking,
              engagement_rate_ranking: adSetEngagementRateRanking,
              conversion_rate_ranking: adSetConversionRateRanking,
              is_active: adSet.status === 'ACTIVE'
            }

            // Upsert by facebook_id to avoid duplicate key errors when resyncing.
            // This also guarantees the ad set gets linked to the current campaign_id.
            const { data: upsertedAdSets, error: adSetError } = await supabase
              .from('ad_sets')
              .upsert(adSetData, { onConflict: 'facebook_id' })
              .select()

            const savedAdSet = Array.isArray(upsertedAdSets) ? upsertedAdSets[0] : upsertedAdSets

            if (adSetError || !savedAdSet) {
              console.error('Error upserting ad set:', adSetError)
              continue
            } else {
              console.log('Ad set saved (upsert):', adSet.name)
            }

            // Fetch ads for this ad set if enabled
            if (syncAds) {
              try {
                console.log('Fetching ads for ad set:', adSet.id)
                // Expanded creative fields to capture CTA, description, url_tags and tracking_specs for UTM parameters
                // url_tags is where Meta stores the UTM parameters at the creative level
                const adsUrl = `https://graph.facebook.com/v20.0/${adSet.id}/ads?fields=id,name,status,tracking_specs,creative{id,title,body,image_url,video_id,thumbnail_url,object_story_spec,call_to_action_type,effective_object_story_id,url_tags,object_url},insights${dateParam}.action_report_time(conversion).action_attribution_windows([\"7d_click\",\"1d_view\"])` +
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
                  
                  // Helper function to fetch real video source URL from Meta API
                  const fetchVideoSourceUrl = async (videoId: string): Promise<{ sourceUrl: string; thumbnailUrl: string }> => {
                    try {
                      const url = `https://graph.facebook.com/v20.0/${videoId}?fields=source,picture&access_token=${accessToken}`
                      console.log(`Fetching video source URL for video_id: ${videoId}`)
                      const response = await fetch(url)
                      
                      if (!response.ok) {
                        console.log(`Failed to fetch video source for ${videoId}: status ${response.status}`)
                        return { sourceUrl: '', thumbnailUrl: '' }
                      }
                      
                      const data = await response.json()
                      console.log(`Video source response for ${videoId}:`, JSON.stringify(data))
                      return {
                        sourceUrl: data.source || '',
                        thumbnailUrl: data.picture || ''
                      }
                    } catch (error) {
                      console.error(`Error fetching video source for ${videoId}:`, error)
                      return { sourceUrl: '', thumbnailUrl: '' }
                    }
                  }
                  
                  // Helper function to extract media URLs (async for video source fetching)
                  const extractMediaUrls = async (creative: any, objectStory: any) => {
                    const imageUrl = creative.image_url || 
                                   linkData.picture || 
                                   linkData.image_url || 
                                   creative.thumbnail_url || 
                                   ''
                    
                    let videoUrl = ''
                    let videoThumbnail = ''
                    
                    // Get video_id from multiple possible locations
                    const videoId = creative.video_id || linkData.video_id || objectStory.video_data?.video_id
                    
                    if (videoId) {
                      // Fetch the real playable video URL from Meta API
                      const videoData = await fetchVideoSourceUrl(videoId)
                      videoUrl = videoData.sourceUrl
                      videoThumbnail = videoData.thumbnailUrl
                      
                      // Fallback to Facebook page URL if source not available
                      if (!videoUrl) {
                        console.log(`No source URL for video ${videoId}, using fallback`)
                        videoUrl = `https://www.facebook.com/${videoId}`
                      }
                    }
                    
                    // Use video thumbnail as image if no image available
                    const finalImageUrl = imageUrl || videoThumbnail
                    
                    console.log('Extracted URLs - Image:', finalImageUrl, 'Video:', videoUrl)
                    return { imageUrl: finalImageUrl, videoUrl }
                  }
                  
                  const creativeType = determineCreativeType(creative, objectStory)
                  const { imageUrl, videoUrl } = await extractMediaUrls(creative, objectStory)
                  
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
                    
                     // Count conversions at ad level for granular analysis
                     const adCombinedMetrics = [
                       ...(Array.isArray(adInsights.actions) ? adInsights.actions : []),
                       ...(Array.isArray((adInsights as any).conversions) ? (adInsights as any).conversions : [])
                     ]
                     adLeads = countConversionsFromActions(adCombinedMetrics, campaign.objective, `${campaign.name} → ${adSet.name} → ${ad.name}`)
                     console.log('Ad conversions saved:', ad.name, adLeads)
                  }
                   
                    // Extract call_to_action - can come from multiple places
                    const ctaFromLinkData = linkData.call_to_action
                    const ctaTypeFromCreative = creative.call_to_action_type
                    let callToActionValue: any = {}
                    
                    if (ctaFromLinkData && typeof ctaFromLinkData === 'object' && Object.keys(ctaFromLinkData).length > 0) {
                      callToActionValue = ctaFromLinkData
                    } else if (ctaTypeFromCreative) {
                      callToActionValue = { type: ctaTypeFromCreative }
                    }
                    
                    console.log('CTA extraction - linkData.call_to_action:', ctaFromLinkData, 'creative.call_to_action_type:', ctaTypeFromCreative, 'final:', callToActionValue)
                    
                    // Extract description - can come from multiple places
                    const descriptionValue = linkData.description || objectStory.video_data?.message || creative.body || ''
                    console.log('Description extraction - linkData.description:', linkData.description, 'final:', descriptionValue)
                    
                    const pickFirstNonEmptyString = (...candidates: any[]): string => {
                      for (const c of candidates) {
                        if (typeof c === 'string' && c.trim().length > 0) return c.trim()
                      }
                      return ''
                    }

                    const appendUrlTags = (baseUrl: string, tags: string): string => {
                      const cleanTags = (tags || '').trim().replace(/^\?/, '')
                      if (!baseUrl || !cleanTags) return baseUrl

                      // Avoid duplicating params if base URL already contains any of the same keys
                      const tagKeys = cleanTags
                        .split('&')
                        .map(p => p.split('=')[0]?.trim())
                        .filter(Boolean) as string[]

                      const alreadyHasAnyKey = tagKeys.some((k) => baseUrl.includes(`${k}=`))
                      if (alreadyHasAnyKey) return baseUrl

                      const separator = baseUrl.includes('?') ? '&' : '?'
                      return `${baseUrl}${separator}${cleanTags}`
                    }

                    // Get URL tags from multiple sources (priority: creative.url_tags > adSet.url_tags)
                    // url_tags is where Meta stores the UTM parameters
                    const creativeUrlTags = creative.url_tags || ''
                    const adSetUrlTags = adSet.url_tags || ''
                    const urlTags = creativeUrlTags || adSetUrlTags
                    console.log('URL Tags - creative.url_tags:', creativeUrlTags, 'adSet.url_tags:', adSetUrlTags, 'final:', urlTags)
                    
                    // Build final link_url (video creatives often store it under video_data.call_to_action.value.link)
                    const baseDestinationUrl = pickFirstNonEmptyString(
                      linkData.link,
                      linkData.call_to_action?.value?.link,
                      objectStory.video_data?.call_to_action?.value?.link,
                      objectStory.video_data?.call_to_action?.value?.link_url,
                      (creative as any).object_url,
                      callToActionValue?.value?.link
                    )
                    let finalLinkUrl = baseDestinationUrl

                    if (finalLinkUrl && urlTags) {
                      finalLinkUrl = appendUrlTags(finalLinkUrl, urlTags)
                      console.log('Final link URL (with url_tags if present):', finalLinkUrl)
                    } else {
                      console.log('Final link URL empty - baseDestinationUrl:', baseDestinationUrl, 'urlTags:', urlTags)
                    }
                    
                    // Extract pixel_id from tracking_specs
                    let adPixelId = null
                    if (ad.tracking_specs && Array.isArray(ad.tracking_specs)) {
                      const pixelSpec = ad.tracking_specs.find(
                        (spec: any) => spec['action.type'] === 'offsite_conversion' && spec.fb_pixel
                      )
                      if (pixelSpec?.fb_pixel) {
                        adPixelId = Array.isArray(pixelSpec.fb_pixel) 
                          ? pixelSpec.fb_pixel[0] 
                          : pixelSpec.fb_pixel
                      }
                    }
                    console.log('Ad tracking_specs:', JSON.stringify(ad.tracking_specs))
                    console.log('Extracted ad pixel_id:', adPixelId)
                    
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
                      creative_description: descriptionValue,
                      image_url: imageUrl,
                      video_url: videoUrl,
                     link_url: finalLinkUrl,
                     call_to_action: JSON.stringify(callToActionValue),
                     pixel_id: adPixelId,
                     ctr: adCtr,
                     cpc: adCpc,
                     cpm: adCpm,
                     spend: adSpend,
                     impressions: adImpressions,
                     clicks: adClicks,
                     conversions: adLeads,
                     cpa: adLeads > 0 ? adSpend / adLeads : adSpend,
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

                  // Upsert by facebook_id to avoid duplicate key errors when resyncing.
                  const { error: adError } = await supabase
                    .from('ads')
                    .upsert(adData, { onConflict: 'facebook_id' })

                  if (adError) {
                    console.error('Error inserting ad:', adError)
                  } else {
                    console.log('Ad saved:', ad.name)
                    
                    // Register URL in client_urls table if link_url exists
                    if (adData.link_url && adData.link_url.trim() !== '') {
                      try {
                        const fullUrl = adData.link_url.trim()
                        // Remove UTM parameters for cleaner URL storage
                        const urlWithoutParams = fullUrl.split('?')[0]
                        const urlObj = new URL(fullUrl)
                        const domain = urlObj.hostname.replace(/^www\./, '')
                        
                        // Use upsert to avoid duplicates and update last_seen_at
                        const { error: urlError } = await supabase.rpc('upsert_client_url', {
                          p_client_id: clientId,
                          p_company_id: client.company_id,
                          p_url: urlWithoutParams,
                          p_domain: domain,
                          p_source: 'meta_sync'
                        })
                        
                        if (urlError) {
                          console.log('Error saving URL to client_urls:', urlError.message)
                        } else {
                          console.log('URL registered for client:', domain)
                        }
                      } catch (urlParseError) {
                        console.log('Error parsing URL:', urlParseError)
                      }
                    }
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
      console.error('❌ ERROR FETCHING UPDATED AD ACCOUNT DATA:', adAccountFetchError)
      console.error('❌ Account ID that failed:', adAccount.id)
    } else {
      console.log('✅ SUCCESSFULLY FETCHED UPDATED AD ACCOUNT DATA:')
      console.log('✅ Account ID:', adAccount.id)
      console.log('✅ Updated ad account data:', JSON.stringify(updatedAdAccount, null, 2))
      console.log('📊 FUNDING STATUS COMPARISON:')
      console.log('  - Original ad account has_funding_issues:', adAccount.has_funding_issues || false)
      console.log('  - Database now has_funding_issues:', updatedAdAccount.has_funding_issues)
      console.log('  - Values match?', (adAccount.has_funding_issues || false) === updatedAdAccount.has_funding_issues)
      console.log('  - Account status:', updatedAdAccount.account_status, '(1 = ACTIVE)')
      console.log('  - Balance:', updatedAdAccount.balance)
      console.log('  - Disable reason:', updatedAdAccount.disable_reason)
    }

    // Determine client status based on funding issues first, then active campaigns
    let clientStatus = 'green' // Excelente
    let statusReason = 'Conta operando normalmente'

    console.log('🎯 DETERMINING CLIENT STATUS for:', client.name)
    console.log('📊 STATUS DETERMINATION INPUTS:')
    console.log('  - Active Campaigns:', activeCampaigns)
    console.log('  - Has Updated Ad Account?', !!updatedAdAccount)
    console.log('  - Ad Account has_funding_issues:', updatedAdAccount?.has_funding_issues)
    console.log('  - Ad Account balance:', updatedAdAccount?.balance)
    console.log('  - Ad Account status:', updatedAdAccount?.account_status)
    console.log('  - Ad Account disable_reason:', updatedAdAccount?.disable_reason)

    // Priority 1: Check for real funding issues (more strict validation)
    console.log('🔍 EVALUATING FUNDING ISSUES...')
    console.log('  - updatedAdAccount exists?', !!updatedAdAccount)
    console.log('  - has_funding_issues value:', updatedAdAccount?.has_funding_issues)
    console.log('  - account_status:', updatedAdAccount?.account_status, '(1 = ACTIVE)')
    console.log('  - balance:', updatedAdAccount?.balance)
    console.log('  - disable_reason:', updatedAdAccount?.disable_reason)
    
    // Check campaigns spend pattern to detect funding issues
    const { data: activeCampaignsData } = await supabase
      .from('campaigns')
      .select('spend, status')
      .eq('client_id', clientId)
      .eq('status', 'active')
    
    const totalActiveSpend = activeCampaignsData?.reduce((sum, campaign) => sum + (parseFloat(campaign.spend) || 0), 0) || 0
    const hasActiveCampaignsInDB = (activeCampaignsData?.length || 0) > 0
    
    console.log('  - Active campaigns in DB:', activeCampaignsData?.length || 0)
    console.log('  - Total active campaigns spend:', totalActiveSpend)
    console.log('  - Has active campaigns with zero spend?', hasActiveCampaignsInDB && totalActiveSpend === 0)
    
    const hasRealFundingIssues = updatedAdAccount && (
      updatedAdAccount.account_status !== 1 || // Account disabled
      (updatedAdAccount.is_prepaid && updatedAdAccount.balance !== null && updatedAdAccount.balance <= 0) || // No balance (only for prepaid)
      (hasActiveCampaignsInDB && totalActiveSpend === 0) // Active campaigns but no spend (indicates funding issues)
    )
    
    console.log('  - Real funding issues detected?', hasRealFundingIssues)
    
    if (hasRealFundingIssues) {
      clientStatus = 'red' // Emergencial
      if (updatedAdAccount.account_status !== 1) {
        statusReason = 'Conta de anúncios desabilitada'
        
        // Send WhatsApp alert for disabled account
        console.log('📱 Sending WhatsApp alert for disabled account...')
        sendWhatsAppAlerts(supabase, {
          companyId: client.company_id,
          notificationType: 'disabled_account',
          message: buildAlertMessage('disabled_account', {
            clientName: client.name,
            accountName: updatedAdAccount.name || 'Conta Meta Ads',
            reason: updatedAdAccount.disable_reason || 'Conta desabilitada pela Meta'
          }),
          relatedEntityType: 'client',
          relatedEntityId: clientId,
        }).catch(err => console.error('WhatsApp alert error:', err))
        
      } else if (updatedAdAccount.is_prepaid && updatedAdAccount.balance <= 0) {
        statusReason = 'Sem fundos na conta de anúncios'
        
        // Send WhatsApp alert for low/zero balance
        console.log('📱 Sending WhatsApp alert for zero balance...')
        sendWhatsAppAlerts(supabase, {
          companyId: client.company_id,
          notificationType: 'low_balance',
          message: buildAlertMessage('low_balance', {
            clientName: client.name,
            balance: 0,
            dailySpend: totalActiveSpend > 0 ? totalActiveSpend / parseInt(period) : 0,
            daysRemaining: 0
          }),
          relatedEntityType: 'client',
          relatedEntityId: clientId,
        }).catch(err => console.error('WhatsApp alert error:', err))
        
      } else if (hasActiveCampaignsInDB && totalActiveSpend === 0) {
        statusReason = 'Sem fundos - campanhas ativas sem gastos'
      } else if (updatedAdAccount.disable_reason) {
        statusReason = `Problema na conta: ${updatedAdAccount.disable_reason}`
      } else {
        statusReason = 'Problemas de financiamento detectados'
      }
      console.log('🔴 CLIENT STATUS SET TO RED due to REAL funding issues')
      console.log('  - Reason:', statusReason)
      console.log('  - Balance:', updatedAdAccount.balance)
      console.log('  - Account Status:', updatedAdAccount.account_status)
      console.log('  - Active campaigns spend:', totalActiveSpend)
      console.log('  - Disable Reason:', updatedAdAccount.disable_reason)
    }
    // Priority 2: No active campaigns
    else if (activeCampaigns === 0) {
      clientStatus = 'red' // Emergencial
      statusReason = 'Nenhuma campanha ativa'
      console.log('🔴 CLIENT STATUS SET TO RED due to no active campaigns')
    }
    // Priority 3: Few active campaigns but still active
    else if (activeCampaigns <= 2) {
      clientStatus = 'yellow' // Atenção
      statusReason = `Apenas ${activeCampaigns} campanha(s) ativa(s)`
      console.log('🟡 CLIENT STATUS SET TO YELLOW due to low campaign count:', activeCampaigns)
    }
    else {
      clientStatus = 'green' // Healthy
      statusReason = null
      console.log('🟢 CLIENT STATUS SET TO GREEN - all metrics are healthy')
      console.log('  - Active campaigns:', activeCampaigns)
      console.log('  - No real funding issues detected')
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

    console.log(`📊 FINAL CLIENT STATUS SUMMARY for ${client.name}:`)
    console.log(`  - Status: ${clientStatus} (${activeCampaigns} campaigns)`)
    console.log(`  - Funding Issues: ${updatedAdAccount?.has_funding_issues}`)
    console.log(`  - Inactive Reason: ${clientStatus === 'red' ? statusReason : 'None (active)'}`)
    console.log(`  - Metrics:`, JSON.stringify(metricsData, null, 2))

    // Update client with real data and status
    console.log('💾 UPDATING CLIENT IN DATABASE...')
    console.log('  - Client ID:', clientId)
    console.log('  - New Status:', clientStatus)
    console.log('  - New Inactive Reason:', metricsData.inactive_reason)
    
    const { error: updateError } = await supabase
      .from('clients')
      .update(metricsData)
      .eq('id', clientId)

    if (updateError) {
      console.error('❌ ERROR UPDATING CLIENT:', updateError)
      console.error('❌ Client ID that failed:', clientId)
      console.error('❌ Data that failed to update:', JSON.stringify(metricsData, null, 2))
      await completeJob(supabase, jobId, false, 'Failed to update client data: ' + updateError.message)
      return
    }

    console.log('✅ CLIENT UPDATE SUCCESSFUL')
    console.log('✅ Client', clientId, 'updated with status:', clientStatus)
    
    // Verify the client update
    console.log('🔍 VERIFYING CLIENT UPDATE...')
    const { data: verifyClientData, error: verifyClientError } = await supabase
      .from('clients')
      .select('status, inactive_reason, active_campaigns')
      .eq('id', clientId)
      .single()
    
    if (verifyClientError) {
      console.error('❌ CLIENT VERIFICATION FAILED:', verifyClientError)
    } else {
      console.log('✅ CLIENT VERIFICATION SUCCESS - Database now contains:')
      console.log('  - status:', verifyClientData.status)
      console.log('  - inactive_reason:', verifyClientData.inactive_reason)
      console.log('  - active_campaigns:', verifyClientData.active_campaigns)
      console.log('  - Status matches expected?', verifyClientData.status === clientStatus)
    }

    await completeJob(supabase, jobId, true)
    console.log('🎉 SYNC JOB COMPLETED SUCCESSFULLY for client:', clientId)

  } catch (error: any) {
    console.error('=== ERROR in sync-facebook-campaigns ===')
    console.error('Error type:', error?.constructor?.name || 'Unknown')
    console.error('Error message:', error?.message || String(error))
    console.error('Error stack:', error?.stack || 'No stack trace')
    console.error('=====================================')
    
    await completeJob(supabase, jobId, false, error?.message || 'Internal server error')
  }
}