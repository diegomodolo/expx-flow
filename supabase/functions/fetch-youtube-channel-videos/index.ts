import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract channel ID from various YouTube URL formats
function extractChannelId(url: string): string | null {
  if (!url) return null;
  
  // Clean the URL
  url = url.trim();
  
  // Format: youtube.com/channel/UC...
  const channelMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/);
  if (channelMatch) return channelMatch[1];
  
  // Format: youtube.com/@username - we'll need to resolve this
  const handleMatch = url.match(/youtube\.com\/@([\w-]+)/);
  if (handleMatch) return `@${handleMatch[1]}`;
  
  // Format: youtube.com/c/channelname or youtube.com/user/username
  const customMatch = url.match(/youtube\.com\/(?:c|user)\/([\w-]+)/);
  if (customMatch) return `custom:${customMatch[1]}`;
  
  // If it's just a channel ID
  if (url.startsWith('UC') && url.length >= 24) return url;
  
  return null;
}

// Parse YouTube RSS feed XML
function parseRSSFeed(xmlText: string): Array<{
  videoId: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  publishedAt: string;
}> {
  const videos: Array<{
    videoId: string;
    title: string;
    videoUrl: string;
    thumbnailUrl: string;
    publishedAt: string;
  }> = [];

  // Extract entries from RSS feed
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entry = match[1];
    
    // Extract video ID
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    // Extract title
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : '';
    
    // Extract published date
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const publishedAt = publishedMatch ? publishedMatch[1] : '';
    
    if (videoId) {
      videos.push({
        videoId,
        title,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt
      });
    }
  }
  
  return videos;
}

// Try to resolve @handle to channel ID using oembed
async function resolveHandle(handle: string): Promise<string | null> {
  try {
    // Try fetching a video page to find channel ID
    const cleanHandle = handle.replace('@', '');
    const response = await fetch(`https://www.youtube.com/@${cleanHandle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Look for channel ID in page content
    const channelIdMatch = html.match(/\"channelId\":\"(UC[\w-]+)\"/);
    if (channelIdMatch) return channelIdMatch[1];
    
    const externalIdMatch = html.match(/\"externalId\":\"(UC[\w-]+)\"/);
    if (externalIdMatch) return externalIdMatch[1];
    
    return null;
  } catch (error) {
    console.error('Error resolving handle:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelUrl, clientId } = await req.json();

    console.log('Fetching YouTube videos for channel:', channelUrl);

    if (!channelUrl) {
      throw new Error('Channel URL is required');
    }

    let channelId = extractChannelId(channelUrl);
    
    if (!channelId) {
      throw new Error('Invalid YouTube channel URL');
    }

    // If it's a handle, try to resolve it
    if (channelId.startsWith('@')) {
      const resolvedId = await resolveHandle(channelId);
      if (!resolvedId) {
        throw new Error(`Could not resolve YouTube handle: ${channelId}`);
      }
      channelId = resolvedId;
      console.log('Resolved handle to channel ID:', channelId);
    }

    // If it's a custom URL, we can't easily resolve it without API key
    if (channelId.startsWith('custom:')) {
      throw new Error('Custom YouTube URLs require channel ID. Please use the channel ID format (starts with UC)');
    }

    // Fetch RSS feed
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    console.log('Fetching RSS:', rssUrl);

    const rssResponse = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!rssResponse.ok) {
      console.error('RSS fetch failed:', rssResponse.status);
      throw new Error(`Failed to fetch YouTube RSS feed: ${rssResponse.status}`);
    }

    const xmlText = await rssResponse.text();
    const videos = parseRSSFeed(xmlText);

    console.log(`Found ${videos.length} videos from channel`);

    return new Response(JSON.stringify({
      success: true,
      channelId,
      videos,
      count: videos.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in fetch-youtube-channel-videos:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
