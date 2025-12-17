import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  SkipForward,
  ListTodo,
  TrendingUp,
  DollarSign,
  Image,
  Bell,
  FileText,
  Settings,
  MoreVertical,
  Plus,
} from 'lucide-react';
import { useRoutineExecutions, useRoutineTemplates, useDefaultRoutineTemplates, RoutineExecution, RoutineTemplate, RoutineCategory } from '@/hooks/useRoutines';
import { cn } from '@/lib/utils';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categoryConfig: Record<RoutineCategory, { icon: React.ReactNode; label: string; color: string }> = {
  saldo: { icon: <DollarSign className="h-4 w-4" />, label: 'Saldo', color: 'text-green-500' },
  campanhas: { icon: <TrendingUp className="h-4 w-4" />, label: 'Campanhas', color: 'text-blue-500' },
  performance: { icon: <TrendingUp className="h-4 w-4" />, label: 'Performance', color: 'text-purple-500' },
  criativos: { icon: <Image className="h-4 w-4" />, label: 'Criativos', color: 'text-orange-500' },
  alertas: { icon: <Bell className="h-4 w-4" />, label: 'Alertas', color: 'text-red-500' },
  relatorios: { icon: <FileText className="h-4 w-4" />, label: 'Relatórios', color: 'text-cyan-500' },
  otimizacao: { icon: <Settings className="h-4 w-4" />, label: 'Otimização', color: 'text-yellow-500' },
  outros: { icon: <MoreVertical className="h-4 w-4" />, label: 'Outros', color: 'text-muted-foreground' },
};

const priorityConfig = {
  high: { label: 'Alta', color: 'bg-red-500/10 text-red-600 border-red-200' },
  medium: { label: 'Média', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
  low: { label: 'Baixa', color: 'bg-green-500/10 text-green-600 border-green-200' },
};

interface RoutineItemProps {
  execution: RoutineExecution & { template: RoutineTemplate };
  onComplete: (id: string, notes?: string) => void;
  onSkip: (id: string, notes?: string) => void;
}

function RoutineItem({ execution, onComplete, onSkip }: RoutineItemProps) {
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'complete' | 'skip'>('complete');

  const template = execution.template;
  const category = categoryConfig[template.category as RoutineCategory] || categoryConfig.outros;
  const priority = priorityConfig[template.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  
  const now = new Date();
  const dueAt = new Date(execution.due_at);
  const isOverdue = execution.status === 'pending' && isAfter(now, dueAt);
  const isCompleted = execution.status === 'completed_on_time' || execution.status === 'completed_late';
  const isSkipped = execution.status === 'skipped';

  const handleAction = (actionType: 'complete' | 'skip') => {
    setAction(actionType);
    setShowNotesDialog(true);
  };

  const confirmAction = () => {
    if (action === 'complete') {
      onComplete(execution.id, notes);
    } else {
      onSkip(execution.id, notes);
    }
    setShowNotesDialog(false);
    setNotes('');
  };

  const getStatusIcon = () => {
    if (isCompleted) {
      return execution.status === 'completed_on_time' 
        ? <CheckCircle2 className="h-5 w-5 text-green-500" />
        : <CheckCircle2 className="h-5 w-5 text-yellow-500" />;
    }
    if (isSkipped) return <SkipForward className="h-5 w-5 text-muted-foreground" />;
    if (isOverdue) return <AlertTriangle className="h-5 w-5 text-red-500" />;
    return <Clock className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <>
      <div 
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all",
          isCompleted && "bg-muted/50 opacity-70",
          isSkipped && "bg-muted/30 opacity-60",
          isOverdue && !isCompleted && !isSkipped && "border-red-300 bg-red-50/50 dark:bg-red-950/20",
          !isCompleted && !isSkipped && !isOverdue && "hover:bg-muted/30"
        )}
      >
        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          disabled={isCompleted || isSkipped}
          onCheckedChange={() => handleAction('complete')}
          className="h-5 w-5"
        />

        {/* Category Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("p-1.5 rounded-md bg-muted", category.color)}>
                {category.icon}
              </div>
            </TooltipTrigger>
            <TooltipContent>{category.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium text-sm",
              (isCompleted || isSkipped) && "line-through text-muted-foreground"
            )}>
              {template.title}
            </span>
            <Badge variant="outline" className={cn("text-xs", priority.color)}>
              {priority.label}
            </Badge>
          </div>
          {template.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {template.description}
            </p>
          )}
        </div>

        {/* Time & Status */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-medium">
              {execution.scheduled_time.substring(0, 5)}
            </div>
            <div className="text-xs text-muted-foreground">
              SLA: {template.sla_minutes}min
            </div>
          </div>
          {getStatusIcon()}
        </div>

        {/* Skip Button */}
        {!isCompleted && !isSkipped && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleAction('skip')}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pular rotina</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'complete' ? 'Concluir Rotina' : 'Pular Rotina'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">{template.title}</p>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </div>
            <Textarea
              placeholder="Adicione uma observação (opcional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAction}>
              {action === 'complete' ? 'Concluir' : 'Pular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DailyRoutinePanel() {
  const { templates } = useRoutineTemplates();
  const { 
    executions, 
    stats, 
    isLoading, 
    createDailyExecutions,
    completeExecution,
    skipExecution,
  } = useRoutineExecutions();
  const { createDefaultTemplates } = useDefaultRoutineTemplates();

  // Criar execuções do dia quando componente carrega
  useEffect(() => {
    if (templates.length > 0 && executions.length === 0 && !isLoading) {
      createDailyExecutions.mutate();
    }
  }, [templates.length, executions.length, isLoading]);

  const handleComplete = (id: string, notes?: string) => {
    completeExecution.mutate({ id, notes });
  };

  const handleSkip = (id: string, notes?: string) => {
    skipExecution.mutate({ id, notes });
  };

  const handleCreateDefaults = () => {
    createDefaultTemplates.mutate();
  };

  // Separar em pendentes e concluídas
  const pendingExecutions = executions.filter(e => e.status === 'pending');
  const completedExecutions = executions.filter(e => e.status !== 'pending');

  if (templates.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Rotinas do Dia
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Nenhuma rotina configurada ainda.
            </p>
            <Button onClick={handleCreateDefaults} disabled={createDefaultTemplates.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Rotinas Padrão
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Rotinas do Dia
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-2xl font-bold">{stats.completed}</span>
              <span className="text-muted-foreground">/{stats.total}</span>
            </div>
            <Badge 
              variant={stats.late > 0 ? "destructive" : stats.progress === 100 ? "default" : "secondary"}
              className="text-xs"
            >
              {stats.progress}%
            </Badge>
          </div>
        </div>
        <Progress value={stats.progress} className="h-2 mt-2" />
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {stats.onTime} no prazo
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            {stats.late} atrasadas
          </span>
          <span className="flex items-center gap-1">
            <SkipForward className="h-3 w-3 text-muted-foreground" />
            {stats.skipped} puladas
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando rotinas...
          </div>
        ) : (
          <>
            {/* Pendentes primeiro */}
            {pendingExecutions.map((execution) => (
              <RoutineItem
                key={execution.id}
                execution={execution}
                onComplete={handleComplete}
                onSkip={handleSkip}
              />
            ))}
            
            {/* Separador se houver ambos */}
            {pendingExecutions.length > 0 && completedExecutions.length > 0 && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">Concluídas</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            
            {/* Concluídas depois */}
            {completedExecutions.map((execution) => (
              <RoutineItem
                key={execution.id}
                execution={execution}
                onComplete={handleComplete}
                onSkip={handleSkip}
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
