import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineDataPoint {
  date: string;
  value: number;
}

interface SocialTimelineChartProps {
  reachData: TimelineDataPoint[];
  impressionsData: TimelineDataPoint[];
  title?: string;
}

const chartConfig = {
  reach: {
    label: "Alcance",
    color: "hsl(var(--primary))",
  },
  impressions: {
    label: "Impressões",
    color: "hsl(280, 80%, 60%)",
  },
};

export function SocialTimelineChart({ 
  reachData, 
  impressionsData,
  title = "Alcance e Impressões (30 dias)"
}: SocialTimelineChartProps) {
  // Merge data by date
  const mergedData = reachData.map((reach, index) => ({
    date: reach.date,
    reach: reach.value,
    impressions: impressionsData[index]?.value || 0,
  }));

  if (mergedData.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-0 shadow-google-sm rounded-xl p-6">
      <h3 className="text-title-md text-foreground mb-4">{title}</h3>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <LineChart data={mergedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(parseISO(value), "dd/MM", { locale: ptBR })}
            className="text-muted-foreground"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
            className="text-muted-foreground"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => format(parseISO(value as string), "d 'de' MMMM", { locale: ptBR })}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="reach"
            stroke="var(--color-reach)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="impressions"
            stroke="var(--color-impressions)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ChartContainer>
    </Card>
  );
}
