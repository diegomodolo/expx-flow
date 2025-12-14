import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Eye, Users, UserPlus, MousePointerClick } from "lucide-react";

interface ComparisonData {
  reach_change_pct: number;
  impressions_change_pct: number;
  profile_views_change_pct: number;
  website_clicks_change_pct: number;
  followers_gained: number;
}

interface ComparisonCardProps {
  data: ComparisonData;
}

function MetricComparison({
  icon: Icon,
  label,
  value,
  isPercentage = true,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  isPercentage?: boolean;
}) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const colorClass = isNeutral 
    ? 'text-muted-foreground' 
    : isPositive 
      ? 'text-success' 
      : 'text-destructive';
  
  const bgColorClass = isNeutral 
    ? 'bg-muted' 
    : isPositive 
      ? 'bg-success/10' 
      : 'bg-destructive/10';

  const formattedValue = isPercentage 
    ? `${isPositive ? '+' : ''}${value.toFixed(1)}%`
    : `${isPositive ? '+' : ''}${value}`;

  return (
    <div className={`${bgColorClass} rounded-xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-label-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <TrendIcon className={`h-5 w-5 ${colorClass}`} />
        <span className={`text-title-md ${colorClass}`}>{formattedValue}</span>
      </div>
    </div>
  );
}

export function ComparisonCard({ data }: ComparisonCardProps) {
  return (
    <Card className="bg-card border-0 shadow-google-sm rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-title-md text-foreground">Comparativo de Performance</h3>
        <span className="text-label-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
          Últimos 7 dias vs 7 dias anteriores
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricComparison
          icon={Eye}
          label="Alcance"
          value={data.reach_change_pct}
        />
        <MetricComparison
          icon={TrendingUp}
          label="Impressões"
          value={data.impressions_change_pct}
        />
        <MetricComparison
          icon={UserPlus}
          label="Visitas ao Perfil"
          value={data.profile_views_change_pct}
        />
        <MetricComparison
          icon={MousePointerClick}
          label="Cliques no Link"
          value={data.website_clicks_change_pct}
        />
        <MetricComparison
          icon={Users}
          label="Seguidores"
          value={data.followers_gained}
          isPercentage={false}
        />
      </div>
    </Card>
  );
}
