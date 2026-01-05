import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingDown, Wallet, BatteryLow, Power } from "lucide-react";

interface RiskDistribution {
  performance: number;
  budget: number;
  balance: number;
  inactive: number;
}

interface RadarTVRiskDistributionProps {
  distribution: RiskDistribution;
}

const RISK_COLORS = {
  performance: '#ef4444',
  budget: '#f97316',
  balance: '#eab308',
  inactive: '#6b7280'
};

const RISK_LABELS = {
  performance: 'Performance',
  budget: 'Orçamento',
  balance: 'Saldo',
  inactive: 'Inatividade'
};

const RISK_ICONS = {
  performance: TrendingDown,
  budget: Wallet,
  balance: BatteryLow,
  inactive: Power
};

export function RadarTVRiskDistribution({ distribution }: RadarTVRiskDistributionProps) {
  const total = distribution.performance + distribution.budget + distribution.balance + distribution.inactive;
  
  if (total === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Distribuição de Riscos</h3>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          Nenhum risco detectado
        </div>
      </Card>
    );
  }

  const data = Object.entries(distribution)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: RISK_LABELS[key as keyof typeof RISK_LABELS],
      value,
      color: RISK_COLORS[key as keyof typeof RISK_COLORS]
    }));

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Distribuição de Riscos</h3>
      
      <div className="flex">
        <div className="w-1/2 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value, 'Alertas']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-1/2 flex flex-col justify-center gap-2">
          {Object.entries(distribution).map(([key, value]) => {
            if (value === 0) return null;
            const Icon = RISK_ICONS[key as keyof typeof RISK_ICONS];
            const color = RISK_COLORS[key as keyof typeof RISK_COLORS];
            const label = RISK_LABELS[key as keyof typeof RISK_LABELS];
            const percentage = ((value / total) * 100).toFixed(0);

            return (
              <div key={key} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                <span className="text-sm flex-1">{label}</span>
                <span className="text-sm font-medium">{value}</span>
                <span className="text-xs text-muted-foreground">({percentage}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
