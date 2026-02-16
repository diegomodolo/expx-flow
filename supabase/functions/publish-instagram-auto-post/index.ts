import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppAlerts, buildAlertMessage } from '../_shared/whatsapp-alerts.ts';
import { resolveInstagramCredentials } from '../_shared/instagram-token-resolver.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Classify error type for proper alert handling
function classifyError(errorText: string): { alertType: string; severity: 'warning' | 'critical' } {
  const lowerError = errorText.toLowerCase();
  
  if (lowerError.includes('user access is restricted') || lowerError.includes('restringida') || lowerError.includes('restricted')) {
    return { alertType: 'account_restricted', severity: 'critical' };
  }
  if (lowerError.includes('token') || lowerError.includes('oauth') || lowerError.includes('expired') || lowerError.includes('invalid session')) {
    return { alertType: 'token_expired', severity: 'critical' };
  }
  if (lowerError.includes('rate limit') || lowerError.includes('too many')) {
    return { alertType: 'rate_limit', severity: 'warning' };
  }
  
  return { alertType: 'post_failed', severity: 'warning' };
}

// Create system alert and send WhatsApp notification
async function createAlertAndNotify(
  post: any,
  instagramAccount: any,
  clientName: string,
  errorText: string
) {
  const { alertType, severity } = classifyError(errorText);
  
  const alertTitles: Record<string, string> = {
    account_restricted: '🚨 Conta do Instagram Restrita',
    token_expired: '🔑 Token do Facebook Expirado',
    rate_limit: '⏱️ Limite de Requisições Excedido',
    post_failed: '❌ Falha na Publicação do Instagram',
  };

  const alertMessages: Record<string, string> = {
    account_restricted: `A conta @${instagramAccount?.username || 'desconhecida'} está restrita pelo Instagram. Verifique a conta no aplicativo.`,
    token_expired: `O token de acesso do Facebook expirou. Reconecte a integração nas configurações.`,
    rate_limit: `Muitas requisições enviadas. Aguarde alguns minutos e tente novamente.`,
    post_failed: `Não foi possível publicar o post automático para @${instagramAccount?.username || 'desconhecida'}.`,
  };

  try {
    const { error: alertError } = await supabase
      .from('system_alerts')
      .insert({
        company_id: post.company_id,
        client_id: post.client_id,
        alert_type: alertType,
        severity: severity,
        title: alertTitles[alertType] || 'Falha na Publicação',
        message: alertMessages[alertType] || errorText,
        details: {
          error_message: errorText,
          post_id: post.id,
          instagram_username: instagramAccount?.username,
          config_id: post.config_id,
        },
        related_entity_type: 'instagram_auto_post',
        related_entity_id: post.id,
      });

    if (alertError) {
      console.error('[Alert] Error creating system alert:', alertError);
    } else {
      console.log('[Alert] System alert created:', alertType, severity);
    }

    const message = buildAlertMessage('post_failed', {
      clientName: clientName,
      platforms: `Instagram Auto Post (@${instagramAccount?.username || 'desconhecido'})`,
      error: errorText,
    });

    const whatsappResult = await sendWhatsAppAlerts(supabase, {
      companyId: post.company_id,
      notificationType: 'post_failed',
      message: message,
      relatedEntityType: 'instagram_auto_post',
      relatedEntityId: post.id,
    });

    console.log('[Alert] WhatsApp notification result:', whatsappResult);

  } catch (err) {
    console.error('[Alert] Error in createAlertAndNotify:', err);
  }
}

// Create a single image container
async function createImageContainer(
  igUserId: string,
  imageUrl: string,
  accessToken: string,
  isCarouselItem: boolean = false
): Promise<string> {
  const containerUrl = `https://graph.facebook.com/v21.0/${igUserId}/media`;
  const params: Record<string, string> = {
    image_url: imageUrl,
    access_token: accessToken
  };
  
  if (isCarouselItem) {
    params.is_carousel_item = 'true';
  }

  const containerResponse = await fetch(`${containerUrl}?${new URLSearchParams(params).toString()}`, {
    method: 'POST'
  });

  if (!containerResponse.ok) {
    const errorText = await containerResponse.text();
    throw new Error(`Failed to create media container: ${errorText}`);
  }

  const containerData = await containerResponse.json();
  return containerData.id;
}

// Wait for container to be ready
async function waitForContainer(containerId: string, accessToken: string): Promise<boolean> {
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(
      `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`Container ${containerId} status:`, statusData.status_code);
      
      if (statusData.status_code === 'FINISHED') {
        return true;
      } else if (statusData.status_code === 'ERROR') {
        throw new Error('Container processing failed - Instagram rejected the media');
      }
    }
    
    attempts++;
  }

  return false;
}

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
          also_post_to_facebook,
          facebook_page_id,
          instagram_accounts (
            id,
            facebook_page_id,
            instagram_id,
            username
          )
        ),
        clients (
          name,
          company
        )
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Error fetching post:', postError, 'Post ID:', postId);
      throw new Error(`Post not found: ${postError?.message || 'Unknown error'}`);
    }

    console.log('Post loaded:', post.id, 'Status:', post.status, 'Type:', post.post_type || 'single');

    // Update status to publishing
    await supabase
      .from('instagram_auto_posts')
      .update({ status: 'publishing' })
      .eq('id', postId);

    const config = post.instagram_auto_post_configs;
    const instagramAccount = config?.instagram_accounts;
    const clientName = post.clients?.name || 'Cliente';

    if (!instagramAccount?.instagram_id) {
      const errorMsg = 'Instagram account not configured';
      await createAlertAndNotify(post, instagramAccount, clientName, errorMsg);
      throw new Error(errorMsg);
    }

    // Resolve the correct token and IG user ID based on account source (page vs BM)
    let accessToken: string;
    let igUserId: string;
    
    try {
      const credentials = await resolveInstagramCredentials(
        supabase,
        config.instagram_account_id,
        post.company_id
      );
      accessToken = credentials.accessToken;
      igUserId = credentials.instagramUserId;
      console.log(`Publishing to Instagram account: ${igUserId} (source: ${credentials.source})`);
    } catch (credError: any) {
      console.error('Error resolving Instagram credentials:', credError.message);
      await createAlertAndNotify(post, instagramAccount, clientName, credError.message);
      throw credError;
    }

    const isCarousel = post.post_type === 'carousel' && post.image_urls && post.image_urls.length > 1;
    let mediaId: string;

    if (isCarousel) {
      // CAROUSEL PUBLISHING FLOW
      console.log('Publishing carousel with', post.image_urls.length, 'images');
      
      // Step 1: Create container for each image with is_carousel_item=true
      const childContainerIds: string[] = [];
      
      for (let i = 0; i < post.image_urls.length; i++) {
        console.log(`Creating carousel item container ${i + 1}/${post.image_urls.length}...`);
        try {
          const containerId = await createImageContainer(
            igUserId,
            post.image_urls[i],
            accessToken,
            true // is_carousel_item
          );
          childContainerIds.push(containerId);
          console.log(`Carousel item ${i + 1} container created:`, containerId);
        } catch (err: any) {
          console.error(`Error creating carousel item ${i + 1}:`, err.message);
          await supabase
            .from('instagram_auto_posts')
            .update({ 
              status: 'failed',
              error_message: `Carousel item ${i + 1} failed: ${err.message}`
            })
            .eq('id', postId);
          await createAlertAndNotify(post, instagramAccount, clientName, err.message);
          throw err;
        }
      }

      // Step 2: Wait for all carousel items to be ready
      console.log('Waiting for carousel items to be ready...');
      for (let i = 0; i < childContainerIds.length; i++) {
        const ready = await waitForContainer(childContainerIds[i], accessToken);
        if (!ready) {
          const errorMsg = `Carousel item ${i + 1} not ready after maximum attempts`;
          await createAlertAndNotify(post, instagramAccount, clientName, errorMsg);
          throw new Error(errorMsg);
        }
      }

      // Step 3: Create carousel container with children
      console.log('Creating carousel container...');
      const carouselUrl = `https://graph.facebook.com/v21.0/${igUserId}/media`;
      const carouselParams = new URLSearchParams({
        media_type: 'CAROUSEL',
        caption: post.caption,
        children: childContainerIds.join(','),
        access_token: accessToken
      });

      const carouselResponse = await fetch(`${carouselUrl}?${carouselParams.toString()}`, {
        method: 'POST'
      });

      if (!carouselResponse.ok) {
        const errorText = await carouselResponse.text();
        console.error('Carousel container creation error:', errorText);
        await supabase
          .from('instagram_auto_posts')
          .update({ 
            status: 'failed',
            error_message: `Carousel container failed: ${errorText}`
          })
          .eq('id', postId);
        await createAlertAndNotify(post, instagramAccount, clientName, errorText);
        throw new Error(`Failed to create carousel container: ${errorText}`);
      }

      const carouselData = await carouselResponse.json();
      const carouselContainerId = carouselData.id;
      console.log('Carousel container created:', carouselContainerId);

      // Step 4: Wait for carousel container to be ready
      const carouselReady = await waitForContainer(carouselContainerId, accessToken);
      if (!carouselReady) {
        const errorMsg = 'Carousel container not ready after maximum attempts';
        await createAlertAndNotify(post, instagramAccount, clientName, errorMsg);
        throw new Error(errorMsg);
      }

      // Step 5: Publish the carousel
      console.log('Publishing carousel...');
      const publishUrl = `https://graph.facebook.com/v21.0/${igUserId}/media_publish`;
      const publishParams = new URLSearchParams({
        creation_id: carouselContainerId,
        access_token: accessToken
      });

      const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, {
        method: 'POST'
      });

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        console.error('Carousel publish error:', errorText);
        await supabase
          .from('instagram_auto_posts')
          .update({ 
            status: 'failed',
            error_message: `Carousel publish failed: ${errorText}`
          })
          .eq('id', postId);
        await createAlertAndNotify(post, instagramAccount, clientName, errorText);
        throw new Error(`Failed to publish carousel: ${errorText}`);
      }

      const publishData = await publishResponse.json();
      mediaId = publishData.id;
      console.log('Carousel published successfully! Media ID:', mediaId);

    } else {
      // SINGLE IMAGE PUBLISHING FLOW
      console.log('Publishing single image...');
      
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

        await createAlertAndNotify(post, instagramAccount, clientName, errorText);
        throw new Error(`Failed to create media container: ${errorText}`);
      }

      const containerData = await containerResponse.json();
      const containerId = containerData.id;
      console.log('Container created:', containerId);

      // Step 2: Wait for container to be ready
      const containerReady = await waitForContainer(containerId, accessToken);
      if (!containerReady) {
        const errorMsg = 'Container not ready after maximum attempts - timeout';
        await createAlertAndNotify(post, instagramAccount, clientName, errorMsg);
        throw new Error(errorMsg);
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

        await createAlertAndNotify(post, instagramAccount, clientName, errorText);
        throw new Error(`Failed to publish: ${errorText}`);
      }

      const publishData = await publishResponse.json();
      mediaId = publishData.id;
      console.log('Published successfully! Media ID:', mediaId);
    }

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

    // Cross-post to Facebook if enabled
    let facebookPostId: string | null = null;
    if (config.also_post_to_facebook && config.facebook_page_id) {
      console.log('Cross-posting to Facebook...');
      
      try {
        // Fetch Facebook page details
        const { data: facebookPage, error: fbPageError } = await supabase
          .from('facebook_pages')
          .select('page_id, page_access_token')
          .eq('id', config.facebook_page_id)
          .single();

        if (fbPageError || !facebookPage) {
          console.error('Error fetching Facebook page:', fbPageError);
        } else if (!facebookPage.page_access_token) {
          console.error('Facebook page access token not found');
        } else {
          const fbPageId = facebookPage.page_id;
          const fbAccessToken = facebookPage.page_access_token;

          if (isCarousel) {
            // CAROUSEL: Upload each photo unpublished, then create post with attached_media
            console.log('Publishing carousel to Facebook...');
            const photoIds: string[] = [];

            for (let i = 0; i < post.image_urls.length; i++) {
              const photoUrl = `https://graph.facebook.com/v21.0/${fbPageId}/photos`;
              const photoParams = new URLSearchParams({
                url: post.image_urls[i],
                published: 'false',
                access_token: fbAccessToken
              });

              const photoResponse = await fetch(`${photoUrl}?${photoParams.toString()}`, {
                method: 'POST'
              });

              if (photoResponse.ok) {
                const photoData = await photoResponse.json();
                photoIds.push(photoData.id);
                console.log(`Facebook photo ${i + 1} uploaded:`, photoData.id);
              } else {
                const errorText = await photoResponse.text();
                console.error(`Error uploading Facebook photo ${i + 1}:`, errorText);
              }
            }

            if (photoIds.length > 0) {
              // Create post with attached media
              const feedUrl = `https://graph.facebook.com/v21.0/${fbPageId}/feed`;
              const attachedMedia = photoIds.map(id => ({ media_fbid: id }));
              
              const feedResponse = await fetch(feedUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: post.caption,
                  attached_media: attachedMedia,
                  access_token: fbAccessToken
                })
              });

              if (feedResponse.ok) {
                const feedData = await feedResponse.json();
                facebookPostId = feedData.id;
                console.log('Facebook carousel post published:', facebookPostId);
              } else {
                const errorText = await feedResponse.text();
                console.error('Error publishing Facebook carousel post:', errorText);
              }
            }
          } else {
            // SINGLE IMAGE: Use /photos endpoint
            console.log('Publishing single image to Facebook...');
            const photoUrl = `https://graph.facebook.com/v21.0/${fbPageId}/photos`;
            const photoParams = new URLSearchParams({
              url: post.image_url,
              caption: post.caption,
              access_token: fbAccessToken
            });

            const photoResponse = await fetch(`${photoUrl}?${photoParams.toString()}`, {
              method: 'POST'
            });

            if (photoResponse.ok) {
              const photoData = await photoResponse.json();
              facebookPostId = photoData.post_id || photoData.id;
              console.log('Facebook photo published:', facebookPostId);
            } else {
              const errorText = await photoResponse.text();
              console.error('Error publishing to Facebook:', errorText);
            }
          }
        }
      } catch (fbError: any) {
        console.error('Error cross-posting to Facebook:', fbError.message);
        // Don't fail the entire operation if Facebook cross-post fails
      }
    }

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
      mediaId: mediaId,
      facebookPostId: facebookPostId
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
