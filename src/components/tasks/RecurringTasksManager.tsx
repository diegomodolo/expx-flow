import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Repeat, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  User, 
  Building2,
  Clock,
  AlertCircle
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

interface RecurringTasksManagerProps {
  clientId?: string;
}

export function RecurringTasksManager({ clientId }: RecurringTasksManagerProps) {
  const { templates, loading, deleteTemplate, toggleTemplateActive } = useRecurringTasks(clientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<RecurringTaskTemplate | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

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

  const recurrenceLabels = {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
  };

  const priorityConfig = {
    low: { label: 'Baixa', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    high: { label: 'Alta', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Repeat className="h-5 w-5 text-primary" />
            Tarefas Recorrentes
          </CardTitle>
          <Button size="sm" onClick={() => { setEditTemplate(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <Repeat className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma tarefa recorrente configurada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie tarefas que se repetem automaticamente
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 rounded-lg border transition-all ${
                      template.is_active 
                        ? 'bg-card border-border hover:border-primary/30' 
                        : 'bg-muted/30 border-border/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-foreground truncate">
                            {template.title}
                          </h4>
                          <Badge variant="outline" className={priorityConfig[template.priority].color}>
                            {priorityConfig[template.priority].label}
                          </Badge>
                        </div>

                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                            {template.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Repeat className="h-3 w-3" />
                            {recurrenceLabels[template.recurrence_type]}
                            {template.recurrence_interval > 1 && ` (a cada ${template.recurrence_interval})`}
                          </span>

                          {template.assigned_employee && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {template.assigned_employee.name}
                            </span>
                          )}

                          {template.client && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {template.client.name}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Próxima: {format(new Date(template.next_generation_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Prazo: {template.days_to_complete} dia(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={(checked) => toggleTemplateActive(template.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
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
