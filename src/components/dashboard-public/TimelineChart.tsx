import { Card } from "@/components/ui/card";
import { TimelineDataPoint } from "@/hooks/useClientDashboard";
import { useEffect, useState } from "react";
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
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [data]);

  return (
    <Card className="p-4 bg-card border-0 shadow-google-sm rounded-xl animate-fade-in">
      <h3 className="text-title-md text-foreground mb-4">Leads e Mensagens ao Longo do Tempo</h3>
      <div key={animateKey} className="animate-scale-in">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 1px 3px 0 rgb(60 64 67 / 0.3), 0 4px 8px 3px rgb(60 64 67 / 0.15)'
              }}
              animationDuration={200}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line 
              type="monotone" 
              dataKey="leads" 
              stroke="hsl(var(--success))" 
              strokeWidth={2}
              name="Leads"
              dot={{ fill: 'hsl(var(--success))', r: 3 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Line 
              type="monotone" 
              dataKey="messages" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Mensagens"
              dot={{ fill: 'hsl(var(--primary))', r: 3 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
