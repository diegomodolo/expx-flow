import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  useTaskTvDashboard, ActiveSession, CollaboratorRanking, TaskItem, SquadTvRanking, CompletionTrendDay
} from '@/hooks/useTaskTvDashboard';
import { useCompany } from '@/contexts/CompanyContext';
import {
  CheckCircle2, Clock, AlertTriangle, Zap, TrendingUp, Award,
  RefreshCw, Wifi, Star, Medal, Trophy, X, ExternalLink, User, Search,
  ClipboardCheck, Timer, Users, PartyPopper, Siren
} from 'lucide-react';
import { RadarTVControls } from '@/components/radar-tv-dashboard/RadarTVControls';
import { TooltipProvider } from '@/components/ui/tooltip';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';

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
  high:   { label: 'Alta',  cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  alta:   { label: 'Alta',  cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  medium: { label: 'Média', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  media:  { label: 'Média', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  low:    { label: 'Baixa', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
  baixa:  { label: 'Baixa', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priorityMap[priority] || priorityMap.medium;
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ---- Celebration Overlay ----
function CelebrationOverlay({ task, onDismiss }: { task: TaskItem; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Pulsing rings */}
      <div className="absolute w-96 h-96 rounded-full bg-yellow-400/10 animate-ping" style={{ animationDuration: '0.8s' }} />
      <div className="absolute w-80 h-80 rounded-full bg-emerald-400/10 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }} />

      {/* Card */}
      <div
        className="relative flex flex-col items-center gap-5 rounded-3xl px-16 py-12 shadow-2xl text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.25) 0%, rgba(16,185,129,0.25) 100%)',
          border: '2px solid rgba(251,191,36,0.5)',
          backdropFilter: 'blur(24px)',
          animation: 'celebrationPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        <div style={{ fontSize: 80 }} className="animate-bounce select-none">🏆</div>
        <div className="flex flex-col gap-2">
          <div className="text-yellow-300 text-sm font-bold uppercase tracking-[0.3em]">Alta Prioridade Concluída</div>
          <div className="text-white font-black text-4xl leading-tight max-w-lg">{task.title}</div>
          {task.responsible_name && (
            <div className="text-emerald-300 text-lg font-semibold mt-1">🎉 {task.responsible_name}</div>
          )}
        </div>
        {/* Dismiss hint */}
        <div className="text-gray-500 text-xs mt-2">Fechando automaticamente...</div>
      </div>

      <style>{`
        @keyframes celebrationPop {
          from { opacity: 0; transform: scale(0.5) translateY(40px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);    }
        }
      `}</style>
    </div>
  );
}

// ---- Critical Alert Banner ----
function CriticalAlertBanner({ task, onDismiss }: { task: TaskItem; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 12000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-8" style={{ pointerEvents: 'none' }}>
      {/* Subtle backdrop flash */}
      <div className="absolute inset-0 bg-red-950/40" style={{ animation: 'alertFlash 1s ease-in-out infinite alternate' }} />

      {/* Banner */}
      <div
        className="relative w-full max-w-4xl mx-6 rounded-2xl shadow-2xl overflow-hidden"
        style={{ pointerEvents: 'auto', animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        {/* Red animated top bar */}
        <div className="h-1.5 w-full bg-red-500" style={{ animation: 'shrinkBar 12s linear forwards' }} />

        <div className="bg-red-950/95 border border-red-500/60 px-8 py-5 flex items-center gap-5 backdrop-blur-xl">
          <Siren className="w-10 h-10 text-red-400 shrink-0" style={{ animation: 'pulse 0.6s ease-in-out infinite alternate' }} />
          <div className="flex-1 min-w-0">
            <div className="text-red-400 text-xs font-bold uppercase tracking-[0.3em] mb-1">
              ⚠ Tarefa de Alta Prioridade em Atraso
            </div>
            <div className="text-white font-black text-2xl truncate">{task.title}</div>
            {task.responsible_name && (
              <div className="text-red-300 text-sm mt-0.5">Responsável: {task.responsible_name}</div>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-white transition-colors shrink-0 p-2 hover:bg-red-800/50 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes alertFlash {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(60px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shrinkBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}


// ---- Task list modal ----
type ModalKind = 'open' | 'overdue' | 'completed' | 'review' | null;

const modalConfig: Record<Exclude<ModalKind, null>, { title: string; icon: any; color: string }> = {
  open:      { title: 'Tarefas em Aberto',      icon: Clock,           color: 'text-blue-400' },
  overdue:   { title: 'Tarefas em Atraso',      icon: AlertTriangle,   color: 'text-red-400'  },
  completed: { title: 'Concluídas Hoje',        icon: CheckCircle2,    color: 'text-emerald-400' },
  review:    { title: 'Aguardando Revisão',     icon: ClipboardCheck,  color: 'text-purple-400' },
};

function TaskListModal({
  kind, tasks, onClose, onOpenTask,
}: {
  kind: ModalKind; tasks: TaskItem[]; onClose: () => void; onOpenTask: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  if (!kind) return null;
  const cfg = modalConfig[kind];
  const Icon = cfg.icon;

  const filtered = search.trim()
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.responsible_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : tasks;

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-gray-900 border-white/10 text-white" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('w-5 h-5', cfg.color)} />
            <span>{cfg.title}</span>
            <span className="ml-auto text-sm font-normal text-gray-400">{filtered.length} de {tasks.length}</span>
            <button onClick={onClose} className="ml-2 text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por título ou responsável..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1 mt-1">
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 py-8 text-sm">
              {search ? 'Nenhuma tarefa encontrada para essa busca' : 'Nenhuma tarefa nesta categoria'}
            </p>
          )}
          {filtered.map(task => {
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

// ---- KPI Card ----
function KpiCard({
  label, value, icon: Icon, color, sublabel, onClick
}: {
  label: string; value: number | string; icon: any; color: string; sublabel?: string; onClick?: () => void;
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

// ---- Completion Trend Chart ----
function CompletionTrendChart({ data }: { data: CompletionTrendDay[] }) {
  const maxVal = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Ritmo de Conclusão</h3>
          <span className="text-xs text-gray-600">· últimos 14 dias</span>
        </div>
        <span className="text-xs text-gray-500">
          Total: {data.reduce((s, d) => s + d.count, 0)} tarefas
        </span>
      </div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <RechartTooltip
              contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#10b981' }}
              formatter={(v: any) => [`${v} tarefas`, 'Concluídas']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.count === maxVal ? '#10b981' : 'url(#barGrad)'}
                  opacity={entry.count === 0 ? 0.2 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Squad Ranking Card ----
function SquadRankCard({ squad, pos }: { squad: SquadTvRanking; pos: number }) {
  const scoreColor = squad.productivityScore >= 70 ? '#10b981' : squad.productivityScore >= 40 ? '#f59e0b' : '#ef4444';
  const medal = pos === 0 ? '🥇' : pos === 1 ? '🥈' : pos === 2 ? '🥉' : null;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 w-6 shrink-0">
        {medal ? (
          <span className="text-lg">{medal}</span>
        ) : (
          <span className="text-xs font-bold text-gray-500">#{pos + 1}</span>
        )}
      </div>

      {/* Squad color dot */}
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: squad.team_color || '#6366f1' }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-white truncate">{squad.team_name}</p>
          {squad.activeSessions > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-semibold">{squad.activeSessions} ativo{squad.activeSessions > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
          <span>{squad.completedTasks}/{squad.totalTasks} concluídas</span>
          {squad.overdueTasks > 0 && (
            <span className="text-red-400">{squad.overdueTasks} atrasada{squad.overdueTasks > 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${squad.productivityScore}%`, backgroundColor: scoreColor }}
            />
          </div>
          <span className="text-xs font-black tabular-nums shrink-0" style={{ color: scoreColor }}>
            {squad.productivityScore}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- Active Session Card ----
function SessionCard({ session, onOpenTask }: { session: ActiveSession; onOpenTask: (id: string) => void }) {
  const timer = useLiveTimer(session.started_at);
  const isOverdue = session.task_deadline && new Date(session.task_deadline) < new Date();

  return (
    <div
      onClick={() => onOpenTask(session.task_id)}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-3 min-w-0 cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all active:scale-[0.98]"
    >
      {/* Header: colaborador + timer */}
      <div className="flex items-center gap-3">
        {session.user_avatar ? (
          <img src={session.user_avatar} alt={session.user_name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50 shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-emerald-200">{session.user_name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-emerald-400 font-semibold truncate">{session.user_name}</p>
          <p className="text-sm font-bold text-white truncate leading-tight">{session.task_title}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-lg font-bold text-emerald-300 tabular-nums">{timer}</span>
        </div>
      </div>

      {/* Client badge */}
      {session.client_name && (
        <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          {session.client_avatar ? (
            <img
              src={session.client_avatar}
              alt={session.client_name}
              className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-white/20"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-gray-400" />
            </div>
          )}
          <span className="text-xs font-semibold text-gray-300 truncate">{session.client_name}</span>
        </div>
      )}

      {isOverdue && (
        <div className="flex items-center gap-1.5 rounded-md bg-red-900/40 border border-red-500/30 px-2 py-1">
          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">Vencido</span>
        </div>
      )}
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
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('task-tv-refresh-interval');
    return saved ? parseInt(saved) : 30_000;
  });
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('task-tv-zoom');
    return saved ? parseInt(saved) : 100;
  });
  const [rotation, setRotation] = useState(() => {
    const saved = localStorage.getItem('task-tv-rotation');
    return saved ? parseInt(saved) : 0;
  });

  const handleZoomChange = (v: number) => { setZoom(v); localStorage.setItem('task-tv-zoom', v.toString()); };
  const handleRotationChange = (v: number) => { setRotation(v); localStorage.setItem('task-tv-rotation', v.toString()); };
  const handleRefreshIntervalChange = (v: number) => { setRefreshInterval(v); localStorage.setItem('task-tv-refresh-interval', v.toString()); };

  const { data, isLoading, isFetching, refetch } = useTaskTvDashboard(refreshInterval);
  const { activeCompany } = useCompany();

  const [listModal, setListModal] = useState<ModalKind>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // --- Alert states ---
  const [celebrationTask, setCelebrationTask] = useState<TaskItem | null>(null);
  const [criticalAlert, setCriticalAlert] = useState<TaskItem | null>(null);
  const prevCompletedIdsRef = useRef<Set<string>>(new Set());
  const prevOverdueIdsRef = useRef<Set<string>>(new Set());
  // Track whether first load has happened (to avoid alerts on initial render)
  const completedInitializedRef = useRef(false);
  const overdueInitializedRef = useRef(false);

  // Detect new high-priority completions
  useEffect(() => {
    if (!data) return;
    const currentIds = new Set(data.completedTodayList.map(t => t.id));

    if (!completedInitializedRef.current) {
      // First load — just seed the ref, no alert
      prevCompletedIdsRef.current = currentIds;
      completedInitializedRef.current = true;
      return;
    }

    const newHighPriority = data.completedTodayList.filter(
      t => !prevCompletedIdsRef.current.has(t.id) && ['high', 'alta'].includes(t.priority?.toLowerCase() ?? '')
    );
    if (newHighPriority.length > 0) {
      setCelebrationTask(newHighPriority[0]);
    }
    prevCompletedIdsRef.current = currentIds;
  }, [data?.completedTodayList]);

  // Detect new high-priority overdues
  useEffect(() => {
    if (!data) return;
    const currentIds = new Set(data.overdueTasksList.map(t => t.id));

    if (!overdueInitializedRef.current) {
      // First load — just seed the ref, no alert
      prevOverdueIdsRef.current = currentIds;
      overdueInitializedRef.current = true;
      return;
    }

    const newOverdue = data.overdueTasksList.filter(
      t => !prevOverdueIdsRef.current.has(t.id) && ['high', 'alta'].includes(t.priority?.toLowerCase() ?? '')
    );
    if (newOverdue.length > 0 && !criticalAlert) {
      setCriticalAlert(newOverdue[0]);
    }
    prevOverdueIdsRef.current = currentIds;
  }, [data?.overdueTasksList, criticalAlert]);

  function openTask(id: string) {
    setListModal(null);
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

  const topPerformers = [...data.rankings].sort((a, b) => b.score      - a.score     ).slice(0, 5);
  const topRegularity = [...data.rankings].sort((a, b) => b.regularity - a.regularity).slice(0, 5);
  const topEfficiency = [...data.rankings].sort((a, b) => b.efficiency - a.efficiency).slice(0, 5);

  const listTasks: TaskItem[] =
    listModal === 'open'      ? data.openTasksList :
    listModal === 'overdue'   ? data.overdueTasksList :
    listModal === 'completed' ? data.completedTodayList :
    listModal === 'review'    ? data.reviewTasksList : [];

  const allTasksForEdit = [
    ...data.openTasksList, ...data.overdueTasksList,
    ...data.completedTodayList, ...data.reviewTasksList,
  ];
  const editingTask = editingTaskId ? allTasksForEdit.find(t => t.id === editingTaskId) : null;

  const isRotated = rotation === 90 || rotation === 270;

  return (
    <div
      className="min-h-screen bg-gray-950 overflow-hidden"
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: rotation === 90 ? 'top left' : rotation === 270 ? 'bottom right' : 'center',
        width: isRotated ? '100vh' : '100%',
        height: isRotated ? '100vw' : '100%',
        position: isRotated ? 'absolute' : 'relative',
        top: rotation === 90 ? 0 : rotation === 270 ? 'auto' : undefined,
        left: rotation === 90 ? '100vw' : undefined,
        bottom: rotation === 270 ? '100vh' : undefined,
        right: rotation === 270 ? 0 : undefined,
      }}
    >
      {/* Celebration Overlay */}
      {celebrationTask && (
        <CelebrationOverlay task={celebrationTask} onDismiss={() => setCelebrationTask(null)} />
      )}

      {/* Critical Alert Banner */}
      {criticalAlert && (
        <CriticalAlertBanner task={criticalAlert} onDismiss={() => setCriticalAlert(null)} />
      )}

      <TooltipProvider>
        <div
          className="text-white p-6 flex flex-col gap-5 origin-top-left"
          style={{
            transform: `scale(${zoom / 100})`,
            width: `${10000 / zoom}%`,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
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

          {/* ---- KPI ROW — 6 cards ---- */}
          <div className="grid grid-cols-6 gap-4">
            <KpiCard label="Em Aberto" value={data.openTasks} icon={Clock} color="text-blue-400"
              sublabel="Clique para ver a lista" onClick={() => setListModal('open')} />
            <KpiCard label="Em Atraso" value={data.overdueTasks} icon={AlertTriangle} color="text-red-400"
              sublabel="Clique para ver a lista" onClick={() => setListModal('overdue')} />
            <KpiCard label="Concluídas Hoje" value={data.completedToday} icon={CheckCircle2} color="text-emerald-400"
              sublabel={`Clique para ver — ${format(new Date(), 'dd/MM')}`} onClick={() => setListModal('completed')} />
            <KpiCard label="Em Revisão" value={data.reviewTasks} icon={ClipboardCheck} color="text-purple-400"
              sublabel="Aguardando aprovação" onClick={() => setListModal('review')} />
            <KpiCard label="Executando Agora" value={data.executingNow} icon={Zap} color="text-yellow-400"
              sublabel="Sessões ativas" />
            <KpiCard
              label="Horas Rastreadas (7d)"
              value={`${data.hoursTrackedLast7Days}h`}
              icon={Timer}
              color="text-cyan-400"
              sublabel={`Média ${data.avgHoursPerCollaborator}h/colaborador`}
            />
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

          {/* ---- TREND CHART ---- */}
          {data.completionTrend.length > 0 && (
            <CompletionTrendChart data={data.completionTrend} />
          )}

          {/* ---- EXECUTANDO AGORA — linha completa, só aparece se houver sessões ---- */}
          {data.activeSessions.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                  Executando Agora — {data.executingNow} sessão{data.executingNow !== 1 ? 'ões' : ''} ativa{data.executingNow !== 1 ? 's' : ''}
                </h2>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(data.activeSessions.length, 4)}, minmax(0, 1fr))` }}>
                {data.activeSessions.map(s => (
                  <SessionCard key={s.session_id} session={s} onOpenTask={openTask} />
                ))}
              </div>
            </div>
          )}

          {/* ---- SQUADS + RANKINGS ---- */}
          <div className="grid grid-cols-12 gap-4">
            {/* Squad Ranking */}
            {data.squadRankings.length > 0 && (
              <div className="col-span-3 rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Performance por Squad</h3>
                </div>
                <div className="flex flex-col">
                  {data.squadRankings.slice(0, 6).map((sq, i) => (
                    <SquadRankCard key={sq.team_id} squad={sq} pos={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Rankings */}
            <div className={cn(
              'grid grid-cols-3 gap-4',
              data.squadRankings.length > 0 ? 'col-span-9' : 'col-span-12'
            )}>
              {/* Top Performers */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Top Performers</h3>
                </div>
                <p className="text-xs text-gray-500 mb-2">Score combinado da última semana</p>
                {topPerformers.length === 0
                  ? <p className="text-xs text-gray-600 text-center py-4">Sem dados suficientes</p>
                  : topPerformers.map((c, i) => <RankingRow key={c.user_id} collab={c} pos={i} metric="score" />)
                }
              </div>

              {/* Top Regularidade */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Top Regularidade</h3>
                </div>
                <p className="text-xs text-gray-500 mb-2">Tarefas entregues dentro do prazo</p>
                {topRegularity.length === 0
                  ? <p className="text-xs text-gray-600 text-center py-4">Sem dados suficientes</p>
                  : topRegularity.map((c, i) => <RankingRow key={c.user_id} collab={c} pos={i} metric="regularity" />)
                }
              </div>

              {/* Top Eficiência */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Top Eficiência</h3>
                </div>
                <p className="text-xs text-gray-500 mb-2">Conclusão vs. em andamento</p>
                {topEfficiency.length === 0
                  ? <p className="text-xs text-gray-600 text-center py-4">Sem dados suficientes</p>
                  : topEfficiency.map((c, i) => <RankingRow key={c.user_id} collab={c} pos={i} metric="efficiency" />)
                }
              </div>
            </div>
          </div>

          {/* ---- FOOTER ---- */}
          <div className="flex items-center justify-between text-xs text-gray-600 border-t border-white/5 pt-3">
            <span>Atualização automática a cada {refreshInterval / 1000}s · Clique nos cards para ver detalhes</span>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar agora
            </button>
            <span>Última sync: {data.lastSync ? format(data.lastSync, 'HH:mm:ss') : '—'}</span>
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

      {/* ---- SETTINGS CONTROLS ---- */}
      <RadarTVControls
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={handleRefreshIntervalChange}
        onRefreshNow={() => refetch()}
        isRefreshing={isFetching}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        rotation={rotation}
        onRotationChange={handleRotationChange}
      />
    </div>
  );
}
