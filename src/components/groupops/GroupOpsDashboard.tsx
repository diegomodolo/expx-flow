import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGroupOpsDashboard } from '@/hooks/useGroupOpsDashboard';
import { useGroupOpsGroups } from '@/hooks/useGroupOpsGroups';
import {
  MessageSquare,
  Users,
  AlertTriangle,
  Trophy,
  VolumeX,
  Megaphone,
  Zap,
  Pause,
  BarChart3,
} from 'lucide-react';

export default function GroupOpsDashboard() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [rankingGroupId, setRankingGroupId] = useState<string | undefined>();
  const { groups } = useGroupOpsGroups();
  const { stats, isLoading } = useGroupOpsDashboard(selectedGroupId);
  const { stats: rankingStats } = useGroupOpsDashboard(rankingGroupId);

  const podiumColors = ['text-yellow-500', 'text-slate-400', 'text-amber-700'];
  const podiumEmojis = ['🥇', '🥈', '🥉'];
  const top3 = rankingStats?.top10.slice(0, 3) ?? [];
  const restRanking = rankingStats?.top10.slice(3) ?? [];

  return (
    <div className="space-y-6">
      {/* Group selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedGroupId ?? 'all'} onValueChange={(v) => setSelectedGroupId(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todos os grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Membros Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mensagens 24h</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.messages24h ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              7d: {stats?.messages7d ?? 0} · 30d: {stats?.messages30d ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Silenciosos (≥14d)</CardTitle>
            <VolumeX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.silentMembers.length ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risco Alto</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.riskMembers.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking de Engajamento — Semana
            </CardTitle>
            <Select value={rankingGroupId ?? 'all'} onValueChange={(v) => setRankingGroupId(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {top3.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado de engajamento ainda. Sincronize o histórico de mensagens para ver o ranking.</p>
            ) : (
              <div className="space-y-6">
                {/* Podium - Top 3 */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 0, 2].map((idx) => {
                    const entry = top3[idx];
                    if (!entry) return <div key={idx} />;
                    const isFirst = idx === 0;
                    return (
                      <div
                        key={entry.memberId}
                        className={`flex flex-col items-center gap-2 py-4 rounded-lg ${isFirst ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-muted/50'}`}
                      >
                        <span className="text-2xl">{podiumEmojis[idx]}</span>
                        <Avatar className={`${isFirst ? 'h-14 w-14' : 'h-10 w-10'} border-2 ${isFirst ? 'border-yellow-500' : 'border-muted-foreground/30'}`}>
                          <AvatarFallback className={`text-sm font-bold ${podiumColors[idx]} bg-background`}>
                            {(entry.name || '?').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`text-sm font-semibold text-center truncate max-w-full px-2 ${podiumColors[idx]}`}>
                          {entry.name}
                        </span>
                        <Badge variant="secondary" className={isFirst ? 'bg-yellow-500/20 text-yellow-600' : ''}>
                          {entry.score} msgs
                        </Badge>
                      </div>
                    );
                  })}
                </div>

                {/* Rest of ranking */}
                {restRanking.length > 0 && (
                  <div className="space-y-2">
                    {restRanking.map((entry, i) => (
                      <div key={entry.memberId} className="flex items-center justify-between py-1.5 border-b last:border-0 border-border/50">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5">#{i + 4}</span>
                          <span className="text-sm">{entry.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">{entry.score} msgs</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" disabled>
              <Megaphone className="h-5 w-5" />
              <span className="text-xs">Criar Campanha</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" disabled>
              <Zap className="h-5 w-5" />
              <span className="text-xs">Postar Provocação</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" disabled>
              <Pause className="h-5 w-5" />
              <span className="text-xs">Pausar Bot</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" disabled>
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Gerar Ranking</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Silent members radar */}
      {(stats?.silentMembers.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Radar: Membros Silenciosos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats!.silentMembers.slice(0, 10).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{m.display_name ?? 'Sem nome'}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{m.silent_days}d sem atividade</Badge>
                    <Button size="sm" variant="ghost" disabled>Cutucar</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
