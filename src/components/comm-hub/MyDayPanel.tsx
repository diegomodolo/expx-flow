import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2, Clock, Calendar, Zap, Circle, Search, MessageSquare, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MyDayPanelProps {
  onOpenDM?: (userId: string, userName: string, userAvatar?: string) => void;
  onOpenTask?: (taskId: string) => void;
}

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <span className="font-mono font-bold text-primary">
      {h > 0 ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}
    </span>
  );
}

export function MyDayPanel({ onOpenDM, onOpenTask }: MyDayPanelProps) {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const [teamSearch, setTeamSearch] = useState('');

  const companyId = activeCompany?.company_id;

  // Active time tracking session for current user
  const { data: activeSession } = useQuery({
    queryKey: ['my-active-session', companyId, user?.id],
    queryFn: async () => {
      if (!companyId || !user?.id) return null;
      const { data } = await supabase
        .from('task_time_tracking')
        .select('id, task_id, started_at')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      // Fetch task title
      const { data: task } = await supabase
        .from('tasks')
        .select('id, title, priority')
        .eq('id', data.task_id)
        .maybeSingle();
      return { ...data, task_title: task?.title || 'Tarefa', task_priority: task?.priority };
    },
    enabled: !!companyId && !!user?.id,
    refetchInterval: 10000,
  });

  // My tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['my-day-tasks-panel', companyId, user?.id],
    queryFn: async () => {
      if (!companyId || !user?.id) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority, status')
        .eq('company_id', companyId)
        .or(`assigned_user_id.eq.${user.id},and(user_id.eq.${user.id},assigned_user_id.is.null)`)
        .in('status', ['todo', 'progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);
      return data || [];
    },
    enabled: !!companyId && !!user?.id,
  });

  // All employees
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-all-members', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, user_id, status, avatar')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      if (!employees) return [];

      const userIds = employees.filter(e => e.user_id).map(e => e.user_id!);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .in('user_id', userIds);
      const avatarMap = new Map((profiles || []).map(p => [p.user_id, p.avatar_url]));

      return employees.map(e => ({
        ...e,
        avatarUrl: (e.user_id && avatarMap.get(e.user_id)) || e.avatar || null,
      }));
    },
    enabled: !!companyId,
  });

  const priorityColors: Record<string, string> = {
    high: 'text-destructive', medium: 'text-warning', low: 'text-success',
  };

  const filteredMembers = teamMembers.filter(m =>
    m.name?.toLowerCase().includes(teamSearch.toLowerCase())
  );

  return (
    <div className="w-full h-full border-l border-border bg-card/50 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-title-md text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Meu Dia
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">

          {/* Active Task */}
          {activeSession && (
            <div>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Executando Agora</p>
              <button
                onClick={() => onOpenTask?.(activeSession.task_id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 bg-primary/10 border border-primary/20 hover:bg-primary/15 text-left group"
              >
                <div className="relative shrink-0">
                  <Play className="w-4 h-4 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{activeSession.task_title}</p>
                  <LiveTimer startedAt={activeSession.started_at} />
                </div>
              </button>
            </div>
          )}

          {/* My Tasks */}
          <div>
            <p className="text-label-sm text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
              Tarefas
              {tasks.length > 0 && <span className="ml-1">({tasks.length})</span>}
            </p>
            {tasks.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Tudo em dia!
              </div>
            ) : (
              <div className="space-y-0.5">
                {tasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => onOpenTask?.(task.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                      "hover:bg-accent/60 text-muted-foreground border-l-2 border-transparent text-left"
                    )}
                  >
                    <Circle className={cn("w-3 h-3 shrink-0", priorityColors[task.priority] || 'text-muted-foreground')} />
                    <span className="truncate flex-1 text-xs">{task.title}</span>
                    {task.due_date && (
                      <span className={cn(
                        "text-[10px] shrink-0",
                        isToday(parseISO(task.due_date)) ? 'text-warning' :
                        isPast(parseISO(task.due_date)) ? 'text-destructive' : 'text-muted-foreground'
                      )}>
                        {isToday(parseISO(task.due_date)) ? 'Hoje' : format(parseISO(task.due_date), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Team Members */}
          <div>
            <p className="text-label-sm text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
              Equipe
              <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1.5">
                {teamMembers.length}
              </Badge>
            </p>
            {/* Search */}
            <div className="px-3 mb-1.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                />
              </div>
            </div>
            <div className="space-y-0.5">
              {filteredMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhum encontrado</p>
              ) : filteredMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => {
                    if (member.user_id && onOpenDM) {
                      onOpenDM(member.user_id, member.name || 'Usuário', member.avatarUrl || undefined);
                    }
                  }}
                  disabled={!member.user_id || member.user_id === user?.id}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150",
                    member.user_id && member.user_id !== user?.id
                      ? "hover:bg-accent/60 cursor-pointer text-muted-foreground border-l-2 border-transparent"
                      : "opacity-60 cursor-default text-muted-foreground border-l-2 border-transparent"
                  )}
                >
                  <div className="relative shrink-0">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border-[1.5px] border-card" />
                  </div>
                  <span className="text-xs truncate flex-1 text-left">{member.name}</span>
                  {member.user_id === user?.id ? (
                    <span className="text-[10px] text-muted-foreground">você</span>
                  ) : member.user_id ? (
                    <MessageSquare className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
