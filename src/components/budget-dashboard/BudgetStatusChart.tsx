import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { BudgetAnalysis } from "@/hooks/useBudgetAnalysis";

interface BudgetStatusChartProps {
  data: BudgetAnalysis;
}

const COLORS = {
  critical: '#ef4444',
  warning: '#f59e0b',
  healthy: '#10b981',
  noBudget: '#9ca3af',
};

const STATUS_LABELS = {
  critical: 'Crítico (>100%)',
  warning: 'Atenção (90-100%)',
  healthy: 'Saudável (<90%)',
  noBudget: 'Sem orçamento',
};

export function BudgetStatusChart({ data }: BudgetStatusChartProps) {
  const chartData = [
    { name: STATUS_LABELS.critical, value: data.statusDistribution.critical, color: COLORS.critical },
    { name: STATUS_LABELS.warning, value: data.statusDistribution.warning, color: COLORS.warning },
    { name: STATUS_LABELS.healthy, value: data.statusDistribution.healthy, color: COLORS.healthy },
    { name: STATUS_LABELS.noBudget, value: data.statusDistribution.noBudget, color: COLORS.noBudget },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} clientes`, 'Quantidade']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
