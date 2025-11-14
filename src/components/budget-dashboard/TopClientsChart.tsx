import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BudgetAnalysis } from "@/hooks/useBudgetAnalysis";

interface TopClientsChartProps {
  data: BudgetAnalysis;
}

const getBarColor = (percentage: number) => {
  if (percentage > 100) return '#ef4444';
  if (percentage >= 90) return '#f59e0b';
  return '#10b981';
};

export function TopClientsChart({ data }: TopClientsChartProps) {
  const chartData = [...data.clients]
    .filter(c => c.monthlyBudget > 0)
    .sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
    .slice(0, 10)
    .map(client => ({
      name: client.name.length > 20 ? client.name.substring(0, 20) + '...' : client.name,
      utilization: client.utilizationPercentage,
      color: getBarColor(client.utilizationPercentage),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top 10 Clientes por Utilização</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="%" />
            <YAxis type="category" dataKey="name" width={150} />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Utilização']}
            />
            <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
