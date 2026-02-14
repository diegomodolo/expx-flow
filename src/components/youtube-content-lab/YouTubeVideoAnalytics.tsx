import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTubeVideo, PeriodOption, SortOption } from "@/hooks/useYouTubeAnalytics";
import { YouTubeChannel } from "@/hooks/useYouTubeChannels";
import { Eye, ThumbsUp, MessageCircle, TrendingUp, FileText, Loader2, ExternalLink, BarChart3, Clock, Hash, Youtube, X, RefreshCw, Film, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouTubeAnalysisFilters } from "./YouTubeAnalysisFilters";
import { YouTubeChannelComparison } from "./YouTubeChannelComparison";
import { YouTubeTrendAnalysis } from "./YouTubeTrendAnalysis";
import { YouTubeDurationAnalysis } from "./YouTubeDurationAnalysis";
import { YouTubePostingBehavior } from "./YouTubePostingBehavior";
import { TranslatedTitle } from "./TranslatedTitle";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface YouTubeVideoAnalyticsProps {
  videos: YouTubeVideo[];
  allVideos: YouTubeVideo[];
  loading: boolean;
  period: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  customDateRange: { start: Date; end: Date } | null;
  onCustomDateChange: (range: { start: Date; end: Date } | null) => void;
  selectedChannelIds: string[];
  onChannelSelect: (ids: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
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
  channels: YouTubeChannel[];
  onRefreshAnalysis?: () => Promise<void>;
  refreshing?: boolean;
}

export function YouTubeVideoAnalytics({
  videos,
  allVideos,
  loading,
  period,
  onPeriodChange,
  customDateRange,
  onCustomDateChange,
  selectedChannelIds,
  onChannelSelect,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  metrics,
  topByViews,
  topByEngagement,
  onCreateScript,
  channels,
  onRefreshAnalysis,
  refreshing,
}: YouTubeVideoAnalyticsProps) {
  const [analysisTab, setAnalysisTab] = useState("ranking");
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'videos' | 'shorts'>('all');

  const filteredByContentType = videos.filter((v) => {
    if (contentTypeFilter === 'shorts') return (v.duration_seconds ?? 0) <= 60;
    if (contentTypeFilter === 'videos') return (v.duration_seconds ?? 0) > 60;
    return true;
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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

  if (allVideos.length === 0) {
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <YouTubeAnalysisFilters
                channels={channels}
                selectedChannelIds={selectedChannelIds}
                onChannelSelect={onChannelSelect}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                period={period}
                onPeriodChange={onPeriodChange}
                customDateRange={customDateRange}
                onCustomDateChange={onCustomDateChange}
                sortBy={sortBy}
                onSortChange={(s) => onSortChange(s as SortOption)}
              />
              {onRefreshAnalysis && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshAnalysis}
                  disabled={refreshing || channels.length === 0}
                  className="flex items-center gap-2 shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Analisando...' : 'Refazer Análise'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vídeos</p>
                <p className="text-2xl font-bold">{metrics.totalVideos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <p className="text-sm text-muted-foreground">Engajamento</p>
                <p className="text-2xl font-bold">{metrics.avgEngagementRate.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs value={analysisTab} onValueChange={setAnalysisTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Ranking</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Canais</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            <span className="hidden sm:inline">Tendências</span>
          </TabsTrigger>
          <TabsTrigger value="duration" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Duração</span>
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Comportamento</span>
          </TabsTrigger>
        </TabsList>

        {/* Ranking Tab */}
        <TabsContent value="ranking" className="mt-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
               <CardTitle>Vídeos de Maior Destaque</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {/* Content type filter */}
                  <div className="flex items-center gap-1 mr-2 border-r pr-3">
                    <Button
                      size="sm"
                      variant={contentTypeFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setContentTypeFilter('all')}
                      className="h-7 text-xs"
                    >
                      Todos
                    </Button>
                    <Button
                      size="sm"
                      variant={contentTypeFilter === 'videos' ? 'default' : 'outline'}
                      onClick={() => setContentTypeFilter('videos')}
                      className="h-7 text-xs flex items-center gap-1"
                    >
                      <Film className="h-3.5 w-3.5" />
                      Vídeos
                    </Button>
                    <Button
                      size="sm"
                      variant={contentTypeFilter === 'shorts' ? 'default' : 'outline'}
                      onClick={() => setContentTypeFilter('shorts')}
                      className="h-7 text-xs flex items-center gap-1"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Shorts
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant={sortBy === 'engagement' ? 'default' : 'outline'}
                    onClick={() => onSortChange('engagement')}
                    className="flex items-center gap-1.5"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Engajamento
                  </Button>
                  <Button
                    size="sm"
                    variant={sortBy === 'views' ? 'default' : 'outline'}
                    onClick={() => onSortChange('views')}
                    className="flex items-center gap-1.5"
                  >
                    <Eye className="h-4 w-4" />
                    Views
                  </Button>
                  <Button
                    size="sm"
                    variant={sortBy === 'likes' ? 'default' : 'outline'}
                    onClick={() => onSortChange('likes')}
                    className="flex items-center gap-1.5"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Curtidas
                  </Button>
                  <Button
                    size="sm"
                    variant={sortBy === 'comments' ? 'default' : 'outline'}
                    onClick={() => onSortChange('comments')}
                    className="flex items-center gap-1.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Comentários
                  </Button>
                </div>
              </div>
              
              {/* Channel Filter */}
              {channels.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Youtube className="h-4 w-4" />
                    Canal:
                  </span>
                  <Button
                    size="sm"
                    variant={selectedChannelIds.length === 0 ? 'default' : 'outline'}
                    onClick={() => onChannelSelect([])}
                    className="h-7 text-xs"
                  >
                    Todos
                  </Button>
                  {channels.map((channel) => (
                    <Button
                      key={channel.id}
                      size="sm"
                      variant={selectedChannelIds.includes(channel.id) ? 'default' : 'outline'}
                      onClick={() => {
                        if (selectedChannelIds.includes(channel.id)) {
                          onChannelSelect(selectedChannelIds.filter(id => id !== channel.id));
                        } else {
                          onChannelSelect([...selectedChannelIds, channel.id]);
                        }
                      }}
                      className="h-7 text-xs flex items-center gap-1.5"
                    >
                      {channel.thumbnail_url && (
                        <img 
                          src={channel.thumbnail_url} 
                          alt={channel.channel_name}
                          className="h-4 w-4 rounded-full"
                        />
                      )}
                      {channel.channel_name}
                      {selectedChannelIds.includes(channel.id) && (
                        <X className="h-3 w-3 ml-0.5" />
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {videos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum vídeo encontrado com os filtros atuais
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredByContentType.slice(0, 15).map((video, index) => (
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
                        <TranslatedTitle 
                          title={video.title} 
                          className="font-medium"
                        />
                        {video.channel_name && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {video.channel_name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className={`flex items-center gap-1 ${sortBy === 'views' ? 'text-primary font-semibold' : ''}`}>
                            <Eye className="h-3.5 w-3.5" />
                            {formatNumber(video.view_count)}
                          </span>
                          <span className={`flex items-center gap-1 ${sortBy === 'likes' ? 'text-primary font-semibold' : ''}`}>
                            <ThumbsUp className="h-3.5 w-3.5" />
                            {formatNumber(video.like_count)}
                          </span>
                          <span className={`flex items-center gap-1 ${sortBy === 'comments' ? 'text-primary font-semibold' : ''}`}>
                            <MessageCircle className="h-3.5 w-3.5" />
                            {formatNumber(video.comment_count)}
                          </span>
                          <Badge variant={sortBy === 'engagement' ? 'default' : 'secondary'}>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Comparison Tab */}
        <TabsContent value="channels" className="mt-6">
          <YouTubeChannelComparison videos={videos} channels={channels} />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="mt-6">
          <YouTubeTrendAnalysis videos={videos} />
        </TabsContent>

        {/* Duration Tab */}
        <TabsContent value="duration" className="mt-6">
          <YouTubeDurationAnalysis videos={videos} />
        </TabsContent>

        {/* Posting Behavior Tab */}
        <TabsContent value="behavior" className="mt-6">
          <YouTubePostingBehavior videos={videos} channels={channels} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
