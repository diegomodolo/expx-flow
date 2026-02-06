import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTubeVideo, PeriodOption } from "@/hooks/useYouTubeAnalytics";
import { Eye, ThumbsUp, MessageCircle, TrendingUp, FileText, Loader2, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface YouTubeVideoAnalyticsProps {
  videos: YouTubeVideo[];
  loading: boolean;
  period: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  metrics: {
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    avgEngagementRate: number;
    topVideo: YouTubeVideo | null;
  };
  topByViews: YouTubeVideo[];
  topByEngagement: YouTubeVideo[];
  onCreateScript: (topic: string) => void;
}

export function YouTubeVideoAnalytics({
  videos,
  loading,
  period,
  onPeriodChange,
  metrics,
  topByViews,
  topByEngagement,
  onCreateScript,
}: YouTubeVideoAnalyticsProps) {
  const [sortBy, setSortBy] = useState<"engagement" | "views">("engagement");

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const periodLabels: Record<PeriodOption, string> = {
    "1": "Último dia",
    "3": "Últimos 3 dias",
    "7": "Últimos 7 dias",
    "15": "Últimos 15 dias",
    "30": "Últimos 30 dias",
    "60": "Últimos 60 dias",
    "90": "Últimos 90 dias",
    custom: "Personalizado",
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-40 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum vídeo analisado</p>
          <p className="text-sm text-muted-foreground">
            Adicione canais para começar a análise de engajamento
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayedVideos = sortBy === "engagement" ? topByEngagement : topByViews;

  return (
    <div className="space-y-6">
      {/* Period Selector & Metrics */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Período:</span>
          <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Views</p>
                <p className="text-2xl font-bold">{formatNumber(metrics.totalViews)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ThumbsUp className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Curtidas</p>
                <p className="text-2xl font-bold">{formatNumber(metrics.totalLikes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comentários</p>
                <p className="text-2xl font-bold">{formatNumber(metrics.totalComments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Engajamento Médio</p>
                <p className="text-2xl font-bold">{metrics.avgEngagementRate.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Videos Ranking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vídeos de Maior Destaque</CardTitle>
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as "engagement" | "views")}>
              <TabsList>
                <TabsTrigger value="engagement">Por Engajamento</TabsTrigger>
                <TabsTrigger value="views">Por Views</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayedVideos.map((video, index) => (
              <div
                key={video.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="text-lg font-bold text-muted-foreground w-6">
                  {index + 1}
                </div>
                
                <div className="w-32 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Eye className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-clamp-2" title={video.title}>
                    {video.title}
                  </h4>
                  {video.channel_name && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {video.channel_name}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {formatNumber(video.view_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {formatNumber(video.like_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {formatNumber(video.comment_count)}
                    </span>
                    <Badge variant="secondary">
                      {(video.engagement_rate || 0).toFixed(2)}% eng.
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreateScript(video.title)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Roteiro
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => window.open(`https://youtube.com/watch?v=${video.video_id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
