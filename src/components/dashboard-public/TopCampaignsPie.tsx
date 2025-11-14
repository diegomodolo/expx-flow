import { Card } from "@/components/ui/card";
import { TopCampaign } from "@/hooks/useClientDashboard";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface TopCampaignsPieProps {
  campaigns: TopCampaign[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];

export const TopCampaignsPie = ({ campaigns }: TopCampaignsPieProps) => {
  const chartData = campaigns.map((campaign, index) => ({
    name: campaign.name.length > 30 ? campaign.name.substring(0, 30) + '...' : campaign.name,
    value: campaign.conversions,
    percentage: campaign.percentage,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="p-4 bg-card border-border">
      <h3 className="text-xl font-semibold text-foreground mb-4">Top Campanhas por Conversões</h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percentage }) => `${percentage.toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[280px] text-muted-foreground">
          Nenhuma campanha com conversões encontrada
        </div>
      )}
    </Card>
  );
};
