import { TrendingUp, Zap, Target, Expand } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClientOpportunity {
  id: string;
  name: string;
  avatar: string | null;
  opportunityType: 'scale' | 'optimization' | 'expansion';
  message: string;
  potentialGain: string;
  currentValue: string;
}

interface RadarTVOpportunitiesListProps {
  opportunities: ClientOpportunity[];
}

const opportunityTypeConfig = {
  scale: {
    icon: TrendingUp,
    label: 'Escalar',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  optimization: {
    icon: Target,
    label: 'Otimizar',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  expansion: {
    icon: Expand,
    label: 'Expandir',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  }
};

export function RadarTVOpportunitiesList({ opportunities }: RadarTVOpportunitiesListProps) {
  if (opportunities.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <TrendingUp className="h-12 w-12 opacity-20" />
          <p>Nenhuma oportunidade identificada</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-green-500" />
        <h3 className="font-semibold text-lg">Oportunidades Detectadas</h3>
        <Badge className="ml-auto bg-green-500/20 text-green-600 hover:bg-green-500/30">
          {opportunities.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {opportunities.map((opportunity, index) => {
          const config = opportunityTypeConfig[opportunity.opportunityType];
          const Icon = config.icon;

          return (
            <div
              key={`${opportunity.id}-${opportunity.opportunityType}-${index}`}
              className={cn(
                "p-4 rounded-xl border-2 transition-all hover:scale-[1.02]",
                config.borderColor,
                config.bgColor
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={opportunity.avatar || undefined} />
                  <AvatarFallback className="bg-muted text-xs">
                    {opportunity.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{opportunity.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-1">
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    <Badge 
                      variant="secondary"
                      className={cn("text-[10px] px-1.5 py-0", config.bgColor, config.color)}
                    >
                      {config.label}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {opportunity.message}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {opportunity.currentValue}
                    </p>
                    <p className={cn("text-xs font-bold", config.color)}>
                      {opportunity.potentialGain}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
