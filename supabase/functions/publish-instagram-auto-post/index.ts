import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppAlerts, buildAlertMessage } from '../_shared/whatsapp-alerts.ts';

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
  
  // Get alert title based on type
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
    // 1. Create system alert in database
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

    // 2. Send WhatsApp notification
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

    console.log('Post loaded:', post.id, 'Status:', post.status, 'Image URL:', post.image_url?.substring(0, 50));

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

    // Get Facebook access token
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token')
      .eq('company_id', post.company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration?.access_token) {
      console.error('Error fetching Facebook integration:', integrationError);
      const errorMsg = 'Facebook integration not found or inactive';
      await createAlertAndNotify(post, instagramAccount, clientName, errorMsg);
      throw new Error(errorMsg);
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

      // Create alert and notify
      await createAlertAndNotify(post, instagramAccount, clientName, errorText);

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
          const errorMsg = 'Container processing failed - Instagram rejected the media';
          await createAlertAndNotify(post, instagramAccount, clientName, errorMsg);
          throw new Error(errorMsg);
        }
      }
      
      attempts++;
    }

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

      // Create alert and notify
      await createAlertAndNotify(post, instagramAccount, clientName, errorText);

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
