import { Card } from "@/components/ui/card";
import { TopCampaign } from "@/hooks/useClientDashboard";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useEffect, useState } from "react";

interface TopCampaignsPieProps {
  campaigns: TopCampaign[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];

export const TopCampaignsPie = ({ campaigns }: TopCampaignsPieProps) => {
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [campaigns]);

  const chartData = campaigns.map((campaign, index) => ({
    name: campaign.name.length > 30 ? campaign.name.substring(0, 30) + '...' : campaign.name,
    value: campaign.conversions,
    percentage: campaign.percentage,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="p-4 bg-card border-border animate-fade-in">
      <h3 className="text-xl font-semibold text-foreground mb-4 transition-colors duration-300">Top Campanhas por Conversões</h3>
      {chartData.length > 0 ? (
        <div key={animateKey} className="animate-scale-in">
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
                animationDuration={1000}
                animationEasing="ease-out"
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
                animationDuration={300}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[280px] text-muted-foreground animate-fade-in">
          Nenhuma campanha com conversões encontrada
        </div>
      )}
    </Card>
  );
};
