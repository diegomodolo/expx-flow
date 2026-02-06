import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { YouTubeVideo } from "@/hooks/useYouTubeAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { Clock, TrendingUp } from "lucide-react";

interface YouTubeDurationAnalysisProps {
  videos: YouTubeVideo[];
}

// Duration buckets
const durationBuckets = [
  { min: 0, max: 60, label: "< 1 min", shortLabel: "<1m" },
  { min: 60, max: 180, label: "1-3 min", shortLabel: "1-3m" },
  { min: 180, max: 300, label: "3-5 min", shortLabel: "3-5m" },
  { min: 300, max: 600, label: "5-10 min", shortLabel: "5-10m" },
  { min: 600, max: 1200, label: "10-20 min", shortLabel: "10-20m" },
  { min: 1200, max: 1800, label: "20-30 min", shortLabel: "20-30m" },
  { min: 1800, max: 3600, label: "30-60 min", shortLabel: "30-60m" },
  { min: 3600, max: Infinity, label: "> 60 min", shortLabel: ">60m" },
];

export function YouTubeDurationAnalysis({ videos }: YouTubeDurationAnalysisProps) {
  // Group videos by duration
  const durationStats = useMemo(() => {
    return durationBuckets.map((bucket) => {
      const bucketVideos = videos.filter((v) => {
        const duration = v.duration_seconds || 0;
        return duration >= bucket.min && duration < bucket.max;
      });

      const totalViews = bucketVideos.reduce((sum, v) => sum + v.view_count, 0);
      const totalEngagement = bucketVideos.reduce((sum, v) => sum + (v.engagement_rate || 0), 0);

      return {
        label: bucket.label,
        shortLabel: bucket.shortLabel,
        count: bucketVideos.length,
        avgViews: bucketVideos.length > 0 ? Math.round(totalViews / bucketVideos.length) : 0,
        avgEngagement: bucketVideos.length > 0 ? totalEngagement / bucketVideos.length : 0,
        totalViews,
      };
    }).filter((b) => b.count > 0);
  }, [videos]);

  // Find best performing duration
  const bestDuration = useMemo(() => {
    if (durationStats.length === 0) return null;
    return durationStats.reduce((best, current) =>
      current.avgEngagement > best.avgEngagement ? current : best
    );
  }, [durationStats]);

  // Scatter data for duration vs engagement
  const scatterData = useMemo(() => {
    return videos
      .filter((v) => v.duration_seconds && v.duration_seconds > 0)
      .map((v) => ({
        duration: Math.round((v.duration_seconds || 0) / 60), // Convert to minutes
        engagement: v.engagement_rate || 0,
        views: v.view_count,
        title: v.title,
      }));
  }, [videos]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-40 text-center">
          <Clock className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sem dados suficientes para análise de duração</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Best Duration Insight */}
      {bestDuration && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duração com Melhor Performance</p>
                <p className="text-xl font-bold">{bestDuration.label}</p>
                <p className="text-sm text-muted-foreground">
                  {bestDuration.avgEngagement.toFixed(2)}% engajamento médio • {bestDuration.count} vídeos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Engagement by Duration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engajamento por Duração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortLabel" />
                  <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)}%`,
                      "Engajamento Médio",
                    ]}
                    labelFormatter={(label) => {
                      const stat = durationStats.find((s) => s.shortLabel === label);
                      return stat ? `${stat.label} (${stat.count} vídeos)` : label;
                    }}
                  />
                  <Bar dataKey="avgEngagement" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Views by Duration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Views Médias por Duração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortLabel" />
                  <YAxis tickFormatter={formatNumber} />
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value), "Views Médias"]}
                    labelFormatter={(label) => {
                      const stat = durationStats.find((s) => s.shortLabel === label);
                      return stat ? `${stat.label} (${stat.count} vídeos)` : label;
                    }}
                  />
                  <Bar dataKey="avgViews" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scatter: Duration vs Engagement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Correlação: Duração × Engajamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="duration"
                  name="Duração"
                  unit=" min"
                  label={{ value: "Duração (min)", position: "bottom", offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="engagement"
                  name="Engajamento"
                  unit="%"
                  label={{ value: "Engajamento (%)", angle: -90, position: "insideLeft" }}
                />
                <ZAxis type="number" dataKey="views" range={[50, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: number, name: string) => {
                    if (name === "Duração") return [`${value} min`, name];
                    if (name === "Engajamento") return [`${value.toFixed(2)}%`, name];
                    return [formatNumber(value), "Views"];
                  }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg max-w-xs">
                        <p className="font-medium text-sm truncate">{data.title}</p>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <p>Duração: {data.duration} min</p>
                          <p>Engajamento: {data.engagement.toFixed(2)}%</p>
                          <p>Views: {formatNumber(data.views)}</p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData} fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Duration Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Vídeos por Duração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {durationStats.map((stat) => (
              <Badge key={stat.label} variant="outline" className="py-2 px-3">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                {stat.label}: {stat.count} vídeos
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
