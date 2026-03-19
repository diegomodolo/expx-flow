import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useSquadDashboard,
  SquadPerformance,
  MemberPerformance,
} from "@/hooks/useSquadDashboard";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trophy,
  TrendingUp,
  BarChart3,
  Target,
  Loader2,
  Crown,
  Flame,
  Zap,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";

const CHART_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(25, 95%, 53%)",
  "hsl(346, 77%, 50%)",
  "hsl(47, 96%, 53%)",
  "hsl(173, 80%, 40%)",
  "hsl(322, 65%, 55%)",
];

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<unknown>;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-emerald-500/10 text-emerald-500",
    orange: "bg-orange-500/10 text-orange-500",
    red: "bg-red-500/10 text-red-500",
    purple: "bg-purple-500/10 text-purple-500",
    yellow: "bg-yellow-500/10 text-yellow-600",
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && trendLabel && (
              <div className="flex items-center gap-1 mt-1">
                {trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : trend === "down" ? (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                ) : null}
                <span
                  className={`text-xs font-medium ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}`}
                >
                  {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.primary}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberRankingRow({
  member,
  rank,
}: {
  member: MemberPerformance;
  rank: number;
}) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Trophy className="h-4 w-4 text-orange-600" />;
    return (
      <span className="text-xs font-medium text-muted-foreground w-4 text-center">
        {rank}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-6 flex items-center justify-center">
        {getRankIcon(rank)}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={member.avatar || undefined} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {member.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {member.name}
        </p>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: member.squadColor }}
          />
          <p className="text-xs text-muted-foreground truncate">
            {member.squadName}
          </p>
        </div>
      </div>
      <div className="text-right space-y-0.5">
        <p className="text-sm font-semibold text-foreground">
          {member.completedTasks}
        </p>
        <p className="text-[10px] text-muted-foreground">concluídas</p>
      </div>
      <div className="text-right space-y-0.5 hidden sm:block">
        <p className="text-sm font-medium text-foreground">
          {member.completionRate}%
        </p>
        <p className="text-[10px] text-muted-foreground">taxa</p>
      </div>
    </div>
  );
}

function SquadCard({ squad }: { squad: SquadPerformance }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10";
    if (score >= 60) return "bg-yellow-500/10";
    if (score >= 40) return "bg-orange-500/10";
    return "bg-red-500/10";
  };

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-8 rounded-full"
              style={{ backgroundColor: squad.color }}
            />
            <div>
              <h3 className="font-semibold text-foreground">{squad.name}</h3>
              {squad.leaderName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Crown className="h-3 w-3 text-yellow-500" />{" "}
                  {squad.leaderName}
                </p>
              )}
            </div>
          </div>
          <div
            className={`px-3 py-1.5 rounded-lg ${getScoreBg(squad.productivityScore)}`}
          >
            <span
              className={`text-lg font-bold ${getScoreColor(squad.productivityScore)}`}
            >
              {squad.productivityScore}
            </span>
            <span className="text-[10px] text-muted-foreground ml-0.5">
              /100
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">
              {squad.membersCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Membros</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">
              {squad.clientsCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Clientes</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">
              {squad.completedTasks}
            </p>
            <p className="text-[10px] text-muted-foreground">Concluídas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-red-500">
              {squad.overdueTasks}
            </p>
            <p className="text-[10px] text-muted-foreground">Atrasadas</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Taxa de Conclusão</span>
            <span className="font-medium text-foreground">
              {squad.completionRate}%
            </span>
          </div>
          <Progress value={squad.completionRate} className="h-2" />
        </div>

        {/* Bottom stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" /> {squad.tasksLast7Days} nos últimos 7
            dias
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" /> ~{squad.avgCompletionDays}d/tarefa
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SquadDashboard() {
  const { loading, kpis, squadsPerformance, membersRanking } =
    useSquadDashboard();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Chart data
  const squadComparisonData = squadsPerformance.map((s) => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
    Concluídas: s.completedTasks,
    "Em Andamento": s.inProgressTasks,
    Atrasadas: s.overdueTasks,
    color: s.color,
  }));

  const statusDistributionData = [
    {
      name: "Concluídas",
      value: kpis.completedTasks,
      fill: "hsl(142, 71%, 45%)",
    },
    {
      name: "Em Andamento",
      value: kpis.inProgressTasks,
      fill: "hsl(217, 91%, 60%)",
    },
    { name: "Atrasadas", value: kpis.overdueTasks, fill: "hsl(4, 90%, 58%)" },
    {
      name: "Pendentes",
      value: Math.max(
        0,
        kpis.totalTasks -
          kpis.completedTasks -
          kpis.inProgressTasks -
          kpis.overdueTasks,
      ),
      fill: "hsl(0, 0%, 70%)",
    },
  ].filter((d) => d.value > 0);

  const radarData = squadsPerformance.slice(0, 5).map((s) => ({
    squad: s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name,
    Produtividade: s.productivityScore,
    Conclusão: s.completionRate,
    Velocidade: Math.max(0, 100 - s.avgCompletionDays * 10),
    Volume: Math.min(100, s.tasksLast30Days * 3),
  }));

  const productivityRankingData = squadsPerformance.map((s, i) => ({
    name: s.name.length > 15 ? s.name.slice(0, 15) + "…" : s.name,
    score: s.productivityScore,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6 pb-8">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <BarChart3 className="text-primary h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Dashboard de Equipe
            </h1>
            <p className="text-muted-foreground text-sm">
              Visão consolidada de performance e produtividade por squad
            </p>
          </div>
        </div>

        {/* KPIs Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <KPICard
            title="Squads"
            value={kpis.totalSquads}
            icon={Users}
            color="primary"
          />
          <KPICard
            title="Membros"
            value={kpis.totalMembers}
            icon={Users}
            color="blue"
          />
          <KPICard
            title="Total Tarefas"
            value={kpis.totalTasks}
            icon={Target}
            color="purple"
          />
          <KPICard
            title="Concluídas"
            value={kpis.completedTasks}
            icon={CheckCircle2}
            color="green"
          />
          <KPICard
            title="Em Andamento"
            value={kpis.inProgressTasks}
            icon={Clock}
            color="blue"
          />
          <KPICard
            title="Atrasadas"
            value={kpis.overdueTasks}
            icon={AlertTriangle}
            color="red"
          />
          <KPICard
            title="Taxa Conclusão"
            value={`${kpis.globalCompletionRate}%`}
            icon={TrendingUp}
            color="green"
          />
          <KPICard
            title="Tempo Médio"
            value={`${kpis.avgCompletionDays}d`}
            subtitle="por tarefa"
            icon={Timer}
            color="orange"
          />
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border shadow-sm bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Squad com melhor performance
                </p>
                <p className="font-semibold text-foreground">
                  {kpis.topSquad || "—"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm bg-orange-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                <p className="font-semibold text-foreground">
                  {kpis.tasksLast7Days} tarefas concluídas
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm bg-blue-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                <p className="font-semibold text-foreground">
                  {kpis.tasksLast30Days} tarefas concluídas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList>
            <TabsTrigger value="comparison">Comparativo</TabsTrigger>
            <TabsTrigger value="distribution">Distribuição</TabsTrigger>
            <TabsTrigger value="radar">Radar</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="mt-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tarefas por Squad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={squadComparisonData} barGap={4}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <YAxis
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar
                        dataKey="Concluídas"
                        fill="hsl(142, 71%, 45%)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Em Andamento"
                        fill="hsl(217, 91%, 60%)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Atrasadas"
                        fill="hsl(4, 90%, 58%)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="mt-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Distribuição Geral de Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {statusDistributionData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="radar" className="mt-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Radar de Performance (Top 5 Squads)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="squad"
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 9 }}
                      />
                      <Radar
                        name="Produtividade"
                        dataKey="Produtividade"
                        stroke="hsl(142, 71%, 45%)"
                        fill="hsl(142, 71%, 45%)"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="Conclusão"
                        dataKey="Conclusão"
                        stroke="hsl(217, 91%, 60%)"
                        fill="hsl(217, 91%, 60%)"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="Velocidade"
                        dataKey="Velocidade"
                        stroke="hsl(262, 83%, 58%)"
                        fill="hsl(262, 83%, 58%)"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="Volume"
                        dataKey="Volume"
                        stroke="hsl(25, 95%, 53%)"
                        fill="hsl(25, 95%, 53%)"
                        fillOpacity={0.2}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranking" className="mt-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Score de Produtividade por Squad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productivityRankingData}
                      layout="vertical"
                      barSize={20}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {productivityRankingData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom Section: Squads Grid + Members Ranking */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Squads Grid - 2 cols */}
          <div className="xl:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Performance por Squad
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {squadsPerformance.map((squad) => (
                <SquadCard key={squad.id} squad={squad} />
              ))}
              {squadsPerformance.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                  Nenhum squad encontrado. Crie squads na página de
                  gerenciamento.
                </p>
              )}
            </div>
          </div>

          {/* Members Ranking - 1 col */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking de Membros
            </h2>
            <Card className="border shadow-sm">
              <CardContent className="p-3 max-h-[600px] overflow-y-auto">
                {membersRanking.length > 0 ? (
                  <div className="space-y-0.5">
                    {membersRanking.slice(0, 20).map((member, i) => (
                      <MemberRankingRow
                        key={member.id}
                        member={member}
                        rank={i + 1}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum membro encontrado.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
