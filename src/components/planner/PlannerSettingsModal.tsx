import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Clock, Edit2, Trash2, GripVertical } from "lucide-react";
import { usePlannerSlots, PlannerTimeSlot } from "@/hooks/usePlannerSlots";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface SlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot?: PlannerTimeSlot;
  onSave: (slotData: Omit<PlannerTimeSlot, "id" | "created_at" | "updated_at">) => void;
}

const SlotDialog: React.FC<SlotDialogProps> = ({ open, onOpenChange, slot, onSave }) => {
  const [formData, setFormData] = useState({
    name: slot?.name || "",
    description: slot?.description || "",
    start_time: slot?.start_time || "",
    end_time: slot?.end_time || "",
    is_active: slot?.is_active ?? true,
    display_order: slot?.display_order || 0,
    company_id: slot?.company_id || "",
  });

  const handleSave = () => {
    if (!formData.name || !formData.start_time || !formData.end_time) {
      return;
    }

    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {slot ? "Editar" : "Criar"} Slot de Tempo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Slot</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Manhã, Tarde, Noite"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Horário de Início</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">Horário de Fim</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do período de trabalho"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {slot ? "Atualizar" : "Criar"} Slot
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface PlannerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlannerSettingsModal: React.FC<PlannerSettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { timeSlots, loading, createTimeSlot, updateTimeSlot, deleteTimeSlot, reorderSlots } = usePlannerSlots();
  const { toast } = useToast();
  const [editingSlot, setEditingSlot] = useState<PlannerTimeSlot | undefined>();
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);

  const handleCreateSlot = async (slotData: Omit<PlannerTimeSlot, "id" | "created_at" | "updated_at">) => {
    try {
      await createTimeSlot({
        ...slotData,
        display_order: timeSlots.length,
      });
      toast({
        title: "Slot criado",
        description: "Slot de tempo criado com sucesso.",
      });
    } catch (error) {
      console.error('Error creating slot:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar slot de tempo.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSlot = async (slotData: Omit<PlannerTimeSlot, "id" | "created_at" | "updated_at">) => {
    if (!editingSlot) return;

    try {
      await updateTimeSlot(editingSlot.id, slotData);
      toast({
        title: "Slot atualizado",
        description: "Slot de tempo atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating slot:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar slot de tempo.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await deleteTimeSlot(slotId);
      toast({
        title: "Slot excluído",
        description: "Slot de tempo excluído com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir slot de tempo.",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(timeSlots);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all items
    const reorderedSlots = items.map((slot, index) => ({
      ...slot,
      display_order: index,
    }));

    try {
      await reorderSlots(reorderedSlots);
      toast({
        title: "Ordem atualizada",
        description: "Ordem dos slots atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Error reordering slots:', error);
      toast({
        title: "Erro",
        description: "Erro ao reordenar slots.",
        variant: "destructive",
      });
    }
  };

  const getSlotDuration = (slot: PlannerTimeSlot) => {
    const start = new Date(`2000-01-01T${slot.start_time}`);
    const end = new Date(`2000-01-01T${slot.end_time}`);
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Configurações do Planner
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Slots de Tempo</h3>
                <p className="text-sm text-muted-foreground">
                  Configure os períodos do seu dia para organizar suas tarefas
                </p>
              </div>
              <Button 
                onClick={() => {
                  setEditingSlot(undefined);
                  setSlotDialogOpen(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Slot
              </Button>
            </div>

            <Separator />

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando slots...
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <div>
                  <h3 className="text-lg font-medium">Nenhum slot configurado</h3>
                  <p className="text-muted-foreground">
                    Crie seu primeiro slot de tempo para começar a organizar seu dia
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    setEditingSlot(undefined);
                    setSlotDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Slot
                </Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="slots">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3"
                    >
                      {timeSlots.map((slot, index) => (
                        <Draggable key={slot.id} draggableId={slot.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`transition-all ${snapshot.isDragging ? 'shadow-lg scale-105' : ''}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab hover:cursor-grabbing"
                                    >
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium">{slot.name}</h4>
                                        <Badge variant="outline" className="text-xs">
                                          {slot.start_time} - {slot.end_time} ({getSlotDuration(slot)})
                                        </Badge>
                                      </div>
                                      {slot.description && (
                                        <p className="text-sm text-muted-foreground">
                                          {slot.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingSlot(slot);
                                        setSlotDialogOpen(true);
                                      }}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteSlot(slot.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SlotDialog
        open={slotDialogOpen}
        onOpenChange={setSlotDialogOpen}
        slot={editingSlot}
        onSave={editingSlot ? handleUpdateSlot : handleCreateSlot}
      />
    </>
  );
};