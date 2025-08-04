import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/hooks/useTasks";
import { useTaskStats } from "@/hooks/useTaskStats";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Target,
  TrendingUp,
  Plus,
  User
} from "lucide-react";

interface TaskAnalysis {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to?: string;
  deadline?: string;
  progress: number;
  created_at: string;
  team_id?: string;
  analysisStatus: 'excellent' | 'good' | 'needs_attention' | 'critical';
  issues: string[];
  recommendations: string[];
  daysOverdue: number;
  efficiency: number;
}

const RelatorioTarefasPlanner = () => {
  const { tasks } = useTasks();
  const taskStats = useTaskStats();
  const { convertAlertToTask } = useTaskAutomation();
  
  const [tasksAnalysis, setTasksAnalysis] = useState<TaskAnalysis[]>([]);
  const [filteredData, setFilteredData] = useState<TaskAnalysis[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const primaryFilters: FilterConfig[] = [
    {
      id: 'status-analise',
      label: 'Status de Análise',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os status' },
        { value: 'critical', label: 'Crítico' },
        { value: 'needs_attention', label: 'Precisa de Atenção' },
        { value: 'good', label: 'Bom' },
        { value: 'excellent', label: 'Excelente' }
      ],
      placeholder: 'Todos os status'
    },
    {
      id: 'status-tarefa',
      label: 'Status da Tarefa',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todas as tarefas' },
        { value: 'todo', label: 'Pendentes' },
        { value: 'progress', label: 'Em Progresso' },
        { value: 'done', label: 'Concluídas' }
      ],
      placeholder: 'Todas as tarefas'
    },
    {
      id: 'prioridade',
      label: 'Prioridade',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as prioridades' },
        { value: 'high', label: 'Alta' },
        { value: 'medium', label: 'Média' },
        { value: 'low', label: 'Baixa' }
      ],
      placeholder: 'Todas as prioridades'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'tipo-problema',
      label: 'Tipo de Problema',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os problemas' },
        { value: 'atrasada', label: 'Tarefas Atrasadas' },
        { value: 'sem_progresso', label: 'Sem Progresso' },
        { value: 'alta_prioridade_parada', label: 'Alta Prioridade Parada' },
        { value: 'prazo_apertado', label: 'Prazo Apertado' }
      ],
      placeholder: 'Todos os problemas'
    },
    {
      id: 'progresso-minimo',
      label: 'Progresso Mínimo',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os progressos' },
        { value: '80', label: '80%+' },
        { value: '60', label: '60%+' },
        { value: '40', label: '40%+' },
        { value: '20', label: '20%+' }
      ],
      placeholder: 'Todos os progressos'
    }
  ];

  const analyzeTasks = () => {
    const today = new Date();
    
    const analysis: TaskAnalysis[] = tasks.map(task => {
      const createdDate = new Date(task.created_at);
      const dueDate = task.deadline ? new Date(task.deadline) : null;
      const daysOverdue = dueDate && dueDate < today 
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      const daysSinceCreated = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const expectedProgress = Math.min(100, daysSinceCreated * 10); // 10% por dia esperado
      const efficiency = expectedProgress > 0 ? (task.progress / expectedProgress) * 100 : 100;

      // Identificar problemas
      const issues: string[] = [];
      if (daysOverdue > 0) issues.push(`Atrasada há ${daysOverdue} dias`);
      if (task.progress === 0 && daysSinceCreated > 2) issues.push('Sem progresso há mais de 2 dias');
      if (task.priority === 'high' && task.status === 'todo') issues.push('Alta prioridade não iniciada');
      if (dueDate && (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) < 2 && task.progress < 80) {
        issues.push('Prazo apertado com baixo progresso');
      }
      if (task.status === 'progress' && task.progress < 20 && daysSinceCreated > 3) {
        issues.push('Em progresso mas com baixo avanço');
      }

      // Determinar status
      const analysisStatus: TaskAnalysis['analysisStatus'] = 
        daysOverdue > 3 || (task.priority === 'high' && task.status === 'todo') ? 'critical' :
        issues.length >= 2 || daysOverdue > 0 ? 'needs_attention' :
        efficiency >= 100 && task.progress > 50 ? 'excellent' : 'good';

      // Gerar recomendações
      const recommendations: string[] = [];
      if (daysOverdue > 0) recommendations.push('Revisar prazo e realocar recursos');
      if (task.progress === 0) recommendations.push('Iniciar execução imediatamente');
      if (task.priority === 'high' && task.status === 'todo') recommendations.push('Priorizar início desta tarefa');
      if (efficiency < 50) recommendations.push('Revisar escopo e remover impedimentos');
      if (!task.user_id) recommendations.push('Atribuir responsável');

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigned_to: task.user_id,
        deadline: task.deadline,
        progress: task.progress,
        created_at: task.created_at,
        team_id: task.team_id,
        analysisStatus,
        issues,
        recommendations,
        daysOverdue,
        efficiency: Math.round(efficiency)
      };
    });

    setTasksAnalysis(analysis);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);

    let filtered = tasksAnalysis;

    // Filtro por status de análise
    if (newFilters['status-analise'] && newFilters['status-analise'] !== 'todos') {
      filtered = filtered.filter(task => task.analysisStatus === newFilters['status-analise']);
    }

    // Filtro por status da tarefa
    if (newFilters['status-tarefa'] && newFilters['status-tarefa'] !== 'todos') {
      filtered = filtered.filter(task => task.status === newFilters['status-tarefa']);
    }

    // Filtro por prioridade
    if (newFilters['prioridade'] && newFilters['prioridade'] !== 'todas') {
      filtered = filtered.filter(task => task.priority === newFilters['prioridade']);
    }

    // Filtro por tipo de problema
    if (newFilters['tipo-problema'] && newFilters['tipo-problema'] !== 'todos') {
      const problemMap: Record<string, string> = {
        'atrasada': 'Atrasada',
        'sem_progresso': 'Sem progresso',
        'alta_prioridade_parada': 'Alta prioridade não iniciada',
        'prazo_apertado': 'Prazo apertado'
      };
      const problemText = problemMap[newFilters['tipo-problema']];
      if (problemText) {
        filtered = filtered.filter(task => task.issues.some(issue => issue.includes(problemText)));
      }
    }

    // Filtro por progresso mínimo
    if (newFilters['progresso-minimo'] && newFilters['progresso-minimo'] !== 'todos') {
      const minProgress = parseInt(newFilters['progresso-minimo']);
      filtered = filtered.filter(task => task.progress >= minProgress);
    }

    setFilteredData(filtered);
  };

  const handleCreateTask = async (task: TaskAnalysis) => {
    const taskTitle = `Resolver problemas da tarefa: ${task.title}`;
    const taskDescription = `Problemas: ${task.issues.join(', ')}. Recomendações: ${task.recommendations.join(', ')}`;
    
    await convertAlertToTask({
      title: taskTitle,
      description: taskDescription,
      priority: task.analysisStatus === 'critical' ? 'high' : 'medium',
      type: 'improvement'
    });
  };

  const getStatusColor = (status: TaskAnalysis['analysisStatus']) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs_attention': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: TaskAnalysis['analysisStatus']) => {
    const variants = {
      excellent: 'default',
      good: 'secondary',
      needs_attention: 'outline',
      critical: 'destructive'
    } as const;

    const labels = {
      excellent: 'Excelente',
      good: 'Bom',
      needs_attention: 'Precisa de Atenção',
      critical: 'Crítico'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getStatusIcon = (status: TaskAnalysis['analysisStatus']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'good': return <Target className="w-4 h-4 text-blue-600" />;
      case 'needs_attention': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'destructive',
      medium: 'outline',
      low: 'secondary'
    } as const;

    const labels = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    };

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'outline'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    );
  };

  useEffect(() => {
    if (tasks.length > 0) {
      analyzeTasks();
    }
  }, [tasks]);

  useEffect(() => {
    setFilteredData(tasksAnalysis);
  }, [tasksAnalysis]);

  // Métricas de resumo baseadas nos dados filtrados
  const filteredMetrics = {
    totalTasks: filteredData.length,
    criticalTasks: filteredData.filter(t => t.analysisStatus === 'critical').length,
    overdueTasks: filteredData.filter(t => t.daysOverdue > 0).length,
    avgEfficiency: filteredData.length > 0 
      ? Math.round(filteredData.reduce((acc, t) => acc + t.efficiency, 0) / filteredData.length)
      : 0
  };

  return (
    <ReportLayout
      title="Relatório de Tarefas do Planner"
      description="Análise detalhada de performance e eficiência das tarefas"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
      filterDescription="Use os filtros para analisar tarefas específicas e identificar gargalos"
    >
      {/* Métricas de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total de Tarefas"
          value={filteredMetrics.totalTasks}
          subtitle="Tarefas analisadas"
        />
        <MetricCard
          title="Tarefas Críticas"
          value={filteredMetrics.criticalTasks}
          trend={filteredMetrics.criticalTasks > 0 ? "down" : "up"}
          subtitle="Precisam de atenção imediata"
        />
        <MetricCard
          title="Tarefas Atrasadas"
          value={filteredMetrics.overdueTasks}
          trend={filteredMetrics.overdueTasks > 0 ? "down" : "up"}
          subtitle="Fora do prazo"
        />
        <MetricCard
          title="Eficiência Média"
          value={`${filteredMetrics.avgEfficiency}%`}
          trend={filteredMetrics.avgEfficiency >= 80 ? "up" : "down"}
          subtitle="Taxa de progresso esperado"
        />
      </div>

      {/* Lista de tarefas analisadas */}
      <div className="space-y-4">
        {filteredData.length > 0 ? (
          filteredData.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      {getPriorityBadge(task.priority)}
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.analysisStatus)}
                    {getStatusBadge(task.analysisStatus)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Problemas identificados */}
                {task.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Problemas Identificados
                    </h4>
                    <ul className="space-y-1">
                      {task.issues.map((issue, index) => (
                        <li key={index} className="text-sm text-destructive flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-destructive" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recomendações */}
                {task.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Recomendações
                    </h4>
                    <ul className="space-y-1">
                      {task.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Métricas */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Métricas da Tarefa
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{task.progress}%</div>
                      <div className="text-xs text-muted-foreground">Progresso</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getStatusColor(task.analysisStatus)}`}>
                        {task.efficiency}%
                      </div>
                      <div className="text-xs text-muted-foreground">Eficiência</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {task.daysOverdue > 0 ? task.daysOverdue : 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Dias Atraso</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {task.status === 'done' ? 'Concluída' : 
                         task.status === 'progress' ? 'Em Progresso' : 'Pendente'}
                      </div>
                      <div className="text-xs text-muted-foreground">Status</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">
                        {task.assigned_to ? '✓' : '✗'}
                      </div>
                      <div className="text-xs text-muted-foreground">Responsável</div>
                    </div>
                  </div>
                </div>

                {/* Botão de ação para tarefas problemáticas */}
                {(task.analysisStatus === 'critical' || task.analysisStatus === 'needs_attention') && (
                  <div className="flex justify-end pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCreateTask(task)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Tarefa de Melhoria
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma tarefa encontrada
              </h3>
              <p className="text-muted-foreground">
                Ajuste os filtros para ver mais resultados ou verifique se há tarefas cadastradas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ReportLayout>
  );
};

export default RelatorioTarefasPlanner;