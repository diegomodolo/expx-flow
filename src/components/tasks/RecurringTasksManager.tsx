import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Repeat, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  User, 
  Building2,
  Clock,
  AlertCircle,
  Play,
  Loader2
} from "lucide-react";
import { useRecurringTasks, RecurringTaskTemplate } from "@/hooks/useRecurringTasks";
import { RecurringTaskDialog } from "./RecurringTaskDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RecurringTasksManagerProps {
  clientId?: string;
}

const DAY_ABBREVIATIONS: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

function formatActiveDays(days: number[]): string {
  const sortedDays = [...days].sort((a, b) => {
    if (a === 0) return 1;
    if (b === 0) return -1;
    return a - b;
  });
  return sortedDays.map(d => DAY_ABBREVIATIONS[d]).join(', ');
}

const recurrenceLabels: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Baixa', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  medium: { label: 'Média', className: 'bg-primary/10 text-primary border-primary/30' },
  high: { label: 'Alta', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function RecurringTasksManager({ clientId }: RecurringTasksManagerProps) {
  const { templates, loading, deleteTemplate, toggleTemplateActive, fetchTemplates } = useRecurringTasks(clientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<RecurringTaskTemplate | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleEdit = (template: RecurringTaskTemplate) => {
    setEditTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate(templateToDelete);
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recurring-tasks');
      
      if (error) {
        console.error('Error generating tasks:', error);
        toast.error('Erro ao gerar tarefas', { description: error.message });
        return;
      }

      if (data?.results?.created > 0) {
        toast.success(`${data.results.created} tarefa(s) gerada(s)`, {
          description: 'As tarefas foram criadas com sucesso'
        });
      } else if (data?.results?.processed === 0) {
        toast.info('Nenhuma tarefa pendente', {
          description: 'Não há tarefas recorrentes para gerar no momento'
        });
      } else if (data?.results?.errors?.length > 0) {
        toast.warning('Geração parcial', {
          description: `${data.results.created} criadas, ${data.results.errors.length} erro(s)`
        });
      } else {
        toast.info('Nenhuma tarefa gerada', {
          description: 'Verifique as datas de próxima geração dos templates'
        });
      }

      await fetchTemplates();
    } catch (err) {
      console.error('Exception generating tasks:', err);
      toast.error('Erro ao gerar tarefas');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Repeat className="h-5 w-5 text-primary" />
            Tarefas Recorrentes
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleGenerateTasks}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Gerar Agora
            </Button>
            <Button size="sm" onClick={() => { setEditTemplate(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Repeat className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma tarefa recorrente configurada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie tarefas que se repetem automaticamente
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tarefa</TableHead>
                  <TableHead className="w-[12%]">Recorrência</TableHead>
                  <TableHead className="w-[12%]">Prioridade</TableHead>
                  <TableHead className="w-[14%]">Responsável</TableHead>
                  <TableHead className="w-[12%]">Cliente</TableHead>
                  <TableHead className="w-[12%]">Próxima</TableHead>
                  <TableHead className="w-[8%]">Prazo</TableHead>
                  <TableHead className="w-[6%] text-center">Ativo</TableHead>
                  <TableHead className="w-[8%] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const prio = priorityConfig[template.priority] || priorityConfig.medium;
                  return (
                    <TableRow key={template.id} className={!template.is_active ? 'opacity-50' : ''}>
                      {/* Title */}
                      <TableCell>
                        <div>
                          <span className="font-medium text-foreground">{template.title}</span>
                          {template.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{template.description}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Recurrence */}
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Repeat className="h-3 w-3 shrink-0" />
                          <span>
                            {recurrenceLabels[template.recurrence_type]}
                            {template.recurrence_interval > 1 && ` (${template.recurrence_interval}x)`}
                          </span>
                        </div>
                        {template.recurrence_type === 'daily' && template.active_days_of_week && template.active_days_of_week.length < 7 && (
                          <span className="text-[10px] text-primary">{formatActiveDays(template.active_days_of_week)}</span>
                        )}
                      </TableCell>

                      {/* Priority */}
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${prio.className}`}>
                          {prio.label}
                        </Badge>
                      </TableCell>

                      {/* Responsible */}
                      <TableCell>
                        {template.assigned_employee ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{template.assigned_employee.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>

                      {/* Client */}
                      <TableCell>
                        {template.client ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{template.client.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>

                      {/* Next generation */}
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {format(new Date(template.next_generation_date), "dd/MM/yy", { locale: ptBR })}
                        </div>
                      </TableCell>

                      {/* Days to complete */}
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          {template.days_to_complete}d
                        </div>
                      </TableCell>

                      {/* Active toggle */}
                      <TableCell className="text-center">
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={(checked) => toggleTemplateActive(template.id, checked)}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(template)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecurringTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        editTemplate={editTemplate}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Excluir tarefa recorrente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa recorrente será excluída permanentemente
              e novas tarefas não serão mais geradas automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
