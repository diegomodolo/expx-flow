import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTeams } from "@/hooks/useTeams";
import { useEmployees } from "@/hooks/useEmployees";
import { usePlannerSlots } from "@/hooks/usePlannerSlots";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  onSave: (taskData: any) => void;
}

export function TaskDialog({ open, onOpenChange, task, onSave }: TaskDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    team_id: '',
    responsible_name: '',
    responsible_avatar: '',
    start_date: null as Date | null,
    start_time: '',
    due_date: null as Date | null,
    due_time: '',
    hasSpecificTime: false,
    progress: 0,
    checklist: [] as { id: string; text: string; completed: boolean }[],
  });

  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [previewSlot, setPreviewSlot] = useState<string>('');
  const { teams } = useTeams();
  const { employees } = useEmployees();
  const { timeSlots } = usePlannerSlots();

  useEffect(() => {
    if (task) {
      const startDate = task.start_date ? new Date(task.start_date) : null;
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        team_id: task.team_id || '',
        responsible_name: task.responsible_name || '',
        responsible_avatar: task.responsible_avatar || '',
        start_date: startDate,
        start_time: startDate ? format(startDate, 'HH:mm') : '',
        due_date: dueDate,
        due_time: dueDate ? format(dueDate, 'HH:mm') : '',
        hasSpecificTime: !!task.start_date,
        progress: task.progress || 0,
        checklist: (() => {
          try {
            return task.checklist && typeof task.checklist === 'string' && task.checklist.trim() !== '' 
              ? JSON.parse(task.checklist) 
              : [];
          } catch (error) {
            console.warn('Failed to parse checklist JSON:', error);
            return [];
          }
        })(),
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        team_id: '',
        responsible_name: '',
        responsible_avatar: '',
        start_date: null,
        start_time: '',
        due_date: null,
        due_time: '',
        hasSpecificTime: false,
        progress: 0,
        checklist: [],
      });
    }
  }, [task]);

  const handleSave = () => {
    let startDateTime: Date | null = null;
    let dueDateTime: Date | null = null;

    // Combinar data e hora para criar timestamp completo
    if (formData.hasSpecificTime && formData.start_date && formData.start_time) {
      // Criar data no formato UTC para evitar problemas de timezone
      const dateStr = formData.start_date.toISOString().split('T')[0]; // YYYY-MM-DD
      startDateTime = new Date(`${dateStr}T${formData.start_time}:00.000Z`); // UTC
    }

    if (formData.due_date && formData.due_time) {
      // Criar data no formato UTC para evitar problemas de timezone
      const dateStr = formData.due_date.toISOString().split('T')[0]; // YYYY-MM-DD
      dueDateTime = new Date(`${dateStr}T${formData.due_time}:00.000Z`); // UTC
    } else if (formData.due_date) {
      // Se não tem horário específico, usar final do dia em UTC
      const dateStr = formData.due_date.toISOString().split('T')[0]; // YYYY-MM-DD
      dueDateTime = new Date(`${dateStr}T23:59:59.999Z`); // UTC
    }

    // Validação: data de início deve ser anterior ao prazo
    if (startDateTime && dueDateTime && startDateTime >= dueDateTime) {
      alert('A data/hora de início deve ser anterior à data/hora do prazo.');
      return;
    }

    // Preparar dados da tarefa - removendo campos auxiliares que não existem no banco
    const taskData: any = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      team_id: formData.team_id,
      responsible_name: formData.responsible_name,
      responsible_avatar: formData.responsible_avatar,
      progress: formData.progress,
      checklist: JSON.stringify(formData.checklist),
    };

    if (startDateTime) {
      taskData.start_date = startDateTime.toISOString();
    }

    if (dueDateTime) {
      taskData.due_date = dueDateTime.toISOString();
      taskData.deadline = dueDateTime.toISOString().split('T')[0]; // formato YYYY-MM-DD para o campo deadline
    }

    onSave(taskData);
    onOpenChange(false);
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormData(prev => ({
        ...prev,
        checklist: [
          ...prev.checklist,
          {
            id: Date.now().toString(),
            text: newChecklistItem.trim(),
            completed: false,
          }
        ]
      }));
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter(item => item.id !== id)
    }));
  };

  const toggleChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  // Função para encontrar o slot baseado na data/hora de início
  const findSlotForDateTime = (date: Date | null, time: string) => {
    if (!date || !time || !timeSlots) return null;
    
    const [hours, minutes] = time.split(':').map(Number);
    const timeOnly = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    
    // Buscar slot exato primeiro
    const exactSlot = timeSlots.find(slot => 
      timeOnly >= slot.start_time && timeOnly <= slot.end_time
    );
    
    if (exactSlot) return { slot: exactSlot, isExact: true };
    
    // Se não encontrou exato, buscar o próximo
    const nextSlot = timeSlots
      .filter(slot => slot.start_time > timeOnly)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
    
    if (nextSlot) return { slot: nextSlot, isExact: false };
    
    // Se não tem próximo, pegar o último do dia
    const lastSlot = timeSlots
      .sort((a, b) => b.end_time.localeCompare(a.end_time))[0];
    
    return lastSlot ? { slot: lastSlot, isExact: false } : null;
  };

  // Atualizar preview do slot quando data/hora mudam
  useEffect(() => {
    if (formData.hasSpecificTime && formData.start_date && formData.start_time) {
      const result = findSlotForDateTime(formData.start_date, formData.start_time);
      if (result) {
        const prefix = result.isExact ? '' : '📍 ';
        const suffix = result.isExact ? '' : ' (próximo disponível)';
        setPreviewSlot(`${prefix}${result.slot.name}${suffix}`);
      } else {
        setPreviewSlot('Nenhum slot encontrado');
      }
    } else {
      setPreviewSlot('');
    }
  }, [formData.start_date, formData.start_time, formData.hasSpecificTime, timeSlots]);

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800',
    progress: 'bg-blue-100 text-blue-800',
    review: 'bg-purple-100 text-purple-800',
    done: 'bg-green-100 text-green-800',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Título */}
          <div>
            <Label htmlFor="title">Título</Label>
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

          {/* Status e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">
                    <Badge className={statusColors.todo}>Pendente</Badge>
                  </SelectItem>
                  <SelectItem value="progress">
                    <Badge className={statusColors.progress}>Em Andamento</Badge>
                  </SelectItem>
                  <SelectItem value="review">
                    <Badge className={statusColors.review}>Em Revisão</Badge>
                  </SelectItem>
                  <SelectItem value="done">
                    <Badge className={statusColors.done}>Concluída</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <Badge className={priorityColors.low}>Baixa</Badge>
                  </SelectItem>
                  <SelectItem value="medium">
                    <Badge className={priorityColors.medium}>Média</Badge>
                  </SelectItem>
                  <SelectItem value="high">
                    <Badge className={priorityColors.high}>Alta</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Equipe e Responsável */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Equipe</Label>
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
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Responsável</Label>
              <Select
                value={formData.responsible_name}
                onValueChange={(value) => {
                  const employee = employees?.find(e => e.name === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    responsible_name: value,
                    responsible_avatar: employee?.avatar || ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Opção de horário específico */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasSpecificTime"
              checked={formData.hasSpecificTime}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasSpecificTime: !!checked }))}
            />
            <Label htmlFor="hasSpecificTime">Esta tarefa tem horário específico</Label>
          </div>

          {/* Data/Hora de Início */}
          {formData.hasSpecificTime && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? format(formData.start_date, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Hora de Início</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
                {previewSlot && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Será adicionada ao slot: <strong>{previewSlot}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prazo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data do Prazo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, "PPP", { locale: ptBR }) : "Selecione o prazo"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Hora do Prazo {!formData.hasSpecificTime && "(opcional)"}</Label>
              <Input
                type="time"
                value={formData.due_time}
                onChange={(e) => setFormData(prev => ({ ...prev, due_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Progresso */}
          <div>
            <Label>Progresso (%)</Label>
            <div className="space-y-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))}
              />
              <Progress value={formData.progress} />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <Label>Checklist</Label>
            <div className="space-y-2">
              {formData.checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="h-4 w-4"
                  />
                  <span className={item.completed ? 'line-through text-gray-500' : ''}>
                    {item.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChecklistItem(item.id)}
                    className="ml-auto"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <div className="flex gap-2">
                <Input
                  placeholder="Novo item do checklist"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                />
                <Button onClick={addChecklistItem} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {task ? 'Atualizar' : 'Criar'} Tarefa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}