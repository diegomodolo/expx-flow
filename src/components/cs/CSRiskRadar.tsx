import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertTriangle, 
  Phone, 
  Calendar, 
  MessageSquare,
  ChevronRight,
  Flame
} from 'lucide-react';
import { HealthScore360Data } from '@/hooks/useCSHealthScore360';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CSRiskRadarProps {
  clients: HealthScore360Data[];
  isLoading: boolean;
}

export function CSRiskRadar({ clients, isLoading }: CSRiskRadarProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6 h-32 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6 text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <span className="text-3xl">🎉</span>
          </div>
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
            Nenhum cliente em risco!
          </h3>
          <p className="text-green-600 dark:text-green-400">
            Todos os clientes estão com saúde estável. Continue o bom trabalho!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <Flame className="h-5 w-5 animate-pulse" />
            Clientes em Risco de Churn
            <Badge variant="destructive" className="ml-2">{clients.length}</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((client) => (
          <Card 
            key={client.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg',
              client.churnRiskLevel === 'critical' 
                ? 'border-red-300 bg-red-50/80 dark:bg-red-950/30 animate-pulse-slow' 
                : 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20'
            )}
            onClick={() => navigate(`/clientes/${client.clientId}/cs`)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border-2 border-red-200">
                  <AvatarImage src={client.clientAvatar || undefined} />
                  <AvatarFallback className="bg-red-100 text-red-700">
                    {client.clientName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{client.clientName}</h3>
                    <Badge 
                      variant={client.churnRiskLevel === 'critical' ? 'destructive' : 'outline'}
                      className="shrink-0"
                    >
                      {client.churnRiskLevel === 'critical' ? 'Crítico' : 'Alto Risco'}
                    </Badge>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className={cn(
                        'font-bold',
                        client.healthScoreTotal < 40 ? 'text-red-600' : 'text-orange-600'
                      )}>
                        {client.healthScoreTotal}%
                      </span>
                      <span>Saúde</span>
                    </span>
                    {client.npsScore !== null && (
                      <span className="flex items-center gap-1">
                        NPS: <span className={cn(
                          'font-bold',
                          client.npsScore <= 6 ? 'text-red-600' : client.npsScore <= 8 ? 'text-yellow-600' : 'text-green-600'
                        )}>{client.npsScore}</span>
                      </span>
                    )}
                  </div>

                  {/* Fatores de Risco */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {client.riskFactors.slice(0, 2).map((factor, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-red-100/50 border-red-200 text-red-700">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {factor}
                      </Badge>
                    ))}
                    {client.riskFactors.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{client.riskFactors.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>

              {/* Ações Rápidas */}
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); }}>
                  <Phone className="h-3 w-3 mr-1" />
                  Ligar
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); }}>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); }}>
                  <Calendar className="h-3 w-3 mr-1" />
                  Reunião
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
