import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Inbox, Clock, User, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingConversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessageAt: string;
  waitingMinutes: number;
  clientName: string | null;
  attendantId: string | null;
  attendantName: string | null;
}

interface CSTVPendingConversationsProps {
  conversations: PendingConversation[];
}

function formatWaitingTime(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getUrgencyColor(minutes: number): string {
  if (minutes < 5) return 'text-emerald-500';
  if (minutes < 15) return 'text-amber-500';
  if (minutes < 30) return 'text-orange-500';
  return 'text-red-500';
}

function getUrgencyBg(minutes: number): string {
  if (minutes < 5) return 'bg-emerald-500/10';
  if (minutes < 15) return 'bg-amber-500/10';
  if (minutes < 30) return 'bg-orange-500/10';
  return 'bg-red-500/10';
}

export function CSTVPendingConversations({ conversations }: CSTVPendingConversationsProps) {
  if (conversations.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Inbox className="w-5 h-5 text-primary" />
            Aguardando Resposta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
            <p className="text-lg font-medium text-foreground">Todas as mensagens respondidas!</p>
            <p className="text-sm text-muted-foreground">Nenhuma conversa aguardando resposta.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="w-5 h-5 text-orange-500" />
          Aguardando Resposta
          <Badge variant="outline" className="ml-2 text-orange-500 border-orange-500/20">
            {conversations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
          {conversations.map((conv) => (
            <div 
              key={conv.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all",
                getUrgencyBg(conv.waitingMinutes)
              )}
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">
                    {conv.contactName || conv.contactPhone}
                  </p>
                  {conv.contactName && conv.contactPhone && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {conv.contactPhone}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {conv.clientName && (
                    <span className="truncate">{conv.clientName}</span>
                  )}
                  {conv.clientName && conv.attendantName && (
                    <span>•</span>
                  )}
                  {conv.attendantName && (
                    <span className="text-primary/80 font-medium truncate">
                      {conv.attendantName}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Clock className={cn("w-4 h-4", getUrgencyColor(conv.waitingMinutes))} />
                <span className={cn("font-bold text-sm", getUrgencyColor(conv.waitingMinutes))}>
                  {formatWaitingTime(conv.waitingMinutes)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
