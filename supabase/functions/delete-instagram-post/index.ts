import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, instagramMediaId } = await req.json();
    console.log('Deleting Instagram post:', { postId, instagramMediaId });

    if (!postId || !instagramMediaId) {
      throw new Error('postId and instagramMediaId are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the post to find the config and Instagram account
    const { data: post, error: postError } = await supabase
      .from('instagram_auto_posts')
      .select('*, instagram_auto_post_configs!inner(instagram_account_id)')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    const instagramAccountId = post.instagram_auto_post_configs.instagram_account_id;

    // Get the Instagram account with access token
    const { data: igAccount, error: igError } = await supabase
      .from('instagram_accounts')
      .select('access_token')
      .eq('id', instagramAccountId)
      .single();

    if (igError || !igAccount?.access_token) {
      throw new Error('Instagram account not found or access token missing');
    }

    // Delete from Instagram Graph API
    const deleteUrl = `https://graph.facebook.com/v21.0/${instagramMediaId}?access_token=${igAccount.access_token}`;
    
    console.log('Calling Instagram API to delete media:', instagramMediaId);
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
    });

    const deleteResult = await deleteResponse.json();
    console.log('Instagram API response:', deleteResult);

    if (!deleteResponse.ok) {
      // If it's already deleted or not found, we can still remove from our DB
      if (deleteResult.error?.code === 100 || deleteResult.error?.code === 10) {
        console.log('Post already deleted from Instagram or not found, removing from database');
      } else {
        throw new Error(deleteResult.error?.message || 'Failed to delete from Instagram');
      }
    }

    // Remove the post from our database
    const { error: dbDeleteError } = await supabase
      .from('instagram_auto_posts')
      .delete()
      .eq('id', postId);

    if (dbDeleteError) {
      throw dbDeleteError;
    }

    console.log('Post deleted successfully from Instagram and database');

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
