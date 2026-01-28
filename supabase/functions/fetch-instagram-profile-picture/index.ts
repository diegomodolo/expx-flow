import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the Instagram account with its Facebook page and access token
    const { data: instagramAccount, error: accountError } = await supabase
      .from('instagram_accounts')
      .select(`
        id,
        instagram_id,
        username,
        profile_picture_url,
        facebook_page_id,
        facebook_pages!inner (
          page_id,
          page_access_token,
          company_id
        )
      `)
      .eq('id', instagramAccountId)
      .single();

    if (accountError || !instagramAccount) {
      console.error('Error fetching Instagram account:', accountError);
      return new Response(
        JSON.stringify({ success: false, error: 'Instagram account not found', details: accountError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = (instagramAccount.facebook_pages as any)?.page_access_token;
    const igUserId = instagramAccount.instagram_id;

    if (!accessToken) {
      console.error('No access token found for Instagram account');
      return new Response(
        JSON.stringify({ success: false, error: 'No page access token available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the profile picture URL directly from Instagram Graph API
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
      console.error('No profile picture URL returned from Graph API');
      return new Response(
        JSON.stringify({ success: false, error: 'No profile picture URL available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Got fresh profile picture URL, now downloading...');

    // Now fetch the image with the fresh URL (should work since it's a fresh token-signed URL)
    const imageResponse = await fetch(profilePictureUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      console.error('Failed to download image:', imageResponse.status, imageResponse.statusText);
      
      // If still failing, try fetching a higher resolution version
      console.log('Trying to fetch higher resolution version...');
      const hdResponse = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}?fields=profile_picture_url&access_token=${accessToken}`
      );
      
      if (hdResponse.ok) {
        const hdData = await hdResponse.json();
        if (hdData.profile_picture_url) {
          const retryResponse = await fetch(hdData.profile_picture_url);
          if (retryResponse.ok) {
            const imageBuffer = await retryResponse.arrayBuffer();
            const imageBytes = new Uint8Array(imageBuffer);
            
            // Upload to storage
            const timestamp = Date.now();
            const randomId = crypto.randomUUID().substring(0, 8);
            const fileName = `client-avatars/${timestamp}-${randomId}.jpg`;
            
            const { error: uploadError } = await supabase.storage
              .from('ai-generated-images')
              .upload(fileName, imageBytes, {
                contentType: 'image/jpeg',
                upsert: false,
              });
            
            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('ai-generated-images')
                .getPublicUrl(fileName);
              
              return new Response(
                JSON.stringify({ success: true, url: publicUrlData.publicUrl }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to download image: ${imageResponse.status}`,
          originalUrl: profilePictureUrl 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the image as array buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    // Determine content type and extension
    let contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    let extension = 'jpg';
    
    if (contentType.includes('png')) {
      extension = 'png';
    } else if (contentType.includes('webp')) {
      extension = 'webp';
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().substring(0, 8);
    const fileName = `client-avatars/${timestamp}-${randomId}.${extension}`;

    console.log('Uploading to storage:', fileName, 'Size:', imageBytes.length, 'bytes');

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('ai-generated-images')
      .upload(fileName, imageBytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('ai-generated-images')
      .getPublicUrl(fileName);

    console.log('Instagram profile picture saved successfully:', publicUrlData.publicUrl);

    // Optionally update the client avatar if clientId is provided
    if (clientId) {
      await supabase
        .from('clients')
        .update({ logo_url: publicUrlData.publicUrl })
        .eq('id', clientId);
      console.log('Updated client logo_url for client:', clientId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrlData.publicUrl,
        fileName 
      }),
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
