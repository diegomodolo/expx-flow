import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Calendar, CheckCircle, AlertTriangle, Zap, User, Timer, TrendingUp, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrganizedTask {
  taskId: string;
  slotId: string;
  date: string;
  estimatedMinutes: number;
  startOffsetMinutes: number;
  endOffsetMinutes: number;
  reason: string;
  taskTitle: string;
  slotName: string;
  slotTime: string;
  assignedTo?: string;
  assignedToName?: string;
  previousAssignee?: string;
  reassignmentReason?: string;
  priority?: string;
}

interface OrganizationPlan {
  organizedTasks: OrganizedTask[];
  statistics: {
    totalTasks: number;
    totalEstimatedTime: number;
    averageTaskTime: number;
    daysUsed: number;
  };
  warnings: string[];
  reassignments?: {
    taskId: string;
    taskTitle: string;
    fromUser: string;
    toUser: string;
    reason: string;
  }[];
  workloadDistribution?: {
    employeeName: string;
    beforeTasks: number;
    afterTasks: number;
    totalMinutes: number;
  }[];
}

interface TaskOrganizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationPlan: OrganizationPlan;
  onApply: () => void;
  onCancel: () => void;
  isApplying: boolean;
}

export const TaskOrganizerModal: React.FC<TaskOrganizerModalProps> = ({
  open,
  onOpenChange,
  organizationPlan,
  onApply,
  onCancel,
  isApplying,
}) => {
  // Agrupar tarefas por data e slot
  const tasksByDate = organizationPlan.organizedTasks.reduce((acc, task) => {
    if (!acc[task.date]) {
      acc[task.date] = [];
    }
    acc[task.date].push(task);
    return acc;
  }, {} as Record<string, OrganizedTask[]>);

  // Função para calcular horário específico da tarefa dentro do slot
  const getTaskSpecificTime = (task: OrganizedTask) => {
    if (task.startOffsetMinutes !== undefined && task.endOffsetMinutes !== undefined) {
      const slotStartTime = task.slotTime?.split(' - ')[0];
      if (slotStartTime) {
        const [startHour, startMin] = slotStartTime.split(':').map(Number);
        const slotStartInMinutes = startHour * 60 + startMin;
        
        const taskStartInMinutes = slotStartInMinutes + task.startOffsetMinutes;
        const taskEndInMinutes = slotStartInMinutes + task.endOffsetMinutes;
        
        const taskStartHour = Math.floor(taskStartInMinutes / 60);
        const taskStartMin = taskStartInMinutes % 60;
        const taskEndHour = Math.floor(taskEndInMinutes / 60);
        const taskEndMin = taskEndInMinutes % 60;
        
        return `${String(taskStartHour).padStart(2, '0')}:${String(taskStartMin).padStart(2, '0')} - ${String(taskEndHour).padStart(2, '0')}:${String(taskEndMin).padStart(2, '0')}`;
      }
    }
    return task.slotTime;
  };

  const formatTime = (minutes: number) => {
    if (!minutes || isNaN(minutes)) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  // Função para traduzir prioridade para português
  const translatePriority = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Média';
    }
  };

  // Função para obter cor da prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Função para obter emoji da prioridade
  const getPriorityEmoji = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  // Calcular estatísticas se não fornecidas
  const totalTasks = organizationPlan.statistics?.totalTasks || organizationPlan.organizedTasks.length;
  const totalTimeMinutes = organizationPlan.statistics?.totalEstimatedTime || 
    organizationPlan.organizedTasks.reduce((acc, task) => acc + (task.estimatedMinutes || 0), 0);
  const daysUsed = organizationPlan.statistics?.daysUsed || Object.keys(tasksByDate).length;
  const averageTime = organizationPlan.statistics?.averageTaskTime || Math.round(totalTimeMinutes / totalTasks);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Organização Inteligente de Tarefas
          </DialogTitle>
          <DialogDescription>
            A IA analisou suas tarefas e criou uma organização otimizada. Revise e confirme para aplicar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tarefas</p>
                  <p className="text-2xl font-bold">{totalTasks}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Total</p>
                  <p className="text-2xl font-bold">{formatTime(totalTimeMinutes)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Dias Utilizados</p>
                  <p className="text-2xl font-bold">{daysUsed}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Média por Tarefa</p>
                  <p className="text-2xl font-bold">{formatTime(averageTime)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Avisos */}
          {organizationPlan.warnings && organizationPlan.warnings.length > 0 && (
            <Card className="p-4 border-yellow-200 bg-yellow-50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800">Avisos da Organização</h3>
                  <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                    {organizationPlan.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Cronograma Organizado */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronograma Organizado
            </h3>
            
            <div className="space-y-6">
              {Object.entries(tasksByDate)
                .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                .map(([date, tasks]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">
                      {format(new Date(date + 'T00:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </h4>
                    <Badge variant="secondary" className="ml-auto">
                      {tasks.length} tarefas
                    </Badge>
                  </div>

                  <div className="grid gap-3">
                    {tasks
                      .sort((a, b) => {
                        // Ordenar primeiro por slot, depois por offset dentro do slot
                        const slotA = a.slotTime?.split(' - ')[0] || '00:00';
                        const slotB = b.slotTime?.split(' - ')[0] || '00:00';
                        const slotComparison = slotA.localeCompare(slotB);
                        
                        if (slotComparison !== 0) return slotComparison;
                        
                        // Se estão no mesmo slot, ordenar por offset
                        return (a.startOffsetMinutes || 0) - (b.startOffsetMinutes || 0);
                      })
                      .map((task, index) => (
                      <Card key={`${task.taskId}-${index}`} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-primary/20">
                        <div className="flex items-start gap-4">
                          {/* Avatar do colaborador */}
                          <div className="flex-shrink-0">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {task.assignedToName ? 
                                  task.assignedToName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
                                  '?'
                                }
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          {/* Conteúdo principal */}
                          <div className="flex-1 min-w-0">
                            {/* Header com título e prioridade */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-base text-foreground leading-tight truncate">
                                  {task.taskTitle}
                                </h5>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`flex-shrink-0 text-xs px-2 py-1 border ${getPriorityColor(task.priority || 'medium')}`}
                              >
                                {getPriorityEmoji(task.priority || 'medium')} {translatePriority(task.priority || 'medium')}
                              </Badge>
                            </div>

                            {/* Descrição/Razão */}
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {task.reason}
                            </p>

                            {/* Footer com informações organizadas horizontalmente */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{getTaskSpecificTime(task)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Timer className="h-4 w-4" />
                                  <span>{formatTime(task.estimatedMinutes)}</span>
                                </div>
                                {task.assignedToName && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span className="truncate max-w-24">{task.assignedToName}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {task.slotName}
                                </Badge>
                                {task.reassignmentReason && (
                                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                    Reatribuído
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reatribuições */}
          {organizationPlan.reassignments && organizationPlan.reassignments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Reatribuições Realizadas
              </h3>
              <div className="space-y-2">
                {organizationPlan.reassignments.map((reassignment, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{reassignment.taskTitle}</p>
                        <p className="text-xs text-muted-foreground">{reassignment.reason}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p><span className="text-red-600">{reassignment.fromUser}</span> → <span className="text-green-600">{reassignment.toUser}</span></p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
           )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4 flex-shrink-0">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {organizationPlan.organizedTasks.length} tarefas organizadas em {Object.keys(tasksByDate).length} dias
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isApplying}>
                Cancelar
              </Button>
              <Button onClick={onApply} disabled={isApplying} className="min-w-32">
                {isApplying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aplicar Organização
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};