import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTubeVideo } from "@/hooks/useYouTubeAnalytics";
import { YouTubeChannel } from "@/hooks/useYouTubeChannels";
import { Eye, ThumbsUp, MessageCircle, TrendingUp, ExternalLink } from "lucide-react";

type ChannelSortOption = "engagement" | "views" | "likes" | "comments";

interface ChannelAggregated {
  channelId: string;
  channelName: string;
  thumbnailUrl?: string | null;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgEngagement: number;
  videoCount: number;
  shortsCount: number;
  longCount: number;
  channelUrl?: string;
}

interface YouTubeChannelRankingProps {
  videos: YouTubeVideo[];
  channels: YouTubeChannel[];
}

export function YouTubeChannelRanking({ videos, channels }: YouTubeChannelRankingProps) {
  const [sortBy, setSortBy] = useState<ChannelSortOption>("engagement");

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const channelRanking = useMemo(() => {
    const map = new Map<string, ChannelAggregated>();

    for (const video of videos) {
      const key = video.channel_id;
      const duration = video.duration_seconds ?? 0;
      const isShort = duration > 0 && duration <= 180;
      const existing = map.get(key);
      if (existing) {
        existing.totalViews += video.view_count;
        existing.totalLikes += video.like_count;
        existing.totalComments += video.comment_count;
        existing.avgEngagement += video.engagement_rate || 0;
        existing.videoCount += 1;
        if (isShort) existing.shortsCount += 1;
        else existing.longCount += 1;
      } else {
        const ch = channels.find((c) => c.id === key);
        map.set(key, {
          channelId: key,
          channelName: video.channel_name || ch?.channel_name || "Canal desconhecido",
          thumbnailUrl: ch?.thumbnail_url,
          totalViews: video.view_count,
          totalLikes: video.like_count,
          totalComments: video.comment_count,
          avgEngagement: video.engagement_rate || 0,
          videoCount: 1,
          shortsCount: isShort ? 1 : 0,
          longCount: isShort ? 0 : 1,
          channelUrl: ch?.channel_url,
        });
      }
    }

    // Calculate average engagement
    const results = Array.from(map.values()).map((ch) => ({
      ...ch,
      avgEngagement: ch.videoCount > 0 ? ch.avgEngagement / ch.videoCount : 0,
    }));

    // Sort
    switch (sortBy) {
      case "engagement":
        results.sort((a, b) => b.avgEngagement - a.avgEngagement);
        break;
      case "views":
        results.sort((a, b) => b.totalViews - a.totalViews);
        break;
      case "likes":
        results.sort((a, b) => b.totalLikes - a.totalLikes);
        break;
      case "comments":
        results.sort((a, b) => b.totalComments - a.totalComments);
        break;
    }

    return results;
  }, [videos, channels, sortBy]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Ranking de Canais</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={sortBy === "engagement" ? "default" : "outline"}
              onClick={() => setSortBy("engagement")}
              className="flex items-center gap-1.5"
            >
              <TrendingUp className="h-4 w-4" />
              Engajamento
            </Button>
            <Button
              size="sm"
              variant={sortBy === "views" ? "default" : "outline"}
              onClick={() => setSortBy("views")}
              className="flex items-center gap-1.5"
            >
              <Eye className="h-4 w-4" />
              Views
            </Button>
            <Button
              size="sm"
              variant={sortBy === "likes" ? "default" : "outline"}
              onClick={() => setSortBy("likes")}
              className="flex items-center gap-1.5"
            >
              <ThumbsUp className="h-4 w-4" />
              Curtidas
            </Button>
            <Button
              size="sm"
              variant={sortBy === "comments" ? "default" : "outline"}
              onClick={() => setSortBy("comments")}
              className="flex items-center gap-1.5"
            >
              <MessageCircle className="h-4 w-4" />
              Comentários
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {channelRanking.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum canal encontrado com os filtros atuais
          </div>
        ) : (
          <div className="space-y-4">
            {channelRanking.map((ch, index) => (
              <div
                key={ch.channelId}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="text-lg font-bold text-muted-foreground w-6 text-center">
                  {index + 1}
                </div>

                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  {ch.thumbnailUrl ? (
                    <img
                      src={ch.thumbnailUrl}
                      alt={ch.channelName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                      {ch.channelName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ch.channelName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ch.videoCount} vídeos · {ch.longCount} longos · {ch.shortsCount} shorts
                  </p>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                    <span className={`flex items-center gap-1 ${sortBy === "views" ? "text-primary font-semibold" : ""}`}>
                      <Eye className="h-3.5 w-3.5" />
                      {formatNumber(ch.totalViews)}
                    </span>
                    <span className={`flex items-center gap-1 ${sortBy === "likes" ? "text-primary font-semibold" : ""}`}>
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {formatNumber(ch.totalLikes)}
                    </span>
                    <span className={`flex items-center gap-1 ${sortBy === "comments" ? "text-primary font-semibold" : ""}`}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      {formatNumber(ch.totalComments)}
                    </span>
                    <Badge variant={sortBy === "engagement" ? "default" : "secondary"}>
                      {ch.avgEngagement.toFixed(2)}% eng.
                    </Badge>
                  </div>
                </div>

                {ch.channelUrl && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => window.open(ch.channelUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
