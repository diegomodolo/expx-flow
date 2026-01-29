import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, AlertTriangle, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CriticalConversation {
  id: string;
  contactName: string;
  contactPhone: string;
  clientId: string | null;
  clientName: string | null;
  score: number | null;
  temperature: string | null;
  alertsCount: number;
  lastAnalysis: string | null;
  attendantId: string | null;
  attendantName: string | null;
}

interface CSTVCriticalConversationsProps {
  conversations: CriticalConversation[];
}

export function CSTVCriticalConversations({ conversations }: CSTVCriticalConversationsProps) {
  if (conversations.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="w-5 h-5 text-red-500" />
            Conversas Críticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="w-12 h-12 text-emerald-500 mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhuma conversa crítica!</p>
            <p className="text-sm text-muted-foreground">Todas as conversas estão com sentimento positivo ou neutro.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5 text-red-500" />
          Conversas Críticas
          <Badge variant="outline" className="ml-2 text-red-500 border-red-500/20">
            {conversations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {conversations.map((conversation) => (
            <div 
              key={conversation.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-red-500" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground truncate">
                    {conversation.contactName !== 'Sem nome' 
                      ? conversation.contactName 
                      : conversation.contactPhone || 'Contato desconhecido'}
                  </p>
                  <Badge 
                    variant="outline" 
                    className="text-xs shrink-0 bg-red-500/10 text-red-500 border-red-500/20"
                  >
                    Negativo
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {/* Mostrar telefone se tiver nome (ou seja, telefone é adicional) */}
                  {conversation.contactName !== 'Sem nome' && conversation.contactPhone && (
                    <span className="truncate">{conversation.contactPhone}</span>
                  )}
                  {conversation.clientName && (
                    <span className="truncate text-primary/80 font-medium">
                      🏢 {conversation.clientName}
                    </span>
                  )}
                  {conversation.attendantName && (
                    <span className="truncate text-blue-500">
                      👤 {conversation.attendantName}
                    </span>
                  )}
                  {!conversation.attendantName && (
                    <span className="truncate text-orange-500">
                      ⚠️ Sem atendente
                    </span>
                  )}
                  {conversation.lastAnalysis && (
                    <span>
                      {formatDistanceToNow(new Date(conversation.lastAnalysis), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                {conversation.alertsCount > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10">
                    <Bell className="w-3 h-3 text-red-500" />
                    <span className="text-xs font-medium text-red-500">
                      {conversation.alertsCount}
                    </span>
                  </div>
                )}
                <div className="text-right">
                  <p className={cn(
                    "text-xl font-bold",
                    (conversation.score ?? 0) < 40 ? "text-red-500" : "text-orange-500"
                  )}>
                    {conversation.score !== null ? conversation.score.toFixed(1) : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
