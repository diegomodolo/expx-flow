import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployees } from "@/hooks/useEmployees";
import { useClients } from "@/hooks/useClients";
import { useRecurringTasks, CreateRecurringTaskData, RecurringTaskTemplate } from "@/hooks/useRecurringTasks";
import { Repeat, Calendar, User, Building2, Clock, Eye } from "lucide-react";

interface RecurringTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string; // Se passado, pré-seleciona e fixa o cliente
  editTemplate?: RecurringTaskTemplate | null;
}

export function RecurringTaskDialog({
  open,
  onOpenChange,
  clientId,
  editTemplate,
}: RecurringTaskDialogProps) {
  const { employees } = useEmployees();
  const { clients } = useClients();
  const { createTemplate, updateTemplate } = useRecurringTasks();

  const [formData, setFormData] = useState<CreateRecurringTaskData>({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    client_id: clientId || null,
    recurrence_type: 'daily',
    recurrence_interval: 1,
    days_before_visible: 0,
    days_to_complete: 1,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preencher form quando editando
  useEffect(() => {
    if (editTemplate) {
      setFormData({
        title: editTemplate.title,
        description: editTemplate.description || '',
        priority: editTemplate.priority,
        assigned_to: editTemplate.assigned_to,
        client_id: editTemplate.client_id,
        recurrence_type: editTemplate.recurrence_type,
        recurrence_interval: editTemplate.recurrence_interval,
        days_before_visible: editTemplate.days_before_visible,
        days_to_complete: editTemplate.days_to_complete,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        assigned_to: '',
        client_id: clientId || null,
        recurrence_type: 'daily',
        recurrence_interval: 1,
        days_before_visible: 0,
        days_to_complete: 1,
      });
    }
  }, [editTemplate, clientId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.assigned_to) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editTemplate) {
        await updateTemplate(editTemplate.id, formData);
      } else {
        await createTemplate(formData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving recurring task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const recurrenceLabels = {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
  };

  const intervalLabels = {
    daily: 'dia(s)',
    weekly: 'semana(s)',
    monthly: 'mês(es)',
    yearly: 'ano(s)',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            {editTemplate ? 'Editar Tarefa Recorrente' : 'Nova Tarefa Recorrente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Revisar campanhas do cliente"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes da tarefa..."
              rows={2}
            />
          </div>

          {/* Responsável e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Responsável *
              </Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.user_id} value={emp.user_id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cliente (se não fixado) */}
          {!clientId && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Cliente (opcional)
              </Label>
              <Select
                value={formData.client_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum cliente específico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente específico</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recorrência */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Repeat className="h-4 w-4" />
              Configuração de Recorrência
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={formData.recurrence_type}
                  onValueChange={(value) => setFormData({ ...formData, recurrence_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>A cada</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={formData.recurrence_interval}
                    onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">
                    {intervalLabels[formData.recurrence_type]}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Aparecer
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={formData.days_before_visible}
                    onChange={(e) => setFormData({ ...formData, days_before_visible: parseInt(e.target.value) || 0 })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">dia(s) antes</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Prazo para concluir
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={formData.days_to_complete}
                    onChange={(e) => setFormData({ ...formData, days_to_complete: parseInt(e.target.value) || 1 })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">dia(s)</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title || !formData.assigned_to}>
              {isSubmitting ? 'Salvando...' : editTemplate ? 'Salvar Alterações' : 'Criar Tarefa Recorrente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
