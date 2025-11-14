import { Card } from "@/components/ui/card";
import { TimelineDataPoint } from "@/hooks/useClientDashboard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TimelineChartProps {
  data: TimelineDataPoint[];
}

export const TimelineChart = ({ data }: TimelineChartProps) => {
  return (
    <Card className="p-4 bg-card border-border">
      <h3 className="text-xl font-semibold text-foreground mb-4">Leads e Mensagens ao Longo do Tempo</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="leads" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Leads"
            dot={{ fill: '#10b981' }}
          />
          <Line 
            type="monotone" 
            dataKey="messages" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Mensagens"
            dot={{ fill: '#3b82f6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
