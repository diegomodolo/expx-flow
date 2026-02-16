import React, { useState, useEffect } from 'react';
import { useTaskTimeTracking, TimeTrackingSession } from '@/hooks/useTaskTimeTracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Square, Trash2, Clock, Plus, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useEmployees } from '@/hooks/useEmployees';

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

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface SessionFormData {
  user_id: string;
  started_at: string;
  ended_at: string;
}

interface TaskTimeTrackingTabProps {
  taskId: string | null;
  taskStatus?: string;
}

export function TaskTimeTrackingTab({ taskId, taskStatus }: TaskTimeTrackingTabProps) {
  const { user } = useAuth();
  const { employees } = useEmployees();
  const {
    sessions,
    isLoading,
    activeSession,
    totalMinutes,
    startTracking,
    stopTracking,
    deleteSession,
    createManualSession,
    updateSession,
  } = useTaskTimeTracking(taskId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TimeTrackingSession | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({
    user_id: '',
    started_at: '',
    ended_at: '',
  });

  const openCreateForm = () => {
    const now = new Date();
    setEditingSession(null);
    setFormData({
      user_id: user?.id || '',
      started_at: toLocalDatetimeValue(now.toISOString()),
      ended_at: toLocalDatetimeValue(now.toISOString()),
    });
    setFormOpen(true);
  };

  const openEditForm = (session: TimeTrackingSession) => {
    setEditingSession(session);
    setFormData({
      user_id: session.user_id,
      started_at: toLocalDatetimeValue(session.started_at),
      ended_at: session.ended_at ? toLocalDatetimeValue(session.ended_at) : toLocalDatetimeValue(new Date().toISOString()),
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.user_id || !formData.started_at || !formData.ended_at) return;
    const startedIso = new Date(formData.started_at).toISOString();
    const endedIso = new Date(formData.ended_at).toISOString();

    if (new Date(endedIso) <= new Date(startedIso)) return;

    if (editingSession) {
      updateSession.mutate(
        { sessionId: editingSession.id, started_at: startedIso, ended_at: endedIso, user_id: formData.user_id },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createManualSession.mutate(
        { user_id: formData.user_id, started_at: startedIso, ended_at: endedIso },
        { onSuccess: () => setFormOpen(false) },
      );
    }
  };

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

      {/* Active Session Card */}
      {activeSession && taskStatus === 'progress' && (
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
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

      {/* Start/Stop + Add Manual */}
      <div className="flex gap-2">
        {activeSession ? (
          <Button
            variant="destructive"
            size="lg"
            className="gap-2 flex-1"
            onClick={() => stopTracking.mutate(activeSession.id)}
            disabled={stopTracking.isPending}
          >
            <Square className="w-4 h-4" />
            Parar Timer — <LiveTimer startedAt={activeSession.started_at} />
          </Button>
        ) : (
          <Button
            size="lg"
            className="gap-2 flex-1"
            onClick={() => startTracking.mutate()}
            disabled={startTracking.isPending}
          >
            <Play className="w-4 h-4" />
            Iniciar Timer
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={openCreateForm}
        >
          <Plus className="w-4 h-4" />
          Manual
        </Button>
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
            onEdit={() => openEditForm(session)}
          />
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSession ? 'Editar Sessão' : 'Adicionar Sessão Manual'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium">Responsável</Label>
              <Select value={formData.user_id} onValueChange={(v) => setFormData(p => ({ ...p, user_id: v }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'active').map((emp) => (
                    <SelectItem key={emp.user_id} value={emp.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={emp.profile_avatar_url || emp.avatar || ''} />
                          <AvatarFallback className="text-[8px] bg-muted">{emp.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {emp.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Início</Label>
              <Input
                type="datetime-local"
                className="mt-1.5"
                value={formData.started_at}
                onChange={(e) => setFormData(p => ({ ...p, started_at: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Término</Label>
              <Input
                type="datetime-local"
                className="mt-1.5"
                value={formData.ended_at}
                onChange={(e) => setFormData(p => ({ ...p, ended_at: e.target.value }))}
              />
            </div>
            {formData.started_at && formData.ended_at && new Date(formData.ended_at) > new Date(formData.started_at) && (
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Duração</p>
                <p className="text-lg font-bold text-foreground">
                  {formatDuration((new Date(formData.ended_at).getTime() - new Date(formData.started_at).getTime()) / 60000)}
                </p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={
                !formData.user_id || !formData.started_at || !formData.ended_at ||
                new Date(formData.ended_at) <= new Date(formData.started_at) ||
                createManualSession.isPending || updateSession.isPending
              }
            >
              {editingSession ? 'Salvar Alterações' : 'Adicionar Sessão'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionRow({
  session,
  isOwner,
  onDelete,
  onEdit,
}: {
  session: TimeTrackingSession;
  isOwner: boolean;
  onDelete: () => void;
  onEdit: () => void;
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

      <div className="flex items-center gap-1 shrink-0">
        <div className="flex items-center gap-1 text-sm font-medium mr-1">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          {isActive ? (
            <LiveTimer startedAt={session.started_at} />
          ) : (
            <span>{formatDuration(Number(session.duration_minutes || 0))}</span>
          )}
        </div>
        {!isActive && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
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
