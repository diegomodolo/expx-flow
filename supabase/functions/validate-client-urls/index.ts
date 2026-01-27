import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationResult {
  url_id: string
  status: 'ok' | 'error' | 'timeout' | 'redirect' | 'pending' | 'empty'
  status_code: number | null
  load_time_ms: number | null
  error_message: string | null
  final_url: string | null
  content_length?: number | null
}

// Extract visible text from HTML (removes scripts, styles, tags)
function extractVisibleText(html: string): string {
  // Remove script tags and their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // Remove style tags and their content
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

// Check if page content is effectively empty
// Returns true only for truly empty pages, not SPAs
function isPageEmpty(html: string): boolean {
  const lowerHtml = html.toLowerCase()
  
  // If page has React/Vue/Angular root elements with JS bundles, it's likely an SPA - NOT empty
  // These frameworks render content client-side, so the HTML may look empty but isn't
  const spaIndicators = [
    'id="root"',
    'id="app"',
    'id="__next"',
    'id="__nuxt"',
    'ng-app',
    'data-reactroot',
    'data-v-',
    '__NEXT_DATA__',
    '__NUXT__',
    'window.__INITIAL_STATE__',
    'type="module"',
    'vite',
    'webpack',
    'bundle.js',
    'main.js',
    'app.js',
  ]
  
  for (const indicator of spaIndicators) {
    if (lowerHtml.includes(indicator.toLowerCase())) {
      console.log(`SPA detected via indicator: ${indicator}`)
      return false // It's an SPA, not empty
    }
  }
  
  // Check for meaningful content indicators
  const contentIndicators = [
    '<main',
    '<article',
    '<section',
    '<header',
    '<nav',
    '<h1',
    '<h2',
    '<p>',
    '<img',
    '<video',
    '<form',
  ]
  
  let contentElementCount = 0
  for (const indicator of contentIndicators) {
    if (lowerHtml.includes(indicator)) {
      contentElementCount++
    }
  }
  
  // If page has multiple content elements, it's not empty
  if (contentElementCount >= 2) {
    return false
  }
  
  // Extract visible text and check length
  const visibleText = extractVisibleText(html)
  
  // Consider page empty if visible text is less than 50 characters
  // AND there are no content indicators
  const isEmpty = visibleText.length < 50 && contentElementCount === 0
  
  if (isEmpty) {
    console.log(`Page detected as empty. Visible text length: ${visibleText.length}, Content elements: ${contentElementCount}`)
  }
  
  return isEmpty
}

async function validateUrl(url: string, urlId: string): Promise<ValidationResult> {
  const startTime = Date.now()

  // Use a real browser-like user agent to avoid bot-blocked “blank HTML” responses.
  const browserHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  }
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    // First do HEAD request for quick status check
    const headResponse = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        ...browserHeaders,
      },
    })
    
    const headTime = Date.now() - startTime
    
    // Check for redirects
    const finalUrl = headResponse.url !== url ? headResponse.url : null
    
    // Handle non-200 responses
    if (headResponse.status >= 400) {
      clearTimeout(timeoutId)
      return {
        url_id: urlId,
        status: 'error',
        status_code: headResponse.status,
        load_time_ms: headTime,
        error_message: null,
        final_url: finalUrl,
      }
    }
    
    if (headResponse.status >= 300 || finalUrl) {
      clearTimeout(timeoutId)
      return {
        url_id: urlId,
        status: 'redirect',
        status_code: headResponse.status,
        load_time_ms: headTime,
        error_message: null,
        final_url: finalUrl,
      }
    }
    
    // For 200 responses, do GET to check content
    const getController = new AbortController()
    const getTimeoutId = setTimeout(() => getController.abort(), 5000) // 5s timeout for content check
    
    try {
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
        redirect: 'follow',
        headers: {
          ...browserHeaders,
        },
      })
      
      clearTimeout(getTimeoutId)
      clearTimeout(timeoutId)
      
      // Read only first 100KB of content
      const reader = getResponse.body?.getReader()
      let content = ''
      let totalBytes = 0
      // Some pages place meaningful content late in the HTML (after heavy scripts/styles).
      // We read up to 300KB to reduce false positives, but avoid downloading full pages.
      const maxBytes = 300 * 1024 // 300KB limit
      let reachedLimit = false
      let lastCheckBytes = 0
      
      if (reader) {
        const decoder = new TextDecoder()
        while (totalBytes < maxBytes) {
          const { done, value } = await reader.read()
          if (done) break
          content += decoder.decode(value, { stream: true })
          totalBytes += value?.length || 0

          // Periodically check if we already have enough visible text to decide it's not empty
          if (totalBytes - lastCheckBytes >= 32 * 1024) {
            lastCheckBytes = totalBytes
            const sampleText = extractVisibleText(content)
            if (sampleText.length >= 80) {
              break
            }
          }
        }
        if (totalBytes >= maxBytes) reachedLimit = true
        reader.cancel() // Cancel remaining content
      }
      
      const loadTime = Date.now() - startTime
      
      // Check if content is empty.
      // IMPORTANT: only mark as "empty" if we didn't hit the size cap;
      // if we hit the cap, the page may have content later and we avoid false positives.
      if (!reachedLimit && isPageEmpty(content)) {
        return {
          url_id: urlId,
          status: 'empty',
          status_code: getResponse.status,
          load_time_ms: loadTime,
          error_message: 'Página sem conteúdo visível',
          final_url: finalUrl,
          content_length: totalBytes,
        }
      }
      
      return {
        url_id: urlId,
        status: 'ok',
        status_code: getResponse.status,
        load_time_ms: loadTime,
        error_message: null,
        final_url: finalUrl,
        content_length: totalBytes,
      }
    } catch (getError: any) {
      clearTimeout(getTimeoutId)
      clearTimeout(timeoutId)
      
      // If GET fails but HEAD succeeded, still mark as OK
      // The page might block GET but serve content via browser
      return {
        url_id: urlId,
        status: 'ok',
        status_code: headResponse.status,
        load_time_ms: headTime,
        error_message: null,
        final_url: finalUrl,
      }
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
      empty: results.filter(r => r.status === 'empty').length,
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
