import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTubeVideo } from "@/hooks/useYouTubeAnalytics";
import { YouTubeChannel } from "@/hooks/useYouTubeChannels";
import { DollarSign, Eye, Film, Zap, TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// RPM values in BRL per 1000 views (Brazilian market averages 2026)
const RPM = {
  shorts: { min: 0.15, avg: 0.25, max: 0.35 },       // Shorts (≤60s)
  shortVideos: { min: 2.0, avg: 3.5, max: 5.0 },      // Short videos (1-8 min)
  longVideos: { min: 6.0, avg: 10.0, max: 15.0 },      // Long videos (8+ min)
};

type MonetizationSort = "total" | "long" | "short" | "shorts";

interface ChannelMonetization {
  channelId: string;
  channelName: string;
  thumbnailUrl?: string | null;
  shortsViews: number;
  shortVideoViews: number;
  longVideoViews: number;
  shortsCount: number;
  shortVideoCount: number;
  longVideoCount: number;
  totalViews: number;
  estimateMin: number;
  estimateAvg: number;
  estimateMax: number;
  shortsEstimate: number;
  shortVideoEstimate: number;
  longVideoEstimate: number;
}

interface YouTubeMonetizationRankingProps {
  videos: YouTubeVideo[];
  channels: YouTubeChannel[];
}

export function YouTubeMonetizationRanking({ videos, channels }: YouTubeMonetizationRankingProps) {
  const [sortBy, setSortBy] = useState<MonetizationSort>("total");

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `R$ ${(num / 1000).toFixed(1)}K`;
    return `R$ ${num.toFixed(0)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const calcEstimate = (views: number, rpm: { min: number; avg: number; max: number }) => ({
    min: (views / 1000) * rpm.min,
    avg: (views / 1000) * rpm.avg,
    max: (views / 1000) * rpm.max,
  });

  const channelRanking = useMemo(() => {
    const map = new Map<string, ChannelMonetization>();

    for (const video of videos) {
      const key = video.channel_id;
      const duration = video.duration_seconds ?? 0;
      // Shorts: ≤ 180s, Short videos: 181-480s, Long: > 480s (8 min)
      const isShort = duration > 0 && duration <= 180;
      const isLong = duration > 480;

      const existing = map.get(key);
      if (existing) {
        existing.totalViews += video.view_count;
        if (isShort) {
          existing.shortsViews += video.view_count;
          existing.shortsCount += 1;
        } else if (isLong) {
          existing.longVideoViews += video.view_count;
          existing.longVideoCount += 1;
        } else {
          existing.shortVideoViews += video.view_count;
          existing.shortVideoCount += 1;
        }
      } else {
        const ch = channels.find((c) => c.id === key);
        map.set(key, {
          channelId: key,
          channelName: video.channel_name || ch?.channel_name || "Canal desconhecido",
          thumbnailUrl: ch?.thumbnail_url,
          totalViews: video.view_count,
          shortsViews: isShort ? video.view_count : 0,
          shortVideoViews: !isShort && !isLong ? video.view_count : 0,
          longVideoViews: isLong ? video.view_count : 0,
          shortsCount: isShort ? 1 : 0,
          shortVideoCount: !isShort && !isLong ? 1 : 0,
          longVideoCount: isLong ? 1 : 0,
          estimateMin: 0, estimateAvg: 0, estimateMax: 0,
          shortsEstimate: 0, shortVideoEstimate: 0, longVideoEstimate: 0,
        });
      }
    }

    const results = Array.from(map.values()).map((ch) => {
      const shorts = calcEstimate(ch.shortsViews, RPM.shorts);
      const shortVids = calcEstimate(ch.shortVideoViews, RPM.shortVideos);
      const longVids = calcEstimate(ch.longVideoViews, RPM.longVideos);

      return {
        ...ch,
        shortsEstimate: shorts.avg,
        shortVideoEstimate: shortVids.avg,
        longVideoEstimate: longVids.avg,
        estimateMin: shorts.min + shortVids.min + longVids.min,
        estimateAvg: shorts.avg + shortVids.avg + longVids.avg,
        estimateMax: shorts.max + shortVids.max + longVids.max,
      };
    });

    switch (sortBy) {
      case "total":
        results.sort((a, b) => b.estimateAvg - a.estimateAvg);
        break;
      case "long":
        results.sort((a, b) => b.longVideoEstimate - a.longVideoEstimate);
        break;
      case "short":
        results.sort((a, b) => b.shortVideoEstimate - a.shortVideoEstimate);
        break;
      case "shorts":
        results.sort((a, b) => b.shortsEstimate - a.shortsEstimate);
        break;
    }

    return results;
  }, [videos, channels, sortBy]);

  const totals = useMemo(() => {
    return channelRanking.reduce(
      (acc, ch) => ({
        min: acc.min + ch.estimateMin,
        avg: acc.avg + ch.estimateAvg,
        max: acc.max + ch.estimateMax,
      }),
      { min: 0, avg: 0, max: 0 }
    );
  }, [channelRanking]);

  return (
    <div className="space-y-6">
      {/* Total estimate card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Estimativa Total de Monetização</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Estimativa baseada nos RPMs médios do mercado brasileiro (2026).
                          Shorts: R$ 0,15-0,35/1k views · Vídeos curtos (&lt;8min): R$ 2-5/1k views · Vídeos longos (8+min): R$ 6-15/1k views.
                          Valores reais variam por nicho.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(totals.avg)}</p>
                <p className="text-xs text-muted-foreground">
                  Faixa: {formatCurrency(totals.min)} — {formatCurrency(totals.max)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RPM Reference */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Shorts (≤3 min)</span>
            </div>
            <p className="text-xs text-muted-foreground">RPM: R$ 0,15 — R$ 0,35 / 1k views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Film className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Vídeos Curtos (&lt;8 min)</span>
            </div>
            <p className="text-xs text-muted-foreground">RPM: R$ 2,00 — R$ 5,00 / 1k views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Film className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Vídeos Longos (8+ min)</span>
            </div>
            <p className="text-xs text-muted-foreground">RPM: R$ 6,00 — R$ 15,00 / 1k views</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel ranking */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Ranking por Monetização</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={sortBy === "total" ? "default" : "outline"} onClick={() => setSortBy("total")} className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                Total
              </Button>
              <Button size="sm" variant={sortBy === "long" ? "default" : "outline"} onClick={() => setSortBy("long")} className="flex items-center gap-1.5">
                <Film className="h-4 w-4" />
                Longos
              </Button>
              <Button size="sm" variant={sortBy === "short" ? "default" : "outline"} onClick={() => setSortBy("short")} className="flex items-center gap-1.5">
                <Film className="h-4 w-4" />
                Curtos
              </Button>
              <Button size="sm" variant={sortBy === "shorts" ? "default" : "outline"} onClick={() => setSortBy("shorts")} className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                Shorts
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
                <div key={ch.channelId} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="text-lg font-bold text-muted-foreground w-6 text-center">
                    {index + 1}
                  </div>

                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {ch.thumbnailUrl ? (
                      <img src={ch.thumbnailUrl} alt={ch.channelName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                        {ch.channelName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ch.channelName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(ch.totalViews)} views
                      </span>
                      <span>·</span>
                      <span>{ch.longVideoCount} longos</span>
                      <span>{ch.shortVideoCount} curtos</span>
                      <span>{ch.shortsCount} shorts</span>
                    </div>

                    {/* Monetization breakdown */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {ch.longVideoEstimate > 0 && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Film className="h-3 w-3" />
                          Longos: {formatCurrency(ch.longVideoEstimate)}
                        </Badge>
                      )}
                      {ch.shortVideoEstimate > 0 && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Film className="h-3 w-3" />
                          Curtos: {formatCurrency(ch.shortVideoEstimate)}
                        </Badge>
                      )}
                      {ch.shortsEstimate > 0 && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Zap className="h-3 w-3" />
                          Shorts: {formatCurrency(ch.shortsEstimate)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(ch.estimateAvg)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(ch.estimateMin)} — {formatCurrency(ch.estimateMax)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
