import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FollowerDataPoint {
  date: string;
  value: number;
}

interface FollowersGrowthChartProps {
  data: FollowerDataPoint[];
  title?: string;
}

const chartConfig = {
  value: {
    label: "Variação",
  },
};

export function FollowersGrowthChart({ 
  data,
  title = "Variação de Seguidores (30 dias)"
}: FollowersGrowthChartProps) {
  if (data.length === 0) {
    return null;
  }

  // Calculate daily change (difference between consecutive days)
  const chartData = data.map((point, index) => {
    const prevValue = index > 0 ? data[index - 1].value : point.value;
    const change = point.value - prevValue;
    return {
      date: point.date,
      value: change,
      total: point.value,
    };
  }).slice(1); // Remove first element as it has no previous to compare

  const totalGained = chartData.reduce((sum, d) => d.value > 0 ? sum + d.value : sum, 0);
  const totalLost = chartData.reduce((sum, d) => d.value < 0 ? sum + Math.abs(d.value) : sum, 0);
  const netChange = totalGained - totalLost;

  return (
    <Card className="bg-card border-0 shadow-google-sm rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-title-md text-foreground">{title}</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground">+{totalGained}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">-{totalLost}</span>
          </span>
          <span className={`font-medium ${netChange >= 0 ? 'text-success' : 'text-destructive'}`}>
            = {netChange >= 0 ? '+' : ''}{netChange}
          </span>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(parseISO(value), "dd/MM", { locale: ptBR })}
            className="text-muted-foreground"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            className="text-muted-foreground"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => format(parseISO(value as string), "d 'de' MMMM", { locale: ptBR })}
                formatter={(value, name) => {
                  const numValue = Number(value);
                  return [
                    <span key="value" className={numValue >= 0 ? 'text-success' : 'text-destructive'}>
                      {numValue >= 0 ? '+' : ''}{numValue} seguidores
                    </span>,
                    ''
                  ];
                }}
              />
            }
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </Card>
  );
}
