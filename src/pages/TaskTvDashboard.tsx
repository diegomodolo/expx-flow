import { useState, useEffect, lazy, Suspense } from 'react';
import { useTaskTvDashboard, ActiveSession, CollaboratorRanking, TaskItem } from '@/hooks/useTaskTvDashboard';
import { useCompany } from '@/contexts/CompanyContext';
import {
  CheckCircle2, Clock, AlertTriangle, Zap, TrendingUp, Award,
  RefreshCw, Wifi, Star, Medal, Trophy, X, ExternalLink, User
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const TaskDialog = lazy(() =>
  import('@/components/tasks/TaskDialog').then(m => ({ default: m.TaskDialog }))
);

// ---- Live timer hook ----
function useLiveTimer(startedAt: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const update = () => setElapsed(Date.now() - new Date(startedAt).getTime());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const secs = Math.floor(elapsed / 1000);
  const h = Math.floor(secs / 3600).toString().padStart(2, '0');
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ---- Clock component ----
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right">
      <div className="text-3xl font-mono font-bold text-white tabular-nums">
        {format(now, 'HH:mm:ss')}
      </div>
      <div className="text-xs text-gray-400 uppercase tracking-widest">
        {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </div>
    </div>
  );
}

// ---- Priority badge ----
const priorityMap: Record<string, { label: string; cls: string }> = {
  high: { label: 'Alta', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  alta: { label: 'Alta', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  medium: { label: 'Média', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  media: { label: 'Média', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  low: { label: 'Baixa', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
  baixa: { label: 'Baixa', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priorityMap[priority] || priorityMap.medium;
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ---- Task list modal ----
type ModalKind = 'open' | 'overdue' | 'completed' | null;

const modalConfig: Record<Exclude<ModalKind, null>, { title: string; icon: any; color: string }> = {
  open:      { title: 'Tarefas em Aberto',    icon: Clock,         color: 'text-blue-400' },
  overdue:   { title: 'Tarefas em Atraso',    icon: AlertTriangle, color: 'text-red-400'  },
  completed: { title: 'Concluídas Hoje',      icon: CheckCircle2,  color: 'text-emerald-400' },
};

function TaskListModal({
  kind,
  tasks,
  onClose,
  onOpenTask,
}: {
  kind: ModalKind;
  tasks: TaskItem[];
  onClose: () => void;
  onOpenTask: (id: string) => void;
}) {
  if (!kind) return null;
  const cfg = modalConfig[kind];
  const Icon = cfg.icon;

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="max-w-2xl bg-gray-900 border-white/10 text-white"
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('w-5 h-5', cfg.color)} />
            <span>{cfg.title}</span>
            <span className="ml-auto text-sm font-normal text-gray-400">{tasks.length} tarefas</span>
            <button onClick={onClose} className="ml-2 text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1 mt-2">
          {tasks.length === 0 && (
            <p className="text-center text-gray-500 py-8 text-sm">Nenhuma tarefa nesta categoria</p>
          )}
          {tasks.map(task => {
            const dl = task.due_date || task.deadline;
            const isOverdue = dl && isPast(parseISO(dl)) && task.status !== 'done';
            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg p-3 border transition-colors cursor-pointer',
                  'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
                  isOverdue && 'border-l-2 border-l-red-500'
                )}
                onClick={() => onOpenTask(task.id)}
              >
                {/* Avatar / Initial */}
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                  {task.responsible_avatar ? (
                    <img src={task.responsible_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.responsible_name && (
                      <span className="text-xs text-gray-400">{task.responsible_name}</span>
                    )}
                    {dl && (
                      <span className={cn('text-xs', isOverdue ? 'text-red-400' : 'text-gray-500')}>
                        {isOverdue ? 'Vencido · ' : 'Prazo: '}
                        {format(parseISO(dl), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={task.priority} />
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- KPI Card (clickable) ----
function KpiCard({
  label, value, icon: Icon, color, sublabel, onClick
}: {
  label: string; value: number | string; icon: any; color: string; sublabel?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex flex-col gap-2',
        onClick && 'cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98]'
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className={`text-5xl font-black tabular-nums ${color}`}>{value}</div>
      {sublabel && <div className="text-xs text-gray-500">{sublabel}</div>}
      {onClick && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100">
          <ExternalLink className="w-3 h-3 text-gray-600" />
        </div>
      )}
    </div>
  );
}

// ---- Indicator bar ----
function IndicatorBar({ label, value, color, description }: {
  label: string; value: number; color: string; description: string;
}) {
  const clamp = Math.min(100, Math.max(0, value));
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{label}</span>
        <span className={`text-4xl font-black tabular-nums ${color}`}>{value}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            clamp >= 70 ? 'bg-emerald-500' : clamp >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${clamp}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

// ---- Active Session Card (clickable) ----
function SessionCard({ session, onOpenTask }: { session: ActiveSession; onOpenTask: (id: string) => void }) {
  const timer = useLiveTimer(session.started_at);
  const isOverdue = session.task_deadline && new Date(session.task_deadline) < new Date();

  return (
    <div
      onClick={() => onOpenTask(session.task_id)}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-3 min-w-0 cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        {session.user_avatar ? (
          <img src={session.user_avatar} alt={session.user_name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50 shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-emerald-200">
              {session.user_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-emerald-400 font-semibold truncate">{session.user_name}</p>
          <p className="text-sm font-bold text-white truncate leading-tight">{session.task_title}</p>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
      </div>

      {isOverdue && (
        <div className="flex items-center gap-1.5 rounded-md bg-red-900/40 border border-red-500/30 px-2 py-1">
          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">Vencido</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="font-mono text-xl font-bold text-emerald-300 tabular-nums">{timer}</span>
      </div>
    </div>
  );
}

// ---- Rank icon ----
function RankIcon({ pos }: { pos: number }) {
  if (pos === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
  if (pos === 1) return <Medal className="w-5 h-5 text-gray-300" />;
  if (pos === 2) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-500">#{pos + 1}</span>;
}

// ---- Ranking row ----
function RankingRow({ collab, pos, metric }: {
  collab: CollaboratorRanking; pos: number;
  metric: 'score' | 'regularity' | 'efficiency';
}) {
  const val = collab[metric];
  const color = val >= 70 ? 'bg-emerald-500' : val >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <RankIcon pos={pos} />
      {collab.user_avatar ? (
        <img src={collab.user_avatar} alt={collab.user_name}
          className="w-8 h-8 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-gray-300">{collab.user_name.charAt(0)}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{collab.user_name}</p>
        <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
          <span>R: {collab.regularity}%</span>
          <span>Q: {collab.quality}%</span>
          <span>E: {collab.efficiency}%</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-lg font-black text-white tabular-nums">{val}%</span>
        <div className="w-20 h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${val}%` }} />
        </div>
      </div>
    </div>
  );
}

// ---- Main Dashboard ----
export default function TaskTvDashboard() {
  const { data, isLoading, isFetching, refetch } = useTaskTvDashboard(30_000);
  const { activeCompany } = useCompany();

  // Modal state for KPI cards
  const [listModal, setListModal] = useState<ModalKind>(null);
  // Task dialog state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  function openTask(id: string) {
    setListModal(null); // close list modal first
    setEditingTaskId(id);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 animate-spin text-emerald-400" />
          <p className="text-gray-400 text-lg">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Erro ao carregar dados.</p>
      </div>
    );
  }

  const topPerformers  = [...data.rankings].sort((a, b) => b.score      - a.score     ).slice(0, 5);
  const topRegularity  = [...data.rankings].sort((a, b) => b.regularity - a.regularity).slice(0, 5);
  const topEfficiency  = [...data.rankings].sort((a, b) => b.efficiency - a.efficiency).slice(0, 5);

  const listTasks: TaskItem[] =
    listModal === 'open'      ? data.openTasksList :
    listModal === 'overdue'   ? data.overdueTasksList :
    listModal === 'completed' ? data.completedTodayList : [];

  // Find the full task object for TaskDialog
  const editingTask = editingTaskId
    ? [...data.openTasksList, ...data.overdueTasksList, ...data.completedTodayList].find(t => t.id === editingTaskId)
    : null;

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col gap-5" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* ---- HEADER ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {activeCompany?.company?.name || 'Dashboard de Tarefas'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-widest">Painel de Operações em Tempo Real</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs">
            {isFetching
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /><span className="text-emerald-400">Atualizando...</span></>
              : <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-gray-400">Ao vivo</span></>
            }
          </div>
          <LiveClock />
        </div>
      </div>

      {/* ---- KPI ROW ---- */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Em Aberto" value={data.openTasks} icon={Clock} color="text-blue-400"
          sublabel="Clique para ver a lista"
          onClick={() => setListModal('open')} />
        <KpiCard label="Em Atraso" value={data.overdueTasks} icon={AlertTriangle} color="text-red-400"
          sublabel="Clique para ver a lista"
          onClick={() => setListModal('overdue')} />
        <KpiCard label="Concluídas Hoje" value={data.completedToday} icon={CheckCircle2} color="text-emerald-400"
          sublabel={`Clique para ver — ${format(new Date(), 'dd/MM')}`}
          onClick={() => setListModal('completed')} />
        <KpiCard label="Executando Agora" value={data.executingNow} icon={Zap} color="text-yellow-400"
          sublabel="Sessões ativas" />
      </div>

      {/* ---- INDICATORS ---- */}
      <div className="grid grid-cols-3 gap-4">
        <IndicatorBar label="Regularidade" value={data.regularity} color="text-blue-400"
          description="Mede tarefas abertas em relação às que estão dentro do prazo." />
        <IndicatorBar label="Qualidade" value={data.quality} color="text-emerald-400"
          description="Índice de eficiência das tarefas concluídas sem retrabalho." />
        <IndicatorBar label="Eficiência" value={data.efficiency} color="text-yellow-400"
          description="Combina regularidade e qualidade para medir eficiência geral." />
      </div>

      {/* ---- EXECUTING NOW + RANKINGS ---- */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Active sessions */}
        <div className="col-span-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
              Executando Agora ({data.executingNow})
            </h2>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-72 pr-1">
            {data.activeSessions.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col items-center gap-2">
                <Zap className="w-8 h-8 text-gray-600" />
                <p className="text-sm text-gray-500">Nenhuma sessão ativa</p>
              </div>
            ) : (
              data.activeSessions.map(s => (
                <SessionCard key={s.session_id} session={s} onOpenTask={openTask} />
              ))
            )}
          </div>
        </div>

        {/* Rankings */}
        <div className="col-span-8 grid grid-cols-3 gap-4">
          {/* Top Performers */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Top Performers</h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">Score combinado da última semana</p>
            <div className="flex-1">
              {topPerformers.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">Sem dados suficientes</p>
              ) : (
                topPerformers.map((c, i) => <RankingRow key={c.user_id} collab={c} pos={i} metric="score" />)
              )}
            </div>
          </div>

          {/* Top Regularidade */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Top Regularidade</h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">Tarefas entregues dentro do prazo</p>
            <div className="flex-1">
              {topRegularity.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">Sem dados suficientes</p>
              ) : (
                topRegularity.map((c, i) => <RankingRow key={c.user_id} collab={c} pos={i} metric="regularity" />)
              )}
            </div>
          </div>

          {/* Top Eficiência */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Top Eficiência</h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">Conclusão vs. em andamento</p>
            <div className="flex-1">
              {topEfficiency.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">Sem dados suficientes</p>
              ) : (
                topEfficiency.map((c, i) => <RankingRow key={c.user_id} collab={c} pos={i} metric="efficiency" />)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- FOOTER ---- */}
      <div className="flex items-center justify-between text-xs text-gray-600 border-t border-white/5 pt-3">
        <span>Atualização automática a cada 30 segundos · Clique nos cards para ver detalhes</span>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Atualizar agora
        </button>
        <span>
          Última sync: {data.lastSync ? format(data.lastSync, 'HH:mm:ss') : '—'}
        </span>
      </div>

      {/* ---- MODALS ---- */}
      {listModal && (
        <TaskListModal
          kind={listModal}
          tasks={listTasks}
          onClose={() => setListModal(null)}
          onOpenTask={openTask}
        />
      )}

      {editingTaskId && (
        <Suspense fallback={null}>
          <TaskDialog
            open={!!editingTaskId}
            onOpenChange={open => { if (!open) setEditingTaskId(null); }}
            task={editingTask ? {
              id: editingTask.id,
              title: editingTask.title,
              status: editingTask.status as any,
              priority: editingTask.priority as any,
              deadline: editingTask.deadline,
              due_date: editingTask.due_date,
              responsible_name: editingTask.responsible_name,
              responsible_avatar: editingTask.responsible_avatar,
              assigned_user_id: editingTask.assigned_user_id,
              user_id: editingTask.user_id,
            } as any : undefined}
            onSave={() => { setEditingTaskId(null); refetch(); }}
            onDelete={() => { setEditingTaskId(null); refetch(); }}
          />
        </Suspense>
      )}
    </div>
    </TooltipProvider>
  );
}
