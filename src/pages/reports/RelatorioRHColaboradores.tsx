import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useEmployees } from "@/hooks/useEmployees";
import { useTasks } from "@/hooks/useTasks";
import { User, TrendingUp, Clock, Award } from "lucide-react";

const RelatorioRHColaboradores = () => {
  const { employees } = useEmployees();
  const { tasks } = useTasks();

  const chartConfig = {
    productivity: { label: "Produtividade", color: "hsl(var(--primary))" },
    tasks: { label: "Tarefas", color: "hsl(var(--secondary))" }
  };

  const getEmployeeMetrics = () => {
    return employees.map(employee => {
      const employeeTasks = tasks.filter(task => task.responsible_name === employee.name);
      const completedTasks = employeeTasks.filter(task => task.status === 'done');
      const inProgressTasks = employeeTasks.filter(task => task.status === 'progress');
      
      const productivity = employeeTasks.length > 0 
        ? (completedTasks.length / employeeTasks.length * 100)
        : 0;

      const avgProgress = employeeTasks.length > 0 
        ? employeeTasks.reduce((acc, task) => acc + task.progress, 0) / employeeTasks.length 
        : 0;

      return {
        ...employee,
        totalTasks: employeeTasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        productivity: productivity.toFixed(1),
        avgProgress: avgProgress.toFixed(1)
      };
    });
  };

  const employeeMetrics = getEmployeeMetrics();
  const activeEmployees = employees.filter(emp => emp.status === 'active').length;
  const avgProductivity = employeeMetrics.length > 0 
    ? (employeeMetrics.reduce((acc, emp) => acc + parseFloat(emp.productivity), 0) / employeeMetrics.length).toFixed(1)
    : '0';

  const roleDistribution = employees.reduce((acc, emp) => {
    acc[emp.role] = (acc[emp.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const roleChartData = Object.entries(roleDistribution).map(([role, count]) => ({
    role,
    count,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`
  }));

  const topPerformers = employeeMetrics
    .sort((a, b) => parseFloat(b.productivity) - parseFloat(a.productivity))
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      vacation: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  const getPerformanceLevel = (productivity: number) => {
    if (productivity >= 90) return { level: 'Excepcional', color: 'text-green-600' };
    if (productivity >= 80) return { level: 'Excelente', color: 'text-blue-600' };
    if (productivity >= 70) return { level: 'Bom', color: 'text-yellow-600' };
    if (productivity >= 60) return { level: 'Regular', color: 'text-orange-600' };
    return { level: 'Precisa Melhorar', color: 'text-red-600' };
  };

  return (
    <ReportLayout
      title="Relatório RH - Colaboradores"
      description="Status e produtividade individual da equipe"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Colaboradores Ativos"
          value={activeEmployees}
        />
        <MetricCard
          title="Produtividade Média"
          value={`${avgProductivity}%`}
          trend={parseFloat(avgProductivity.toString()) > 75 ? "up" : "down"}
        />
        <MetricCard
          title="Total de Funções"
          value={Object.keys(roleDistribution).length}
        />
        <MetricCard
          title="Alta Performance"
          value={employeeMetrics.filter(emp => parseFloat(emp.productivity) > 80).length}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtividade por Colaborador</CardTitle>
            <CardDescription>Taxa de conclusão de tarefas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeeMetrics.slice(0, 8)}>
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
            <CardTitle>Distribuição por Função</CardTitle>
            <CardDescription>Organograma da empresa</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ role, count }) => `${role}: ${count}`}
                  >
                    {roleChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
          <CardDescription>Colaboradores com melhor performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((employee, index) => (
              <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    {employee.avatar ? (
                      <img 
                        src={employee.avatar} 
                        alt={employee.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold">{employee.name}</h4>
                      <p className="text-sm text-muted-foreground">{employee.role}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold text-lg">{employee.productivity}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {employee.completedTasks}/{employee.totalTasks} tarefas
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Completo</CardTitle>
          <CardDescription>Informações detalhadas de todos os colaboradores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Colaborador</th>
                  <th className="text-left p-3 font-medium">Função</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Tarefas</th>
                  <th className="text-right p-3 font-medium">Concluídas</th>
                  <th className="text-right p-3 font-medium">Produtividade</th>
                  <th className="text-center p-3 font-medium">Performance</th>
                </tr>
              </thead>
              <tbody>
                {employeeMetrics.map((employee) => {
                  const performance = getPerformanceLevel(parseFloat(employee.productivity));
                  
                  return (
                    <tr key={employee.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {employee.avatar ? (
                            <img 
                              src={employee.avatar} 
                              alt={employee.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{employee.role}</td>
                      <td className="p-3 text-center">
                        <Badge className={getStatusBadge(employee.status)}>
                          {employee.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{employee.totalTasks}</td>
                      <td className="p-3 text-right">{employee.completedTasks}</td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${performance.color}`}>
                          {employee.productivity}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-medium ${performance.color}`}>
                          {performance.level}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Análise de Capacidade</CardTitle>
            <CardDescription>Distribuição da carga de trabalho</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeeMetrics
                .sort((a, b) => b.totalTasks - a.totalTasks)
                .slice(0, 8)
                .map((employee) => {
                  const workload = employee.totalTasks > 10 ? 'Alto' :
                                  employee.totalTasks > 5 ? 'Médio' : 'Baixo';
                  const workloadColor = employee.totalTasks > 10 ? 'text-red-600' :
                                       employee.totalTasks > 5 ? 'text-yellow-600' : 'text-green-600';
                  
                  return (
                    <div key={employee.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {employee.avatar ? (
                          <img 
                            src={employee.avatar} 
                            alt={employee.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <span className="font-medium">{employee.name}</span>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${workloadColor}`}>{workload}</p>
                        <p className="text-sm text-muted-foreground">{employee.totalTasks} tarefas</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo na Empresa</CardTitle>
            <CardDescription>Senioridade dos colaboradores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees
                .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .slice(0, 8)
                .map((employee) => {
                  const startDate = new Date(employee.start_date);
                  const today = new Date();
                  const monthsWorked = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                  const yearsWorked = Math.floor(monthsWorked / 12);
                  const remainingMonths = monthsWorked % 12;
                  
                  const timeString = yearsWorked > 0 
                    ? `${yearsWorked}a ${remainingMonths}m`
                    : `${remainingMonths}m`;
                  
                  return (
                    <div key={employee.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {employee.avatar ? (
                          <img 
                            src={employee.avatar} 
                            alt={employee.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{timeString}</p>
                        <p className="text-sm text-muted-foreground">na empresa</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  );
};

export default RelatorioRHColaboradores;