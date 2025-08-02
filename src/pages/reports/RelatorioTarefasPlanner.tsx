import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useTasks } from "@/hooks/useTasks";
import { useTaskStats } from "@/hooks/useTaskStats";
import { CheckCircle, Clock, AlertTriangle, Calendar } from "lucide-react";

const RelatorioTarefasPlanner = () => {
  const { tasks } = useTasks();
  const taskStats = useTaskStats();

  const chartConfig = {
    completed: { label: "Concluídas", color: "hsl(var(--primary))" },
    inProgress: { label: "Em Progresso", color: "hsl(var(--secondary))" },
    pending: { label: "Pendentes", color: "hsl(var(--accent))" }
  };

  const statusData = [
    { name: 'Concluídas', value: Number(taskStats.data?.completed_tasks || 0), color: 'hsl(var(--primary))' },
    { name: 'Em Progresso', value: Number(taskStats.data?.in_progress_tasks || 0), color: 'hsl(var(--secondary))' },
    { name: 'Pendentes', value: Number(taskStats.data?.pending_tasks || 0), color: 'hsl(var(--accent))' },
    { name: 'Em Revisão', value: Number(taskStats.data?.review_tasks || 0), color: 'hsl(var(--muted))' }
  ];

  const priorityData = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityChartData = Object.entries(priorityData).map(([priority, count]) => ({
    priority,
    count,
    color: priority === 'high' ? 'hsl(var(--destructive))' : 
           priority === 'medium' ? 'hsl(var(--secondary))' : 
           'hsl(var(--muted))'
  }));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'todo': return <Calendar className="w-4 h-4 text-gray-600" />;
      case 'review': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return variants[priority as keyof typeof variants] || variants.low;
  };

  const getOverdueTasks = () => {
    const today = new Date();
    return tasks.filter(task => 
      task.deadline && new Date(task.deadline) < today && task.status !== 'done'
    );
  };

  const overdueTasks = getOverdueTasks();
  const completionRate = taskStats.data?.total_tasks ? 
    ((Number(taskStats.data.completed_tasks) / Number(taskStats.data.total_tasks)) * 100).toFixed(1) : '0';

  return (
    <ReportLayout
      title="Relatório de Tarefas e Planner"
      description="Produtividade e tempo de execução das tarefas"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Tarefas Totais"
          value={Number(taskStats.data?.total_tasks || 0)}
        />
        <MetricCard
          title="Taxa de Conclusão"
          value={`${completionRate.toString()}%`}
          trend={parseFloat(completionRate) > 80 ? "up" : "down"}
        />
        <MetricCard
          title="Tarefas Atrasadas"
          value={overdueTasks.length}
          trend={overdueTasks.length > 0 ? "down" : "up"}
        />
        <MetricCard
          title="Tempo Médio"
          value={`${Number(taskStats.data?.avg_completion_days || 0).toFixed(1)} dias`}
          subtitle="Para conclusão"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Estado atual das tarefas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Prioridade</CardTitle>
            <CardDescription>Classificação das tarefas por urgência</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityChartData}>
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {overdueTasks.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-red-600">Tarefas Atrasadas</CardTitle>
            <CardDescription>Requerem atenção imediata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueTasks.slice(0, 5).map((task) => {
                const daysOverdue = Math.floor(
                  (new Date().getTime() - new Date(task.deadline).getTime()) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Responsável: {task.responsible_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        {daysOverdue} dias em atraso
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tarefas Recentes</CardTitle>
          <CardDescription>Últimas atividades do planner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Tarefa</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Prioridade</th>
                  <th className="text-left p-3 font-medium">Responsável</th>
                  <th className="text-right p-3 font-medium">Prazo</th>
                  <th className="text-right p-3 font-medium">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 10).map((task) => (
                  <tr key={task.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="text-sm">{task.status}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={getPriorityBadge(task.priority)}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {task.responsible_avatar && (
                          <img 
                            src={task.responsible_avatar} 
                            alt={task.responsible_name}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-sm">{task.responsible_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-sm">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-sm">{task.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtividade por Responsável</CardTitle>
            <CardDescription>Performance individual da equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(
                tasks.reduce((acc, task) => {
                  if (!acc[task.responsible_name]) {
                    acc[task.responsible_name] = { completed: 0, total: 0 };
                  }
                  acc[task.responsible_name].total++;
                  if (task.status === 'done') {
                    acc[task.responsible_name].completed++;
                  }
                  return acc;
                }, {} as Record<string, { completed: number; total: number }>)
              )
              .sort(([,a], [,b]) => (b.completed / b.total) - (a.completed / a.total))
              .slice(0, 6)
              .map(([name, data]) => {
                const rate = ((data.completed / data.total) * 100).toFixed(1);
                
                return (
                  <div key={name} className="flex justify-between items-center">
                    <span className="font-medium">{name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas Organizadas por IA</CardTitle>
            <CardDescription>Automação e eficiência do planner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Tarefas organizadas automaticamente</span>
                <span className="font-semibold">
                  {tasks.filter(t => t.organized_by_ai).length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Tempo estimado por IA</span>
                <span className="font-semibold">
                  {tasks.filter(t => t.ai_estimated_minutes).length} tarefas
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Economia de tempo</span>
                <span className="font-semibold text-green-600">
                  ~{Math.round(tasks.filter(t => t.organized_by_ai).length * 15)} min/dia
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  );
};

export default RelatorioTarefasPlanner;