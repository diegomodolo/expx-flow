import { Card } from "@/components/ui/card";
import { TopCampaign } from "@/hooks/useClientDashboard";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useEffect, useState } from "react";

interface TopCampaignsPieProps {
  campaigns: TopCampaign[];
}

// Google-inspired colors
const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(36, 100%, 50%)', 'hsl(4, 90%, 58%)', 'hsl(280, 70%, 50%)'];

export const TopCampaignsPie = ({ campaigns }: TopCampaignsPieProps) => {
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [campaigns]);

  const chartData = campaigns.map((campaign, index) => ({
    name: campaign.name.length > 25 ? campaign.name.substring(0, 25) + '...' : campaign.name,
    value: campaign.conversions,
    percentage: campaign.percentage,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="p-4 bg-card border-0 shadow-google-sm rounded-xl animate-fade-in h-full">
      <h3 className="text-title-md text-foreground mb-3">Top Campanhas por Conversões</h3>
      {chartData.length > 0 ? (
        <div key={animateKey} className="animate-scale-in">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage.toFixed(0)}%`}
                outerRadius={70}
                innerRadius={30}
                fill="#8884d8"
                dataKey="value"
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px 0 rgb(60 64 67 / 0.3), 0 4px 8px 3px rgb(60 64 67 / 0.15)'
                }}
                animationDuration={200}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[240px] text-muted-foreground text-body-md">
          Nenhuma campanha com conversões encontrada
        </div>
      )}
    </Card>
  );
};
