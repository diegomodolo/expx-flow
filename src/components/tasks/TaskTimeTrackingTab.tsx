import React, { useState, useEffect } from 'react';
import { useTaskTimeTracking, TimeTrackingSession } from '@/hooks/useTaskTimeTracking';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Play, Square, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
}

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed((Date.now() - start) / 60000);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="text-primary font-mono font-bold">{formatDuration(elapsed)}</span>;
}

interface TaskTimeTrackingTabProps {
  taskId: string | null;
  taskStatus?: string;
}

export function TaskTimeTrackingTab({ taskId, taskStatus }: TaskTimeTrackingTabProps) {
  const { user } = useAuth();
  const {
    sessions,
    isLoading,
    activeSession,
    totalMinutes,
    startTracking,
    stopTracking,
    deleteSession,
  } = useTaskTimeTracking(taskId);

  // Calculate lead time from task creation (approximated by first session or passed)
  const leadTimeMinutes = totalMinutes;

  if (!taskId) {
    return (
      <div className="text-sm text-muted-foreground">
        Salve a tarefa primeiro para usar o time tracking.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Time Tracking</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Controle o tempo de trabalho nesta tarefa.
        </p>
      </div>

      {/* Active Session Card - shown when task is in progress */}
      {activeSession && taskStatus === 'progress' && (
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 animate-pulse-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-semibold text-foreground">Cronômetro Ativo</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => stopTracking.mutate(activeSession.id)}
              disabled={stopTracking.isPending}
            >
              <Square className="w-3 h-3" />
              Parar
            </Button>
          </div>
          <div className="mt-3 text-center">
            <p className="text-3xl font-mono font-bold text-primary">
              <LiveTimer startedAt={activeSession.started_at} />
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tempo desde o último início</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Tempo Trabalhado</p>
          <p className="text-xl font-bold text-foreground">{formatDuration(totalMinutes)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Sessões</p>
          <p className="text-xl font-bold text-foreground">{sessions.length}</p>
        </div>
      </div>

      {/* Start/Stop Button */}
      <div className="flex justify-center">
        {activeSession ? (
          <Button
            variant="destructive"
            size="lg"
            className="gap-2 w-full"
            onClick={() => stopTracking.mutate(activeSession.id)}
            disabled={stopTracking.isPending}
          >
            <Square className="w-4 h-4" />
            Parar Timer — <LiveTimer startedAt={activeSession.started_at} />
          </Button>
        ) : (
          <Button
            size="lg"
            className="gap-2 w-full"
            onClick={() => startTracking.mutate()}
            disabled={startTracking.isPending}
          >
            <Play className="w-4 h-4" />
            Iniciar Timer
          </Button>
        )}
      </div>

      {/* Sessions List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Histórico de Sessões</h4>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma sessão registrada.</p>
        )}
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            isOwner={session.user_id === user?.id}
            onDelete={() => deleteSession.mutate(session.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  isOwner,
  onDelete,
}: {
  session: TimeTrackingSession;
  isOwner: boolean;
  onDelete: () => void;
}) {
  const isActive = !session.ended_at;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/20'
    }`}>
      <Avatar className="h-8 w-8 shrink-0">
        {session.user_avatar && <AvatarImage src={session.user_avatar} />}
        <AvatarFallback className="text-xs bg-muted">
          {(session.user_name || 'U').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {session.user_name || 'Usuário'}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{format(new Date(session.started_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
          <span>→</span>
          {session.ended_at ? (
            <span>{format(new Date(session.ended_at), "HH:mm", { locale: ptBR })}</span>
          ) : (
            <span className="text-primary font-medium">Em andamento</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-sm font-medium">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          {isActive ? (
            <LiveTimer startedAt={session.started_at} />
          ) : (
            <span>{formatDuration(Number(session.duration_minutes || 0))}</span>
          )}
        </div>
        {isOwner && !isActive && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
