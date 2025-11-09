import { useState } from "react";
import { CRMLeadActivity, useCRMLeadActivities } from "@/hooks/useCRMLeadActivities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, User, Clock } from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMLeadActivityTimelineProps {
  leadId: string;
  leadName: string;
}

const activityTypeConfig = {
  created: { 
    label: 'Lead criado', 
    color: '#f59e0b', 
    icon: '✨',
    bgColor: 'bg-amber-500/20'
  },
  stage_change: { 
    label: 'Movimentação', 
    color: '#10b981', 
    icon: '🔄',
    bgColor: 'bg-emerald-500/20'
  },
  status_change: { 
    label: 'Status alterado', 
    color: '#3b82f6', 
    icon: '📊',
    bgColor: 'bg-blue-500/20'
  },
  manual_note: { 
    label: 'Nota manual', 
    color: '#6366f1', 
    icon: '📝',
    bgColor: 'bg-indigo-500/20'
  },
  updated: { 
    label: 'Atualização', 
    color: '#8b5cf6', 
    icon: '✏️',
    bgColor: 'bg-violet-500/20'
  },
  temperature_change: { 
    label: 'Temperatura alterada', 
    color: '#ec4899', 
    icon: '🌡️',
    bgColor: 'bg-pink-500/20'
  },
  won: { 
    label: 'Lead ganho', 
    color: '#059669', 
    icon: '🎉',
    bgColor: 'bg-emerald-600/20'
  },
  lost: { 
    label: 'Lead perdido', 
    color: '#dc2626', 
    icon: '❌',
    bgColor: 'bg-red-500/20'
  },
  unqualified: { 
    label: 'Lead desqualificado', 
    color: '#6b7280', 
    icon: '🚫',
    bgColor: 'bg-gray-500/20'
  },
};

const formatActivityDate = (dateString: string) => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return `Hoje às ${format(date, 'HH:mm')}`;
  }
  
  if (isYesterday(date)) {
    return `Ontem às ${format(date, 'HH:mm')}`;
  }
  
  if (isThisWeek(date, { weekStartsOn: 0 })) {
    return format(date, "EEEE 'às' HH:mm", { locale: ptBR });
  }
  
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

const ActivityItem = ({ activity, leadName }: { activity: CRMLeadActivity; leadName: string }) => {
  const config = activityTypeConfig[activity.activity_type];
  const userName = activity.user_name || 'Sistema';
  
  // Construir descrição
  let description = '';
  if (activity.activity_type === 'stage_change') {
    description = `${leadName} foi movido de ${activity.from_stage_name || 'Desconhecido'} para ${activity.to_stage_name || 'Desconhecido'}`;
    if (activity.event_sent) {
      description += ' (Evento enviado ao Meta)';
    }
  } else if (activity.activity_type === 'manual_note') {
    description = activity.notes || '';
  } else {
    description = activity.notes || config.label;
  }

  return (
    <div className="flex gap-3 pb-6 last:pb-0 relative">
      {/* Linha vertical */}
      <div className="absolute left-[15px] top-[30px] bottom-0 w-px bg-border" />
      
      {/* Ícone/Avatar */}
      <div 
        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${config.bgColor}`}
        style={{ color: config.color }}
      >
        {activity.is_manual && activity.user_name ? (
          getInitials(activity.user_name)
        ) : (
          <span className="text-base">{config.icon}</span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{userName}</span>
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ borderColor: config.color, color: config.color }}
            >
              {config.icon} {config.label}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatActivityDate(activity.created_at)}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {description}
        </p>
      </div>
    </div>
  );
};

export function CRMLeadActivityTimeline({ leadId, leadName }: CRMLeadActivityTimelineProps) {
  const { activities, isLoading, addManualActivity, isAddingActivity } = useCRMLeadActivities(leadId);
  const [noteInput, setNoteInput] = useState('');

  const handleAddNote = async () => {
    if (!noteInput.trim() || isAddingActivity) return;
    
    try {
      await addManualActivity({ leadId, notes: noteInput });
      setNoteInput('');
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Input para nova nota */}
      <div className="mb-4 pb-4 border-b">
        <div className="flex gap-2">
          <Input
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Adicionar nota ao histórico... (Enter para enviar)"
            maxLength={1000}
            disabled={isAddingActivity}
          />
          <Button 
            onClick={handleAddNote}
            disabled={!noteInput.trim() || isAddingActivity}
            size="icon"
          >
            {isAddingActivity ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {noteInput.length > 900 && (
          <p className="text-xs text-muted-foreground mt-1">
            {noteInput.length}/1000 caracteres
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma atividade registrada ainda.</p>
            <p className="text-sm mt-1">Adicione uma nota para começar!</p>
          </div>
        ) : (
          <div className="space-y-0">
            {activities.map((activity) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                leadName={leadName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}