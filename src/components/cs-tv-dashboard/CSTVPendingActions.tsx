import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Star, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingContact {
  id: string;
  name: string;
  avatar: string | null;
  daysSinceContact: number;
  lastContactAt: string | null;
}

interface PendingNPS {
  id: string;
  name: string;
  avatar: string | null;
  daysSinceNPS: number;
  lastNPSAt: string | null;
}

interface CSTVPendingActionsProps {
  pendingContacts: PendingContact[];
  pendingNPS: PendingNPS[];
}

export function CSTVPendingActions({ pendingContacts, pendingNPS }: CSTVPendingActionsProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getDaysColor = (days: number) => {
    if (days >= 30) return 'text-red-500';
    if (days >= 14) return 'text-orange-500';
    if (days >= 7) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const hasNoData = pendingContacts.length === 0 && pendingNPS.length === 0;

  if (hasNoData) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Ações Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
            <p className="text-lg font-medium text-foreground">Tudo em dia!</p>
            <p className="text-sm text-muted-foreground">Sem ações pendentes de CS.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Pending Contacts */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="w-4 h-4 text-blue-500" />
            Sem Contato Recente
            {pendingContacts.length > 0 && (
              <Badge variant="outline" className="ml-2 text-blue-500 border-blue-500/20">
                {pendingContacts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Todos os clientes foram contatados recentemente
            </p>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {pendingContacts.map((client) => (
                <div 
                  key={client.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.avatar || undefined} alt={client.name} />
                    <AvatarFallback className="bg-background text-xs">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {client.name}
                    </p>
                  </div>
                  
                  <div className={cn("text-sm font-semibold", getDaysColor(client.daysSinceContact))}>
                    {client.daysSinceContact === 999 ? 'Nunca' : `${client.daysSinceContact}d`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending NPS */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-4 h-4 text-yellow-500" />
            NPS Pendente
            {pendingNPS.length > 0 && (
              <Badge variant="outline" className="ml-2 text-yellow-500 border-yellow-500/20">
                {pendingNPS.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingNPS.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Todos os clientes têm NPS atualizado
            </p>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {pendingNPS.map((client) => (
                <div 
                  key={client.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.avatar || undefined} alt={client.name} />
                    <AvatarFallback className="bg-background text-xs">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {client.name}
                    </p>
                  </div>
                  
                  <div className={cn("text-sm font-semibold", getDaysColor(client.daysSinceNPS))}>
                    {client.daysSinceNPS === 999 ? 'Nunca' : `${client.daysSinceNPS}d`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
