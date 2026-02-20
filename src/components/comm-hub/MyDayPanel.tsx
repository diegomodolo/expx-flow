import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Play, Pause, RotateCcw, CheckCircle2, Clock,
  Calendar, Zap, Coffee, Circle, Search, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useCallback } from 'react';

interface MyDayPanelProps {
  onOpenDM?: (userId: string, userName: string, userAvatar?: string) => void;
}

export function MyDayPanel({ onOpenDM }: MyDayPanelProps) {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const [teamSearch, setTeamSearch] = useState('');

  // 18-minute timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(18 * 60);

  useEffect(() => {
    if (!timerActive || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) { setTimerActive(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => { setTimerActive(false); setTimerSeconds(18 * 60); };
  const timerProgress = ((18 * 60 - timerSeconds) / (18 * 60)) * 100;

  // My tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['my-day-tasks-panel', activeCompany?.company_id, user?.id],
    queryFn: async () => {
      if (!activeCompany?.company_id || !user?.id) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority, status')
        .eq('company_id', activeCompany.company_id)
        .or(`assigned_user_id.eq.${user.id},and(user_id.eq.${user.id},assigned_user_id.is.null)`)
        .in('status', ['todo', 'progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(6);
      return data || [];
    },
    enabled: !!activeCompany?.company_id && !!user?.id,
  });

  // All employees with avatars
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-all-members', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, user_id, status, avatar')
        .eq('company_id', activeCompany.company_id)
        .eq('status', 'active')
        .order('name');
      if (!employees) return [];

      // Fetch profile avatars
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
    enabled: !!activeCompany?.company_id,
  });

  const priorityColors: Record<string, string> = {
    high: 'text-destructive', medium: 'text-warning', low: 'text-success',
  };

  const filteredMembers = teamMembers.filter(m =>
    m.name?.toLowerCase().includes(teamSearch.toLowerCase())
  );

  return (
    <div className="w-80 border-l border-border bg-card/50 backdrop-blur-sm flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">

          {/* Timer Card */}
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Tarefa Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-3">
                <div className={cn(
                  "text-4xl font-mono font-bold tracking-wider",
                  timerSeconds <= 60 ? "text-destructive" :
                  timerSeconds <= 5 * 60 ? "text-warning" : "text-foreground"
                )}>
                  {formatTimer(timerSeconds)}
                </div>
                <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${timerProgress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setTimerActive(!timerActive)} className="rounded-full gap-1.5">
                  {timerActive ? <><Pause className="w-3.5 h-3.5" /> Pausar</> : <><Play className="w-3.5 h-3.5" /> Iniciar</>}
                </Button>
                <Button variant="ghost" size="icon" onClick={resetTimer} className="rounded-full h-8 w-8">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* My Day Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Meu Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {tasks.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Tudo em dia!</p>
                </div>
              ) : tasks.map(task => (
                <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Circle className={cn("w-3 h-3 mt-1 shrink-0", priorityColors[task.priority] || 'text-muted-foreground')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground line-clamp-1">{task.title}</p>
                    {task.due_date && (
                      <span className={cn(
                        "text-[10px]",
                        isToday(parseISO(task.due_date)) ? 'text-warning' :
                        isPast(parseISO(task.due_date)) ? 'text-destructive' : 'text-muted-foreground'
                      )}>
                        {isToday(parseISO(task.due_date)) ? 'Hoje' : format(parseISO(task.due_date), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Equipe
                <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                  {teamMembers.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaborador..."
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                  className="pl-7 h-7 text-xs"
                />
              </div>

              <div className="space-y-0.5 max-h-60 overflow-y-auto">
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
                      "w-full flex items-center gap-2 p-1.5 rounded-lg text-left transition-colors group",
                      member.user_id && member.user_id !== user?.id
                        ? "hover:bg-accent/60 cursor-pointer"
                        : "opacity-60 cursor-default"
                    )}
                  >
                    <div className="relative shrink-0">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-medium text-muted-foreground">
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
                    </div>
                    <span className="text-xs text-foreground truncate flex-1">{member.name}</span>
                    {member.user_id === user?.id ? (
                      <span className="text-[10px] text-muted-foreground">você</span>
                    ) : member.user_id ? (
                      <MessageSquare className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    ) : null}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
    </div>
  );
}
