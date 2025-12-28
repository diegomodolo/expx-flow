import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { DollarSign } from "lucide-react";

interface PlatformData {
  platform: string;
  spend: number;
  percentage: number;
}

interface TVPlatformChartProps {
  data: PlatformData[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const platformLabels: Record<string, string> = {
  'Meta': 'Meta',
  'Facebook': 'Meta',
  'Instagram': 'Meta',
  'Google': 'Google',
  'Google Ads': 'Google',
  'TikTok': 'TikTok',
  'LinkedIn': 'LinkedIn',
  'Twitter': 'Twitter',
  'Outros': 'Outros'
};

export function TVPlatformChart({ data }: TVPlatformChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl p-3 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Investimento por Plataforma</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
          <DollarSign className="h-8 w-8 mb-1 opacity-30" />
          <p className="text-xs">Sem dados de investimento</p>
        </div>
      </div>
    );
  }

  // Normalize platform names and aggregate
  const aggregatedData = data.reduce((acc, item) => {
    const normalizedPlatform = platformLabels[item.platform] || item.platform;
    const existing = acc.find(a => a.platform === normalizedPlatform);
    if (existing) {
      existing.spend += item.spend;
      existing.percentage += item.percentage;
    } else {
      acc.push({ ...item, platform: normalizedPlatform });
    }
    return acc;
  }, [] as PlatformData[]);

  const chartData = aggregatedData.map((item, index) => ({
    name: item.platform,
    value: item.spend,
    percentage: item.percentage,
    color: COLORS[index % COLORS.length]
  }));

  const totalSpend = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Invest. por Plataforma</h2>
      </div>
      
      <div className="flex-1 flex items-center min-h-0">
        <div className="w-1/2 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="w-1/2 space-y-1 pl-2">
          {chartData.slice(0, 4).map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: item.color }} 
              />
              <span className="text-[10px] truncate flex-1">{item.name}</span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {item.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
          <div className="pt-1 border-t border-border">
            <p className="text-[9px] text-muted-foreground">Total</p>
            <p className="text-xs font-bold text-primary">
              R$ {(totalSpend / 1000).toFixed(1)}k
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
