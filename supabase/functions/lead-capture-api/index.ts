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

// Validate if string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

interface LeadCaptureRequest {
  // === 1. IDENTIFICAÇÃO DO LEAD ===
  lead_status?: string;
  primary_source?: string;
  secondary_source?: string;
  capture_url?: string;
  capture_type?: string;
  
  // === 2. DADOS DA EMPRESA ===
  company_name?: string;
  company_trade_name?: string;
  cnpj?: string;
  company_segment?: string;
  company_subsegment?: string;
  cnae?: string;
  company_size?: string;
  monthly_revenue?: string;
  annual_revenue?: string;
  employee_count?: string;
  years_in_market?: number;
  client_type?: string;
  company_website?: string;
  company_linkedin?: string;
  
  // === 3. DADOS DO CONTATO (PESSOA) ===
  full_name: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  job_level?: string;
  department?: string;
  email?: string;
  email_type?: string;
  phone?: string;
  whatsapp?: string;
  linkedin_profile?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  date_of_birth?: string;
  gender?: 'm' | 'f' | 'o';
  facebook_id?: string;
  instagram?: string;
  
  // === 4. ESTRUTURA ORGANIZACIONAL / DECISÃO ===
  buying_role?: string;
  is_decision_maker?: boolean;
  influence_level?: string;
  decision_makers_count?: number;
  
  // === 5. STACK ATUAL / CONTEXTO DE SOFTWARE ===
  uses_software?: boolean;
  software_type?: string;
  current_software?: string;
  current_vendor?: string;
  software_usage_time?: string;
  software_satisfaction?: string;
  main_pain_point?: string;
  switch_reason?: string;
  
  // === 6. POTENCIAL DE COMPRA ===
  estimated_users?: number;
  license_type?: string;
  budget_range?: string;
  purchase_timeline?: string;
  urgency_level?: string;
  
  // === 7. COMPORTAMENTO E ENGAJAMENTO ===
  first_interaction_at?: string;
  last_interaction_at?: string;
  content_consumed?: string[];
  content_type?: string;
  pages_visited?: string[];
  visited_pricing?: boolean;
  attended_webinar?: boolean;
  requested_demo?: boolean;
  
  // === 8. ORIGEM DE MARKETING E AQUISIÇÃO ===
  acquisition_channel?: string;
  specific_source?: string;
  campaign?: string;
  ad_set?: string;
  creative?: string;
  keyword?: string;
  lead_cost?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  
  // === 9. QUALIDADE E ENRIQUECIMENTO ===
  lead_validated?: boolean;
  company_validated?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  data_enriched?: boolean;
  enrichment_source?: string;
  
  // === 10. CONSENTIMENTO E COMPLIANCE (LGPD) ===
  lgpd_consent?: boolean;
  consent_date?: string;
  consent_source?: string;
  data_purpose?: string;
  partner_sharing_consent?: boolean;
  
  // === 11. CAMPOS TÉCNICOS / OPERACIONAIS ===
  internal_classification?: string;
  internal_notes?: string;
  tags?: string[];
  assigned_to?: string;
  
  // === CAMPOS EXISTENTES/LEGADOS ===
  client_id?: string;
  client_external_id?: string;
  client_sector?: string;
  source?: string;
  value?: number;
  extra_data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key. Include X-API-Key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const apiKeyHash = await sha256(apiKey);

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

    const permissions = apiKeyRecord.permissions as { capture?: boolean };
    if (!permissions?.capture) {
      return new Response(
        JSON.stringify({ error: 'API key does not have capture permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = apiKeyRecord.company_id;
    const body: LeadCaptureRequest = await req.json();

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

    const emailHash = body.email ? await sha256(normalizeEmail(body.email)) : null;
    const phoneHash = body.phone ? await sha256(normalizePhone(body.phone)) : null;

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

    // Build the lead data object with all fields
    const buildLeadData = (existing?: Record<string, unknown>) => {
      const firstClientId = body.client_id && isValidUUID(body.client_id) ? body.client_id : null;
      const assignedToUUID = body.assigned_to && isValidUUID(body.assigned_to) ? body.assigned_to : null;
      
      const mergedExtraData: Record<string, unknown> = {
        ...((existing?.extra_data as Record<string, unknown>) || {}),
        ...(body.extra_data || {}),
        ...(body.client_id && !isValidUUID(body.client_id) ? { client_identifier: body.client_id } : {}),
      };

      return {
        // Existing fields
        company_id: companyId,
        email_hash: emailHash,
        phone_hash: phoneHash,
        email: body.email ?? existing?.email,
        phone: body.phone ?? existing?.phone,
        full_name: body.full_name ?? existing?.full_name,
        first_name: body.first_name ?? existing?.first_name,
        last_name: body.last_name ?? existing?.last_name,
        city: body.city ?? existing?.city,
        state: body.state ?? existing?.state,
        country: body.country ?? existing?.country ?? 'BR',
        zip_code: body.zip_code ?? existing?.zip_code,
        date_of_birth: body.date_of_birth ?? existing?.date_of_birth,
        gender: body.gender ?? existing?.gender,
        facebook_id: body.facebook_id ?? existing?.facebook_id,
        instagram: body.instagram ?? existing?.instagram,
        original_source: body.source ?? body.primary_source ?? existing?.original_source ?? 'api',
        first_client_id: existing ? existing.first_client_id : firstClientId,
        extra_data: mergedExtraData,
        
        // === 2. DADOS DA EMPRESA ===
        company_name: body.company_name ?? existing?.company_name,
        company_trade_name: body.company_trade_name ?? existing?.company_trade_name,
        cnpj: body.cnpj ?? existing?.cnpj,
        company_segment: body.company_segment ?? existing?.company_segment,
        company_subsegment: body.company_subsegment ?? existing?.company_subsegment,
        cnae: body.cnae ?? existing?.cnae,
        company_size: body.company_size ?? existing?.company_size,
        monthly_revenue: body.monthly_revenue ?? existing?.monthly_revenue,
        annual_revenue: body.annual_revenue ?? existing?.annual_revenue,
        employee_count: body.employee_count ?? existing?.employee_count,
        years_in_market: body.years_in_market ?? existing?.years_in_market,
        client_type: body.client_type ?? existing?.client_type,
        company_website: body.company_website ?? existing?.company_website,
        company_linkedin: body.company_linkedin ?? existing?.company_linkedin,
        
        // === 3. DADOS DO CONTATO (PESSOA) - campos adicionais ===
        job_title: body.job_title ?? existing?.job_title,
        job_level: body.job_level ?? existing?.job_level,
        department: body.department ?? existing?.department,
        email_type: body.email_type ?? existing?.email_type,
        whatsapp: body.whatsapp ?? existing?.whatsapp,
        linkedin_profile: body.linkedin_profile ?? existing?.linkedin_profile,
        
        // === 4. ESTRUTURA ORGANIZACIONAL / DECISÃO ===
        buying_role: body.buying_role ?? existing?.buying_role,
        is_decision_maker: body.is_decision_maker ?? existing?.is_decision_maker,
        influence_level: body.influence_level ?? existing?.influence_level,
        decision_makers_count: body.decision_makers_count ?? existing?.decision_makers_count,
        
        // === 5. STACK ATUAL / CONTEXTO DE SOFTWARE ===
        uses_software: body.uses_software ?? existing?.uses_software,
        software_type: body.software_type ?? existing?.software_type,
        current_software: body.current_software ?? existing?.current_software,
        current_vendor: body.current_vendor ?? existing?.current_vendor,
        software_usage_time: body.software_usage_time ?? existing?.software_usage_time,
        software_satisfaction: body.software_satisfaction ?? existing?.software_satisfaction,
        main_pain_point: body.main_pain_point ?? existing?.main_pain_point,
        switch_reason: body.switch_reason ?? existing?.switch_reason,
        
        // === 6. POTENCIAL DE COMPRA ===
        estimated_users: body.estimated_users ?? existing?.estimated_users,
        license_type: body.license_type ?? existing?.license_type,
        budget_range: body.budget_range ?? existing?.budget_range,
        purchase_timeline: body.purchase_timeline ?? existing?.purchase_timeline,
        urgency_level: body.urgency_level ?? existing?.urgency_level,
        
        // === 7. COMPORTAMENTO E ENGAJAMENTO ===
        first_interaction_at: existing?.first_interaction_at ?? body.first_interaction_at ?? new Date().toISOString(),
        last_interaction_at: body.last_interaction_at ?? new Date().toISOString(),
        content_consumed: body.content_consumed ?? existing?.content_consumed ?? [],
        content_type: body.content_type ?? existing?.content_type,
        pages_visited: body.pages_visited ?? existing?.pages_visited ?? [],
        visited_pricing: body.visited_pricing ?? existing?.visited_pricing,
        attended_webinar: body.attended_webinar ?? existing?.attended_webinar,
        requested_demo: body.requested_demo ?? existing?.requested_demo,
        
        // === 8. ORIGEM DE MARKETING E AQUISIÇÃO ===
        acquisition_channel: body.acquisition_channel ?? existing?.acquisition_channel,
        specific_source: body.specific_source ?? existing?.specific_source,
        campaign: body.campaign ?? body.utm_campaign ?? existing?.campaign,
        ad_set: body.ad_set ?? existing?.ad_set,
        creative: body.creative ?? existing?.creative,
        keyword: body.keyword ?? existing?.keyword,
        lead_cost: body.lead_cost ?? existing?.lead_cost,
        capture_url: body.capture_url ?? existing?.capture_url,
        capture_type: body.capture_type ?? existing?.capture_type,
        secondary_source: body.secondary_source ?? existing?.secondary_source,
        
        // === 9. QUALIDADE E ENRIQUECIMENTO ===
        lead_validated: body.lead_validated ?? existing?.lead_validated,
        company_validated: body.company_validated ?? existing?.company_validated,
        email_verified: body.email_verified ?? existing?.email_verified,
        phone_verified: body.phone_verified ?? existing?.phone_verified,
        data_enriched: body.data_enriched ?? existing?.data_enriched,
        enrichment_source: body.enrichment_source ?? existing?.enrichment_source,
        
        // === 10. CONSENTIMENTO E COMPLIANCE (LGPD) ===
        lgpd_consent: body.lgpd_consent ?? existing?.lgpd_consent,
        consent_date: body.consent_date ?? existing?.consent_date,
        consent_source: body.consent_source ?? existing?.consent_source,
        data_purpose: body.data_purpose ?? existing?.data_purpose,
        partner_sharing_consent: body.partner_sharing_consent ?? existing?.partner_sharing_consent,
        
        // === 11. CAMPOS TÉCNICOS / OPERACIONAIS ===
        lead_status: body.lead_status ?? existing?.lead_status ?? 'novo',
        internal_classification: body.internal_classification ?? existing?.internal_classification,
        internal_notes: body.internal_notes ?? existing?.internal_notes,
        tags: body.tags ?? existing?.tags ?? [],
        assigned_to: assignedToUUID ?? existing?.assigned_to,
        
        updated_at: new Date().toISOString()
      };
    };

    if (existingLead) {
      leadId = existingLead.id;
      
      const updateData = buildLeadData(existingLead);
      // Remove fields that shouldn't be updated
      delete (updateData as Record<string, unknown>).company_id;
      delete (updateData as Record<string, unknown>).email_hash;
      delete (updateData as Record<string, unknown>).phone_hash;
      delete (updateData as Record<string, unknown>).first_client_id;
      
      // Increment interactions
      (updateData as Record<string, unknown>).total_interactions = (existingLead.total_interactions || 0) + 1;
      
      // Append to arrays instead of replacing
      if (body.content_consumed && existingLead.content_consumed) {
        const existingContent = existingLead.content_consumed as string[];
        const newContent = body.content_consumed.filter((c: string) => !existingContent.includes(c));
        (updateData as Record<string, unknown>).content_consumed = [...existingContent, ...newContent];
      }
      
      if (body.pages_visited && existingLead.pages_visited) {
        const existingPages = existingLead.pages_visited as string[];
        const newPages = body.pages_visited.filter((p: string) => !existingPages.includes(p));
        (updateData as Record<string, unknown>).pages_visited = [...existingPages, ...newPages];
      }
      
      if (body.tags && existingLead.tags) {
        const existingTags = existingLead.tags as string[];
        const newTags = body.tags.filter((t: string) => !existingTags.includes(t));
        (updateData as Record<string, unknown>).tags = [...existingTags, ...newTags];
      }

      const { error: updateError } = await supabase
        .from('lead_master_pool')
        .update(updateData)
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating lead:', updateError);
        throw updateError;
      }

      console.log(`Lead updated: ${leadId}, interactions: ${(existingLead.total_interactions || 0) + 1}`);
    } else {
      isNew = true;
      const insertData = buildLeadData();
      (insertData as Record<string, unknown>).total_interactions = 1;

      const { data: newLead, error: insertError } = await supabase
        .from('lead_master_pool')
        .insert(insertData)
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting lead:', insertError);
        throw insertError;
      }

      leadId = newLead.id;
      console.log(`New lead created: ${leadId}`);
    }

    // Create client interaction if client_id provided
    let clientSector = body.client_sector;
    let resolvedClientId: string | null = null;
    
    if (body.client_id) {
      let client = null;
      
      if (isValidUUID(body.client_id)) {
        const { data } = await supabase
          .from('clients')
          .select('id, sector')
          .eq('id', body.client_id)
          .eq('company_id', companyId)
          .single();
        client = data;
      }
      
      if (!client) {
        const { data } = await supabase
          .from('clients')
          .select('id, sector')
          .eq('email', body.client_id)
          .eq('company_id', companyId)
          .single();
        client = data;
      }
      
      if (!client) {
        const { data } = await supabase
          .from('clients')
          .select('id, sector')
          .ilike('name', body.client_id)
          .eq('company_id', companyId)
          .single();
        client = data;
      }
      
      if (!client) {
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
            source: body.source || body.primary_source || 'api',
            utm_source: body.utm_source,
            utm_medium: body.utm_medium,
            utm_campaign: body.utm_campaign || body.campaign
          });

        if (interactionError) {
          console.error('Error creating interaction:', interactionError);
        }
      } else {
        console.log(`No client found for identifier: "${body.client_id}". Lead captured without client association.`);
      }
    }

    // Auto-assign sector segment
    if (clientSector || body.company_segment) {
      const segmentName = clientSector || body.company_segment;
      const { data: sectorSegment } = await supabase
        .from('lead_segments')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('segment_type', 'sector')
        .ilike('name', segmentName!)
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

    // Auto-assign location segment
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
