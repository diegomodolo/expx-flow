import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { useEmployees } from "@/hooks/useEmployees";
import { useTasks } from "@/hooks/useTasks";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { User, TrendingUp, TrendingDown, Clock, Award, AlertTriangle, Target, Users } from "lucide-react";

interface EmployeePerformance {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
  start_date: string;
  team_id?: string;
  skills?: string;
  // Métricas de performance
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  productivity: number;
  avgProgress: number;
  monthsWorked: number;
  // Análise de problemas
  issues: string[];
  status_type: 'excellent' | 'good' | 'needs_attention' | 'critical';
  recommended_actions: string[];
  workload_level: 'low' | 'normal' | 'high' | 'overloaded';
}

const RelatorioRHColaboradores = () => {
  const { employees } = useEmployees();
  const { tasks } = useTasks();
  const { convertAlertToTask } = useTaskAutomation();
  const [employeePerformances, setEmployeePerformances] = useState<EmployeePerformance[]>([]);
  const [filteredData, setFilteredData] = useState<EmployeePerformance[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employees && tasks) {
      analyzeEmployeePerformance();
    }
  }, [employees, tasks]);

  useEffect(() => {
    setFilteredData(employeePerformances);
  }, [employeePerformances]);

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);
    
    let filtered = [...employeePerformances];

    // Filtro por status
    if (newFilters.status && newFilters.status !== 'todos') {
      filtered = filtered.filter(emp => emp.status_type === newFilters.status);
    }

    // Filtro por função
    if (newFilters.funcao && newFilters.funcao !== 'todas') {
      filtered = filtered.filter(emp => emp.role === newFilters.funcao);
    }

    // Filtro por nível de carga de trabalho
    if (newFilters['carga-trabalho'] && newFilters['carga-trabalho'] !== 'todos') {
      filtered = filtered.filter(emp => emp.workload_level === newFilters['carga-trabalho']);
    }

    // Filtro por produtividade mínima
    if (newFilters['produtividade-minima'] && newFilters['produtividade-minima'] !== 'sem-limite') {
      const minProductivity = parseFloat(newFilters['produtividade-minima']);
      filtered = filtered.filter(emp => emp.productivity >= minProductivity);
    }

    // Filtro por tipo de problema
    if (newFilters['tipo-problema'] && newFilters['tipo-problema'] !== 'todos') {
      const problemType = newFilters['tipo-problema'];
      filtered = filtered.filter(emp => {
        switch (problemType) {
          case 'baixa-produtividade':
            return emp.issues.some(issue => issue.includes('produtividade'));
          case 'sobrecarga':
            return emp.issues.some(issue => issue.includes('sobrecarga'));
          case 'sem-tarefas':
            return emp.issues.some(issue => issue.includes('sem tarefas'));
          case 'tarefas-atrasadas':
            return emp.issues.some(issue => issue.includes('atrasadas'));
          default:
            return true;
        }
      });
    }

    setFilteredData(filtered);
  };

  const analyzeEmployeePerformance = () => {
    const performances: EmployeePerformance[] = [];

    employees?.forEach(employee => {
      const employeeTasks = tasks?.filter(task => 
        task.responsible_name === employee.name
      ) || [];

      const completedTasks = employeeTasks.filter(task => task.status === 'done');
      const inProgressTasks = employeeTasks.filter(task => task.status === 'progress');
      const pendingTasks = employeeTasks.filter(task => task.status === 'todo');
      
      // Calcular tarefas atrasadas (simulado)
      const today = new Date();
      const overdueTasks = employeeTasks.filter(task => 
        task.deadline && new Date(task.deadline) < today && task.status !== 'done'
      );

      const productivity = employeeTasks.length > 0 
        ? (completedTasks.length / employeeTasks.length) * 100
        : 0;

      const avgProgress = employeeTasks.length > 0 
        ? employeeTasks.reduce((acc, task) => acc + task.progress, 0) / employeeTasks.length 
        : 0;

      // Calcular tempo na empresa
      const startDate = new Date(employee.start_date);
      const monthsWorked = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      // Analisar problemas
      const issues: string[] = [];
      let status_type: 'excellent' | 'good' | 'needs_attention' | 'critical' = 'good';
      const recommended_actions: string[] = [];

      // 1. Verificar produtividade baixa
      if (productivity < 50) {
        issues.push(`Produtividade baixa (${productivity.toFixed(1)}%)`);
        status_type = 'critical';
        recommended_actions.push('Revisar carga de trabalho e oferecer suporte');
      } else if (productivity < 70) {
        issues.push(`Produtividade abaixo do esperado (${productivity.toFixed(1)}%)`);
        status_type = status_type === 'good' ? 'needs_attention' : status_type;
        recommended_actions.push('Identificar obstáculos e oferecer treinamento');
      }

      // 2. Verificar sobrecarga de trabalho
      const workload_level: 'low' | 'normal' | 'high' | 'overloaded' = 
        employeeTasks.length > 15 ? 'overloaded' :
        employeeTasks.length > 10 ? 'high' :
        employeeTasks.length > 5 ? 'normal' : 'low';

      if (workload_level === 'overloaded') {
        issues.push(`Sobrecarga de trabalho (${employeeTasks.length} tarefas)`);
        status_type = status_type === 'good' ? 'needs_attention' : status_type;
        recommended_actions.push('Redistribuir tarefas ou contratar mais pessoal');
      }

      // 3. Verificar funcionário sem tarefas
      if (employeeTasks.length === 0) {
        issues.push('Colaborador sem tarefas atribuídas');
        status_type = 'needs_attention';
        recommended_actions.push('Atribuir tarefas apropriadas ao cargo');
      }

      // 4. Verificar tarefas atrasadas
      if (overdueTasks.length > 0) {
        issues.push(`${overdueTasks.length} tarefa(s) atrasada(s)`);
        status_type = status_type === 'good' ? 'needs_attention' : status_type;
        recommended_actions.push('Revisar prazos e prioridades');
      }

      // 5. Definir excelência
      if (productivity >= 90 && employeeTasks.length > 3 && overdueTasks.length === 0) {
        status_type = 'excellent';
        recommended_actions.push('Manter o excelente trabalho e considerar promoção');
      }

      // 6. Verificar colaborador novo sem produtividade
      if (monthsWorked < 3 && productivity < 30) {
        issues.push('Colaborador novo com dificuldades de adaptação');
        recommended_actions.push('Intensificar acompanhamento e mentoria');
      }

      performances.push({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        status: employee.status,
        avatar: employee.avatar,
        start_date: employee.start_date,
        team_id: employee.team_id,
        skills: employee.skills,
        totalTasks: employeeTasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        productivity,
        avgProgress,
        monthsWorked,
        issues,
        status_type,
        recommended_actions,
        workload_level
      });
    });

    // Ordenar por status (críticos primeiro)
    setEmployeePerformances(performances.sort((a, b) => {
      const statusOrder = { critical: 0, needs_attention: 1, good: 2, excellent: 3 };
      return statusOrder[a.status_type] - statusOrder[b.status_type];
    }));
  };

  const handleCreateTask = (employee: EmployeePerformance) => {
    const alertData = {
      type: employee.status_type === 'critical' ? 'danger' : 'warning',
      description: `Colaborador ${employee.name}: ${employee.issues.join(', ')} - ${employee.recommended_actions[0] || 'Revisar situação'}`,
      campaign_id: undefined,
      client_id: undefined,
      id: `employee_performance_${employee.id}`
    };

    convertAlertToTask(alertData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'needs_attention': return 'bg-warning text-warning-foreground';
      case 'excellent': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return AlertTriangle;
      case 'needs_attention': return TrendingDown;
      case 'excellent': return Award;
      default: return TrendingUp;
    }
  };

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'overloaded': return 'text-destructive';
      case 'high': return 'text-warning';
      case 'low': return 'text-muted-foreground';
      default: return 'text-success';
    }
  };

  // Usar dados filtrados para métricas quando há filtros ativos
  const dataToUse = Object.keys(activeFilters).length > 0 ? filteredData : employeePerformances;
  
  const criticalCount = dataToUse.filter(emp => emp.status_type === 'critical').length;
  const needsAttentionCount = dataToUse.filter(emp => emp.status_type === 'needs_attention').length;
  const excellentCount = dataToUse.filter(emp => emp.status_type === 'excellent').length;
  const avgProductivity = dataToUse.length > 0 
    ? dataToUse.reduce((sum, emp) => sum + emp.productivity, 0) / dataToUse.length 
    : 0;

  // Preparar dados únicos para filtros
  const uniqueRoles = Array.from(new Set(employeePerformances.map(emp => emp.role)))
    .sort()
    .map(role => ({ value: role, label: role }));

  const primaryFilters: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status de Performance',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os status' },
        { value: 'critical', label: 'Crítico' },
        { value: 'needs_attention', label: 'Precisa Atenção' },
        { value: 'good', label: 'Bom' },
        { value: 'excellent', label: 'Excelente' }
      ],
      placeholder: 'Todos os status'
    },
    {
      id: 'funcao',
      label: 'Função',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as funções' },
        ...uniqueRoles
      ],
      placeholder: 'Todas as funções'
    },
    {
      id: 'carga-trabalho',
      label: 'Carga de Trabalho',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os níveis' },
        { value: 'overloaded', label: 'Sobrecarregado' },
        { value: 'high', label: 'Alta' },
        { value: 'normal', label: 'Normal' },
        { value: 'low', label: 'Baixa' }
      ],
      placeholder: 'Todos os níveis'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'produtividade-minima',
      label: 'Produtividade Mínima',
      type: 'select',
      options: [
        { value: 'sem-limite', label: 'Sem limite' },
        { value: '90', label: '90%+' },
        { value: '80', label: '80%+' },
        { value: '70', label: '70%+' },
        { value: '50', label: '50%+' }
      ],
      placeholder: 'Sem limite'
    },
    {
      id: 'tipo-problema',
      label: 'Tipo de Problema',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os tipos' },
        { value: 'baixa-produtividade', label: 'Baixa Produtividade' },
        { value: 'sobrecarga', label: 'Sobrecarga' },
        { value: 'sem-tarefas', label: 'Sem Tarefas' },
        { value: 'tarefas-atrasadas', label: 'Tarefas Atrasadas' }
      ],
      placeholder: 'Todos os tipos'
    }
  ];

  return (
    <ReportLayout
      title="Relatório RH - Colaboradores"
      description="Análise de performance e produtividade da equipe"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
      filterDescription="Configure os parâmetros para análise de colaboradores"
    >
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Situação Crítica"
            value={criticalCount}
            trend={criticalCount > 0 ? "down" : "neutral"}
            subtitle="Requerem ação imediata"
          />
          <MetricCard
            title="Precisam Atenção"
            value={needsAttentionCount}
            trend={needsAttentionCount > 0 ? "down" : "neutral"}
            subtitle="Monitoramento necessário"
          />
          <MetricCard
            title="Performance Excelente"
            value={excellentCount}
            trend={excellentCount > 0 ? "up" : "neutral"}
            subtitle="Top performers"
          />
          <MetricCard
            title="Produtividade Média"
            value={`${avgProductivity.toFixed(1)}%`}
            trend={avgProductivity > 75 ? "up" : avgProductivity > 60 ? "neutral" : "down"}
            subtitle="Da equipe"
          />
        </div>

        {/* Lista de Colaboradores */}
        <div className="grid gap-4">
          {filteredData.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum colaborador encontrado</h3>
                <p className="text-muted-foreground">
                  {Object.keys(activeFilters).length > 0 
                    ? 'Nenhum colaborador corresponde aos filtros selecionados.'
                    : 'Não há colaboradores cadastrados no momento.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredData.map((employee) => {
              const StatusIcon = getStatusIcon(employee.status_type);
              const yearsWorked = Math.floor(employee.monthsWorked / 12);
              const remainingMonths = employee.monthsWorked % 12;
              const timeString = yearsWorked > 0 
                ? `${yearsWorked}a ${remainingMonths}m`
                : `${remainingMonths}m`;
              
              return (
                <Card key={employee.id} className={`border-l-4 ${
                  employee.status_type === 'critical' ? 'border-l-destructive' : 
                  employee.status_type === 'needs_attention' ? 'border-l-warning' :
                  employee.status_type === 'excellent' ? 'border-l-success' : 'border-l-primary'
                }`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`w-5 h-5 ${
                          employee.status_type === 'critical' ? 'text-destructive' : 
                          employee.status_type === 'needs_attention' ? 'text-warning' :
                          employee.status_type === 'excellent' ? 'text-success' : 'text-primary'
                        }`} />
                        <div className="flex items-center gap-3">
                          {employee.avatar ? (
                            <img 
                              src={employee.avatar} 
                              alt={employee.name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg">{employee.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {employee.role} • {employee.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(employee.status_type)}>
                          {employee.status_type === 'critical' ? 'CRÍTICO' : 
                           employee.status_type === 'needs_attention' ? 'ATENÇÃO' :
                           employee.status_type === 'excellent' ? 'EXCELENTE' : 'BOM'}
                        </Badge>
                        <Badge variant="outline">
                          {timeString} na empresa
                        </Badge>
                        {employee.issues.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateTask(employee)}
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Criar Tarefa
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Problemas Identificados */}
                    {employee.issues.length > 0 && (
                      <div>
                        <h4 className={`font-semibold mb-2 ${
                          employee.status_type === 'critical' ? 'text-destructive' : 'text-warning'
                        }`}>
                          Problemas Identificados:
                        </h4>
                        <div className="space-y-1">
                          {employee.issues.map((issue, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <AlertTriangle className={`w-4 h-4 ${
                                employee.status_type === 'critical' ? 'text-destructive' : 'text-warning'
                              }`} />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recomendações */}
                    {employee.recommended_actions.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-primary">Ações Recomendadas:</h4>
                        <div className="space-y-1">
                          {employee.recommended_actions.map((action, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                              <span className="text-muted-foreground">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Informações Adicionais */}
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="outline">
                        Status: {employee.status}
                      </Badge>
                      <Badge variant="outline" className={getWorkloadColor(employee.workload_level)}>
                        Carga: {employee.workload_level === 'overloaded' ? 'Sobrecarregado' :
                               employee.workload_level === 'high' ? 'Alta' :
                               employee.workload_level === 'low' ? 'Baixa' : 'Normal'}
                      </Badge>
                      {employee.skills && (
                        <Badge variant="outline">
                          Skills: {employee.skills}
                        </Badge>
                      )}
                    </div>

                    {/* Métricas de Performance */}
                    <div className="grid grid-cols-5 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          employee.productivity >= 90 ? 'text-success' :
                          employee.productivity >= 70 ? 'text-primary' :
                          employee.productivity >= 50 ? 'text-warning' : 'text-destructive'
                        }`}>
                          {employee.productivity.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Produtividade</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {employee.totalTasks}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Tarefas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-success">
                          {employee.completedTasks}
                        </div>
                        <div className="text-xs text-muted-foreground">Concluídas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {employee.inProgressTasks}
                        </div>
                        <div className="text-xs text-muted-foreground">Em Progresso</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${employee.overdueTasks > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {employee.overdueTasks}
                        </div>
                        <div className="text-xs text-muted-foreground">Atrasadas</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </ReportLayout>
  );
};

export default RelatorioRHColaboradores;