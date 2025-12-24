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
    const { postId } = await req.json();

    console.log('Publishing Instagram auto post:', postId);

    if (!postId) {
      throw new Error('Post ID is required');
    }

    // Fetch the post with config and client data
    const { data: post, error: postError } = await supabase
      .from('instagram_auto_posts')
      .select(`
        *,
        instagram_auto_post_configs (
          id,
          instagram_account_id,
          scheduled_days,
          scheduled_hours,
          instagram_accounts (
            id,
            facebook_account_id,
            instagram_id
          )
        )
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Error fetching post:', postError);
      throw new Error('Post not found');
    }

    console.log('Post loaded:', post.id, 'Status:', post.status);

    // Update status to publishing
    await supabase
      .from('instagram_auto_posts')
      .update({ status: 'publishing' })
      .eq('id', postId);

    const config = post.instagram_auto_post_configs;
    const instagramAccount = config?.instagram_accounts;

    if (!instagramAccount?.instagram_id) {
      throw new Error('Instagram account not configured');
    }

    // Get Facebook access token
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token')
      .eq('company_id', post.company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration?.access_token) {
      console.error('Error fetching Facebook integration:', integrationError);
      throw new Error('Facebook integration not found');
    }

    const accessToken = integration.access_token;
    const igUserId = instagramAccount.instagram_id;

    console.log('Publishing to Instagram account:', igUserId);

    // Step 1: Create media container
    const containerUrl = `https://graph.facebook.com/v21.0/${igUserId}/media`;
    const containerParams = new URLSearchParams({
      image_url: post.image_url,
      caption: post.caption,
      access_token: accessToken
    });

    console.log('Creating media container...');
    const containerResponse = await fetch(`${containerUrl}?${containerParams.toString()}`, {
      method: 'POST'
    });

    if (!containerResponse.ok) {
      const errorText = await containerResponse.text();
      console.error('Container creation error:', errorText);
      
      await supabase
        .from('instagram_auto_posts')
        .update({ 
          status: 'failed',
          error_message: `Container creation failed: ${errorText}`
        })
        .eq('id', postId);

      throw new Error(`Failed to create media container: ${errorText}`);
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;

    console.log('Container created:', containerId);

    // Step 2: Wait for container to be ready (poll status)
    let containerReady = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!containerReady && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`
      );
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('Container status:', statusData.status_code);
        
        if (statusData.status_code === 'FINISHED') {
          containerReady = true;
        } else if (statusData.status_code === 'ERROR') {
          throw new Error('Container processing failed');
        }
      }
      
      attempts++;
    }

    if (!containerReady) {
      throw new Error('Container not ready after maximum attempts');
    }

    // Step 3: Publish the container
    console.log('Publishing media...');
    const publishUrl = `https://graph.facebook.com/v21.0/${igUserId}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken
    });

    const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, {
      method: 'POST'
    });

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error('Publish error:', errorText);
      
      await supabase
        .from('instagram_auto_posts')
        .update({ 
          status: 'failed',
          error_message: `Publish failed: ${errorText}`
        })
        .eq('id', postId);

      throw new Error(`Failed to publish: ${errorText}`);
    }

    const publishData = await publishResponse.json();
    const mediaId = publishData.id;

    console.log('Published successfully! Media ID:', mediaId);

    // Update post as published
    await supabase
      .from('instagram_auto_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        instagram_media_id: mediaId
      })
      .eq('id', postId);

    // Update config last_post_at
    await supabase
      .from('instagram_auto_post_configs')
      .update({ last_post_at: new Date().toISOString() })
      .eq('id', config.id);

    // Generate next post
    console.log('Generating next post...');
    const generateResponse = await supabase.functions.invoke('generate-instagram-auto-post', {
      body: {
        configId: config.id,
        clientId: post.client_id,
        companyId: post.company_id
      }
    });

    if (generateResponse.error) {
      console.error('Error generating next post:', generateResponse.error);
    } else {
      console.log('Next post generated successfully');
    }

    return new Response(JSON.stringify({
      success: true,
      mediaId: mediaId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in publish-instagram-auto-post:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
