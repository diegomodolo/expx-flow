import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// SHA256 hash function
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Normalize email for hashing
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Normalize phone for hashing (E.164 format)
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

interface ConversionRequest {
  external_id: string; // email or phone
  client_id: string;
  conversion_type: 'converted' | 'qualified' | 'disqualified' | 'won' | 'lost';
  value?: number;
  metadata?: Record<string, unknown>;
}

// Calculate new lead score based on conversion history
function calculateScore(conversions: number, totalValue: number, interactionType: string): number {
  let score = 0;
  
  // Base score from conversions
  score += Math.min(conversions * 10, 50);
  
  // Score from value
  if (totalValue >= 10000) score += 25;
  else if (totalValue >= 5000) score += 20;
  else if (totalValue >= 1000) score += 10;
  else if (totalValue > 0) score += 5;
  
  // Score modifier from interaction type
  switch (interactionType) {
    case 'won':
      score += 25;
      break;
    case 'qualified':
      score += 15;
      break;
    case 'converted':
      score += 10;
      break;
    case 'disqualified':
      score -= 10;
      break;
    case 'lost':
      score -= 5;
      break;
  }
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow PATCH
    if (req.method !== 'PATCH') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use PATCH.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key. Include X-API-Key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the API key for lookup
    const apiKeyHash = await sha256(apiKey);

    // Validate API key and get company_id
    const { data: apiKeyRecord, error: apiKeyError } = await supabase
      .from('company_api_keys')
      .select('id, company_id, is_active, permissions, request_count')
      .eq('api_key_hash', apiKeyHash)
      .single();

    if (apiKeyError || !apiKeyRecord) {
      console.error('API key validation failed:', apiKeyError);
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKeyRecord.is_active) {
      return new Response(
        JSON.stringify({ error: 'API key is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions
    const permissions = apiKeyRecord.permissions as { conversion?: boolean };
    if (!permissions?.conversion) {
      return new Response(
        JSON.stringify({ error: 'API key does not have conversion permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = apiKeyRecord.company_id;

    // Parse request body
    const body: ConversionRequest = await req.json();

    // Validate required fields
    if (!body.external_id) {
      return new Response(
        JSON.stringify({ error: 'external_id (email or phone) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.conversion_type) {
      return new Response(
        JSON.stringify({ error: 'conversion_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validTypes = ['converted', 'qualified', 'disqualified', 'won', 'lost'];
    if (!validTypes.includes(body.conversion_type)) {
      return new Response(
        JSON.stringify({ error: `conversion_type must be one of: ${validTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if external_id is email or phone
    const isEmail = body.external_id.includes('@');
    const hash = isEmail 
      ? await sha256(normalizeEmail(body.external_id))
      : await sha256(normalizePhone(body.external_id));

    // Find lead by hash
    const hashField = isEmail ? 'email_hash' : 'phone_hash';
    const { data: lead, error: leadError } = await supabase
      .from('lead_master_pool')
      .select('*')
      .eq('company_id', companyId)
      .eq(hashField, hash)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found with provided external_id' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client sector
    const { data: client } = await supabase
      .from('clients')
      .select('sector')
      .eq('id', body.client_id)
      .single();

    // Create interaction record
    const { error: interactionError } = await supabase
      .from('lead_client_interactions')
      .insert({
        lead_id: lead.id,
        client_id: body.client_id,
        company_id: companyId,
        interaction_type: body.conversion_type,
        client_sector: client?.sector,
        value: body.value || 0,
        source: 'api',
        metadata: body.metadata || {}
      });

    if (interactionError) {
      console.error('Error creating interaction:', interactionError);
      throw interactionError;
    }

    // Update lead metrics
    const isConversion = ['converted', 'qualified', 'won'].includes(body.conversion_type);
    const newConversions = isConversion ? lead.total_conversions + 1 : lead.total_conversions;
    const newValue = lead.total_value + (body.value || 0);
    const newScore = calculateScore(newConversions, newValue, body.conversion_type);

    const { error: updateError } = await supabase
      .from('lead_master_pool')
      .update({
        total_conversions: newConversions,
        total_value: newValue,
        global_score: newScore,
        propensity_to_convert: Math.min(1, newConversions / 10), // Simple propensity calculation
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    // Auto-assign behavior segments based on conversion
    if (isConversion) {
      // Look for "Convertedores" or similar segment
      const { data: behaviorSegment } = await supabase
        .from('lead_segments')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('segment_type', 'behavior')
        .ilike('name', '%convert%')
        .limit(1)
        .single();

      if (behaviorSegment) {
        await supabase
          .from('lead_segment_assignments')
          .upsert({
            lead_id: lead.id,
            segment_id: behaviorSegment.id,
            assigned_by: 'auto'
          }, { onConflict: 'lead_id,segment_id' });
      }
    }

    // Check for high value segment
    if (newValue >= 5000) {
      const { data: valueSegment } = await supabase
        .from('lead_segments')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('segment_type', 'value')
        .limit(1)
        .single();

      if (valueSegment) {
        await supabase
          .from('lead_segment_assignments')
          .upsert({
            lead_id: lead.id,
            segment_id: valueSegment.id,
            assigned_by: 'auto'
          }, { onConflict: 'lead_id,segment_id' });
      }
    }

    // Update API key usage stats
    await supabase
      .from('company_api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        request_count: (apiKeyRecord.request_count || 0) + 1
      })
      .eq('id', apiKeyRecord.id);

    console.log(`Conversion recorded for lead ${lead.id}: ${body.conversion_type}, value: ${body.value || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead.id,
        conversion_type: body.conversion_type,
        new_score: newScore,
        total_conversions: newConversions,
        total_value: newValue
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lead-conversion-api:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
