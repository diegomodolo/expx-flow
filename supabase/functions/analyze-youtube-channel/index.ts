import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract channel ID from various YouTube URL formats
function extractChannelInfo(url: string): { type: 'id' | 'handle' | 'username'; value: string } | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Channel ID format: youtube.com/channel/UC...
    const channelMatch = pathname.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (channelMatch) {
      return { type: 'id', value: channelMatch[1] };
    }

    // Handle format: youtube.com/@handle
    const handleMatch = pathname.match(/\/@([^\/]+)/);
    if (handleMatch) {
      return { type: 'handle', value: handleMatch[1] };
    }

    // Username format: youtube.com/user/username or youtube.com/c/customname
    const userMatch = pathname.match(/\/(user|c)\/([^\/]+)/);
    if (userMatch) {
      return { type: 'username', value: userMatch[2] };
    }

    // Direct handle without @
    const directMatch = pathname.match(/^\/([^\/]+)$/);
    if (directMatch && directMatch[1] !== 'watch' && directMatch[1] !== 'channel') {
      return { type: 'handle', value: directMatch[1] };
    }

    return null;
  } catch {
    return null;
  }
}

// Fetch channel info from YouTube API
async function fetchChannelInfo(channelInfo: { type: string; value: string }) {
  let apiUrl: string;

  if (channelInfo.type === 'id') {
    apiUrl = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelInfo.value}&key=${youtubeApiKey}`;
  } else if (channelInfo.type === 'handle') {
    apiUrl = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${channelInfo.value}&key=${youtubeApiKey}`;
  } else {
    apiUrl = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${channelInfo.value}&key=${youtubeApiKey}`;
  }

  console.log('Fetching channel info from:', apiUrl.replace(youtubeApiKey, '***'));

  const response = await fetch(apiUrl);
  const data = await response.json();

  if (!response.ok) {
    console.error('YouTube API error:', data);
    throw new Error(data.error?.message || 'Failed to fetch channel info');
  }

  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }

  return data.items[0];
}

// Fetch recent videos from channel
async function fetchChannelVideos(channelId: string, publishedAfter?: string, maxResults = 50) {
  let apiUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=${maxResults}&key=${youtubeApiKey}`;
  
  if (publishedAfter) {
    apiUrl += `&publishedAfter=${publishedAfter}`;
  }

  console.log('Fetching videos from channel:', channelId);

  const response = await fetch(apiUrl);
  const data = await response.json();

  if (!response.ok) {
    console.error('YouTube API error:', data);
    throw new Error(data.error?.message || 'Failed to fetch videos');
  }

  return data.items || [];
}

// Fetch video statistics
async function fetchVideoStats(videoIds: string[]) {
  if (videoIds.length === 0) return [];

  const apiUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds.join(',')}&key=${youtubeApiKey}`;

  console.log('Fetching stats for', videoIds.length, 'videos');

  const response = await fetch(apiUrl);
  const data = await response.json();

  if (!response.ok) {
    console.error('YouTube API error:', data);
    throw new Error(data.error?.message || 'Failed to fetch video stats');
  }

  return data.items || [];
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Calculate engagement rate
function calculateEngagementRate(likes: number, comments: number, views: number): number {
  if (views === 0) return 0;
  return ((likes + comments) / views) * 100;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelUrl, clientId, companyId, periodDays = 30 } = await req.json();

    console.log('Analyzing YouTube channel:', channelUrl);

    if (!channelUrl) {
      throw new Error('Channel URL is required');
    }

    if (!clientId || !companyId) {
      throw new Error('Client ID and Company ID are required');
    }

    // Extract channel info from URL
    const channelInfo = extractChannelInfo(channelUrl);
    if (!channelInfo) {
      throw new Error('Invalid YouTube channel URL');
    }

    console.log('Extracted channel info:', channelInfo);

    // Fetch channel data
    const channel = await fetchChannelInfo(channelInfo);
    console.log('Channel found:', channel.snippet.title);

    // Calculate date for period filter
    const publishedAfter = new Date();
    publishedAfter.setDate(publishedAfter.getDate() - periodDays);

    // Fetch recent videos
    const videos = await fetchChannelVideos(channel.id, publishedAfter.toISOString());
    console.log('Found', videos.length, 'videos in the period');

    // Get video IDs and fetch stats
    const videoIds = videos.map((v: any) => v.id.videoId);
    const videoStats = await fetchVideoStats(videoIds);

    // Create stats map
    const statsMap = new Map(videoStats.map((s: any) => [s.id, s]));

    // Process videos with stats
    const processedVideos = videos.map((video: any) => {
      const stats = statsMap.get(video.id.videoId);
      const viewCount = parseInt(stats?.statistics?.viewCount || '0', 10);
      const likeCount = parseInt(stats?.statistics?.likeCount || '0', 10);
      const commentCount = parseInt(stats?.statistics?.commentCount || '0', 10);
      const durationSeconds = stats?.contentDetails?.duration 
        ? parseDuration(stats.contentDetails.duration)
        : 0;

      return {
        video_id: video.id.videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
        published_at: video.snippet.publishedAt,
        view_count: viewCount,
        like_count: likeCount,
        comment_count: commentCount,
        duration_seconds: durationSeconds,
        engagement_rate: calculateEngagementRate(likeCount, commentCount, viewCount),
      };
    });

    // Sort by engagement rate
    processedVideos.sort((a: any, b: any) => b.engagement_rate - a.engagement_rate);

    // Save/update channel in database
    const channelData = {
      client_id: clientId,
      company_id: companyId,
      channel_id: channel.id,
      channel_url: channelUrl,
      channel_name: channel.snippet.title,
      channel_handle: channel.snippet.customUrl || null,
      thumbnail_url: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
      subscriber_count: parseInt(channel.statistics.subscriberCount || '0', 10),
      video_count: parseInt(channel.statistics.videoCount || '0', 10),
      last_analyzed_at: new Date().toISOString(),
      is_active: true,
    };

    const { data: savedChannel, error: saveError } = await supabase
      .from('youtube_monitored_channels')
      .upsert(channelData, {
        onConflict: 'client_id,channel_id',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving channel:', saveError);
      throw new Error('Failed to save channel');
    }

    console.log('Channel saved with ID:', savedChannel.id);

    // Save video analyses
    for (const video of processedVideos) {
      const videoData = {
        channel_id: savedChannel.id,
        client_id: clientId,
        company_id: companyId,
        ...video,
        analyzed_at: new Date().toISOString(),
      };

      const { error: videoError } = await supabase
        .from('youtube_video_analyses')
        .upsert(videoData, {
          onConflict: 'channel_id,video_id',
        });

      if (videoError) {
        console.error('Error saving video:', videoError);
      }
    }

    console.log('Saved', processedVideos.length, 'video analyses');

    return new Response(JSON.stringify({
      success: true,
      channel: {
        id: savedChannel.id,
        channelId: channel.id,
        name: channel.snippet.title,
        handle: channel.snippet.customUrl,
        thumbnail: channelData.thumbnail_url,
        subscriberCount: channelData.subscriber_count,
        videoCount: channelData.video_count,
      },
      videos: processedVideos,
      analyzedCount: processedVideos.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in analyze-youtube-channel:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
