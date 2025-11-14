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
    <Card className="p-4 bg-card border-border animate-fade-in">
      <h3 className="text-xl font-semibold text-foreground mb-4 transition-colors duration-300">Leads e Mensagens ao Longo do Tempo</h3>
      <div key={animateKey} className="animate-scale-in">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" className="transition-opacity duration-500" />
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
              animationDuration={300}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="leads" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Leads"
              dot={{ fill: '#10b981' }}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
            <Line 
              type="monotone" 
              dataKey="messages" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Mensagens"
              dot={{ fill: '#3b82f6' }}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
