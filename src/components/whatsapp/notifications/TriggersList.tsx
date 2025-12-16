import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Clock, AlertCircle } from "lucide-react";
import { NotificationTrigger, TRIGGER_TYPES, REALTIME_ONLY_TRIGGERS } from "@/hooks/useWhatsAppNotifications";
import { TriggerEditModal } from "./TriggerEditModal";
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

interface TriggersListProps {
  triggers: NotificationTrigger[];
  onCreateTrigger: (data: any) => void;
  isCreating: boolean;
  onUpdateTrigger: (data: any) => void;
  isUpdating: boolean;
  onDeleteTrigger: (triggerId: string) => void;
  onToggleTrigger: (data: { triggerId: string; isActive: boolean }) => void;
}

function getFrequencyLabel(trigger: NotificationTrigger): { label: string; isRealtime: boolean } {
  // Check if this trigger type is realtime-only (event-based)
  if (REALTIME_ONLY_TRIGGERS.includes(trigger.trigger_type)) {
    return { label: '⚡ Tempo Real', isRealtime: true };
  }

  const schedule = trigger.schedule;
  if (!schedule) return { label: 'Não agendado', isRealtime: false };

  switch (schedule.frequency_type) {
    case 'realtime':
      return { label: '⚡ Tempo Real', isRealtime: true };
    case 'hourly':
      return { label: 'A cada hora', isRealtime: false };
    case 'daily':
      const hours = schedule.execution_hours || [];
      if (hours.length === 0) {
        return { label: 'Diário (sem horário)', isRealtime: false };
      }
      if (hours.length === 1) {
        return { label: `Diário às ${hours[0]}h`, isRealtime: false };
      }
      if (hours.length <= 3) {
        return { label: `Diário às ${hours.map(h => `${h}h`).join(', ')}`, isRealtime: false };
      }
      return { label: `Diário (${hours.length}x): ${hours.slice(0, 3).map(h => `${h}h`).join(', ')}...`, isRealtime: false };
    case 'weekly':
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const selectedDays = (schedule.days_of_week || []).map(d => days[d]).join(', ');
      return { label: `Semanal (${selectedDays})`, isRealtime: false };
    case 'monthly':
      return { label: `Mensal (dia ${schedule.day_of_month || 1})`, isRealtime: false };
    default:
      return { label: schedule.frequency_type, isRealtime: false };
  }
}

export function TriggersList({
  triggers,
  onCreateTrigger,
  isCreating,
  onUpdateTrigger,
  isUpdating,
  onDeleteTrigger,
  onToggleTrigger,
}: TriggersListProps) {
  const [editingTrigger, setEditingTrigger] = useState<NotificationTrigger | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTriggerId, setDeleteTriggerId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingTrigger(null);
    setIsModalOpen(true);
  };

  const handleEdit = (trigger: NotificationTrigger) => {
    setEditingTrigger(trigger);
    setIsModalOpen(true);
  };

  const handleSave = (data: any) => {
    if (editingTrigger) {
      onUpdateTrigger({ triggerId: editingTrigger.id, ...data });
    } else {
      onCreateTrigger(data);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteTriggerId) {
      onDeleteTrigger(deleteTriggerId);
      setDeleteTriggerId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Gatilhos Configurados</CardTitle>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Gatilho
          </Button>
        </CardHeader>
        <CardContent>
          {triggers.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum gatilho configurado</p>
              <p className="text-sm text-muted-foreground mb-4">
                Crie gatilhos para enviar notificações automáticas
              </p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Gatilho
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {triggers.map((trigger) => {
                const triggerType = TRIGGER_TYPES.find(t => t.value === trigger.trigger_type);
                return (
                  <div
                    key={trigger.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{triggerType?.icon || '📌'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{trigger.trigger_name}</span>
                          <Badge variant={trigger.is_active ? "default" : "secondary"} className="text-xs">
                            {trigger.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        {(() => {
                          const freq = getFrequencyLabel(trigger);
                          return (
                            <div className="flex items-center gap-2 text-sm">
                              {freq.isRealtime ? (
                                <Badge variant="outline" className="text-xs font-normal text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950">
                                  {freq.label}
                                </Badge>
                              ) : (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {freq.label}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={trigger.is_active}
                        onCheckedChange={(checked) => 
                          onToggleTrigger({ triggerId: trigger.id, isActive: checked })
                        }
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(trigger)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteTriggerId(trigger.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TriggerEditModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        trigger={editingTrigger}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />

      <AlertDialog open={!!deleteTriggerId} onOpenChange={() => setDeleteTriggerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Gatilho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este gatilho? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
