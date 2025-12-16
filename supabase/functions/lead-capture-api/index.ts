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
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 55 (Brazil), keep it; otherwise add 55
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

// Validate if string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

interface LeadCaptureRequest {
  email?: string;
  phone?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  date_of_birth?: string;
  gender?: 'm' | 'f' | 'o';
  facebook_id?: string;
  instagram?: string;
  client_id?: string; // Optional - must be valid UUID if provided, otherwise ignored
  client_external_id?: string; // Optional - any string identifier for the client
  client_sector?: string; // Optional - sector name directly, used if client_id not provided
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  value?: number;
  extra_data?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
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
      .select('id, company_id, is_active, permissions')
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
    const permissions = apiKeyRecord.permissions as { capture?: boolean };
    if (!permissions?.capture) {
      return new Response(
        JSON.stringify({ error: 'API key does not have capture permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = apiKeyRecord.company_id;

    // Parse request body
    const body: LeadCaptureRequest = await req.json();

    // Validate required fields
    if (!body.full_name) {
      return new Response(
        JSON.stringify({ error: 'full_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.email && !body.phone) {
      return new Response(
        JSON.stringify({ error: 'Either email or phone is required for lead identification' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate hashes for deduplication
    const emailHash = body.email ? await sha256(normalizeEmail(body.email)) : null;
    const phoneHash = body.phone ? await sha256(normalizePhone(body.phone)) : null;

    // Check for existing lead by email or phone hash
    let existingLead = null;

    if (emailHash) {
      const { data } = await supabase
        .from('lead_master_pool')
        .select('*')
        .eq('company_id', companyId)
        .eq('email_hash', emailHash)
        .single();
      existingLead = data;
    }

    if (!existingLead && phoneHash) {
      const { data } = await supabase
        .from('lead_master_pool')
        .select('*')
        .eq('company_id', companyId)
        .eq('phone_hash', phoneHash)
        .single();
      existingLead = data;
    }

    let leadId: string;
    let isNew = false;
    const segmentsAssigned: string[] = [];

    if (existingLead) {
      // Update existing lead
      leadId = existingLead.id;
      
      const { error: updateError } = await supabase
        .from('lead_master_pool')
        .update({
          total_interactions: existingLead.total_interactions + 1,
          // Update fields only if provided and not already set
          first_name: body.first_name || existingLead.first_name,
          last_name: body.last_name || existingLead.last_name,
          city: body.city || existingLead.city,
          state: body.state || existingLead.state,
          zip_code: body.zip_code || existingLead.zip_code,
          date_of_birth: body.date_of_birth || existingLead.date_of_birth,
          gender: body.gender || existingLead.gender,
          facebook_id: body.facebook_id || existingLead.facebook_id,
          instagram: body.instagram || existingLead.instagram,
          extra_data: {
            ...((existingLead.extra_data as Record<string, unknown>) || {}),
            ...(body.extra_data || {})
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating lead:', updateError);
        throw updateError;
      }

      console.log(`Lead updated: ${leadId}, interactions: ${existingLead.total_interactions + 1}`);
    } else {
      // Create new lead
      isNew = true;

      // lead_master_pool.first_client_id is UUID in DB, so only set it when a UUID is provided.
      const firstClientId = body.client_id && isValidUUID(body.client_id) ? body.client_id : null;

      // Preserve the raw identifier (email/phone/etc) for traceability
      const mergedExtraData: Record<string, unknown> = {
        ...(body.extra_data || {}),
        ...(body.client_id ? { client_identifier: body.client_id } : {}),
      };

      const { data: newLead, error: insertError } = await supabase
        .from('lead_master_pool')
        .insert({
          company_id: companyId,
          email_hash: emailHash,
          phone_hash: phoneHash,
          email: body.email,
          phone: body.phone,
          full_name: body.full_name,
          first_name: body.first_name,
          last_name: body.last_name,
          city: body.city,
          state: body.state,
          country: body.country || 'BR',
          zip_code: body.zip_code,
          date_of_birth: body.date_of_birth,
          gender: body.gender,
          facebook_id: body.facebook_id,
          instagram: body.instagram,
          original_source: body.source || 'api',
          first_client_id: firstClientId,
          extra_data: mergedExtraData,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting lead:', insertError);
        throw insertError;
      }

      leadId = newLead.id;
      console.log(`New lead created: ${leadId}`);
    }

    // Create client interaction if client_id provided (can be UUID, email, or any identifier)
    let clientSector = body.client_sector; // Use directly provided sector as fallback
    let resolvedClientId: string | null = null;
    
    if (body.client_id) {
      let client = null;
      
      // Try to find client by different methods
      if (isValidUUID(body.client_id)) {
        // Search by UUID
        const { data } = await supabase
          .from('clients')
          .select('id, sector')
          .eq('id', body.client_id)
          .eq('company_id', companyId)
          .single();
        client = data;
      }
      
      if (!client) {
        // Search by email
        const { data } = await supabase
          .from('clients')
          .select('id, sector')
          .eq('email', body.client_id)
          .eq('company_id', companyId)
          .single();
        client = data;
      }
      
      if (!client) {
        // Search by name (case insensitive)
        const { data } = await supabase
          .from('clients')
          .select('id, sector')
          .ilike('name', body.client_id)
          .eq('company_id', companyId)
          .single();
        client = data;
      }
      
      if (!client) {
        // Search by company name (case insensitive)
        const { data } = await supabase
          .from('clients')
          .select('id, sector')
          .ilike('company', body.client_id)
          .eq('company_id', companyId)
          .single();
        client = data;
      }

      if (client) {
        resolvedClientId = client.id;
        if (client.sector) {
          clientSector = client.sector;
        }
        console.log(`Client found: ${resolvedClientId} (searched by: "${body.client_id}")`);

        const { error: interactionError } = await supabase
          .from('lead_client_interactions')
          .insert({
            lead_id: leadId,
            client_id: resolvedClientId,
            company_id: companyId,
            interaction_type: 'captured',
            client_sector: clientSector,
            value: body.value || 0,
            source: body.source || 'api',
            utm_source: body.utm_source,
            utm_medium: body.utm_medium,
            utm_campaign: body.utm_campaign
          });

        if (interactionError) {
          console.error('Error creating interaction:', interactionError);
        }
      } else {
        console.log(`No client found for identifier: "${body.client_id}". Lead captured without client association.`);
      }
    }

    // Auto-assign sector segment if we have a sector (from client or directly provided)
    if (clientSector) {
      const { data: sectorSegment } = await supabase
        .from('lead_segments')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('segment_type', 'sector')
        .ilike('name', clientSector)
        .single();

      if (sectorSegment) {
        const { error: assignError } = await supabase
          .from('lead_segment_assignments')
          .upsert({
            lead_id: leadId,
            segment_id: sectorSegment.id,
            assigned_by: 'auto'
          }, { onConflict: 'lead_id,segment_id' });

        if (!assignError) {
          segmentsAssigned.push(sectorSegment.name);
        }
      }
    }

    // Auto-assign location segment if state provided
    if (body.state) {
      const { data: locationSegment } = await supabase
        .from('lead_segments')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('segment_type', 'location')
        .ilike('name', `%${body.state}%`)
        .limit(1)
        .single();

      if (locationSegment) {
        const { error: assignError } = await supabase
          .from('lead_segment_assignments')
          .upsert({
            lead_id: leadId,
            segment_id: locationSegment.id,
            assigned_by: 'auto'
          }, { onConflict: 'lead_id,segment_id' });

        if (!assignError) {
          segmentsAssigned.push(locationSegment.name);
        }
      }
    }

    // Update API key usage stats
    await supabase
      .from('company_api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        request_count: (apiKeyRecord as { request_count?: number }).request_count ? 
          (apiKeyRecord as { request_count: number }).request_count + 1 : 1
      })
      .eq('id', apiKeyRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: leadId,
        is_new: isNew,
        message: isNew ? 'Lead captured successfully' : 'Lead updated successfully',
        segments_assigned: segmentsAssigned
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lead-capture-api:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
