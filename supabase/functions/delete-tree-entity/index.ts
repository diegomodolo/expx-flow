import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('[delete-tree-entity] Started')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    const { entityType, entityId, clientId, facebookId } = await req.json()

    console.log('Delete request:', { entityType, entityId, clientId, facebookId })

    if (!entityType || !entityId || !clientId || !facebookId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('ad_account_id, company_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('Client not found:', clientError)
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get ad account
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('integration_id')
      .eq('id', client.ad_account_id)
      .single()

    if (adAccountError || !adAccount) {
      console.error('Ad account not found:', adAccountError)
      return new Response(
        JSON.stringify({ success: false, error: 'Ad account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get integration for access token
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token')
      .eq('id', adAccount.integration_id)
      .single()

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError)
      return new Response(
        JSON.stringify({ success: false, error: 'Facebook integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = integration.access_token

    // Delete from Meta API
    // For ads and adsets, we use DELETE method
    // For campaigns, Meta recommends setting status to DELETED instead of actual deletion
    let deleteUrl: string
    let deleteMethod = 'DELETE'
    let deleteBody: string | undefined

    if (entityType === 'campaign') {
      // For campaigns, update status to DELETED (Meta best practice)
      deleteUrl = `https://graph.facebook.com/v20.0/${facebookId}`
      deleteMethod = 'POST'
      deleteBody = `status=DELETED&access_token=${accessToken}`
      console.log('Archiving campaign (setting status to DELETED):', facebookId)
    } else {
      // For ad sets and ads, use DELETE
      deleteUrl = `https://graph.facebook.com/v20.0/${facebookId}?access_token=${accessToken}`
      console.log('Deleting entity from Meta:', facebookId)
    }

    const metaResponse = await fetch(deleteUrl, {
      method: deleteMethod,
      headers: deleteMethod === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      body: deleteBody,
    })

    const metaResult = await metaResponse.json()
    console.log('Meta API response:', metaResult)

    if (!metaResponse.ok) {
      console.error('Meta API error:', metaResult)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: metaResult.error?.message || 'Failed to delete from Meta' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete from local database
    let tableName: string
    switch (entityType) {
      case 'campaign':
        tableName = 'campaigns'
        break
      case 'adset':
        tableName = 'ad_sets'
        break
      case 'ad':
        tableName = 'ads'
        break
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid entity type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // For campaigns, also delete child ad sets and ads
    if (entityType === 'campaign') {
      // First get all ad sets for this campaign
      const { data: adSets } = await supabase
        .from('ad_sets')
        .select('id')
        .eq('campaign_id', entityId)

      if (adSets && adSets.length > 0) {
        const adSetIds = adSets.map(as => as.id)
        
        // Delete all ads for these ad sets
        const { error: adsDeleteError } = await supabase
          .from('ads')
          .delete()
          .in('ad_set_id', adSetIds)

        if (adsDeleteError) {
          console.error('Error deleting ads:', adsDeleteError)
        } else {
          console.log('Deleted ads for campaign')
        }

        // Delete all ad sets
        const { error: adSetsDeleteError } = await supabase
          .from('ad_sets')
          .delete()
          .eq('campaign_id', entityId)

        if (adSetsDeleteError) {
          console.error('Error deleting ad sets:', adSetsDeleteError)
        } else {
          console.log('Deleted ad sets for campaign')
        }
      }
    }

    // For ad sets, also delete child ads
    if (entityType === 'adset') {
      const { error: adsDeleteError } = await supabase
        .from('ads')
        .delete()
        .eq('ad_set_id', entityId)

      if (adsDeleteError) {
        console.error('Error deleting ads for adset:', adsDeleteError)
      } else {
        console.log('Deleted ads for ad set')
      }
    }

    // Delete the main entity
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', entityId)

    if (deleteError) {
      console.error('Error deleting from database:', deleteError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Deleted from Meta but failed to delete from database' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully deleted entity:', entityType, entityId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${entityType} deleted successfully` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
