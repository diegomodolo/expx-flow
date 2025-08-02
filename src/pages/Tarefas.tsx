import React, { useState } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskList } from "@/components/tasks/TaskList";
import { useTasks } from "@/hooks/useTasks";
import { useTaskStats } from "@/hooks/useTaskStats";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { useDashboardData } from "@/hooks/useDashboardData";
import { 
  Plus, 
  Search, 
  Filter, 
  BarChart3, 
  Calendar as CalendarIcon, 
  List, 
  Kanban,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Tarefas() {
  const [view, setView] = useState<'list' | 'kanban' | 'calendar'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { data: taskStats } = useTaskStats();
  const { convertAlertToTask } = useTaskAutomation();
  const { alerts } = useDashboardData();

  // Filtrar tarefas
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesTeam = teamFilter === 'all' || task.team_id === teamFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesTeam;
  });

  const handleCreateTask = async (taskData: any) => {
    await createTask(taskData);
    setTaskDialogOpen(false);
  };

  const handleUpdateTask = async (taskData: any) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, taskData);
      setSelectedTask(null);
      setTaskDialogOpen(false);
    }
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    await updateTask(taskId, { status });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(taskId);
    }
  };

  const dangerAlerts = alerts?.filter(alert => alert.type === 'danger') || [];
  const opportunityAlerts = alerts?.filter(alert => alert.type === 'opportunity') || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tarefas Inteligentes</h1>
            <p className="text-gray-600 mt-2">
              Gerencie tarefas automáticas e manuais do seu sistema de tráfego
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <Button 
              onClick={() => {
                setSelectedTask(null);
                setTaskDialogOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        {taskStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{taskStats.total_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pendente</p>
                    <p className="text-2xl font-bold">{taskStats.pending_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Em Andamento</p>
                    <p className="text-2xl font-bold">{taskStats.in_progress_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Concluídas</p>
                    <p className="text-2xl font-bold">{taskStats.completed_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Atrasadas</p>
                    <p className="text-2xl font-bold">{taskStats.overdue_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tempo Médio</p>
                    <p className="text-2xl font-bold">
                      {taskStats.avg_completion_days ? `${Math.round(taskStats.avg_completion_days)}d` : '-'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alertas para Conversão */}
        {(dangerAlerts.length > 0 || opportunityAlerts.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Converter Alertas em Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Alertas de Problemas */}
                {dangerAlerts.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-3">
                      Problemas Detectados ({dangerAlerts.length})
                    </h4>
                    <div className="space-y-2">
                      {dangerAlerts.slice(0, 3).map((alert, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                          <div>
                            <p className="font-medium text-red-800">{alert.title}</p>
                            <p className="text-sm text-red-600">{alert.client}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => convertAlertToTask(alert)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Criar Tarefa
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alertas de Oportunidades */}
                {opportunityAlerts.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-800 mb-3">
                      Oportunidades Detectadas ({opportunityAlerts.length})
                    </h4>
                    <div className="space-y-2">
                      {opportunityAlerts.slice(0, 3).map((alert, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                          <div>
                            <p className="font-medium text-green-800">{alert.title}</p>
                            <p className="text-sm text-green-600">{alert.client}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => convertAlertToTask(alert)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Criar Tarefa
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros e Visualizações */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="todo">Pendente</SelectItem>
                <SelectItem value="progress">Em Andamento</SelectItem>
                <SelectItem value="review">Em Revisão</SelectItem>
                <SelectItem value="done">Concluída</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Controles de Visualização */}
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('kanban')}
            >
              <Kanban className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('calendar')}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Conteúdo das Tarefas */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div>
            {view === 'list' && (
              <TaskList
                tasks={filteredTasks}
                onEditTask={handleEditTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onDeleteTask={handleDeleteTask}
              />
            )}
            
            {view === 'kanban' && (
              <TaskKanban
                tasks={filteredTasks}
                onEditTask={handleEditTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onDeleteTask={handleDeleteTask}
              />
            )}
            
            {view === 'calendar' && (
              <Card>
                <CardHeader>
                  <CardTitle>Calendário de Tarefas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <h3 className="font-semibold mb-4">
                        Tarefas para {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Hoje'}
                      </h3>
                      <div className="space-y-3">
                        {filteredTasks
                          .filter(task => 
                            task.due_date && 
                            selectedDate && 
                            format(new Date(task.due_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                          )
                          .map(task => (
                            <Card key={task.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{task.title}</h4>
                                  <p className="text-sm text-gray-600">{task.responsible_name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={
                                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }>
                                    {task.priority === 'high' ? 'Alta' : 
                                     task.priority === 'medium' ? 'Média' : 'Baixa'}
                                  </Badge>
                                  <Button size="sm" variant="outline" onClick={() => handleEditTask(task)}>
                                    Editar
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))
                        }
                        {filteredTasks.filter(task => 
                          task.due_date && 
                          selectedDate && 
                          format(new Date(task.due_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                        ).length === 0 && (
                          <p className="text-gray-500 text-center py-8">
                            Nenhuma tarefa para este dia
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dialog de Tarefas */}
        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={selectedTask}
          onSave={selectedTask ? handleUpdateTask : handleCreateTask}
        />
      </div>
    </DashboardLayout>
  );
}