import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache for rate limiting
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Google Trends unofficial API endpoints
const TRENDS_BASE_URL = 'https://trends.google.com/trends/api';

async function fetchTrendsData(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${TRENDS_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Trends API error: ${response.status}`);
  }

  const text = await response.text();
  // Google Trends API returns data with a prefix ")]}',\n" that needs to be removed
  const cleanText = text.replace(/^\)\]\}',?\n/, '');
  return JSON.parse(cleanText);
}

async function getDailyTrends(geo: string = 'BR') {
  const cacheKey = `daily_${geo}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchTrendsData('dailytrends', {
      hl: 'pt-BR',
      tz: '-180',
      geo,
      ns: '15',
    });

    const trends = data?.default?.trendingSearchesDays?.[0]?.trendingSearches || [];
    const result = trends.slice(0, 10).map((trend: any) => ({
      title: trend.title?.query || '',
      traffic: trend.formattedTraffic || '',
      relatedQueries: trend.relatedQueries?.map((q: any) => q.query) || [],
      image: trend.image?.imageUrl || null,
      articles: trend.articles?.slice(0, 2).map((a: any) => ({
        title: a.title,
        url: a.url,
        source: a.source,
      })) || [],
    }));

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching daily trends:', error);
    throw error;
  }
}

async function getInterestOverTime(keyword: string, geo: string = 'BR', timeRange: string = 'today 3-m') {
  const cacheKey = `interest_${keyword}_${geo}_${timeRange}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // First, get the token
    const exploreUrl = new URL(`${TRENDS_BASE_URL}/explore`);
    exploreUrl.searchParams.append('hl', 'pt-BR');
    exploreUrl.searchParams.append('tz', '-180');
    exploreUrl.searchParams.append('req', JSON.stringify({
      comparisonItem: [{ keyword, geo, time: timeRange }],
      category: 0,
      property: '',
    }));

    const exploreResponse = await fetch(exploreUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const exploreText = await exploreResponse.text();
    const cleanExploreText = exploreText.replace(/^\)\]\}',?\n/, '');
    const exploreData = JSON.parse(cleanExploreText);

    const token = exploreData?.widgets?.find((w: any) => w.id === 'TIMESERIES')?.token;
    if (!token) {
      throw new Error('Could not get timeseries token');
    }

    // Then fetch the actual data
    const multilineUrl = new URL(`${TRENDS_BASE_URL}/widgetdata/multiline`);
    multilineUrl.searchParams.append('hl', 'pt-BR');
    multilineUrl.searchParams.append('tz', '-180');
    multilineUrl.searchParams.append('token', token);
    multilineUrl.searchParams.append('req', JSON.stringify({
      time: timeRange,
      resolution: 'WEEK',
      locale: 'pt-BR',
      comparisonItem: [{ geo, complexKeywordsRestriction: { keyword: [{ type: 'BROAD', value: keyword }] } }],
      requestOptions: { property: '', backend: 'IZG', category: 0 },
    }));

    const multilineResponse = await fetch(multilineUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const multilineText = await multilineResponse.text();
    const cleanMultilineText = multilineText.replace(/^\)\]\}',?\n/, '');
    const multilineData = JSON.parse(cleanMultilineText);

    const timelineData = multilineData?.default?.timelineData || [];
    const result = {
      keyword,
      data: timelineData.map((item: any) => ({
        date: item.formattedTime,
        value: item.value?.[0] || 0,
      })),
      averageInterest: timelineData.length > 0 
        ? Math.round(timelineData.reduce((sum: number, item: any) => sum + (item.value?.[0] || 0), 0) / timelineData.length)
        : 0,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching interest over time:', error);
    throw error;
  }
}

async function getRelatedQueries(keyword: string, geo: string = 'BR') {
  const cacheKey = `related_${keyword}_${geo}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const exploreUrl = new URL(`${TRENDS_BASE_URL}/explore`);
    exploreUrl.searchParams.append('hl', 'pt-BR');
    exploreUrl.searchParams.append('tz', '-180');
    exploreUrl.searchParams.append('req', JSON.stringify({
      comparisonItem: [{ keyword, geo, time: 'today 3-m' }],
      category: 0,
      property: '',
    }));

    const exploreResponse = await fetch(exploreUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const exploreText = await exploreResponse.text();
    const cleanExploreText = exploreText.replace(/^\)\]\}',?\n/, '');
    const exploreData = JSON.parse(cleanExploreText);

    const token = exploreData?.widgets?.find((w: any) => w.id === 'RELATED_QUERIES')?.token;
    if (!token) {
      throw new Error('Could not get related queries token');
    }

    const relatedUrl = new URL(`${TRENDS_BASE_URL}/widgetdata/relatedsearches`);
    relatedUrl.searchParams.append('hl', 'pt-BR');
    relatedUrl.searchParams.append('tz', '-180');
    relatedUrl.searchParams.append('token', token);
    relatedUrl.searchParams.append('req', JSON.stringify({
      restriction: { geo: { country: geo }, time: 'today 3-m' },
      keywordType: 'QUERY',
      metric: ['TOP', 'RISING'],
      trendinessSettings: { compareTime: 'today 12-m' },
      requestOptions: { property: '', backend: 'IZG', category: 0 },
      language: 'pt',
    }));

    const relatedResponse = await fetch(relatedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const relatedText = await relatedResponse.text();
    const cleanRelatedText = relatedText.replace(/^\)\]\}',?\n/, '');
    const relatedData = JSON.parse(cleanRelatedText);

    const result = {
      keyword,
      top: relatedData?.default?.rankedList?.[0]?.rankedKeyword?.slice(0, 10).map((item: any) => ({
        query: item.query,
        value: item.value,
      })) || [],
      rising: relatedData?.default?.rankedList?.[1]?.rankedKeyword?.slice(0, 10).map((item: any) => ({
        query: item.query,
        value: item.formattedValue || 'Breakout',
      })) || [],
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching related queries:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { queryType, keyword, geo = 'BR', timeRange = 'today 3-m' } = await req.json();

    console.log(`Google Trends request: ${queryType}, keyword: ${keyword}, geo: ${geo}`);

    let result;

    switch (queryType) {
      case 'dailyTrends':
        result = await getDailyTrends(geo);
        break;
      case 'interestOverTime':
        if (!keyword) throw new Error('Keyword is required for interestOverTime');
        result = await getInterestOverTime(keyword, geo, timeRange);
        break;
      case 'relatedQueries':
        if (!keyword) throw new Error('Keyword is required for relatedQueries');
        result = await getRelatedQueries(keyword, geo);
        break;
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Google Trends error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch trends data',
        fallback: true,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
