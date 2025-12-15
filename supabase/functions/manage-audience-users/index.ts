import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

interface RequestBody {
  action: 'add' | 'remove' | 'replace';
  clientId: string;
  audienceId: string;
  users: UserData[];
}

// SHA256 hash function
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Normalize and hash data according to Meta's requirements
async function normalizeAndHash(value: string | undefined, type: string): Promise<string | null> {
  if (!value || value.trim() === '') return null;

  let normalized = value.trim().toLowerCase();

  switch (type) {
    case 'email':
      // Remove extra spaces, lowercase
      normalized = normalized.replace(/\s+/g, '');
      break;
    case 'phone':
      // Remove all non-numeric characters, add country code if missing
      normalized = normalized.replace(/\D/g, '');
      if (!normalized.startsWith('55') && normalized.length <= 11) {
        normalized = '55' + normalized;
      }
      break;
    case 'firstName':
    case 'lastName':
    case 'city':
    case 'state':
      // Just lowercase and trim
      normalized = normalized.replace(/\s+/g, ' ').trim();
      break;
    case 'country':
      // Use ISO country code
      normalized = normalized.length === 2 ? normalized : 'br';
      break;
    case 'zipCode':
      // Remove non-alphanumeric characters
      normalized = normalized.replace(/[^a-z0-9]/g, '');
      break;
  }

  return await sha256(normalized);
}

// Build user data array for Meta API
async function buildUserDataForMeta(users: UserData[]): Promise<string[][]> {
  const result: string[][] = [];

  for (const user of users) {
    const row: string[] = [];

    // Hash each field
    const emailHash = await normalizeAndHash(user.email, 'email');
    const phoneHash = await normalizeAndHash(user.phone, 'phone');
    const fnHash = await normalizeAndHash(user.firstName, 'firstName');
    const lnHash = await normalizeAndHash(user.lastName, 'lastName');
    const ctHash = await normalizeAndHash(user.city, 'city');
    const stHash = await normalizeAndHash(user.state, 'state');
    const countryHash = await normalizeAndHash(user.country, 'country');
    const zipHash = await normalizeAndHash(user.zipCode, 'zipCode');

    row.push(emailHash || '');
    row.push(phoneHash || '');
    row.push(fnHash || '');
    row.push(lnHash || '');
    row.push(ctHash || '');
    row.push(stHash || '');
    row.push(countryHash || '');
    row.push(zipHash || '');

    result.push(row);
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: RequestBody = await req.json();
    const { action, clientId, audienceId, users } = body;

    console.log(`[manage-audience-users] Action: ${action}, AudienceId: ${audienceId}, Users: ${users.length}`);

    if (!users || users.length === 0) {
      throw new Error('No users provided');
    }

    // Buscar cliente e integração Facebook
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, company_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Buscar integração Facebook
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token, expires_at')
      .eq('company_id', client.company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('[manage-audience-users] Integration error:', integrationError);
      throw new Error('Facebook integration not found');
    }

    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      throw new Error('Facebook access token has expired');
    }

    const accessToken = integration.access_token;
    const graphApiUrl = 'https://graph.facebook.com/v22.0';

    // Buscar audiência local
    const { data: audience, error: audienceError } = await supabase
      .from('meta_audiences')
      .select('id, meta_audience_id')
      .eq('meta_audience_id', audienceId)
      .eq('client_id', clientId)
      .single();

    // Criar registro de upload
    const { data: upload, error: uploadError } = await supabase
      .from('meta_audience_uploads')
      .insert({
        audience_id: audience?.id,
        company_id: client.company_id,
        upload_type: action,
        records_count: users.length,
        status: 'processing',
        created_by: user.id,
      })
      .select()
      .single();

    if (uploadError) {
      console.error('[manage-audience-users] Upload insert error:', uploadError);
    }

    // Build hashed user data
    const hashedData = await buildUserDataForMeta(users);

    // Schema for Meta API
    const schema = ['EMAIL', 'PHONE', 'FN', 'LN', 'CT', 'ST', 'COUNTRY', 'ZIP'];

    // Determine endpoint based on action
    let url: string;
    let method: string;
    let payload: any;

    if (action === 'add' || action === 'replace') {
      url = `${graphApiUrl}/${audienceId}/users`;
      method = 'POST';
      payload = {
        payload: {
          schema,
          data: hashedData,
        },
        access_token: accessToken,
      };
    } else if (action === 'remove') {
      url = `${graphApiUrl}/${audienceId}/users`;
      method = 'DELETE';
      payload = {
        payload: {
          schema,
          data: hashedData,
        },
        access_token: accessToken,
      };
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[manage-audience-users] Sending request to Meta API`);

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error) {
      console.error('[manage-audience-users] Meta API error:', data.error);
      
      // Update upload status
      if (upload) {
        await supabase
          .from('meta_audience_uploads')
          .update({
            status: 'failed',
            error_message: data.error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', upload.id);
      }

      throw new Error(data.error.message);
    }

    console.log(`[manage-audience-users] Meta response:`, data);

    // Update upload status
    if (upload) {
      await supabase
        .from('meta_audience_uploads')
        .update({
          status: 'completed',
          session_id: data.session_id,
          records_received: data.num_received,
          records_invalid: data.num_invalid_entries,
          completed_at: new Date().toISOString(),
        })
        .eq('id', upload.id);
    }

    return new Response(JSON.stringify({
      success: true,
      result: {
        session_id: data.session_id,
        num_received: data.num_received,
        num_invalid_entries: data.num_invalid_entries,
        invalid_entry_samples: data.invalid_entry_samples,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[manage-audience-users] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
