import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useTeams } from "@/hooks/useTeams";
import { useTasks } from "@/hooks/useTasks";
import { Users, Target, TrendingUp, Clock } from "lucide-react";

const RelatorioProdutividadeSquads = () => {
  const { teams } = useTeams();
  const { tasks } = useTasks();

  const chartConfig = {
    productivity: { label: "Produtividade", color: "hsl(var(--primary))" },
    completed: { label: "Concluídas", color: "hsl(var(--secondary))" }
  };

  const getTeamMetrics = () => {
    return teams.map(team => {
      const teamTasks = tasks.filter(task => task.team_id === team.id);
      const completedTasks = teamTasks.filter(task => task.status === 'completed');
      const inProgressTasks = teamTasks.filter(task => task.status === 'in_progress');
      const avgProgress = teamTasks.length > 0 
        ? teamTasks.reduce((acc, task) => acc + task.progress, 0) / teamTasks.length 
        : 0;
      
      const productivity = teamTasks.length > 0 
        ? (completedTasks.length / teamTasks.length * 100)
        : 0;

      return {
        ...team,
        totalTasks: teamTasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        productivity: productivity.toFixed(1),
        avgProgress: avgProgress.toFixed(1)
      };
    });
  };

  const teamMetrics = getTeamMetrics();
  const totalTeams = teams.length;
  const totalActiveTasks = tasks.filter(task => task.status !== 'completed').length;
  const avgProductivity = teamMetrics.length > 0 
    ? (teamMetrics.reduce((acc, team) => acc + parseFloat(team.productivity), 0) / teamMetrics.length).toFixed(1)
    : 0;

  const topPerformers = teamMetrics
    .sort((a, b) => parseFloat(b.productivity) - parseFloat(a.productivity))
    .slice(0, 5);

  return (
    <ReportLayout
      title="Relatório de Produtividade de Squads"
      description="Métricas de eficiência por equipe"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total de Squads"
          value={totalTeams}
        />
        <MetricCard
          title="Produtividade Média"
          value={`${avgProductivity}%`}
          trend={parseFloat(avgProductivity) > 75 ? "up" : "down"}
        />
        <MetricCard
          title="Tarefas Ativas"
          value={totalActiveTasks}
        />
        <MetricCard
          title="Squads Ativos"
          value={teams.filter(team => team.active_tasks > 0).length}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtividade por Squad</CardTitle>
            <CardDescription>Taxa de conclusão de tarefas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teamMetrics.slice(0, 8)}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="productivity" fill="var(--color-productivity)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas por Squad</CardTitle>
            <CardDescription>Volume de trabalho distribuído</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teamMetrics.slice(0, 8)}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalTasks" fill="var(--color-completed)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ranking de Performance</CardTitle>
          <CardDescription>Top performers por produtividade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((team, index) => (
              <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: team.icon_bg }}
                  >
                    <span style={{ color: team.icon_color }} className="text-lg">
                      {team.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{team.name}</h4>
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="font-bold text-lg">{team.productivity}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {team.completedTasks}/{team.totalTasks} tarefas
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Carga de Trabalho</CardTitle>
            <CardDescription>Análise de capacidade por squad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMetrics.map((team) => {
                const workload = team.totalTasks;
                const capacity = team.active_tasks > 10 ? 'Sobrecarregado' :
                                team.active_tasks > 5 ? 'Capacidade Alta' :
                                team.active_tasks > 2 ? 'Capacidade Normal' : 'Capacidade Baixa';
                const capacityColor = team.active_tasks > 10 ? 'text-red-600' :
                                     team.active_tasks > 5 ? 'text-yellow-600' :
                                     team.active_tasks > 2 ? 'text-green-600' : 'text-blue-600';
                
                return (
                  <div key={team.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: team.icon_bg, color: team.icon_color }}
                      >
                        {team.icon}
                      </div>
                      <span className="font-medium">{team.name}</span>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${capacityColor}`}>{capacity}</p>
                      <p className="text-sm text-muted-foreground">{workload} tarefas</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métricas de Eficiência</CardTitle>
            <CardDescription>Indicadores de performance por squad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMetrics.slice(0, 6).map((team) => (
                <div key={team.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{team.name}</span>
                    <span className="text-sm text-muted-foreground">{team.productivity}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${team.productivity}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{team.completedTasks} concluídas</span>
                    <span>{team.inProgressTasks} em andamento</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Squad</CardTitle>
          <CardDescription>Visão completa de todas as equipes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Squad</th>
                  <th className="text-right p-3 font-medium">Total Tarefas</th>
                  <th className="text-right p-3 font-medium">Concluídas</th>
                  <th className="text-right p-3 font-medium">Em Progresso</th>
                  <th className="text-right p-3 font-medium">Produtividade</th>
                  <th className="text-right p-3 font-medium">Progresso Médio</th>
                </tr>
              </thead>
              <tbody>
                {teamMetrics.map((team) => (
                  <tr key={team.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{ backgroundColor: team.icon_bg, color: team.icon_color }}
                        >
                          {team.icon}
                        </div>
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-sm text-muted-foreground">{team.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right">{team.totalTasks}</td>
                    <td className="p-3 text-right">{team.completedTasks}</td>
                    <td className="p-3 text-right">{team.inProgressTasks}</td>
                    <td className="p-3 text-right">
                      <span className={`font-semibold ${
                        parseFloat(team.productivity) > 80 ? 'text-green-600' :
                        parseFloat(team.productivity) > 60 ? 'text-blue-600' :
                        parseFloat(team.productivity) > 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {team.productivity}%
                      </span>
                    </td>
                    <td className="p-3 text-right">{team.avgProgress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default RelatorioProdutividadeSquads;