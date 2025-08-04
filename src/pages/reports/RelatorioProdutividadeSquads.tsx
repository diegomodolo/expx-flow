import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTeams } from "@/hooks/useTeams";
import { useTasks } from "@/hooks/useTasks";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { 
  Users, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus
} from "lucide-react";

interface SquadAnalysis {
  id: string;
  name: string;
  description: string;
  icon: string;
  icon_bg: string;
  icon_color: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  productivity: number;
  avgProgress: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  issues: string[];
  recommendations: string[];
  workloadLevel: 'low' | 'normal' | 'high' | 'overloaded';
}

const RelatorioProdutividadeSquads = () => {
  const { teams } = useTeams();
  const { tasks } = useTasks();
  const { convertAlertToTask } = useTaskAutomation();
  
  const [squadsAnalysis, setSquadsAnalysis] = useState<SquadAnalysis[]>([]);
  const [filteredData, setFilteredData] = useState<SquadAnalysis[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const primaryFilters: FilterConfig[] = [
    {
      id: 'status-performance',
      label: 'Status de Performance',
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
      id: 'carga-trabalho',
      label: 'Carga de Trabalho',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as cargas' },
        { value: 'overloaded', label: 'Sobrecarregado' },
        { value: 'high', label: 'Alta' },
        { value: 'normal', label: 'Normal' },
        { value: 'low', label: 'Baixa' }
      ],
      placeholder: 'Todas as cargas'
    },
    {
      id: 'tipo-problema',
      label: 'Tipo de Problema',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os problemas' },
        { value: 'baixa_produtividade', label: 'Baixa Produtividade' },
        { value: 'sobrecarga', label: 'Sobrecarga' },
        { value: 'sem_tarefas', label: 'Sem Tarefas Ativas' },
        { value: 'atraso_entregas', label: 'Atraso nas Entregas' }
      ],
      placeholder: 'Todos os problemas'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'produtividade-minima',
      label: 'Produtividade Mínima',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as produtividades' },
        { value: '90', label: '90%+' },
        { value: '75', label: '75%+' },
        { value: '50', label: '50%+' },
        { value: '25', label: '25%+' }
      ],
      placeholder: 'Todas as produtividades'
    }
  ];

  const analyzeSquads = () => {
    const analysis: SquadAnalysis[] = teams.map(team => {
      const teamTasks = tasks.filter(task => task.team_id === team.id);
      const completedTasks = teamTasks.filter(task => task.status === 'done');
      const inProgressTasks = teamTasks.filter(task => task.status === 'progress');
      const pendingTasks = teamTasks.filter(task => task.status === 'todo');
      
      const productivity = teamTasks.length > 0 
        ? (completedTasks.length / teamTasks.length * 100)
        : 0;
      
      const avgProgress = teamTasks.length > 0 
        ? teamTasks.reduce((acc, task) => acc + task.progress, 0) / teamTasks.length 
        : 0;

      // Determinar nível de carga de trabalho
      const workloadLevel: SquadAnalysis['workloadLevel'] = 
        teamTasks.length > 15 ? 'overloaded' :
        teamTasks.length > 10 ? 'high' :
        teamTasks.length > 5 ? 'normal' : 'low';

      // Identificar problemas
      const issues: string[] = [];
      if (productivity < 50) issues.push('Produtividade baixa');
      if (teamTasks.length > 15) issues.push('Sobrecarga de trabalho');
      if (teamTasks.length === 0) issues.push('Sem tarefas ativas');
      if (inProgressTasks.length > completedTasks.length * 2) issues.push('Muitas tarefas em andamento');
      if (avgProgress < 30 && inProgressTasks.length > 0) issues.push('Progresso lento das tarefas');

      // Determinar status
      const status: SquadAnalysis['status'] = 
        productivity >= 90 && workloadLevel !== 'overloaded' ? 'excellent' :
        productivity >= 70 && issues.length <= 1 ? 'good' :
        productivity >= 50 || issues.length <= 2 ? 'needs_attention' : 'critical';

      // Gerar recomendações
      const recommendations: string[] = [];
      if (productivity < 50) recommendations.push('Revisar distribuição de tarefas e capacitação da equipe');
      if (workloadLevel === 'overloaded') recommendations.push('Redistribuir carga de trabalho ou contratar mais pessoas');
      if (teamTasks.length === 0) recommendations.push('Alocar novas tarefas para manter a equipe ativa');
      if (inProgressTasks.length > 5) recommendations.push('Focar na conclusão de tarefas em andamento');
      if (avgProgress < 30) recommendations.push('Implementar acompanhamento diário do progresso');

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        icon: team.icon,
        icon_bg: team.icon_bg,
        icon_color: team.icon_color,
        totalTasks: teamTasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        pendingTasks: pendingTasks.length,
        productivity: Math.round(productivity),
        avgProgress: Math.round(avgProgress),
        status,
        issues,
        recommendations,
        workloadLevel
      };
    });

    setSquadsAnalysis(analysis);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);

    let filtered = squadsAnalysis;

    // Filtro por status de performance
    if (newFilters['status-performance'] && newFilters['status-performance'] !== 'todos') {
      filtered = filtered.filter(squad => squad.status === newFilters['status-performance']);
    }

    // Filtro por carga de trabalho
    if (newFilters['carga-trabalho'] && newFilters['carga-trabalho'] !== 'todas') {
      filtered = filtered.filter(squad => squad.workloadLevel === newFilters['carga-trabalho']);
    }

    // Filtro por tipo de problema
    if (newFilters['tipo-problema'] && newFilters['tipo-problema'] !== 'todos') {
      const problemMap: Record<string, string> = {
        'baixa_produtividade': 'Produtividade baixa',
        'sobrecarga': 'Sobrecarga de trabalho',
        'sem_tarefas': 'Sem tarefas ativas',
        'atraso_entregas': 'Progresso lento das tarefas'
      };
      const problemText = problemMap[newFilters['tipo-problema']];
      if (problemText) {
        filtered = filtered.filter(squad => squad.issues.some(issue => issue.includes(problemText)));
      }
    }

    // Filtro por produtividade mínima
    if (newFilters['produtividade-minima'] && newFilters['produtividade-minima'] !== 'todas') {
      const minProductivity = parseInt(newFilters['produtividade-minima']);
      filtered = filtered.filter(squad => squad.productivity >= minProductivity);
    }

    setFilteredData(filtered);
  };

  const handleCreateTask = async (squad: SquadAnalysis) => {
    const taskTitle = `Melhorar produtividade do squad ${squad.name}`;
    const taskDescription = `Problemas identificados: ${squad.issues.join(', ')}. Recomendações: ${squad.recommendations.join(', ')}`;
    
    await convertAlertToTask({
      title: taskTitle,
      description: taskDescription,
      priority: squad.status === 'critical' ? 'high' : 'medium',
      type: 'optimization'
    });
  };

  const getStatusColor = (status: SquadAnalysis['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs_attention': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: SquadAnalysis['status']) => {
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

  const getStatusIcon = (status: SquadAnalysis['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'good': return <Target className="w-4 h-4 text-blue-600" />;
      case 'needs_attention': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  useEffect(() => {
    if (teams.length > 0 && tasks.length > 0) {
      analyzeSquads();
    }
  }, [teams, tasks]);

  useEffect(() => {
    setFilteredData(squadsAnalysis);
  }, [squadsAnalysis]);

  // Métricas de resumo baseadas nos dados filtrados
  const filteredMetrics = {
    totalSquads: filteredData.length,
    criticalSquads: filteredData.filter(s => s.status === 'critical').length,
    avgProductivity: filteredData.length > 0 
      ? Math.round(filteredData.reduce((acc, s) => acc + s.productivity, 0) / filteredData.length)
      : 0,
    activeSquads: filteredData.filter(s => s.totalTasks > 0).length
  };

  console.log('RelatorioProdutividadeSquads loading - no charts here!');
  
  return (
    <ReportLayout
      title="Relatório de Produtividade de Squads"
      description="Análise detalhada de performance e produtividade por equipe"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
      filterDescription="Use os filtros para analisar squads específicos e identificar oportunidades de melhoria"
    >
      {/* Métricas de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total de Squads"
          value={filteredMetrics.totalSquads}
          subtitle="Equipes analisadas"
        />
        <MetricCard
          title="Squads Críticos"
          value={filteredMetrics.criticalSquads}
          trend={filteredMetrics.criticalSquads > 0 ? "down" : "up"}
          subtitle="Precisam de atenção imediata"
        />
        <MetricCard
          title="Produtividade Média"
          value={`${filteredMetrics.avgProductivity}%`}
          trend={filteredMetrics.avgProductivity >= 75 ? "up" : "down"}
          subtitle="Taxa de conclusão de tarefas"
        />
        <MetricCard
          title="Squads Ativos"
          value={filteredMetrics.activeSquads}
          subtitle="Com tarefas em andamento"
        />
      </div>

      {/* Lista de squads analisados */}
      <div className="space-y-4">
        {filteredData.length > 0 ? (
          filteredData.map((squad) => (
            <Card key={squad.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: squad.icon_bg, color: squad.icon_color }}
                    >
                      {squad.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{squad.name}</CardTitle>
                      <CardDescription>{squad.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(squad.status)}
                    {getStatusBadge(squad.status)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Problemas identificados */}
                {squad.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Problemas Identificados
                    </h4>
                    <ul className="space-y-1">
                      {squad.issues.map((issue, index) => (
                        <li key={index} className="text-sm text-destructive flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-destructive" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recomendações */}
                {squad.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Recomendações
                    </h4>
                    <ul className="space-y-1">
                      {squad.recommendations.map((rec, index) => (
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
                    Métricas de Performance
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{squad.totalTasks}</div>
                      <div className="text-xs text-muted-foreground">Total Tarefas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{squad.completedTasks}</div>
                      <div className="text-xs text-muted-foreground">Concluídas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{squad.inProgressTasks}</div>
                      <div className="text-xs text-muted-foreground">Em Andamento</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getStatusColor(squad.status)}`}>
                        {squad.productivity}%
                      </div>
                      <div className="text-xs text-muted-foreground">Produtividade</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground">{squad.avgProgress}%</div>
                      <div className="text-xs text-muted-foreground">Progresso Médio</div>
                    </div>
                  </div>
                </div>

                {/* Botão de ação para squads problemáticos */}
                {(squad.status === 'critical' || squad.status === 'needs_attention') && (
                  <div className="flex justify-end pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCreateTask(squad)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Tarefa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum squad encontrado
              </h3>
              <p className="text-muted-foreground">
                Ajuste os filtros para ver mais resultados ou verifique se há squads cadastrados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ReportLayout>
  );
};

export default RelatorioProdutividadeSquads;