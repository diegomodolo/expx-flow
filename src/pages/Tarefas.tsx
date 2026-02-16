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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskList } from "@/components/tasks/TaskList";
import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { BoardSelector } from "@/components/tasks/BoardSelector";
import { RecurringTasksManager } from "@/components/tasks/RecurringTasksManager";
import { RecurringTaskDialog } from "@/components/tasks/RecurringTaskDialog";
import { TemplateSelector } from "@/components/tasks/TemplateSelector";
import { useTasks } from "@/hooks/useTasks";
import { useTaskStats } from "@/hooks/useTaskStats";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { useTaskBoardColumns } from "@/hooks/useTaskBoardColumns";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useClients } from "@/hooks/useClients";
import { useEmployeeBoard } from "@/hooks/useEmployeeBoard";
import { KanbanTemplate } from "@/data/kanbanTemplates";
import { 
  Plus, 
  Search, 
  Filter, 
  BarChart3, 
  Calendar as CalendarIcon, 
  List, 
  Kanban,
  Layout,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Users,
  RefreshCw,
  ChevronDown,
  Check,
  ChevronsUpDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Repeat,
  Minimize2,
  Maximize2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function Tarefas() {
  const [view, setView] = useState<'list' | 'kanban' | 'calendar' | 'planner' | 'recurring'>('kanban');
  const [plannerDate, setPlannerDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [convertedAlerts, setConvertedAlerts] = useState<Set<string>>(new Set());
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [clientComboOpen2, setClientComboOpen2] = useState(false);
  // Estados para ordenação
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  // Estado para seleção de quadro do colaborador
  const [selectedBoardUserId, setSelectedBoardUserId] = useState<string | null | "all">(null);
  // Estado para modal de templates
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  // Estado para modo compacto (persistido no localStorage)
  const [isCompactMode, setIsCompactMode] = useState(() => {
    return localStorage.getItem('tasks-compact-mode') === 'true';
  });
  // Estado para modal de filtros (modo compacto)
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);

  const toggleCompactMode = () => {
    const newValue = !isCompactMode;
    setIsCompactMode(newValue);
    localStorage.setItem('tasks-compact-mode', newValue.toString());
  };

  // Contar filtros ativos
  const activeFiltersCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
    responsibleFilter !== 'all',
    searchTerm !== '',
  ].filter(Boolean).length;

  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { data: taskStats } = useTaskStats();
  const { convertAlertToTask } = useTaskAutomation();
  const { 
    columns: userColumns, 
    applyTemplate, 
    isApplyingTemplate 
  } = useTaskBoardColumns();
  const { alerts, generateAlerts, loading: alertsLoading } = useDashboardAlerts();
  const { clients } = useClients();
  
  // Hook para quadro do colaborador
  const { 
    boardTasks, 
    tasksLoading: boardTasksLoading,
    employees, 
    canViewOthersBoards, 
    isManager, 
    currentUserId 
  } = useEmployeeBoard(selectedBoardUserId);

  // Sempre usar boardTasks que já filtra corretamente por usuário
  const activeTasks = boardTasks;
  const activeLoading = boardTasksLoading;

  // Filtrar e ordenar tarefas
  const filteredAndSortedTasks = activeTasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesTeam = teamFilter === 'all' || task.team_id === teamFilter;
      const matchesResponsible = responsibleFilter === 'all' || 
                                task.responsible_name === responsibleFilter ||
                                task.user_id === responsibleFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesTeam && matchesResponsible;
    })
    .sort((a, b) => {
      let valueA, valueB;
      
      switch (sortField) {
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          valueA = priorityOrder[a.priority as keyof typeof priorityOrder];
          valueB = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'status':
          const statusOrder = {
            todo: 1,
            progress: 2,
            review: 3,
            waiting_approval: 4,
            blocked: 5,
            paused: 6,
            done: 7,
            cancelled: 8,
          };
          valueA = statusOrder[a.status as keyof typeof statusOrder];
          valueB = statusOrder[b.status as keyof typeof statusOrder];
          break;
        case 'responsible_name':
          valueA = (a.responsible_name || '').toLowerCase();
          valueB = (b.responsible_name || '').toLowerCase();
          break;
        case 'due_date':
          valueA = a.due_date ? new Date(a.due_date).getTime() : 0;
          valueB = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case 'created_at':
        default:
          valueA = a.created_at ? new Date(a.created_at).getTime() : 0;
          valueB = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Manter referência para compatibilidade
  const filteredTasks = filteredAndSortedTasks;

  // Extrair responsáveis únicos das tarefas para o filtro
  const uniqueResponsibles = Array.from(
    new Set(
      activeTasks
        .filter(task => task.responsible_name && task.responsible_name.trim() !== '')
        .map(task => task.responsible_name)
    )
  ).sort();

  // Opções de campos para ordenação
  const sortFieldOptions = [
    { value: 'created_at', label: 'Data de Criação' },
    { value: 'title', label: 'Título' },
    { value: 'priority', label: 'Prioridade' },
    { value: 'status', label: 'Status' },
    { value: 'responsible_name', label: 'Responsável' },
    { value: 'due_date', label: 'Prazo' },
  ];

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

  const handleUpdateTaskStatus = async (taskId: string, status: string, columnId?: string, columnName?: string) => {
    const updates: any = { status: status as any };
    if (columnId !== undefined) updates.quadro_column_id = columnId || null;
    if (columnName !== undefined) updates.etapa = columnName || null;
    await updateTask(taskId, updates);
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
      
      await generateAlerts(selectedClientId);
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
      <div className={cn(
        "transition-all",
        isCompactMode ? "space-y-2 p-3" : "space-y-6 p-6"
      )}>
        {/* Header */}
        <div className={cn(
          "flex flex-col lg:flex-row lg:items-center lg:justify-between",
          isCompactMode && "gap-2"
        )}>
          <div>
            <h1 className={cn(
              "text-foreground",
              isCompactMode ? "text-lg font-semibold" : "text-headline-lg"
            )}>Tarefas Inteligentes</h1>
            {!isCompactMode && (
              <p className="text-muted-foreground mt-2">
                Gerencie tarefas automáticas e manuais do seu sistema de tráfego
              </p>
            )}
          </div>
          
          <div className={cn(
            "flex items-center mt-4 lg:mt-0",
            isCompactMode ? "gap-2" : "gap-3"
          )}>
            {/* Botão Toggle Modo Compacto */}
            <Button 
              variant="outline"
              size={isCompactMode ? "sm" : "default"}
              onClick={toggleCompactMode}
              title={isCompactMode ? "Modo Normal" : "Modo Compacto"}
              className="flex items-center gap-2"
            >
              {isCompactMode ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              {!isCompactMode && <span className="hidden xl:inline">Compactar</span>}
            </Button>

            {/* Botão de Templates */}
            <Button 
              variant="outline"
              size={isCompactMode ? "sm" : "default"}
              className="flex items-center gap-2"
              onClick={() => setTemplateSelectorOpen(true)}
            >
              <Layout className="w-4 h-4" />
              {!isCompactMode && <span className="hidden xl:inline">Templates</span>}
            </Button>

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
                             <AlertTriangle className="w-5 h-5 text-destructive" />
                             <h3 className="text-lg font-semibold text-foreground">
                               Problemas Detectados
                             </h3>
                             <span className="text-sm text-muted-foreground">
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
                                <PopoverContent className="w-48 p-0 bg-popover" align="start">
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
                               className="flex items-center gap-2 text-primary border-primary/30 hover:bg-primary/10"
                               disabled={isAnalyzing}
                             >
                               <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                               {isAnalyzing ? 'Buscando...' : 'Buscar Sugestões'}
                             </Button>
                           </div>
                         </div>
                        <div className="space-y-3">
                          {dangerAlerts.map((alert, index) => (
                            <div key={index} className="bg-card border border-border rounded-lg p-4 shadow-google-sm hover:shadow-google-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      alert.title.includes('CPA alto') ? 'bg-google-red-100 dark:bg-google-red-600/20 text-google-red-600' : 'bg-orange-100 dark:bg-orange-600/20 text-orange-600'
                                    }`}>
                                      {alert.title.includes('CPA alto') ? 'Crítico' : 'Alto'}
                                    </span>
                                    <h4 className="font-medium text-foreground text-sm">
                                      {alert.client}{alert.campaign ? ` - ${alert.campaign}` : ''}
                                    </h4>
                                  </div>
                                  <div className="mb-2">
                                    <p className="font-semibold text-foreground">
                                      {alert.title}: {alert.value}
                                    </p>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <span>Campanha: {alert.campaign || 'N/A'} • </span>
                                    <span>Criado há 2 horas</span>
                                  </div>
                                  {alert.recommendation && (
                                    <div className="mt-2 text-sm text-foreground bg-muted/50 p-2 rounded">
                                      {alert.recommendation}
                                    </div>
                                  )}
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleDiscardAlert(alert)}
                                     className="text-muted-foreground border-border hover:bg-muted"
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
                             <div className="w-5 h-5 bg-google-green-100 dark:bg-google-green-600/20 rounded-full flex items-center justify-center">
                               <div className="w-2 h-2 bg-google-green-500 rounded-full"></div>
                             </div>
                             <h3 className="text-lg font-semibold text-foreground">
                               Oportunidades Detectadas
                             </h3>
                             <span className="text-sm text-muted-foreground">
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
                                <PopoverContent className="w-48 p-0 bg-popover" align="start">
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
                               className="flex items-center gap-2 text-primary border-primary/30 hover:bg-primary/10"
                               disabled={isAnalyzing}
                             >
                               <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                               {isAnalyzing ? 'Buscando...' : 'Buscar Sugestões'}
                             </Button>
                           </div>
                         </div>
                        <div className="space-y-3">
                          {opportunityAlerts.map((alert, index) => (
                            <div key={index} className="bg-card border border-border rounded-lg p-4 shadow-google-sm hover:shadow-google-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-google-green-100 dark:bg-google-green-600/20 text-google-green-600 dark:text-google-green-400">
                                      Excelente
                                    </span>
                                    <h4 className="font-medium text-foreground text-sm">
                                      {alert.client}{alert.campaign ? ` - ${alert.campaign}` : ''}
                                    </h4>
                                  </div>
                                  <div className="mb-2">
                                    <p className="font-semibold text-foreground">
                                      {alert.title}: {alert.value}
                                    </p>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <span>ROI: 340% • CTR: 2.8% • </span>
                                    <span>Criado há 1 hora</span>
                                  </div>
                                  {alert.recommendation && (
                                    <div className="mt-2 text-sm text-foreground bg-muted/50 p-2 rounded">
                                      {alert.recommendation}
                                    </div>
                                  )}
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleDiscardAlert(alert)}
                                     className="text-muted-foreground border-border hover:bg-muted"
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
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Nenhum alerta encontrado
                      </h3>
                      <p className="text-muted-foreground mb-6">
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
                          <PopoverContent className="w-64 p-0 bg-popover" align="center">
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

            {/* Seletor de Quadro */}
            <BoardSelector
              selectedUserId={selectedBoardUserId}
              onSelectUser={setSelectedBoardUserId}
              employees={employees}
              currentUserId={currentUserId}
              canViewOthersBoards={canViewOthersBoards}
              isManager={isManager || false}
            />

            {/* Botão Nova Tarefa Recorrente */}
            <Button 
              variant="outline"
              onClick={() => setRecurringDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Repeat className="w-4 h-4" />
              Nova Recorrente
            </Button>

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

        {/* Estatísticas - Ocultar no modo compacto */}
        {taskStats && !isCompactMode && (
          <div className="grid grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-foreground">{taskStats.total_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-google-blue-100 dark:bg-google-blue-700/20 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-google-blue-600 dark:text-google-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pendente</p>
                    <p className="text-2xl font-bold text-foreground">{taskStats.pending_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Em Andamento</p>
                    <p className="text-2xl font-bold text-foreground">{taskStats.in_progress_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-google-blue-100 dark:bg-google-blue-700/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-google-blue-600 dark:text-google-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Concluídas</p>
                    <p className="text-2xl font-bold text-foreground">{taskStats.completed_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-google-green-100 dark:bg-google-green-600/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-google-green-600 dark:text-google-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Atrasadas</p>
                    <p className="text-2xl font-bold text-foreground">{taskStats.overdue_tasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-google-red-100 dark:bg-google-red-600/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-google-red-600 dark:text-google-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo Médio</p>
                    <p className="text-2xl font-bold text-foreground">
                      {taskStats.avg_completion_days ? `${Math.round(taskStats.avg_completion_days)}d` : '-'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {/* Filtros e Visualizações */}
        <div className={cn(
          "flex flex-col lg:flex-row lg:items-center lg:justify-between",
          isCompactMode ? "gap-2" : "gap-4"
        )}>
          {/* Filtros - Modo compacto: botão que abre Sheet */}
          {isCompactMode ? (
            <div className="flex items-center gap-2">
              <Sheet open={filtersModalOpen} onOpenChange={setFiltersModalOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 mt-6">
                    {/* Busca */}
                    <div className="space-y-2">
                      <Label>Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Buscar tarefas..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos Status</SelectItem>
                          <SelectItem value="todo">Pendente</SelectItem>
                          <SelectItem value="progress">Em Andamento</SelectItem>
                          <SelectItem value="review">Em Revisão</SelectItem>
                          <SelectItem value="waiting_approval">Aguardando Aprovação</SelectItem>
                          <SelectItem value="blocked">Bloqueada</SelectItem>
                          <SelectItem value="paused">Pausada</SelectItem>
                          <SelectItem value="done">Concluída</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Prioridade */}
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger>
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

                    {/* Responsável */}
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos Responsáveis</SelectItem>
                          {uniqueResponsibles.map((responsible) => (
                            <SelectItem key={responsible} value={responsible}>
                              {responsible}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ordenação */}
                    {(view === 'list' || view === 'kanban') && (
                      <>
                        <div className="space-y-2">
                          <Label>Ordenar por</Label>
                          <Select value={sortField} onValueChange={setSortField}>
                            <SelectTrigger>
                              <SelectValue placeholder="Ordenar por" />
                            </SelectTrigger>
                            <SelectContent>
                              {sortFieldOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Direção</Label>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          >
                            {sortOrder === 'asc' ? (
                              <ArrowUp className="w-4 h-4 mr-2" />
                            ) : (
                              <ArrowDown className="w-4 h-4 mr-2" />
                            )}
                            {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Botão Limpar Filtros */}
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                          setPriorityFilter('all');
                          setResponsibleFilter('all');
                        }}
                      >
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          ) : (
            /* Filtros - Modo normal: inline */
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
                  <SelectItem value="waiting_approval">Aguardando Aprovação</SelectItem>
                  <SelectItem value="blocked">Bloqueada</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="done">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
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

              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Responsáveis</SelectItem>
                  {uniqueResponsibles.map((responsible) => (
                    <SelectItem key={responsible} value={responsible}>
                      {responsible}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Controles de Ordenação - Visíveis apenas para lista e kanban */}
              {(view === 'list' || view === 'kanban') && (
                <>
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="w-48">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortFieldOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2"
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                    {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Controles de Visualização */}
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'planner' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('planner')}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
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
            <Button
              variant={view === 'recurring' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('recurring')}
            >
              <Repeat className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Conteúdo das Tarefas */}
        {activeLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div>
            {view === 'planner' && (
              <PlannerTimeline 
                selectedDate={plannerDate}
                onDateChange={setPlannerDate}
                filteredTasks={filteredTasks}
              />
            )}
            
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
                isCompactMode={isCompactMode}
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
                                  <p className="text-sm text-muted-foreground">{task.responsible_name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={
                                    task.priority === 'high' ? 'bg-google-red-100 dark:bg-google-red-600/20 text-google-red-600' :
                                    task.priority === 'medium' ? 'bg-google-yellow-100 dark:bg-google-yellow-500/20 text-google-yellow-600' :
                                    'bg-google-green-100 dark:bg-google-green-600/20 text-google-green-600'
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
                          <p className="text-muted-foreground text-center py-8">
                            Nenhuma tarefa para este dia
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {view === 'recurring' && (
              <RecurringTasksManager />
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

        {/* Dialog de Tarefas Recorrentes */}
        <RecurringTaskDialog
          open={recurringDialogOpen}
          onOpenChange={setRecurringDialogOpen}
        />

        {/* Template Selector Dialog */}
        <TemplateSelector
          open={templateSelectorOpen}
          onOpenChange={setTemplateSelectorOpen}
          onApplyTemplate={(template: KanbanTemplate) => applyTemplate(template)}
          isApplying={isApplyingTemplate}
          hasExistingColumns={userColumns.length > 0}
        />
      </div>
    </DashboardLayout>
  );
}