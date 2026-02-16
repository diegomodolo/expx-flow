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
    const { postId, instagramMediaId, instagramAccountId } = await req.json();

    console.log('Delete request received:', { postId, instagramMediaId, instagramAccountId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let accessToken: string | null = null;
    let mediaIdToDelete = instagramMediaId;
    let resolvedAccountId = instagramAccountId;
    let companyId: string | null = null;

    // If we have a postId, get the post from database first
    if (postId) {
      const { data: post, error: postError } = await supabase
        .from('instagram_auto_posts')
        .select('id, config_id, instagram_media_id, company_id')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        throw new Error(`Post not found: ${postError?.message || 'No data returned'}`);
      }

      mediaIdToDelete = post.instagram_media_id;
      companyId = post.company_id;

      const { data: config, error: configError } = await supabase
        .from('instagram_auto_post_configs')
        .select('instagram_account_id')
        .eq('id', post.config_id)
        .single();

      if (configError || !config) {
        throw new Error(`Config not found: ${configError?.message || 'No data returned'}`);
      }

      resolvedAccountId = config.instagram_account_id;
    }

    // Get company_id if not yet resolved
    if (!companyId && resolvedAccountId) {
      const { data: igAccount } = await supabase
        .from('instagram_accounts')
        .select('company_id')
        .eq('id', resolvedAccountId)
        .single();
      companyId = igAccount?.company_id;
    }

    if (!resolvedAccountId || !companyId) {
      throw new Error('Could not resolve Instagram account or company');
    }

    // Use shared resolver for correct token
    const credentials = await resolveInstagramCredentials(supabase, resolvedAccountId, companyId);
    accessToken = credentials.accessToken;

    if (!mediaIdToDelete) {
      throw new Error('No Instagram media ID to delete');
    }

    console.log('Attempting to delete from Instagram, media ID:', mediaIdToDelete);

    const deleteResponse = await fetch(
      `https://graph.facebook.com/v19.0/${mediaIdToDelete}?access_token=${accessToken}`,
      { method: 'DELETE' }
    );

    const deleteResult = await deleteResponse.json();
    console.log('Instagram API delete response:', deleteResult);

    if (!deleteResponse.ok) {
      throw new Error(`Instagram API error: ${deleteResult.error?.message || 'Unknown error'}`);
    }

    if (postId) {
      const { error: dbError } = await supabase
        .from('instagram_auto_posts')
        .delete()
        .eq('id', postId);

      if (dbError) {
        console.error('Error deleting from database:', dbError);
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
