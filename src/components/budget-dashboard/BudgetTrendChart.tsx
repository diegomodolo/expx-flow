import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, ComposedChart } from "recharts";

interface BudgetTrendChartProps {
  totalBudget: number;
  totalSpend: number;
}

export function BudgetTrendChart({ totalBudget, totalSpend }: BudgetTrendChartProps) {
  // Generate trend data for last 30 days
  const generateTrendData = () => {
    const data = [];
    const daysInMonth = 30;
    const dailyBudget = totalBudget / daysInMonth;
    const currentDay = new Date().getDate();
    
    // Simulate daily spend progression (simplified)
    const dailySpendRate = totalSpend / currentDay;
    
    for (let i = 1; i <= daysInMonth; i++) {
      const expectedBudget = dailyBudget * i;
      const actualSpend = i <= currentDay ? dailySpendRate * i : null;
      
      data.push({
        day: i,
        orcamento: expectedBudget,
        gasto: actualSpend,
        projecao: i > currentDay ? dailySpendRate * i : null,
      });
    }
    
    return data;
  };

  const chartData = generateTrendData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Evolução de Gasto vs. Orçamento</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="day" 
              label={{ value: 'Dia do mês', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="orcamento" 
              stroke="#3b82f6" 
              name="Orçamento Esperado"
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="gasto" 
              stroke="#f97316" 
              name="Gasto Real"
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="projecao" 
              stroke="#f97316" 
              strokeDasharray="5 5"
              name="Projeção"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
