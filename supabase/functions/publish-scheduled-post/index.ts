import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function logPublishAction(
  supabase: any,
  postId: string,
  platform: string,
  action: string,
  status: string,
  responseData?: any,
  errorMessage?: string,
  durationMs?: number
) {
  await supabase.from('post_publish_logs').insert({
    scheduled_post_id: postId,
    platform,
    action,
    status,
    response_data: responseData,
    error_message: errorMessage,
    duration_ms: durationMs,
  });
}

async function publishToFacebook(
  pageAccessToken: string,
  pageId: string,
  post: any,
  supabase: any
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const startTime = Date.now();
  
  try {
    let endpoint = '';
    let body: any = {};

    if (post.content_type === 'image' && post.media_urls?.length > 0) {
      // Single image post
      endpoint = `https://graph.facebook.com/v20.0/${pageId}/photos`;
      body = {
        url: post.media_urls[0],
        caption: post.caption || '',
        access_token: pageAccessToken,
      };
    } else if (post.content_type === 'video' && post.media_urls?.length > 0) {
      // Video post
      endpoint = `https://graph.facebook.com/v20.0/${pageId}/videos`;
      body = {
        file_url: post.media_urls[0],
        description: post.caption || '',
        access_token: pageAccessToken,
      };
    } else if (post.content_type === 'carousel' && post.media_urls?.length > 1) {
      // Multi-photo post (carousel)
      // First, upload each photo and get their IDs
      const photoIds = [];
      for (const mediaUrl of post.media_urls) {
        const uploadResponse = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: mediaUrl,
            published: false,
            access_token: pageAccessToken,
          }),
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          photoIds.push({ media_fbid: uploadData.id });
        }
      }

      // Create multi-photo post
      endpoint = `https://graph.facebook.com/v20.0/${pageId}/feed`;
      body = {
        message: post.caption || '',
        attached_media: JSON.stringify(photoIds),
        access_token: pageAccessToken,
      };
    } else {
      // Text only post
      endpoint = `https://graph.facebook.com/v20.0/${pageId}/feed`;
      body = {
        message: post.caption || '',
        access_token: pageAccessToken,
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      await logPublishAction(supabase, post.id, 'facebook', 'publish', 'error', data, data.error?.message, durationMs);
      return { success: false, error: data.error?.message || 'Facebook publish failed' };
    }

    await logPublishAction(supabase, post.id, 'facebook', 'publish', 'success', data, undefined, durationMs);
    return { success: true, postId: data.id || data.post_id };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    await logPublishAction(supabase, post.id, 'facebook', 'publish', 'error', null, error.message, durationMs);
    return { success: false, error: error.message };
  }
}

async function publishToInstagram(
  pageAccessToken: string,
  instagramAccountId: string,
  post: any,
  supabase: any
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const startTime = Date.now();
  
  try {
    let containerEndpoint = `https://graph.facebook.com/v20.0/${instagramAccountId}/media`;
    let containerBody: any = {
      access_token: pageAccessToken,
      caption: post.caption || '',
    };

    if (post.content_type === 'image' && post.media_urls?.length > 0) {
      containerBody.image_url = post.media_urls[0];
    } else if (post.content_type === 'video' && post.media_urls?.length > 0) {
      containerBody.video_url = post.media_urls[0];
      containerBody.media_type = 'VIDEO';
    } else if (post.content_type === 'reel' && post.media_urls?.length > 0) {
      containerBody.video_url = post.media_urls[0];
      containerBody.media_type = 'REELS';
      if (post.thumbnail_url) {
        containerBody.cover_url = post.thumbnail_url;
      }
    } else if (post.content_type === 'carousel' && post.media_urls?.length > 1) {
      // First, create individual media containers for each item
      const childrenIds = [];
      for (const mediaUrl of post.media_urls) {
        const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');
        const childBody: any = {
          access_token: pageAccessToken,
          is_carousel_item: true,
        };
        
        if (isVideo) {
          childBody.video_url = mediaUrl;
          childBody.media_type = 'VIDEO';
        } else {
          childBody.image_url = mediaUrl;
        }

        const childResponse = await fetch(containerEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(childBody),
        });

        if (childResponse.ok) {
          const childData = await childResponse.json();
          childrenIds.push(childData.id);
        }
      }

      containerBody.media_type = 'CAROUSEL';
      containerBody.children = childrenIds.join(',');
    }

    // Step 1: Create media container
    await logPublishAction(supabase, post.id, 'instagram', 'create_container', 'started');
    
    const containerResponse = await fetch(containerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    });

    const containerData = await containerResponse.json();

    if (!containerResponse.ok) {
      const durationMs = Date.now() - startTime;
      await logPublishAction(supabase, post.id, 'instagram', 'create_container', 'error', containerData, containerData.error?.message, durationMs);
      return { success: false, error: containerData.error?.message || 'Failed to create container' };
    }

    const containerId = containerData.id;
    await logPublishAction(supabase, post.id, 'instagram', 'create_container', 'success', { containerId });

    // Step 2: Wait for container to be ready (for videos/reels)
    if (post.content_type === 'video' || post.content_type === 'reel') {
      let status = 'IN_PROGRESS';
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max (10s intervals)

      while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        const statusResponse = await fetch(
          `https://graph.facebook.com/v20.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`
        );
        const statusData = await statusResponse.json();
        status = statusData.status_code;
        attempts++;
        
        console.log(`Container status check ${attempts}: ${status}`);
      }

      if (status !== 'FINISHED') {
        await logPublishAction(supabase, post.id, 'instagram', 'wait_processing', 'error', { status }, `Container not ready: ${status}`);
        return { success: false, error: `Video processing failed: ${status}` };
      }
    }

    // Step 3: Publish the container
    await logPublishAction(supabase, post.id, 'instagram', 'publish', 'started');
    
    const publishResponse = await fetch(`https://graph.facebook.com/v20.0/${instagramAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: pageAccessToken,
      }),
    });

    const publishData = await publishResponse.json();
    const durationMs = Date.now() - startTime;

    if (!publishResponse.ok) {
      await logPublishAction(supabase, post.id, 'instagram', 'publish', 'error', publishData, publishData.error?.message, durationMs);
      return { success: false, error: publishData.error?.message || 'Failed to publish' };
    }

    await logPublishAction(supabase, post.id, 'instagram', 'publish', 'success', publishData, undefined, durationMs);
    return { success: true, mediaId: publishData.id };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    await logPublishAction(supabase, post.id, 'instagram', 'publish', 'error', null, error.message, durationMs);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId } = await req.json();

    if (!postId) {
      return new Response(
        JSON.stringify({ success: false, error: 'postId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Publishing scheduled post ${postId}`);

    // Get the scheduled post with related data
    const { data: post, error: postError } = await supabase
      .from('scheduled_posts')
      .select(`
        *,
        facebook_page:facebook_pages(*),
        instagram_account:instagram_accounts(*, facebook_page:facebook_pages(*))
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Post not found:', postError);
      return new Response(
        JSON.stringify({ success: false, error: 'Post not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Update status to publishing
    await supabase
      .from('scheduled_posts')
      .update({ status: 'publishing' })
      .eq('id', postId);

    const results: any = {
      facebook: null,
      instagram: null,
    };

    // Publish to Facebook if selected
    if (post.platforms.includes('facebook') && post.facebook_page) {
      console.log(`Publishing to Facebook page: ${post.facebook_page.page_name}`);
      results.facebook = await publishToFacebook(
        post.facebook_page.page_access_token,
        post.facebook_page.page_id,
        post,
        supabase
      );
    }

    // Publish to Instagram if selected
    if (post.platforms.includes('instagram') && post.instagram_account) {
      const fbPage = post.instagram_account.facebook_page;
      console.log(`Publishing to Instagram: @${post.instagram_account.username}`);
      results.instagram = await publishToInstagram(
        fbPage.page_access_token,
        post.instagram_account.instagram_id,
        post,
        supabase
      );
    }

    // Determine overall status
    const anySuccess = results.facebook?.success || results.instagram?.success;
    const allFailed = 
      (post.platforms.includes('facebook') && !results.facebook?.success) &&
      (post.platforms.includes('instagram') && !results.instagram?.success);

    const finalStatus = allFailed ? 'failed' : 'published';
    const errorMessages = [];
    if (results.facebook?.error) errorMessages.push(`Facebook: ${results.facebook.error}`);
    if (results.instagram?.error) errorMessages.push(`Instagram: ${results.instagram.error}`);

    // Update post with results
    await supabase
      .from('scheduled_posts')
      .update({
        status: finalStatus,
        facebook_post_id: results.facebook?.postId || null,
        instagram_media_id: results.instagram?.mediaId || null,
        published_at: anySuccess ? new Date().toISOString() : null,
        error_message: errorMessages.length > 0 ? errorMessages.join('; ') : null,
        retry_count: allFailed ? post.retry_count + 1 : post.retry_count,
      })
      .eq('id', postId);

    console.log(`Post ${postId} ${finalStatus}`, results);

    return new Response(
      JSON.stringify({
        success: anySuccess,
        status: finalStatus,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in publish-scheduled-post:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
