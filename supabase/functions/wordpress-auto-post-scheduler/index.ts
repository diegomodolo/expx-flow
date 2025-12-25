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
    console.log('WordPress Auto Post Scheduler started at:', new Date().toISOString());

    // Find all pending posts that are due for publishing
    const now = new Date().toISOString();
    
    const { data: pendingPosts, error: fetchError } = await supabase
      .from('wordpress_auto_posts')
      .select(`
        id,
        config_id,
        scheduled_at,
        wordpress_auto_post_configs (
          id,
          is_enabled,
          wordpress_sites (
            id,
            is_active
          )
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching pending posts:', fetchError);
      throw new Error('Failed to fetch pending posts');
    }

    console.log(`Found ${pendingPosts?.length || 0} posts ready for publishing`);

    const results: any[] = [];

    for (const post of pendingPosts || []) {
      const config = post.wordpress_auto_post_configs;
      const site = config?.wordpress_sites;

      // Skip if config is disabled or site is inactive
      if (!config?.is_enabled) {
        console.log(`Skipping post ${post.id}: config is disabled`);
        continue;
      }

      if (!site?.is_active) {
        console.log(`Skipping post ${post.id}: site is inactive`);
        continue;
      }

      console.log(`Publishing post ${post.id}...`);

      try {
        const { data, error } = await supabase.functions.invoke('publish-wordpress-auto-post', {
          body: { postId: post.id }
        });

        if (error) {
          console.error(`Error publishing post ${post.id}:`, error);
          results.push({
            postId: post.id,
            success: false,
            error: error.message
          });
        } else {
          console.log(`Post ${post.id} published successfully`);
          results.push({
            postId: post.id,
            success: true,
            wordpressPostUrl: data?.wordpressPostUrl
          });
        }
      } catch (invokeError) {
        console.error(`Exception publishing post ${post.id}:`, invokeError);
        results.push({
          postId: post.id,
          success: false,
          error: invokeError.message
        });
      }
    }

    console.log('Scheduler completed. Results:', JSON.stringify(results));

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scheduler error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Scheduler failed'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
