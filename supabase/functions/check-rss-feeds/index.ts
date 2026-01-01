import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
}

// Parse RSS/Atom feed XML
function parseRSSFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  // Try RSS 2.0 format first
  const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
  
  for (const match of itemMatches) {
    const itemXml = match[1];
    
    const title = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
    const link = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() || '';
    const description = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() || '';
    const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';
    const guid = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim() || link;
    
    if (title || link) {
      items.push({ title, link, description, pubDate, guid });
    }
  }
  
  // If no items found, try Atom format
  if (items.length === 0) {
    const entryMatches = xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi);
    
    for (const match of entryMatches) {
      const entryXml = match[1];
      
      const title = entryXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
      const link = entryXml.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] || 
                   entryXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
      const description = entryXml.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1]?.trim() ||
                          entryXml.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1]?.trim() || '';
      const pubDate = entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim() ||
                      entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim() || '';
      const guid = entryXml.match(/<id[^>]*>([\s\S]*?)<\/id>/i)?.[1]?.trim() || link;
      
      if (title || link) {
        items.push({ title, link, description, pubDate, guid });
      }
    }
  }
  
  return items;
}

// Strip HTML tags from text
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch and parse RSS feed
async function fetchRSSFeed(feedUrl: string): Promise<RSSItem[]> {
  console.log(`Fetching RSS feed: ${feedUrl}`);
  
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RSSBot/1.0)',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }
  
  const xml = await response.text();
  return parseRSSFeed(xml);
}

// Check a single feed for new items
async function checkFeed(feed: { 
  id: string; 
  feed_url: string; 
  config_id: string; 
  last_checked_at: string | null;
  auto_generate?: boolean;
}) {
  console.log(`Checking feed ${feed.id}: ${feed.feed_url}`);
  
  try {
    const items = await fetchRSSFeed(feed.feed_url);
    console.log(`Found ${items.length} items in feed`);
    
    let newItemsCount = 0;
    const newItemIds: string[] = [];
    
    for (const item of items) {
      // Check if item already exists
      const { data: existingItem } = await supabase
        .from('instagram_autopost_rss_items')
        .select('id')
        .eq('feed_id', feed.id)
        .eq('guid', item.guid)
        .maybeSingle();
      
      if (!existingItem) {
        // Parse publication date
        let publishedAt: string | null = null;
        if (item.pubDate) {
          try {
            publishedAt = new Date(item.pubDate).toISOString();
          } catch {
            publishedAt = null;
          }
        }
        
        // Insert new item
        const { data: insertedItem, error: insertError } = await supabase
          .from('instagram_autopost_rss_items')
          .insert({
            feed_id: feed.id,
            config_id: feed.config_id,
            guid: item.guid,
            title: item.title.substring(0, 500),
            link: item.link.substring(0, 2000),
            description: stripHtml(item.description).substring(0, 5000),
            published_at: publishedAt,
            is_selected: true, // Auto-select new items
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error(`Error inserting RSS item:`, insertError);
        } else {
          newItemsCount++;
          if (insertedItem) {
            newItemIds.push(insertedItem.id);
          }
        }
      }
    }
    
    // Update feed last_checked_at and status
    await supabase
      .from('instagram_autopost_rss_feeds')
      .update({
        last_checked_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', feed.id);
    
    console.log(`Feed ${feed.id}: Added ${newItemsCount} new items`);
    
    // Auto-generate posts for new items if enabled
    if (feed.auto_generate && newItemIds.length > 0) {
      console.log(`Auto-generating posts for ${newItemIds.length} new items...`);
      
      for (const itemId of newItemIds) {
        try {
          // Call generate-rss-post function for each new item
          const { data, error } = await supabase.functions.invoke('generate-rss-post', {
            body: {
              itemId,
              configId: feed.config_id,
            },
          });

          if (error || !data?.success) {
            console.error(`Failed to generate post for item ${itemId}:`, error || data);
          } else {
            console.log(`Successfully generated post for item ${itemId}:`, data.postId);
          }

          // Small delay between generations to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (genError) {
          console.error(`Error generating post for item ${itemId}:`, genError);
        }
      }
    }
    
    return { feedId: feed.id, newItems: newItemsCount, autoGenerated: feed.auto_generate ? newItemIds.length : 0, success: true };
    
  } catch (error) {
    console.error(`Error checking feed ${feed.id}:`, error);
    
    // Update feed with error
    await supabase
      .from('instagram_autopost_rss_feeds')
      .update({
        last_checked_at: new Date().toISOString(),
        last_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', feed.id);
    
    return { feedId: feed.id, error: error instanceof Error ? error.message : 'Unknown error', success: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { configId, feedId } = body;

    let query = supabase
      .from('instagram_autopost_rss_feeds')
      .select('id, feed_url, config_id, last_checked_at, auto_generate')
      .eq('is_enabled', true);

    // Filter by specific feed or config if provided
    if (feedId) {
      query = query.eq('id', feedId);
    } else if (configId) {
      query = query.eq('config_id', configId);
    }

    const { data: feeds, error: feedsError } = await query;

    if (feedsError) {
      throw new Error(`Error fetching feeds: ${feedsError.message}`);
    }

    if (!feeds || feeds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No feeds to check', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking ${feeds.length} RSS feeds...`);

    // Process feeds sequentially to avoid overwhelming external servers
    const results = [];
    for (const feed of feeds) {
      const result = await checkFeed(feed);
      results.push(result);
    }

    const totalNewItems = results.reduce((sum, r) => sum + (r.newItems || 0), 0);
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`RSS check complete: ${successCount} feeds checked, ${errorCount} errors, ${totalNewItems} new items`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        feedsChecked: feeds.length,
        successCount,
        errorCount,
        totalNewItems,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-rss-feeds:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
