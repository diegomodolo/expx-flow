import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  const { groups } = useGroupOpsGroups();
  const { stats, isLoading } = useGroupOpsDashboard(selectedGroupId);

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top 10 da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.top10.length ? (
              <p className="text-sm text-muted-foreground">Nenhum dado de pontuação ainda</p>
            ) : (
              <div className="space-y-3">
                {stats.top10.map((entry, i) => (
                  <div key={entry.memberId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-6 ${i < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                        #{i + 1}
                      </span>
                      <span className="text-sm font-medium">{entry.name}</span>
                    </div>
                    <Badge variant="secondary">{entry.score} pts</Badge>
                  </div>
                ))}
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
