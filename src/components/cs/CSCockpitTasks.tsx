import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ClipboardList, 
  Phone, 
  MessageCircle, 
  FileText, 
  Star, 
  Trophy,
  Clock,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { DailyTask } from '@/hooks/useCSCockpitData';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CSNewTouchpointModal } from './CSNewTouchpointModal';
import { toast } from 'sonner';

interface CSCockpitTasksProps {
  tasks: DailyTask[];
  progress: { completed: number; total: number };
  isLoading?: boolean;
  onTaskComplete?: (taskId: string) => void;
}

const taskTypeConfig = {
  onboarding: { icon: Trophy, label: 'Onboarding', color: 'text-purple-600' },
  qbr: { icon: FileText, label: 'QBR', color: 'text-blue-600' },
  touchpoint: { icon: MessageCircle, label: 'Touchpoint', color: 'text-green-600' },
  nps_collect: { icon: Star, label: 'NPS', color: 'text-yellow-600' },
  celebrate: { icon: Trophy, label: 'Celebrar', color: 'text-pink-600' },
};

const dueTypeConfig = {
  overdue: { label: 'Atrasada', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  today: { label: 'Hoje', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' },
  upcoming: { label: 'Em breve', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
};

export function CSCockpitTasks({ tasks, progress, isLoading, onTaskComplete }: CSCockpitTasksProps) {
  const navigate = useNavigate();
  const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  
  const [showTouchpoint, setShowTouchpoint] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [preselectedType, setPreselectedType] = useState<string>('whatsapp');

  const handleAction = (task: DailyTask) => {
    switch (task.primaryAction.action) {
      case 'call':
        if (task.clientPhone) {
          window.open(`tel:+${task.clientPhone}`, '_blank');
          setTimeout(() => {
            setSelectedTask(task);
            setPreselectedType('call');
            setShowTouchpoint(true);
          }, 2000);
        } else {
          toast.error('Telefone não cadastrado');
          navigate(`/clientes/${task.clientId}/cs`);
        }
        break;
      case 'whatsapp':
        if (task.clientPhone) {
          window.open(`https://wa.me/${task.clientPhone}`, '_blank');
          setTimeout(() => {
            setSelectedTask(task);
            setPreselectedType('whatsapp');
            setShowTouchpoint(true);
          }, 2000);
        } else {
          toast.error('Telefone não cadastrado');
          navigate(`/clientes/${task.clientId}/cs`);
        }
        break;
      case 'send_nps':
        navigate(`/clientes/${task.clientId}/cs`);
        break;
      case 'generate_qbr':
        navigate(`/cs/acoes`);
        break;
      default:
        navigate(`/clientes/${task.clientId}/cs`);
    }
  };

  const handleTaskCheck = (taskId: string, completed: boolean) => {
    if (!completed && onTaskComplete) {
      onTaskComplete(taskId);
      toast.success('Tarefa concluída! 🎉');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Tarefas do Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse h-16 bg-muted/50 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Tarefas do Dia
            </span>
            <Badge variant="outline" className="rounded-full">
              {progress.completed}/{progress.total}
            </Badge>
          </CardTitle>
          
          {/* Progress Bar */}
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhuma tarefa pendente! 🎉</p>
            </div>
          ) : (
            tasks.map((task) => {
              const typeConfig = taskTypeConfig[task.type];
              const Icon = typeConfig.icon;
              const dueConfig = dueTypeConfig[task.dueType];
              
              return (
                <div
                  key={task.id}
                  className={cn(
                    "p-3 rounded-lg border bg-card transition-all hover:shadow-sm",
                    task.completed && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleTaskCheck(task.id, task.completed)}
                      className="mt-1"
                    />
                    
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={task.clientAvatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {task.clientName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", typeConfig.color)} />
                        <span className={cn(
                          "font-medium text-sm truncate",
                          task.completed && "line-through"
                        )}>
                          {task.title}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", dueConfig.color)}>
                          {task.dueType === 'overdue' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {task.dueType === 'today' && <Clock className="h-3 w-3 mr-1" />}
                          {task.dueType === 'upcoming' && <Calendar className="h-3 w-3 mr-1" />}
                          {dueConfig.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {task.clientName} • {task.subtitle}
                      </p>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs flex-shrink-0"
                      onClick={() => handleAction(task)}
                      disabled={task.completed}
                    >
                      {task.primaryAction.label}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Touchpoint Modal */}
      <CSNewTouchpointModal
        open={showTouchpoint}
        onOpenChange={setShowTouchpoint}
        clientId={selectedTask?.clientId || ''}
        clientName={selectedTask?.clientName}
        preselectedType={preselectedType}
      />
    </>
  );
}
