import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { YouTubeVideo } from "@/hooks/useYouTubeAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";
import { Hash, Clock, Calendar, TrendingUp } from "lucide-react";
import { format, parseISO, getDay, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";

interface YouTubeTrendAnalysisProps {
  videos: YouTubeVideo[];
}

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function YouTubeTrendAnalysis({ videos }: YouTubeTrendAnalysisProps) {
  // Extract keywords from titles
  const keywordStats = useMemo(() => {
    const stopWords = new Set([
      "o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos",
      "em", "na", "no", "nas", "nos", "por", "para", "com", "sem", "que", "como",
      "e", "ou", "mas", "se", "the", "to", "and", "of", "in", "is", "it", "you", "i",
      "this", "that", "for", "on", "with", "are", "be", "at", "have", "from", "not",
      "|", "-", "–", "—", ":", "?", "!", "#", "@", "&",
    ]);

    const keywordMap = new Map<string, { count: number; totalEngagement: number; totalViews: number }>();

    videos.forEach((video) => {
      const words = video.title
        .toLowerCase()
        .replace(/[^\w\sáàãâéèêíìîóòõôúùûç]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

      words.forEach((word) => {
        const existing = keywordMap.get(word) || { count: 0, totalEngagement: 0, totalViews: 0 };
        keywordMap.set(word, {
          count: existing.count + 1,
          totalEngagement: existing.totalEngagement + (video.engagement_rate || 0),
          totalViews: existing.totalViews + video.view_count,
        });
      });
    });

    return Array.from(keywordMap.entries())
      .map(([keyword, stats]) => ({
        keyword,
        count: stats.count,
        avgEngagement: stats.totalEngagement / stats.count,
        avgViews: stats.totalViews / stats.count,
      }))
      .filter((k) => k.count >= 2) // At least 2 occurrences
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 20);
  }, [videos]);

  // Performance by day of week
  const dayOfWeekStats = useMemo(() => {
    const dayMap = new Map<number, { count: number; totalEngagement: number; totalViews: number }>();

    videos.forEach((video) => {
      const day = getDay(parseISO(video.published_at));
      const existing = dayMap.get(day) || { count: 0, totalEngagement: 0, totalViews: 0 };
      dayMap.set(day, {
        count: existing.count + 1,
        totalEngagement: existing.totalEngagement + (video.engagement_rate || 0),
        totalViews: existing.totalViews + video.view_count,
      });
    });

    return Array.from(dayMap.entries())
      .map(([day, stats]) => ({
        day,
        dayName: dayNames[day],
        count: stats.count,
        avgEngagement: stats.count > 0 ? stats.totalEngagement / stats.count : 0,
        avgViews: stats.count > 0 ? stats.totalViews / stats.count : 0,
      }))
      .sort((a, b) => a.day - b.day);
  }, [videos]);

  // Performance by hour
  const hourStats = useMemo(() => {
    const hourMap = new Map<number, { count: number; totalEngagement: number; totalViews: number }>();

    videos.forEach((video) => {
      const hour = getHours(parseISO(video.published_at));
      const existing = hourMap.get(hour) || { count: 0, totalEngagement: 0, totalViews: 0 };
      hourMap.set(hour, {
        count: existing.count + 1,
        totalEngagement: existing.totalEngagement + (video.engagement_rate || 0),
        totalViews: existing.totalViews + video.view_count,
      });
    });

    return Array.from(hourMap.entries())
      .map(([hour, stats]) => ({
        hour,
        hourLabel: `${hour.toString().padStart(2, "0")}h`,
        count: stats.count,
        avgEngagement: stats.count > 0 ? stats.totalEngagement / stats.count : 0,
        avgViews: stats.count > 0 ? stats.totalViews / stats.count : 0,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [videos]);

  // Performance over time (by week)
  const timelineStats = useMemo(() => {
    const weekMap = new Map<string, { count: number; totalEngagement: number; totalViews: number }>();

    videos.forEach((video) => {
      const date = parseISO(video.published_at);
      const weekKey = format(date, "yyyy-'W'ww");
      const existing = weekMap.get(weekKey) || { count: 0, totalEngagement: 0, totalViews: 0 };
      weekMap.set(weekKey, {
        count: existing.count + 1,
        totalEngagement: existing.totalEngagement + (video.engagement_rate || 0),
        totalViews: existing.totalViews + video.view_count,
      });
    });

    return Array.from(weekMap.entries())
      .map(([week, stats]) => ({
        week,
        count: stats.count,
        avgEngagement: stats.count > 0 ? stats.totalEngagement / stats.count : 0,
        totalViews: stats.totalViews,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
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
          <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sem dados suficientes para análise de tendências</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Keywords with best engagement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Palavras-chave com Maior Engajamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {keywordStats.slice(0, 15).map((kw, index) => (
              <Badge
                key={kw.keyword}
                variant={index < 3 ? "default" : "secondary"}
                className="text-sm py-1 px-3"
              >
                {kw.keyword}
                <span className="ml-1.5 opacity-70">({kw.avgEngagement.toFixed(1)}%)</span>
              </Badge>
            ))}
          </div>
          {keywordStats.length === 0 && (
            <p className="text-sm text-muted-foreground">Adicione mais vídeos para análise de palavras-chave</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Performance por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayName" />
                  <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "avgEngagement" ? `${value.toFixed(2)}%` : formatNumber(value),
                      name === "avgEngagement" ? "Engajamento Médio" : "Views Médias",
                    ]}
                  />
                  <Bar dataKey="avgEngagement" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Best Hour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Performance por Horário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hourLabel" />
                  <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Engajamento Médio"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgEngagement"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução do Engajamento ao Longo do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis yAxisId="left" tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={formatNumber} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "avgEngagement" ? `${value.toFixed(2)}%` : formatNumber(value),
                    name === "avgEngagement" ? "Engajamento Médio" : "Total de Views",
                  ]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgEngagement"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalViews"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
