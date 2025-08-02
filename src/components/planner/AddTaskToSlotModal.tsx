import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Clock, User, Flag, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUnscheduledTasks } from "@/hooks/useUnscheduledTasks";
import { useTeams } from "@/hooks/useTeams";
import { useEmployees } from "@/hooks/useEmployees";
import { PlannerTimeSlot } from "@/hooks/usePlannerSlots";
import { toast } from "sonner";

interface AddTaskToSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: PlannerTimeSlot;
  selectedDate: Date;
  onTaskSelected: (taskId: string) => void;
  onNewTaskCreated: (taskData: any) => void;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  team_id: string;
  responsible_name: string;
  responsible_user_id: string;
  responsible_avatar: string;
}

export function AddTaskToSlotModal({
  open,
  onOpenChange,
  slot,
  selectedDate,
  onTaskSelected,
  onNewTaskCreated,
}: AddTaskToSlotModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    team_id: '',
    responsible_name: '',
    responsible_user_id: '',
    responsible_avatar: '',
  });

  const { unscheduledTasks, loading: tasksLoading } = useUnscheduledTasks();
  const { teams } = useTeams();
  const { employees } = useEmployees();

  // Filtrar tarefas baseado no termo de busca
  const filteredTasks = unscheduledTasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Ordenar por prioridade: Alta -> Média -> Baixa
  const sortedTasks = filteredTasks.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const handleTaskClick = (taskId: string) => {
    onTaskSelected(taskId);
    onOpenChange(false);
    setSearchTerm('');
  };

  const handleCreateTask = () => {
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (!formData.team_id) {
      toast.error("Selecione uma equipe");
      return;
    }

    if (!formData.responsible_name) {
      toast.error("Selecione um responsável");
      return;
    }

    // Criar nova tarefa com dados do slot
    const taskData = {
      ...formData,
      user_id: formData.responsible_user_id,
      status: 'todo',
      deadline: format(selectedDate, 'yyyy-MM-dd'),
      progress: 0,
    };

    onNewTaskCreated(taskData);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      team_id: '',
      responsible_name: '',
      responsible_user_id: '',
      responsible_avatar: '',
    });
    setShowCreateForm(false);
    setSearchTerm('');
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <Circle className="h-3 w-3" />;
      case 'low':
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return 'Média';
    }
  };

  // Reset search and form when modal closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setShowCreateForm(false);
    }
  }, [open]);

  // Return early if slot is null to prevent errors
  if (!slot) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Adicionar Tarefa ao Slot
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">{slot.name}</span> • 
            <span className="ml-1">{slot.start_time} - {slot.end_time}</span> • 
            <span className="ml-1">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreateForm ? (
            <>
              {/* Campo de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tarefas pendentes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Lista de tarefas pendentes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Tarefas Pendentes ({sortedTasks.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateForm(true)}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nova Tarefa
                  </Button>
                </div>

                <ScrollArea className="h-[400px] border rounded-lg">
                  {tasksLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : sortedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <Circle className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium text-foreground">
                        {searchTerm ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa pendente'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {searchTerm ? 'Tente outro termo de busca' : 'Crie uma nova tarefa para este slot'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {sortedTasks.map((task) => (
                        <Card
                          key={task.id}
                          className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
                          onClick={() => handleTaskClick(task.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium text-sm truncate">
                                    {task.title}
                                  </h4>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs h-5 ${getPriorityColor(task.priority)}`}
                                  >
                                    {getPriorityIcon(task.priority)}
                                    <span className="ml-1">{getPriorityLabel(task.priority)}</span>
                                  </Badge>
                                </div>
                                
                                {task.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                    {task.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {task.user_profile && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{task.user_profile.full_name || 'Sem responsável'}</span>
                                    </div>
                                  )}
                                  
                                  {task.team && (
                                    <div className="flex items-center gap-1">
                                      <div 
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: task.team.color }}
                                      />
                                      <span>{task.team.name}</span>
                                    </div>
                                  )}

                                  {task.deadline && (
                                    <div className="flex items-center gap-1">
                                      <Flag className="h-3 w-3" />
                                      <span>{format(new Date(task.deadline), "dd/MM", { locale: ptBR })}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {task.user_profile?.avatar_url && (
                                <Avatar className="h-8 w-8 border">
                                  <AvatarImage src={task.user_profile.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {(task.user_profile.full_name || '?').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          ) : (
            /* Formulário de criação de nova tarefa */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Criar Nova Tarefa</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  Voltar
                </Button>
              </div>

              <Separator />

              <div className="grid gap-4">
                {/* Título */}
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título da tarefa"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva a tarefa..."
                    rows={3}
                  />
                </div>

                {/* Prioridade e Equipe */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') => 
                        setFormData(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span>Baixa</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <Circle className="h-3 w-3 text-yellow-600" />
                            <span>Média</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-3 w-3 text-red-600" />
                            <span>Alta</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Equipe *</Label>
                    <Select
                      value={formData.team_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams?.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: team.color }}
                              />
                              <span>{team.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Responsável */}
                <div>
                  <Label>Responsável *</Label>
                  <Select
                    value={formData.responsible_name}
                    onValueChange={(value) => {
                      const employee = employees?.find(e => e.name === value);
                      setFormData(prev => ({ 
                        ...prev, 
                        responsible_name: value,
                        responsible_avatar: employee?.avatar || employee?.profile_avatar_url || '',
                        responsible_user_id: employee?.user_id || ''
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((employee) => (
                        <SelectItem key={employee.id} value={employee.name}>
                          <div className="flex items-center gap-2">
                            {employee.profile_avatar_url && (
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={employee.profile_avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {employee.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span>{employee.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    disabled={!formData.title.trim() || !formData.team_id || !formData.responsible_name}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Tarefa
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}