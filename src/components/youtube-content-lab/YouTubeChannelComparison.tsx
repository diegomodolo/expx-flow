import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { YouTubeVideo } from "@/hooks/useYouTubeAnalytics";
import { YouTubeChannel } from "@/hooks/useYouTubeChannels";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Eye, ThumbsUp, MessageCircle } from "lucide-react";

interface YouTubeChannelComparisonProps {
  videos: YouTubeVideo[];
  channels: YouTubeChannel[];
}

export function YouTubeChannelComparison({ videos, channels }: YouTubeChannelComparisonProps) {
  // Aggregate stats per channel
  const channelStats = channels.map((channel) => {
    const channelVideos = videos.filter((v) => v.channel_id === channel.id);
    const totalViews = channelVideos.reduce((sum, v) => sum + v.view_count, 0);
    const totalLikes = channelVideos.reduce((sum, v) => sum + v.like_count, 0);
    const totalComments = channelVideos.reduce((sum, v) => sum + v.comment_count, 0);
    const avgEngagement =
      channelVideos.length > 0
        ? channelVideos.reduce((sum, v) => sum + (v.engagement_rate || 0), 0) / channelVideos.length
        : 0;

    return {
      name: channel.channel_name.length > 15 
        ? channel.channel_name.substring(0, 15) + "..." 
        : channel.channel_name,
      fullName: channel.channel_name,
      videos: channelVideos.length,
      views: totalViews,
      likes: totalLikes,
      comments: totalComments,
      engagement: avgEngagement,
      avgViews: channelVideos.length > 0 ? Math.round(totalViews / channelVideos.length) : 0,
    };
  }).filter((s) => s.videos > 0);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (channelStats.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-40 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sem dados suficientes para comparação</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {channelStats.map((stat) => (
          <Card key={stat.fullName}>
            <CardContent className="pt-4">
              <h4 className="font-medium truncate mb-3" title={stat.fullName}>
                {stat.fullName}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatNumber(stat.views)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatNumber(stat.likes)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatNumber(stat.comments)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{stat.engagement.toFixed(2)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{stat.videos} vídeos analisados</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Engagement Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo de Engajamento Médio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)}%`, "Engajamento"]}
                  labelFormatter={(label) => channelStats.find((s) => s.name === label)?.fullName || label}
                />
                <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Views Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo de Views Médias por Vídeo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatNumber} />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip
                  formatter={(value: number) => [formatNumber(value), "Views Médias"]}
                  labelFormatter={(label) => channelStats.find((s) => s.name === label)?.fullName || label}
                />
                <Bar dataKey="avgViews" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
