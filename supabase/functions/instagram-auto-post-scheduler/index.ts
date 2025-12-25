import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Instagram auto-post scheduler started');

    // Find pending posts that should be published now
    const now = new Date().toISOString();
    
    const { data: pendingPosts, error: postsError } = await supabase
      .from('instagram_auto_posts')
      .select(`
        id,
        config_id,
        scheduled_at,
        instagram_auto_post_configs (
          is_enabled
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (postsError) {
      console.error('Error fetching pending posts:', postsError);
      throw postsError;
    }

    console.log('Found pending posts:', pendingPosts?.length || 0);

    const results = [];

    for (const post of pendingPosts || []) {
      // Skip if config is disabled
      if (!post.instagram_auto_post_configs?.is_enabled) {
        console.log('Skipping post', post.id, '- config is disabled');
        continue;
      }

      console.log('Publishing post:', post.id, 'scheduled for:', post.scheduled_at);

      try {
        const publishResponse = await supabase.functions.invoke('publish-instagram-auto-post', {
          body: { postId: post.id }
        });

        if (publishResponse.error) {
          console.error('Error publishing post', post.id, ':', {
            error: publishResponse.error,
            message: publishResponse.error?.message,
            context: publishResponse.error?.context
          });
          results.push({ id: post.id, success: false, error: publishResponse.error.message });
        } else if (publishResponse.data && !publishResponse.data.success) {
          // Function returned 200 but with success: false
          console.error('Publish function returned failure for post', post.id, ':', publishResponse.data);
          results.push({ id: post.id, success: false, error: publishResponse.data.error || 'Unknown error' });
        } else {
          console.log('Post published successfully:', post.id, 'Response:', publishResponse.data);
          results.push({ id: post.id, success: true });
        }
      } catch (e: any) {
        console.error('Exception publishing post', post.id, ':', e.message, e.stack);
        results.push({ id: post.id, success: false, error: e.message });
      }

      // Small delay between posts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in instagram-auto-post-scheduler:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
