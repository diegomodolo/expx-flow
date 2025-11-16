import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { clientId, adAccountId } = await req.json()

    if (!clientId && !adAccountId) {
      throw new Error('clientId or adAccountId is required')
    }

    console.log('Refreshing balance for:', { clientId, adAccountId })

    // If we have clientId, get the ad account info
    let accountInfo
    if (clientId) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('company_id, ad_account_id, facebook_ad_accounts(id, account_id, facebook_integrations(access_token))')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError
      if (!client) throw new Error('Client not found')

      // Verify user has access to this client's company
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      if (!employee || employee.company_id !== client.company_id) {
        throw new Error('Unauthorized - user does not have access to this client')
      }

      accountInfo = client.facebook_ad_accounts
    } else {
      // Get account info directly
      const { data: account, error: accountError } = await supabase
        .from('facebook_ad_accounts')
        .select('id, account_id, company_id, facebook_integrations(access_token)')
        .eq('id', adAccountId)
        .single()

      if (accountError) throw accountError
      if (!account) throw new Error('Account not found')

      // Verify user has access
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      if (!employee || employee.company_id !== account.company_id) {
        throw new Error('Unauthorized - user does not have access to this account')
      }

      accountInfo = account
    }

    if (!accountInfo?.facebook_integrations?.access_token) {
      throw new Error('Facebook integration not found or access token missing')
    }

    const accessToken = accountInfo.facebook_integrations.access_token
    const accountId = accountInfo.account_id

    console.log('Fetching balance from Facebook API for account:', accountId)

    // Fetch balance from Facebook API
    const balanceUrl = `https://graph.facebook.com/v20.0/${accountId}?fields=account_status,balance,disable_reason,funding_source_details&access_token=${accessToken}`
    
    const balanceResponse = await fetch(balanceUrl)
    
    if (!balanceResponse.ok) {
      const errorText = await balanceResponse.text()
      console.error('Facebook API error:', errorText)
      throw new Error(`Facebook API error: ${balanceResponse.status} - ${errorText}`)
    }

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
    const disableReason = balanceData.disable_reason || null
    const fundingSourceDetails = balanceData.funding_source_details || {}

    // Determine if account has funding issues
    const hasFundingIssues = balance <= 0 || accountStatus !== 1
    
    console.log('Updating database with:', { balance, accountStatus, hasFundingIssues })

    // Update database
    const { data: updatedAccount, error: updateError } = await supabase
      .from('facebook_ad_accounts')
      .update({
        balance,
        account_status: accountStatus,
        disable_reason: disableReason,
        has_funding_issues: hasFundingIssues,
        last_balance_check: new Date().toISOString()
      })
      .eq('id', accountInfo.id)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      throw updateError
    }

    console.log('Balance updated successfully:', updatedAccount)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          balance: updatedAccount.balance,
          account_status: updatedAccount.account_status,
          disable_reason: updatedAccount.disable_reason,
          has_funding_issues: updatedAccount.has_funding_issues,
          last_balance_check: updatedAccount.last_balance_check
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error refreshing balance:', error)
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