import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useEmployees } from "@/hooks/useEmployees";
import { useClients } from "@/hooks/useClients";
import { useRecurringTasks, CreateRecurringTaskData, RecurringTaskTemplate } from "@/hooks/useRecurringTasks";
import { Repeat, User, Building2, Clock, Eye, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurringTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string; // Se passado, pré-seleciona e fixa o cliente
  editTemplate?: RecurringTaskTemplate | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

// Short labels for day toggle buttons
const DAYS_OF_WEEK_SHORT = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // All days of week enabled by default

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function RecurringTaskDialog({
  open,
  onOpenChange,
  clientId,
  editTemplate,
}: RecurringTaskDialogProps) {
  const { employees } = useEmployees();
  const { clients } = useClients();
  const { createTemplate, updateTemplate } = useRecurringTasks();
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  // Ordenar clientes por nome alfabeticamente
  const sortedClients = useMemo(() => {
    if (!clients) return [];
    return [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [clients]);

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
    day_of_week: 1, // Segunda-feira por padrão
    day_of_month: 1, // Dia 1 por padrão
    month_of_year: 1, // Janeiro por padrão
    active_days_of_week: ALL_DAYS, // Todos os dias por padrão
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
        day_of_week: editTemplate.day_of_week ?? 1,
        day_of_month: editTemplate.day_of_month ?? 1,
        month_of_year: editTemplate.month_of_year ?? 1,
        active_days_of_week: editTemplate.active_days_of_week ?? ALL_DAYS,
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
        day_of_week: 1,
        day_of_month: 1,
        month_of_year: 1,
        active_days_of_week: ALL_DAYS,
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

  // Gerar opções de dias do mês (1-31)
  const daysOfMonth = Array.from({ length: 31 }, (_, i) => i + 1);

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
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.client_id
                      ? sortedClients.find((c) => c.id === formData.client_id)?.name || "Selecionar cliente"
                      : "Nenhum cliente específico"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setFormData({ ...formData, client_id: null });
                            setClientPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !formData.client_id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Nenhum cliente específico
                        </CommandItem>
                        {sortedClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              setFormData({ ...formData, client_id: client.id });
                              setClientPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.client_id === client.id ? "opacity-100" : "opacity-0"
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

            {/* Seletor de dias da semana - para recorrência diária */}
            {formData.recurrence_type === 'daily' && (
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <p className="text-xs text-muted-foreground">Selecione em quais dias a tarefa deve ser gerada</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK_SHORT.map((day) => {
                    const isActive = (formData.active_days_of_week ?? ALL_DAYS).includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          const currentDays = formData.active_days_of_week ?? ALL_DAYS;
                          let newDays: number[];
                          if (isActive) {
                            // Don't allow removing the last day
                            if (currentDays.length <= 1) return;
                            newDays = currentDays.filter(d => d !== day.value);
                          } else {
                            newDays = [...currentDays, day.value].sort((a, b) => a - b);
                          }
                          setFormData({ ...formData, active_days_of_week: newDays });
                        }}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-md border transition-colors font-medium",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seletor de dia da semana - apenas para recorrência semanal */}
            {formData.recurrence_type === 'weekly' && (
              <div className="space-y-2">
                <Label>Dia da semana</Label>
                <Select
                  value={String(formData.day_of_week ?? 1)}
                  onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seletor de dia do mês - para recorrência mensal */}
            {formData.recurrence_type === 'monthly' && (
              <div className="space-y-2">
                <Label>Dia do mês</Label>
                <Select
                  value={String(formData.day_of_month ?? 1)}
                  onValueChange={(value) => setFormData({ ...formData, day_of_month: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfMonth.map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seletor de dia e mês do ano - para recorrência anual */}
            {formData.recurrence_type === 'yearly' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select
                    value={String(formData.month_of_year ?? 1)}
                    onValueChange={(value) => setFormData({ ...formData, month_of_year: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={String(month.value)}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dia</Label>
                  <Select
                    value={String(formData.day_of_month ?? 1)}
                    onValueChange={(value) => setFormData({ ...formData, day_of_month: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfMonth.map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

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
