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

    console.log('Publishing WordPress post:', postId);

    if (!postId) {
      throw new Error('Post ID is required');
    }

    // Fetch post with config and site
    const { data: post, error: postError } = await supabase
      .from('wordpress_auto_posts')
      .select(`
        *,
        wordpress_auto_post_configs (
          id,
          post_type,
          post_status,
          post_category,
          wordpress_sites (
            id,
            site_url,
            username,
            app_password
          )
        )
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Error fetching post:', postError);
      throw new Error('Post not found');
    }

    const config = post.wordpress_auto_post_configs;
    const site = config?.wordpress_sites;

    if (!site) {
      throw new Error('WordPress site configuration not found');
    }

    // Update status to publishing
    await supabase
      .from('wordpress_auto_posts')
      .update({ status: 'publishing' })
      .eq('id', postId);

    const normalizedUrl = site.site_url.replace(/\/$/, '');
    const credentials = btoa(`${site.username}:${site.app_password}`);

    let featuredMediaId: number | null = null;

    // Upload featured image if exists
    if (post.featured_image_url) {
      console.log('Uploading featured image to WordPress...');
      
      try {
        // Fetch the image
        const imageResponse = await fetch(post.featured_image_url);
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          const imageBytes = new Uint8Array(imageBuffer);
          
          // Get filename from URL
          const urlParts = post.featured_image_url.split('/');
          const fileName = urlParts[urlParts.length - 1] || 'featured-image.png';
          
          // Determine content type
          const extension = fileName.split('.').pop()?.toLowerCase() || 'png';
          const contentType = extension === 'jpg' || extension === 'jpeg' 
            ? 'image/jpeg' 
            : `image/${extension}`;

          // Upload to WordPress media library
          const mediaUrl = `${normalizedUrl}/wp-json/wp/v2/media`;
          const mediaResponse = await fetch(mediaUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${fileName}"`,
            },
            body: imageBytes,
          });

          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            featuredMediaId = mediaData.id;
            console.log('Featured image uploaded, media ID:', featuredMediaId);
          } else {
            const errorText = await mediaResponse.text();
            console.warn('Failed to upload featured image:', errorText);
          }
        }
      } catch (imageError) {
        console.warn('Error uploading featured image:', imageError);
      }
    }

    // Create the post
    console.log('Creating WordPress post...');
    const postUrl = `${normalizedUrl}/wp-json/wp/v2/posts`;
    
    const postData: any = {
      title: post.title,
      content: post.content,
      status: config.post_status || 'draft',
      excerpt: post.excerpt || '',
    };

    if (featuredMediaId) {
      postData.featured_media = featuredMediaId;
    }

    // Add category if specified
    if (config.post_category) {
      // First, try to find the category by name or slug
      const categoriesUrl = `${normalizedUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(config.post_category)}`;
      const catResponse = await fetch(categoriesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (catResponse.ok) {
        const categories = await catResponse.json();
        if (categories.length > 0) {
          postData.categories = [categories[0].id];
        }
      }
    }

    const createResponse = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('WordPress API error:', createResponse.status, errorText);
      
      await supabase
        .from('wordpress_auto_posts')
        .update({ 
          status: 'failed',
          error_message: `WordPress API error: ${createResponse.status}`
        })
        .eq('id', postId);

      throw new Error(`Failed to create WordPress post: ${createResponse.status}`);
    }

    const createdPost = await createResponse.json();
    console.log('WordPress post created:', createdPost.id, createdPost.link);

    // Update post status to published
    await supabase
      .from('wordpress_auto_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        wordpress_post_id: String(createdPost.id),
        wordpress_post_url: createdPost.link,
        error_message: null
      })
      .eq('id', postId);

    // Update config last_post_at
    await supabase
      .from('wordpress_auto_post_configs')
      .update({ last_post_at: new Date().toISOString() })
      .eq('id', post.config_id);

    // Trigger generation of next post
    console.log('Triggering next post generation...');
    try {
      await supabase.functions.invoke('generate-wordpress-auto-post', {
        body: {
          configId: post.config_id,
          clientId: post.client_id,
          companyId: post.company_id
        }
      });
    } catch (genError) {
      console.warn('Failed to trigger next post generation:', genError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        wordpressPostId: createdPost.id,
        wordpressPostUrl: createdPost.link
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error publishing WordPress post:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to publish post'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
