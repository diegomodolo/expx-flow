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
import { Clock, Calendar, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrganizedTask {
  taskId: string;
  slotId: string;
  date: string;
  estimatedMinutes: number;
  reason: string;
  taskTitle: string;
  slotName: string;
  slotTime: string;
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
  // Agrupar tarefas por data
  const tasksByDate = organizationPlan.organizedTasks.reduce((acc, task) => {
    if (!acc[task.date]) {
      acc[task.date] = [];
    }
    acc[task.date].push(task);
    return acc;
  }, {} as Record<string, OrganizedTask[]>);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    return `${mins}min`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Organização Inteligente de Tarefas
          </DialogTitle>
          <DialogDescription>
            A IA analisou suas tarefas e criou uma organização otimizada. Revise e confirme para aplicar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Tarefas</p>
                    <p className="text-2xl font-bold">{organizationPlan.statistics.totalTasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Tempo Total</p>
                    <p className="text-2xl font-bold">{formatTime(organizationPlan.statistics.totalEstimatedTime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Dias Utilizados</p>
                    <p className="text-2xl font-bold">{organizationPlan.statistics.daysUsed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Média por Tarefa</p>
                    <p className="text-2xl font-bold">{formatTime(organizationPlan.statistics.averageTaskTime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Avisos */}
          {organizationPlan.warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Atenção</h4>
                    <ul className="mt-2 space-y-1">
                      {organizationPlan.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-700">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cronograma por Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cronograma Organizado</h3>
            
            {Object.entries(tasksByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, tasks]) => (
                <Card key={date}>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </h4>
                    
                    <div className="space-y-2">
                      {tasks
                        .sort((a, b) => a.slotTime.localeCompare(b.slotTime))
                        .map((task, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-background rounded-lg border"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{task.taskTitle}</span>
                                <Badge variant="outline" className="text-xs">
                                  {task.slotName}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {task.reason}
                              </p>
                            </div>
                            
                            <div className="text-right text-sm">
                              <div className="font-medium">{task.slotTime}</div>
                              <div className="text-muted-foreground">
                                {formatTime(task.estimatedMinutes)}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isApplying}
          >
            Cancelar
          </Button>
          <Button
            onClick={onApply}
            disabled={isApplying}
            className="min-w-[120px]"
          >
            {isApplying ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aplicar Organização
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};