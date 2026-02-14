import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTubeVideo } from "@/hooks/useYouTubeAnalytics";
import { YouTubeChannel } from "@/hooks/useYouTubeChannels";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays,
  Clock,
  Film,
  TrendingUp,
  Loader2,
  Sparkles,
  BarChart3,
  Timer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import ReactMarkdown from "react-markdown";

interface YouTubePostingBehaviorProps {
  videos: YouTubeVideo[];
  channels: YouTubeChannel[];
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}h`);

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1, 220 70% 50%))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

function classifyDuration(seconds: number | null): string {
  if (!seconds) return "Desconhecido";
  if (seconds <= 60) return "Shorts (≤1min)";
  if (seconds <= 300) return "Curto (1-5min)";
  if (seconds <= 900) return "Médio (5-15min)";
  if (seconds <= 1800) return "Longo (15-30min)";
  return "Muito Longo (30min+)";
}

export function YouTubePostingBehavior({
  videos,
  channels,
}: YouTubePostingBehaviorProps) {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // --- Frequency analysis ---
  const frequencyData = useMemo(() => {
    if (videos.length === 0) return null;

    const dates = videos.map((v) => new Date(v.published_at));
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const daySpan =
      Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86400000));

    const weekdayCounts = Array(7).fill(0);
    const weekdayEngagement = Array(7).fill(0);
    const weekdayEngCount = Array(7).fill(0);

    dates.forEach((d, i) => {
      const wd = d.getDay();
      weekdayCounts[wd]++;
      if (videos[i].engagement_rate) {
        weekdayEngagement[wd] += videos[i].engagement_rate!;
        weekdayEngCount[wd]++;
      }
    });

    const weekdayData = WEEKDAY_LABELS.map((label, i) => ({
      name: label,
      videos: weekdayCounts[i],
      avgEngagement:
        weekdayEngCount[i] > 0
          ? +(weekdayEngagement[i] / weekdayEngCount[i]).toFixed(2)
          : 0,
    }));

    const videosPerDay = +(videos.length / daySpan).toFixed(2);
    const videosPerWeek = +(videos.length / (daySpan / 7)).toFixed(1);

    const mostActiveDay =
      weekdayData.reduce((a, b) => (b.videos > a.videos ? b : a)).name;

    return { weekdayData, videosPerDay, videosPerWeek, mostActiveDay, totalVideos: videos.length };
  }, [videos]);

  // --- Hour analysis ---
  const hourData = useMemo(() => {
    if (videos.length === 0) return null;

    const hourCounts = Array(24).fill(0);
    const hourEngagement = Array(24).fill(0);
    const hourEngCount = Array(24).fill(0);

    videos.forEach((v) => {
      const h = new Date(v.published_at).getHours();
      hourCounts[h]++;
      if (v.engagement_rate) {
        hourEngagement[h] += v.engagement_rate;
        hourEngCount[h]++;
      }
    });

    const data = HOUR_LABELS.map((label, i) => ({
      name: label,
      videos: hourCounts[i],
      avgEngagement:
        hourEngCount[i] > 0
          ? +(hourEngagement[i] / hourEngCount[i]).toFixed(2)
          : 0,
    }));

    const peakHour = data.reduce((a, b) => (b.videos > a.videos ? b : a)).name;
    const bestEngHour = data
      .filter((d) => d.avgEngagement > 0)
      .reduce((a, b) => (b.avgEngagement > a.avgEngagement ? b : a), data[0])?.name;

    return { data, peakHour, bestEngHour };
  }, [videos]);

  // --- Content type analysis ---
  const contentTypeData = useMemo(() => {
    if (videos.length === 0) return null;

    const typeCounts: Record<string, number> = {};
    const typeEngagement: Record<string, { sum: number; count: number }> = {};

    videos.forEach((v) => {
      const type = classifyDuration(v.duration_seconds);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      if (!typeEngagement[type]) typeEngagement[type] = { sum: 0, count: 0 };
      if (v.engagement_rate) {
        typeEngagement[type].sum += v.engagement_rate;
        typeEngagement[type].count++;
      }
    });

    const pieData = Object.entries(typeCounts).map(([name, value]) => ({
      name,
      value,
      avgEngagement:
        typeEngagement[name]?.count > 0
          ? +(typeEngagement[name].sum / typeEngagement[name].count).toFixed(2)
          : 0,
    }));

    const mostCommonType = pieData.reduce((a, b) =>
      b.value > a.value ? b : a
    ).name;

    return { pieData, mostCommonType };
  }, [videos]);

  // --- Per-channel summary ---
  const channelSummary = useMemo(() => {
    if (videos.length === 0 || channels.length === 0) return [];

    return channels.map((ch) => {
      const chVideos = videos.filter((v) => v.channel_id === ch.id);
      if (chVideos.length === 0) return null;

      const dates = chVideos.map((v) => new Date(v.published_at));
      const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
      const daySpan = Math.max(
        1,
        Math.ceil((sorted[sorted.length - 1].getTime() - sorted[0].getTime()) / 86400000)
      );

      const hourCounts = Array(24).fill(0);
      dates.forEach((d) => hourCounts[d.getHours()]++);
      const peakHourIdx = hourCounts.indexOf(Math.max(...hourCounts));

      const avgDuration =
        chVideos.reduce((s, v) => s + (v.duration_seconds || 0), 0) / chVideos.length;

      return {
        channelName: ch.channel_name,
        thumbnail: ch.thumbnail_url,
        videoCount: chVideos.length,
        videosPerWeek: +((chVideos.length / daySpan) * 7).toFixed(1),
        peakHour: `${peakHourIdx}h`,
        avgDurationMin: +(avgDuration / 60).toFixed(1),
        mostCommonType: classifyDuration(avgDuration),
        avgEngagement: +(
          chVideos.reduce((s, v) => s + (v.engagement_rate || 0), 0) / chVideos.length
        ).toFixed(2),
      };
    }).filter(Boolean);
  }, [videos, channels]);

  // --- AI Report ---
  const generateAiReport = async () => {
    setGeneratingReport(true);
    setAiReport(null);

    try {
      const summaryData = {
        totalVideos: videos.length,
        channels: channelSummary,
        frequency: frequencyData
          ? {
              videosPerDay: frequencyData.videosPerDay,
              videosPerWeek: frequencyData.videosPerWeek,
              mostActiveDay: frequencyData.mostActiveDay,
            }
          : null,
        peakHour: hourData?.peakHour,
        bestEngagementHour: hourData?.bestEngHour,
        contentTypes: contentTypeData?.pieData,
      };

      const { data, error } = await supabase.functions.invoke(
        "youtube-posting-behavior-report",
        { body: { summaryData } }
      );

      if (error) throw error;
      setAiReport(data?.report || "Não foi possível gerar o relatório.");
    } catch (err: any) {
      console.error("Error generating AI report:", err);
      setAiReport("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setGeneratingReport(false);
    }
  };

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-40 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">Sem dados suficientes</p>
          <p className="text-sm text-muted-foreground">
            Adicione canais e aguarde a coleta de vídeos para analisar o comportamento de postagem.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vídeos/semana</p>
                <p className="text-2xl font-bold">
                  {frequencyData?.videosPerWeek ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horário de pico</p>
                <p className="text-2xl font-bold">{hourData?.peakHour ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Film className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo mais comum</p>
                <p className="text-lg font-bold truncate">
                  {contentTypeData?.mostCommonType ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Melhor engajamento</p>
                <p className="text-2xl font-bold">{hourData?.bestEngHour ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Weekday + Hours */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Postagens por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={frequencyData?.weekdayData || []}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "videos" ? `${value} vídeos` : `${value}%`,
                    name === "videos" ? "Vídeos" : "Eng. Médio",
                  ]}
                />
                <Bar dataKey="videos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Postagens por Horário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourData?.data || []}>
                <XAxis dataKey="name" fontSize={10} interval={1} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "videos" ? `${value} vídeos` : `${value}%`,
                    name === "videos" ? "Vídeos" : "Eng. Médio",
                  ]}
                />
                <Bar dataKey="videos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {(hourData?.data || []).map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.name === hourData?.peakHour
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground) / 0.3)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Content Types + Channel Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="h-4 w-4" />
              Tipos de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={contentTypeData?.pieData || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                  fontSize={11}
                >
                  {(contentTypeData?.pieData || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} vídeos`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Resumo por Canal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {channelSummary.map((ch: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  {ch.thumbnail && (
                    <img
                      src={ch.thumbnail}
                      alt={ch.channelName}
                      className="h-8 w-8 rounded-full shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {ch.channelName}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span>{ch.videosPerWeek} vídeos/sem</span>
                      <span>Pico: {ch.peakHour}</span>
                      <span>~{ch.avgDurationMin}min</span>
                      <span>{ch.avgEngagement}% eng.</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {ch.videoCount} vídeos
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Relatório de IA — Comportamento de Postagem
            </CardTitle>
            <Button
              size="sm"
              onClick={generateAiReport}
              disabled={generatingReport}
            >
              {generatingReport ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {aiReport ? "Regenerar" : "Gerar Relatório"}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {aiReport && (
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{aiReport}</ReactMarkdown>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
