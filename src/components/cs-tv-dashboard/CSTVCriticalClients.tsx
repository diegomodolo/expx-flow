import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Heart, Phone, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CriticalClient {
  id: string;
  name: string;
  avatar: string | null;
  healthScore: number | null;
  riskLevel: string;
  financialScore: number | null;
  operationalScore: number | null;
  relationalScore: number | null;
  npsScore: number | null;
  lastCsContact: string | null;
}

interface CSTVCriticalClientsProps {
  clients: CriticalClient[];
}

export function CSTVCriticalClients({ clients }: CSTVCriticalClientsProps) {
  const getRiskBadgeStyle = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'medium': return 'Médio';
      default: return 'Baixo';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (clients.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Clientes em Alerta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Heart className="w-12 h-12 text-emerald-500 mb-4" />
            <p className="text-lg font-medium text-foreground">Todos os clientes estão saudáveis!</p>
            <p className="text-sm text-muted-foreground">Nenhum cliente em risco crítico ou alto.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Clientes em Alerta
          <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500/20">
            {clients.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {clients.map((client) => (
            <div 
              key={client.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl transition-all",
                client.riskLevel === 'critical' 
                  ? "bg-red-500/5 border border-red-500/20" 
                  : "bg-orange-500/5 border border-orange-500/20"
              )}
            >
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarImage src={client.avatar || undefined} alt={client.name} />
                <AvatarFallback className="bg-muted text-foreground font-medium">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground truncate">{client.name}</p>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs shrink-0", getRiskBadgeStyle(client.riskLevel))}
                  >
                    {getRiskLabel(client.riskLevel)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{client.healthScore ?? '-'}/100</span>
                  </div>
                  {client.npsScore !== null && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span>NPS: {client.npsScore}</span>
                    </div>
                  )}
                  {client.lastCsContact && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>
                        {formatDistanceToNow(new Date(client.lastCsContact), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <p className={cn(
                  "text-2xl font-bold",
                  (client.healthScore ?? 0) < 40 ? "text-red-500" : 
                  (client.healthScore ?? 0) < 60 ? "text-orange-500" : "text-amber-500"
                )}>
                  {client.healthScore ?? '-'}
                </p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
