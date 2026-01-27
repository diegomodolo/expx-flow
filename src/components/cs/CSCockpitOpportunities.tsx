import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Gem, 
  TrendingUp, 
  Trophy, 
  RefreshCw, 
  DollarSign,
  Sparkles,
  PartyPopper
} from 'lucide-react';
import { Opportunity } from '@/hooks/useCSCockpitData';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CSCockpitOpportunitiesProps {
  opportunities: Opportunity[];
  isLoading?: boolean;
}

const opportunityTypeConfig = {
  upsell_budget: { icon: DollarSign, label: 'Upsell', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/50' },
  upsell_roas: { icon: TrendingUp, label: 'Expansão', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/50' },
  victory: { icon: Trophy, label: 'Vitória', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/50' },
  renewal: { icon: RefreshCw, label: 'Renovação', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/50' },
};

export function CSCockpitOpportunities({ opportunities, isLoading }: CSCockpitOpportunitiesProps) {
  const navigate = useNavigate();

  const handleAction = (opportunity: Opportunity) => {
    switch (opportunity.primaryAction.action) {
      case 'propose_upsell':
        navigate(`/clientes/${opportunity.clientId}/cs`);
        break;
      case 'celebrate':
        navigate(`/clientes/${opportunity.clientId}/cs`);
        break;
      case 'start_renewal':
        navigate(`/clientes/${opportunity.clientId}`);
        break;
      default:
        navigate(`/clientes/${opportunity.clientId}/cs`);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <Gem className="h-5 w-5" />
            Oportunidades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse h-20 bg-muted/50 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Gem className="h-5 w-5" />
            Oportunidades
          </span>
          {opportunities.length > 0 && (
            <Badge className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              {opportunities.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Buscando oportunidades...</p>
          </div>
        ) : (
          opportunities.map((opportunity) => {
            const config = opportunityTypeConfig[opportunity.type];
            const Icon = config.icon;
            
            return (
              <div
                key={opportunity.id}
                className={cn(
                  "p-3 rounded-lg border transition-all hover:shadow-md",
                  config.bg,
                  "border-amber-200/50 dark:border-amber-800/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                    <AvatarImage src={opportunity.clientAvatar || undefined} />
                    <AvatarFallback className="bg-amber-100 text-amber-700">
                      {opportunity.clientName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
                      <span className="font-medium text-sm truncate">
                        {opportunity.clientName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-0.5">
                      {opportunity.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {opportunity.description}
                    </p>
                    
                    <Button
                      size="sm"
                      className="h-7 text-xs mt-2"
                      onClick={() => handleAction(opportunity)}
                    >
                      {opportunity.type === 'victory' && <PartyPopper className="h-3 w-3 mr-1" />}
                      {opportunity.type === 'upsell_roas' && <TrendingUp className="h-3 w-3 mr-1" />}
                      {opportunity.type === 'upsell_budget' && <DollarSign className="h-3 w-3 mr-1" />}
                      {opportunity.primaryAction.label}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
