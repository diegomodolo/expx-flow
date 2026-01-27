import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flame, AlertTriangle, Phone, MessageCircle, Eye, ExternalLink } from 'lucide-react';
import { FireAlert } from '@/hooks/useCSCockpitData';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CSCockpitFiresProps {
  fires: FireAlert[];
  isLoading?: boolean;
}

const fireTypeConfig = {
  nps_detractor: { icon: AlertTriangle, label: 'NPS Detrator' },
  leads_drop: { icon: AlertTriangle, label: 'Queda de Leads' },
  campaign_paused: { icon: AlertTriangle, label: 'Campanha Pausada' },
  cpa_exploding: { icon: AlertTriangle, label: 'CPA Alto' },
  critical_risk: { icon: Flame, label: 'Risco Crítico' },
};

export function CSCockpitFires({ fires, isLoading }: CSCockpitFiresProps) {
  const navigate = useNavigate();

  const handleAction = (fire: FireAlert, action: string) => {
    switch (action) {
      case 'view_client':
        navigate(`/clientes/${fire.clientId}/cs`);
        break;
      case 'view_campaign':
        navigate(`/clientes/${fire.clientId}/campanhas`);
        break;
      case 'whatsapp':
        // Open WhatsApp - in real implementation would use client's phone
        window.open('https://wa.me/', '_blank');
        break;
      case 'call':
        // Trigger call action
        navigate(`/clientes/${fire.clientId}/cs`);
        break;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Flame className="h-5 w-5" />
            Incêndios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-20 bg-muted/50 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Flame className="h-5 w-5" />
            Incêndios
          </span>
          {fires.length > 0 && (
            <Badge variant="destructive" className="rounded-full">
              {fires.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fires.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Flame className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Nenhum incêndio hoje! 🎉</p>
          </div>
        ) : (
          fires.map((fire) => {
            const config = fireTypeConfig[fire.type];
            const Icon = config.icon;
            
            return (
              <div
                key={fire.id}
                className={cn(
                  "p-3 rounded-lg border transition-all hover:shadow-md",
                  fire.severity === 'critical' 
                    ? "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800" 
                    : "bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:border-orange-800"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                    <AvatarImage src={fire.clientAvatar || undefined} />
                    <AvatarFallback className={cn(
                      fire.severity === 'critical' ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'
                    )}>
                      {fire.clientName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        fire.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                      )} />
                      <span className="font-medium text-sm truncate">
                        {fire.clientName}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {fire.message}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {fire.actions.map((action, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant={i === 0 ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => handleAction(fire, action.action)}
                        >
                          {action.action === 'whatsapp' && <MessageCircle className="h-3 w-3 mr-1" />}
                          {action.action === 'call' && <Phone className="h-3 w-3 mr-1" />}
                          {action.action === 'view_client' && <Eye className="h-3 w-3 mr-1" />}
                          {action.action === 'view_campaign' && <ExternalLink className="h-3 w-3 mr-1" />}
                          {action.label}
                        </Button>
                      ))}
                    </div>
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
