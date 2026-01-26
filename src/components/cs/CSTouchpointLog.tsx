import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientTouchpoints, ClientTouchpoint } from "@/hooks/useClientTouchpoints";
import { Phone, Mail, MessageCircle, Calendar, Video, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface CSTouchpointLogProps {
  clientId?: string;
  limit?: number;
}

const touchpointIcons: Record<string, React.ElementType> = {
  call: Phone,
  meeting: Video,
  qbr: Calendar,
  email: Mail,
  whatsapp: MessageCircle,
};

const touchpointLabels: Record<string, string> = {
  call: 'Ligação',
  meeting: 'Reunião',
  qbr: 'QBR',
  email: 'Email',
  whatsapp: 'WhatsApp',
};

const touchpointColors: Record<string, string> = {
  call: 'bg-primary/10 text-primary border-primary/30',
  meeting: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  qbr: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  email: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  whatsapp: 'bg-green-500/10 text-green-500 border-green-500/30',
};

export function CSTouchpointLog({ clientId, limit = 10 }: CSTouchpointLogProps) {
  const { touchpoints, isLoading, overdueFollowups } = useClientTouchpoints(clientId);
  const displayedTouchpoints = limit ? touchpoints.slice(0, limit) : touchpoints;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Contatos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Contatos
          </CardTitle>
          {overdueFollowups.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {overdueFollowups.length} follow-up(s) atrasado(s)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedTouchpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum contato registrado</p>
            <p className="text-sm">Registre interações com o cliente aqui</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-4">
              {displayedTouchpoints.map((touchpoint, index) => {
                const Icon = touchpointIcons[touchpoint.touchpointType] || Phone;
                const colorClass = touchpointColors[touchpoint.touchpointType] || touchpointColors.call;
                const isOverdue = touchpoint.nextActionDate && new Date(touchpoint.nextActionDate) < new Date();

                return (
                  <div key={touchpoint.id} className="relative flex gap-4 pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass} border`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-muted/30 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {touchpointLabels[touchpoint.touchpointType] || touchpoint.touchpointType}
                            </Badge>
                            {touchpoint.clients && (
                              <span className="text-sm font-medium">{touchpoint.clients.name}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(touchpoint.occurredAt), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>

                      {touchpoint.summary && (
                        <p className="text-sm mt-2">{touchpoint.summary}</p>
                      )}

                      {touchpoint.nextAction && (
                        <div className={`mt-3 p-2 rounded border ${isOverdue ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/50'}`}>
                          <p className="text-xs font-medium flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" />
                            Próxima ação: {touchpoint.nextAction}
                          </p>
                          {touchpoint.nextActionDate && (
                            <p className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {isOverdue ? '⚠️ Atrasado - ' : ''} 
                              {new Date(touchpoint.nextActionDate).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
