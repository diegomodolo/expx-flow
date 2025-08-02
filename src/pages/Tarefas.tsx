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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskList } from "@/components/tasks/TaskList";
import { useTasks } from "@/hooks/useTasks";
import { useTaskStats } from "@/hooks/useTaskStats";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useClients } from "@/hooks/useClients";
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
  Users,
  RefreshCw,
  ChevronDown,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function Tarefas() {
  const [view, setView] = useState<'list' | 'kanban' | 'calendar'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [convertedAlerts, setConvertedAlerts] = useState<Set<string>>(new Set());
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [clientComboOpen2, setClientComboOpen2] = useState(false);

  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { data: taskStats } = useTaskStats();
  const { convertAlertToTask } = useTaskAutomation();
  const { alerts, refetch: refetchDashboardData } = useDashboardData();
  const { clients } = useClients();

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

  const handleUpdateTaskStatus = async (taskId: string, status: "todo" | "progress" | "review" | "done") => {
    await updateTask(taskId, { status });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(taskId);
    }
  };

  const handleAnalyzeCampaigns = async () => {
    setIsAnalyzing(true);
    try {
      // Limpar alertas convertidos ao buscar novos
      setConvertedAlerts(new Set());
      
      await refetchDashboardData(selectedClientId);
      console.log('Dashboard data refetched, total alerts:', alerts?.length || 0);
      console.log('Danger alerts:', alerts?.filter(a => a.type === 'danger').length || 0);
      console.log('Opportunity alerts:', alerts?.filter(a => a.type === 'opportunity').length || 0);
      console.log('Selected client filter:', selectedClientId);
    } catch (error) {
      console.error('Error analyzing campaigns:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConvertAlertToTask = (alert: any) => {
    // Adicionar alerta à lista de convertidos imediatamente para remover da UI
    setConvertedAlerts(prev => new Set([...prev, alert.id]));
    
    // Converter alerta em tarefa
    convertAlertToTask(alert);
  };

  const handleDiscardAlert = (alert: any) => {
    // Adicionar alerta à lista de convertidos para remover da UI
    setConvertedAlerts(prev => new Set([...prev, alert.id]));
    
    // Fechar modal se não houver mais alertas
    const remainingAlerts = alerts?.filter(a => !convertedAlerts.has(a.id) && a.id !== alert.id) || [];
    if (remainingAlerts.length === 0) {
      setAlertsModalOpen(false);
    }
  };

  // Filtrar alertas que não foram convertidos
  const dangerAlerts = alerts?.filter(alert => 
    alert.type === 'danger' && !convertedAlerts.has(alert.id)
  ) || [];
  
  const opportunityAlerts = alerts?.filter(alert => 
    alert.type === 'opportunity' && !convertedAlerts.has(alert.id)
  ) || [];

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
            {/* Botão de Alertas */}
            <Dialog open={alertsModalOpen} onOpenChange={setAlertsModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Alertas ({dangerAlerts.length + opportunityAlerts.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                    <AlertTriangle className="w-5 h-5" />
                    Alertas de Campanhas
                  </DialogTitle>
                </DialogHeader>
                
                {/* Conteúdo dos Alertas */}
                {(dangerAlerts.length > 0 || opportunityAlerts.length > 0) ? (
                  <div className="space-y-6 mt-6">
                    {/* Seção Problemas Detectados */}
                    {dangerAlerts.length > 0 && (
                      <div>
                         <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-2">
                             <AlertTriangle className="w-5 h-5 text-red-500" />
                             <h3 className="text-lg font-semibold text-gray-900">
                               Problemas Detectados
                             </h3>
                             <span className="text-sm text-gray-500">
                               {dangerAlerts.length} items
                             </span>
                           </div>
                            <div className="flex items-center gap-3">
                              <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={clientComboOpen}
                                    className="w-48 justify-between"
                                  >
                                    {selectedClientId
                                      ? clients?.find((client) => client.id === selectedClientId)?.name
                                      : "Todos os clientes"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-0 bg-white" align="start">
                                  <Command>
                                    <CommandInput placeholder="Buscar cliente..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                      <CommandGroup>
                                        <CommandItem
                                          value="all"
                                          onSelect={() => {
                                            setSelectedClientId(null);
                                            setClientComboOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              selectedClientId === null ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          Todos os clientes
                                        </CommandItem>
                                        {clients?.map((client) => (
                                          <CommandItem
                                            key={client.id}
                                            value={client.name}
                                            onSelect={() => {
                                              setSelectedClientId(client.id);
                                              setClientComboOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {client.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={handleAnalyzeCampaigns}
                               className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                               disabled={isAnalyzing}
                             >
                               <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                               {isAnalyzing ? 'Buscando...' : 'Buscar Sugestões'}
                             </Button>
                           </div>
                         </div>
                        <div className="space-y-3">
                          {dangerAlerts.map((alert, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      alert.title.includes('CPA alto') ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                                    }`}>
                                      {alert.title.includes('CPA alto') ? 'Crítico' : 'Alto'}
                                    </span>
                                    <h4 className="font-medium text-gray-900 text-sm">
                                      {alert.client}{alert.campaign ? ` - ${alert.campaign}` : ''}
                                    </h4>
                                  </div>
                                  <div className="mb-2">
                                    <p className="font-semibold text-gray-900">
                                      {alert.title}: {alert.value}
                                    </p>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    <span>Campanha: {alert.campaign || 'N/A'} • </span>
                                    <span>Criado há 2 horas</span>
                                  </div>
                                  {alert.recommendation && (
                                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                      {alert.recommendation}
                                    </div>
                                  )}
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleDiscardAlert(alert)}
                                     className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                   >
                                     Descartar
                                   </Button>
                                   <Button
                                     size="sm"
                                     onClick={() => {
                                       handleConvertAlertToTask(alert);
                                       if (dangerAlerts.length + opportunityAlerts.length <= 1) {
                                         setAlertsModalOpen(false);
                                       }
                                     }}
                                     className="bg-red-600 hover:bg-red-700 text-white"
                                   >
                                     Criar Tarefa
                                   </Button>
                                 </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                     {/* Seção Oportunidades Detectadas */}
                     {opportunityAlerts.length > 0 && (
                       <div>
                         <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-2">
                             <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                             </div>
                             <h3 className="text-lg font-semibold text-gray-900">
                               Oportunidades Detectadas
                             </h3>
                             <span className="text-sm text-gray-500">
                               {opportunityAlerts.length} items
                             </span>
                           </div>
                            <div className="flex items-center gap-3">
                              <Popover open={clientComboOpen2} onOpenChange={setClientComboOpen2}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={clientComboOpen2}
                                    className="w-48 justify-between"
                                  >
                                    {selectedClientId
                                      ? clients?.find((client) => client.id === selectedClientId)?.name
                                      : "Todos os clientes"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-0 bg-white" align="start">
                                  <Command>
                                    <CommandInput placeholder="Buscar cliente..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                      <CommandGroup>
                                        <CommandItem
                                          value="all"
                                          onSelect={() => {
                                            setSelectedClientId(null);
                                            setClientComboOpen2(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              selectedClientId === null ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          Todos os clientes
                                        </CommandItem>
                                        {clients?.map((client) => (
                                          <CommandItem
                                            key={client.id}
                                            value={client.name}
                                            onSelect={() => {
                                              setSelectedClientId(client.id);
                                              setClientComboOpen2(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {client.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={handleAnalyzeCampaigns}
                               className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                               disabled={isAnalyzing}
                             >
                               <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                               {isAnalyzing ? 'Buscando...' : 'Buscar Sugestões'}
                             </Button>
                           </div>
                         </div>
                        <div className="space-y-3">
                          {opportunityAlerts.map((alert, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Excelente
                                    </span>
                                    <h4 className="font-medium text-gray-900 text-sm">
                                      {alert.client}{alert.campaign ? ` - ${alert.campaign}` : ''}
                                    </h4>
                                  </div>
                                  <div className="mb-2">
                                    <p className="font-semibold text-gray-900">
                                      {alert.title}: {alert.value}
                                    </p>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    <span>ROI: 340% • CTR: 2.8% • </span>
                                    <span>Criado há 1 hora</span>
                                  </div>
                                  {alert.recommendation && (
                                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                      {alert.recommendation}
                                    </div>
                                  )}
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleDiscardAlert(alert)}
                                     className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                   >
                                     Descartar
                                   </Button>
                                   <Button
                                     size="sm"
                                     onClick={() => {
                                       handleConvertAlertToTask(alert);
                                       if (dangerAlerts.length + opportunityAlerts.length <= 1) {
                                         setAlertsModalOpen(false);
                                       }
                                     }}
                                     className="bg-green-600 hover:bg-green-700 text-white"
                                   >
                                     Criar Tarefa
                                   </Button>
                                 </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center max-w-md mx-auto">
                      <div className="text-6xl mb-4">🎯</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum alerta encontrado
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Selecione um cliente específico ou clique no botão abaixo para buscar novas sugestões de problemas e oportunidades nas suas campanhas.
                      </p>
                      
                      {/* Combo de seleção de cliente */}
                      <div className="mb-6">
                        <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={clientComboOpen}
                              className="w-64 justify-between mx-auto"
                            >
                              {selectedClientId
                                ? clients?.find((client) => client.id === selectedClientId)?.name
                                : "Todos os clientes"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0 bg-white" align="center">
                            <Command>
                              <CommandInput placeholder="Buscar cliente..." />
                              <CommandList>
                                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="all"
                                    onSelect={() => {
                                      setSelectedClientId(null);
                                      setClientComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedClientId === null ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    Todos os clientes
                                  </CommandItem>
                                  {clients?.map((client) => (
                                    <CommandItem
                                      key={client.id}
                                      value={client.name}
                                      onSelect={() => {
                                        setSelectedClientId(client.id);
                                        setClientComboOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                        )}
                                       />
                                       {client.name}
                                     </CommandItem>
                                   ))}
                                 </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <Button
                        onClick={handleAnalyzeCampaigns}
                        className="flex items-center gap-2 mx-auto"
                        size="lg"
                        disabled={isAnalyzing}
                      >
                        <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                        {isAnalyzing ? 'Analisando...' : 'Buscar Novas Sugestões'}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Botão Nova Tarefa */}
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
          <div className="grid grid-cols-6 gap-4">
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