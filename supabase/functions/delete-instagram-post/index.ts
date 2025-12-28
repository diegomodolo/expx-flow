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
    const { postId, instagramMediaId, instagramAccountId } = await req.json();

    console.log('Delete request received:', { postId, instagramMediaId, instagramAccountId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let accessToken: string | null = null;
    let mediaIdToDelete = instagramMediaId;

    // If we have a postId, get the post from database first
    if (postId) {
      // Get the post to find the config_id
      const { data: post, error: postError } = await supabase
        .from('instagram_auto_posts')
        .select('id, config_id, instagram_media_id')
        .eq('id', postId)
        .single();

      console.log('Post query result:', { post, postError });

      if (postError || !post) {
        throw new Error(`Post not found: ${postError?.message || 'No data returned'}`);
      }

      mediaIdToDelete = post.instagram_media_id;

      // Get the config to find instagram_account_id
      const { data: config, error: configError } = await supabase
        .from('instagram_auto_post_configs')
        .select('instagram_account_id')
        .eq('id', post.config_id)
        .single();

      console.log('Config query result:', { config, configError });

      if (configError || !config) {
        throw new Error(`Config not found: ${configError?.message || 'No data returned'}`);
      }

      // Get the Instagram account with access token
      const { data: igAccount, error: igError } = await supabase
        .from('instagram_accounts')
        .select('access_token')
        .eq('id', config.instagram_account_id)
        .single();

      console.log('Instagram account query result:', { igAccount: igAccount ? 'found' : 'not found', igError });

      if (igError || !igAccount?.access_token) {
        throw new Error(`Instagram account not found or access token missing: ${igError?.message || 'No access token'}`);
      }

      accessToken = igAccount.access_token;
    } else if (instagramAccountId) {
      // Direct deletion from feed - get access token from account id
      const { data: igAccount, error: igError } = await supabase
        .from('instagram_accounts')
        .select('access_token')
        .eq('id', instagramAccountId)
        .single();

      console.log('Instagram account query result (direct):', { igAccount: igAccount ? 'found' : 'not found', igError });

      if (igError || !igAccount?.access_token) {
        throw new Error(`Instagram account not found or access token missing: ${igError?.message || 'No access token'}`);
      }

      accessToken = igAccount.access_token;
    } else {
      throw new Error('Either postId or instagramAccountId must be provided');
    }

    if (!mediaIdToDelete) {
      throw new Error('No Instagram media ID to delete');
    }

    console.log('Attempting to delete from Instagram, media ID:', mediaIdToDelete);

    // Delete from Instagram Graph API
    const deleteResponse = await fetch(
      `https://graph.facebook.com/v19.0/${mediaIdToDelete}?access_token=${accessToken}`,
      { method: 'DELETE' }
    );

    const deleteResult = await deleteResponse.json();
    console.log('Instagram API delete response:', deleteResult);

    if (!deleteResponse.ok) {
      throw new Error(`Instagram API error: ${deleteResult.error?.message || 'Unknown error'}`);
    }

    // If we had a postId, delete from database too
    if (postId) {
      const { error: dbError } = await supabase
        .from('instagram_auto_posts')
        .delete()
        .eq('id', postId);

      if (dbError) {
        console.error('Error deleting from database:', dbError);
        // Don't throw - post was deleted from Instagram
      } else {
        console.log('Successfully deleted from database');
      }
    }
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting Instagram post:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
