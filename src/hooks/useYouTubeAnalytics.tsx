import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface YouTubeVideo {
  id: string;
  channel_id: string;
  client_id: string;
  video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds: number | null;
  engagement_rate: number | null;
  analyzed_at: string;
  ai_theme_analysis: string | null;
  ai_summary: string | null;
  channel_name?: string;
}

export type PeriodOption = '1' | '3' | '7' | '15' | '30' | '60' | '90' | 'custom';

export function useYouTubeAnalytics(clientId: string, companyId: string) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodOption>('30');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const fetchVideos = useCallback(async () => {
    if (!clientId || !companyId) return;

    setLoading(true);
    try {
      // Calculate date filter
      let startDate: Date;
      const endDate = new Date();

      if (period === 'custom' && customDateRange) {
        startDate = customDateRange.start;
      } else {
        const days = parseInt(period, 10) || 30;
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      // Fetch videos with channel info
      const { data, error } = await supabase
        .from('youtube_video_analyses')
        .select(`
          *,
          youtube_monitored_channels!inner(channel_name)
        `)
        .eq('client_id', clientId)
        .gte('published_at', startDate.toISOString())
        .lte('published_at', endDate.toISOString())
        .order('engagement_rate', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Map with channel name
      const videosWithChannel = (data || []).map((v: any) => ({
        ...v,
        channel_name: v.youtube_monitored_channels?.channel_name,
      }));

      setVideos(videosWithChannel);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId, period, customDateRange]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Calculate metrics
  const metrics = {
    totalVideos: videos.length,
    totalViews: videos.reduce((sum, v) => sum + v.view_count, 0),
    totalLikes: videos.reduce((sum, v) => sum + v.like_count, 0),
    totalComments: videos.reduce((sum, v) => sum + v.comment_count, 0),
    avgEngagementRate: videos.length > 0
      ? videos.reduce((sum, v) => sum + (v.engagement_rate || 0), 0) / videos.length
      : 0,
    topVideo: videos[0] || null,
  };

  // Get top videos by different criteria
  const topByViews = [...videos].sort((a, b) => b.view_count - a.view_count).slice(0, 10);
  const topByEngagement = [...videos].sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0)).slice(0, 10);
  const topByLikes = [...videos].sort((a, b) => b.like_count - a.like_count).slice(0, 10);

  return {
    videos,
    loading,
    period,
    setPeriod,
    customDateRange,
    setCustomDateRange,
    metrics,
    topByViews,
    topByEngagement,
    topByLikes,
    refetch: fetchVideos,
  };
}
