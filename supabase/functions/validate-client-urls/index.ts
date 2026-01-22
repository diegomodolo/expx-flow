import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationResult {
  url_id: string
  status: 'ok' | 'error' | 'timeout' | 'redirect' | 'pending'
  status_code: number | null
  load_time_ms: number | null
  error_message: string | null
  final_url: string | null
}

async function validateUrl(url: string, urlId: string): Promise<ValidationResult> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; URLValidator/1.0)',
      },
    })
    
    clearTimeout(timeoutId)
    const loadTime = Date.now() - startTime
    
    // Check for redirects
    const finalUrl = response.url !== url ? response.url : null
    
    // Determine status based on HTTP code
    let status: ValidationResult['status'] = 'ok'
    if (response.status >= 400) {
      status = 'error'
    } else if (response.status >= 300 || finalUrl) {
      status = 'redirect'
    }
    
    return {
      url_id: urlId,
      status,
      status_code: response.status,
      load_time_ms: loadTime,
      error_message: null,
      final_url: finalUrl,
    }
  } catch (error: any) {
    const loadTime = Date.now() - startTime
    
    if (error.name === 'AbortError') {
      return {
        url_id: urlId,
        status: 'timeout',
        status_code: null,
        load_time_ms: loadTime,
        error_message: 'Timeout após 10 segundos',
        final_url: null,
      }
    }
    
    return {
      url_id: urlId,
      status: 'error',
      status_code: null,
      load_time_ms: loadTime,
      error_message: error.message || 'Erro desconhecido',
      final_url: null,
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { url_ids, client_id, company_id } = await req.json()

    if (!url_ids && !client_id && !company_id) {
      return new Response(
        JSON.stringify({ error: 'url_ids, client_id ou company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch URLs to validate
    let query = supabaseClient.from('client_urls').select('id, url, client_id')
    
    if (url_ids && url_ids.length > 0) {
      // Specific URL IDs
      query = query.in('id', url_ids)
    } else if (client_id) {
      // All active URLs for a specific client
      query = query.eq('client_id', client_id).eq('is_active', true)
    } else if (company_id) {
      // All active URLs for all non-canceled clients of a company
      console.log(`Fetching URLs for all clients in company: ${company_id}`)
      
      // First, get all active client IDs for this company
      const { data: clients, error: clientsError } = await supabaseClient
        .from('clients')
        .select('id')
        .eq('company_id', company_id)
        .eq('is_canceled', false)
      
      if (clientsError) {
        console.error('Error fetching clients:', clientsError)
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar clientes da empresa' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (!clients || clients.length === 0) {
        console.log('No active clients found for company')
        return new Response(
          JSON.stringify({ message: 'Nenhum cliente ativo encontrado', results: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const clientIds = clients.map(c => c.id)
      console.log(`Found ${clientIds.length} active clients`)
      
      query = query.in('client_id', clientIds).eq('is_active', true)
    }

    const { data: urls, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching URLs:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar URLs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!urls || urls.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma URL para validar', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Validating ${urls.length} URLs...`)

    // Validate all URLs in parallel (with limit of 5 concurrent)
    const batchSize = 5
    const results: ValidationResult[] = []
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(urlRecord => validateUrl(urlRecord.url, urlRecord.id))
      )
      results.push(...batchResults)
      
      // Log progress for long operations
      if (urls.length > 10) {
        console.log(`Validated ${Math.min(i + batchSize, urls.length)}/${urls.length} URLs`)
      }
    }

    // Update database with results
    for (const result of results) {
      const { error: updateError } = await supabaseClient
        .from('client_urls')
        .update({
          validation_status: result.status,
          validation_status_code: result.status_code,
          validation_load_time_ms: result.load_time_ms,
          validation_error: result.error_message,
          validation_final_url: result.final_url,
          last_validated_at: new Date().toISOString(),
        })
        .eq('id', result.url_id)

      if (updateError) {
        console.error(`Error updating URL ${result.url_id}:`, updateError)
      }
    }

    // Summary statistics
    const summary = {
      total: results.length,
      ok: results.filter(r => r.status === 'ok').length,
      error: results.filter(r => r.status === 'error').length,
      timeout: results.filter(r => r.status === 'timeout').length,
      redirect: results.filter(r => r.status === 'redirect').length,
    }

    console.log(`Validation complete. Summary:`, JSON.stringify(summary))

    return new Response(
      JSON.stringify({ 
        message: `${results.length} URLs validadas`,
        summary,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Validation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
