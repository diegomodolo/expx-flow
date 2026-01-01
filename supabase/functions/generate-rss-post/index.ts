import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId, configId } = await req.json();

    if (!itemId || !configId) {
      throw new Error('itemId e configId são obrigatórios');
    }

    console.log(`generate-rss-post: itemId=${itemId} configId=${configId}`);

    // Fetch RSS item + feed config
    const { data: rssItem, error: itemError } = await supabase
      .from('instagram_autopost_rss_items')
      .select('id, feed_id, post_generated')
      .eq('id', itemId)
      .single();

    if (itemError || !rssItem) {
      throw new Error(`Item RSS não encontrado: ${itemError?.message}`);
    }

    if (rssItem.post_generated) {
      throw new Error('Post já foi gerado para este item');
    }

    const { data: feed, error: feedError } = await supabase
      .from('instagram_autopost_rss_feeds')
      .select('id, post_type, carousel_images')
      .eq('id', rssItem.feed_id)
      .single();

    if (feedError || !feed) {
      throw new Error(`Feed não encontrado: ${feedError?.message}`);
    }

    // Generate using the existing pipeline (images + prompts + reference images)
    const { data: genData, error: genError } = await supabase.functions.invoke('generate-instagram-auto-post', {
      body: {
        configId,
        rssItemId: itemId,
        overridePostType: feed.post_type,
        overrideCarouselImages: feed.carousel_images,
      },
    });

    if (genError) {
      console.error('Error invoking generate-instagram-auto-post:', genError);
      throw new Error('Falha ao gerar post');
    }

    if (!genData?.success || !genData?.post?.id) {
      console.error('Unexpected generate-instagram-auto-post response:', genData);
      throw new Error('Falha ao gerar post');
    }

    const postId = genData.post.id as string;

    // Mark item as generated
    await supabase
      .from('instagram_autopost_rss_items')
      .update({
        post_generated: true,
        generated_post_id: postId,
        generated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    return new Response(
      JSON.stringify({ success: true, postId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-rss-post:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});