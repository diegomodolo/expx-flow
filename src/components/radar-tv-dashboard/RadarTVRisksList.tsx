import { AlertTriangle, TrendingDown, Wallet, BatteryLow, Power, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClientRisk {
  id: string;
  name: string;
  avatar: string | null;
  riskType: 'performance' | 'budget' | 'balance' | 'inactive';
  severity: 'critical' | 'warning';
  message: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

interface RadarTVRisksListProps {
  risks: ClientRisk[];
}

const riskTypeConfig = {
  performance: {
    icon: TrendingDown,
    label: 'Performance',
    color: 'text-destructive'
  },
  budget: {
    icon: Wallet,
    label: 'Orçamento',
    color: 'text-orange-500'
  },
  balance: {
    icon: BatteryLow,
    label: 'Saldo',
    color: 'text-red-500'
  },
  inactive: {
    icon: Power,
    label: 'Inativo',
    color: 'text-muted-foreground'
  }
};

const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <ArrowUp className="h-3 w-3 text-destructive" />;
  if (trend === 'down') return <ArrowDown className="h-3 w-3 text-destructive" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

export function RadarTVRisksList({ risks }: RadarTVRisksListProps) {
  if (risks.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 opacity-20" />
          <p>Nenhum risco identificado</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-lg">Riscos Detectados</h3>
        <Badge variant="destructive" className="ml-auto">
          {risks.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {risks.map((risk, index) => {
          const config = riskTypeConfig[risk.riskType];
          const Icon = config.icon;

          return (
            <div
              key={`${risk.id}-${risk.riskType}-${index}`}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                risk.severity === 'critical' 
                  ? "border-destructive/50 bg-destructive/5 animate-pulse" 
                  : "border-yellow-500/50 bg-yellow-500/5"
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={risk.avatar || undefined} />
                  <AvatarFallback className="bg-muted text-xs">
                    {risk.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{risk.name}</span>
                    {risk.trend && <TrendIcon trend={risk.trend} />}
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-1">
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    <Badge 
                      variant={risk.severity === 'critical' ? 'destructive' : 'secondary'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {config.label}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {risk.message}
                  </p>
                  
                  <p className={cn(
                    "text-xs font-medium mt-1",
                    risk.severity === 'critical' ? 'text-destructive' : 'text-yellow-600'
                  )}>
                    {risk.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
