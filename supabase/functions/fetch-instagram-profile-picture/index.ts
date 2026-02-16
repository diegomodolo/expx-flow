import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveInstagramCredentials } from '../_shared/instagram-token-resolver.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instagramAccountId, clientId } = await req.json();

    if (!instagramAccountId) {
      return new Response(
        JSON.stringify({ success: false, error: 'instagramAccountId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Instagram profile picture for account:', instagramAccountId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get company_id for the account
    const { data: igAccount, error: igError } = await supabase
      .from('instagram_accounts')
      .select('company_id')
      .eq('id', instagramAccountId)
      .single();

    if (igError || !igAccount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Instagram account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use shared resolver for correct token + IG ID
    const credentials = await resolveInstagramCredentials(supabase, instagramAccountId, igAccount.company_id);
    const accessToken = credentials.accessToken;
    const igUserId = credentials.instagramUserId;

    // Fetch the profile picture URL from Instagram Graph API
    console.log('Fetching profile picture from Graph API for IG user:', igUserId);
    
    const graphResponse = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}?fields=profile_picture_url&access_token=${accessToken}`
    );

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Graph API error:', graphResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Graph API error: ${graphResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const graphData = await graphResponse.json();
    const profilePictureUrl = graphData.profile_picture_url;

    if (!profilePictureUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'No profile picture URL available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Got fresh profile picture URL, now downloading...');

    const imageResponse = await fetch(profilePictureUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      console.error('Failed to download image:', imageResponse.status);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to download image: ${imageResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    let contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';

    const timestamp = Date.now();
    const randomId = crypto.randomUUID().substring(0, 8);
    const fileName = `client-avatars/${timestamp}-${randomId}.${extension}`;

    console.log('Uploading to storage:', fileName, 'Size:', imageBytes.length, 'bytes');

    const { error: uploadError } = await supabase.storage
      .from('ai-generated-images')
      .upload(fileName, imageBytes, { contentType, upsert: false });

    if (uploadError) {
      return new Response(
        JSON.stringify({ success: false, error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from('ai-generated-images')
      .getPublicUrl(fileName);

    console.log('Instagram profile picture saved successfully:', publicUrlData.publicUrl);

    if (clientId) {
      await supabase
        .from('clients')
        .update({ logo_url: publicUrlData.publicUrl })
        .eq('id', clientId);
      console.log('Updated client logo_url for client:', clientId);
    }

    return new Response(
      JSON.stringify({ success: true, url: publicUrlData.publicUrl, fileName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Instagram profile picture:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
