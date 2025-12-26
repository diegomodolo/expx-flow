import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  clientId: string;
  source: 'facebook' | 'instagram';
  sourceId: string; // page_id or instagram_id
  limit?: number;
}

interface VideoItem {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  created_time: string;
  length?: number;
  views?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: RequestBody = await req.json();
    const { clientId, source, sourceId, limit = 25 } = body;

    console.log(`[fetch-meta-videos] Source: ${source}, SourceId: ${sourceId}, ClientId: ${clientId}`);

    // Get client and company
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, company_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Get Facebook integration
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token, expires_at')
      .eq('company_id', client.company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Facebook integration not found');
    }

    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      throw new Error('Facebook access token has expired');
    }

    const accessToken = integration.access_token;
    const graphApiUrl = 'https://graph.facebook.com/v22.0';
    let videos: VideoItem[] = [];

    if (source === 'facebook') {
      // Fetch videos from Facebook Page
      // First get the page access token
      const pageTokenUrl = `${graphApiUrl}/${sourceId}?fields=access_token&access_token=${accessToken}`;
      const pageTokenRes = await fetch(pageTokenUrl);
      const pageTokenData = await pageTokenRes.json();
      
      if (pageTokenData.error) {
        console.error('[fetch-meta-videos] Page token error:', pageTokenData.error);
        throw new Error(pageTokenData.error.message);
      }

      const pageAccessToken = pageTokenData.access_token || accessToken;

      // Fetch videos from the page
      const videosUrl = `${graphApiUrl}/${sourceId}/videos?fields=id,title,description,thumbnails,created_time,length,video_insights.metric(total_video_views)&limit=${limit}&access_token=${pageAccessToken}`;
      
      console.log(`[fetch-meta-videos] Fetching Facebook videos from page ${sourceId}`);
      
      const videosRes = await fetch(videosUrl);
      const videosData = await videosRes.json();

      if (videosData.error) {
        console.error('[fetch-meta-videos] Videos fetch error:', videosData.error);
        throw new Error(videosData.error.message);
      }

      videos = (videosData.data || []).map((video: any) => {
        // Get views from insights if available
        let views = 0;
        if (video.video_insights?.data) {
          const viewsInsight = video.video_insights.data.find((i: any) => i.name === 'total_video_views');
          if (viewsInsight?.values?.[0]?.value) {
            views = viewsInsight.values[0].value;
          }
        }

        return {
          id: video.id,
          title: video.title || 'Vídeo sem título',
          description: video.description,
          thumbnail_url: video.thumbnails?.data?.[0]?.uri || null,
          created_time: video.created_time,
          length: video.length,
          views,
        };
      });

      console.log(`[fetch-meta-videos] Found ${videos.length} Facebook videos`);

    } else if (source === 'instagram') {
      // Fetch videos/reels from Instagram Business Account
      const mediaUrl = `${graphApiUrl}/${sourceId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=${limit}&access_token=${accessToken}`;
      
      console.log(`[fetch-meta-videos] Fetching Instagram media from account ${sourceId}`);
      
      const mediaRes = await fetch(mediaUrl);
      const mediaData = await mediaRes.json();

      if (mediaData.error) {
        console.error('[fetch-meta-videos] Instagram media fetch error:', mediaData.error);
        throw new Error(mediaData.error.message);
      }

      // Filter only videos and reels
      const videoMedia = (mediaData.data || []).filter((m: any) => 
        m.media_type === 'VIDEO' || m.media_type === 'REELS'
      );

      videos = videoMedia.map((media: any) => ({
        id: media.id,
        title: media.caption?.substring(0, 100) || 'Vídeo/Reel',
        description: media.caption,
        thumbnail_url: media.thumbnail_url || media.media_url,
        created_time: media.timestamp,
        views: (media.like_count || 0) + (media.comments_count || 0), // Engagement as proxy
      }));

      console.log(`[fetch-meta-videos] Found ${videos.length} Instagram videos/reels`);
    }

    return new Response(JSON.stringify({
      success: true,
      videos,
      source,
      source_id: sourceId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[fetch-meta-videos] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});