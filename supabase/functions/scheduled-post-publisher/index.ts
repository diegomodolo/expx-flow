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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for scheduled posts to publish...');

    // Find posts that are scheduled and due
    const { data: postsToPublish, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('id, scheduled_at, company_id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10); // Process max 10 posts per run

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!postsToPublish || postsToPublish.length === 0) {
      console.log('No posts to publish');
      return new Response(
        JSON.stringify({ success: true, message: 'No posts to publish', published: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${postsToPublish.length} posts to publish`);

    const results = [];

    for (const post of postsToPublish) {
      try {
        console.log(`Publishing post ${post.id}...`);
        
        // Call the publish function for each post
        const { data, error } = await supabase.functions.invoke('publish-scheduled-post', {
          body: { postId: post.id }
        });

        if (error) {
          console.error(`Error publishing post ${post.id}:`, error);
          results.push({ postId: post.id, success: false, error: error.message });
        } else {
          console.log(`Post ${post.id} published:`, data);
          results.push({ postId: post.id, success: data.success, status: data.status });
        }
      } catch (postError) {
        console.error(`Exception publishing post ${post.id}:`, postError);
        results.push({ postId: post.id, success: false, error: postError.message });
        
        // Mark post as failed
        await supabase
          .from('scheduled_posts')
          .update({ 
            status: 'failed', 
            error_message: postError.message,
            retry_count: (post as any).retry_count + 1
          })
          .eq('id', post.id);
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Published ${successCount}/${postsToPublish.length} posts`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Published ${successCount}/${postsToPublish.length} posts`,
        published: successCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scheduled-post-publisher:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
