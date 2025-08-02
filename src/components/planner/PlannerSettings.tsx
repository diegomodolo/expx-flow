import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Settings, Clock, Trash2, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePlannerSlots, PlannerTimeSlot } from "@/hooks/usePlannerSlots";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface TimeSlotDialogProps {
  slot?: PlannerTimeSlot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (slotData: Omit<PlannerTimeSlot, "id" | "created_at" | "updated_at">) => void;
}

const TimeSlotDialog: React.FC<TimeSlotDialogProps> = ({ slot, open, onOpenChange, onSave }) => {
  const [name, setName] = useState(slot?.name || "");
  const [startTime, setStartTime] = useState(slot?.start_time || "09:00");
  const [endTime, setEndTime] = useState(slot?.end_time || "10:00");
  const [description, setDescription] = useState(slot?.description || "");

  const handleSave = () => {
    if (!name || !startTime || !endTime) return;

    onSave({
      company_id: slot?.company_id || "",
      name,
      start_time: startTime,
      end_time: endTime,
      description,
      display_order: slot?.display_order || 0,
      is_active: true,
    });

    onOpenChange(false);
    
    // Reset form if creating new slot
    if (!slot) {
      setName("");
      setStartTime("09:00");
      setEndTime("10:00");
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{slot ? "Editar Slot" : "Novo Slot de Tempo"}</DialogTitle>
          <DialogDescription>
            Configure os horários e descrição para este slot do planner.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Slot</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Check Matinal"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Horário de Início</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="endTime">Horário de Fim</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as atividades deste período"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {slot ? "Atualizar" : "Criar"} Slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PlannerSettings: React.FC = () => {
  const { timeSlots, loading, createTimeSlot, updateTimeSlot, deleteTimeSlot, reorderSlots } = usePlannerSlots();
  const { toast } = useToast();
  const [editingSlot, setEditingSlot] = useState<PlannerTimeSlot | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateSlot = async (slotData: Omit<PlannerTimeSlot, "id" | "created_at" | "updated_at">) => {
    try {
      await createTimeSlot({
        ...slotData,
        display_order: timeSlots.length + 1,
      });
    } catch (error) {
      console.error("Error creating slot:", error);
    }
  };

  const handleUpdateSlot = async (slotData: Omit<PlannerTimeSlot, "id" | "created_at" | "updated_at">) => {
    if (!editingSlot) return;
    
    try {
      await updateTimeSlot(editingSlot.id, slotData);
      setEditingSlot(undefined);
    } catch (error) {
      console.error("Error updating slot:", error);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (confirm("Tem certeza que deseja remover este slot?")) {
      try {
        await deleteTimeSlot(slotId);
      } catch (error) {
        console.error("Error deleting slot:", error);
      }
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(timeSlots);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderSlots(items);
  };

  if (loading) {
    return <div className="flex justify-center p-4">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações do Planner</h2>
          <p className="text-muted-foreground">
            Configure os slots de tempo para organizar a rotina diária das suas squads
          </p>
        </div>
        
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Slot
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Slots de Tempo Configurados
          </CardTitle>
          <CardDescription>
            Arraste e solte para reordenar os slots. Os slots serão exibidos nesta ordem no planner.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {timeSlots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum slot configurado ainda.</p>
              <p className="text-sm">Crie seu primeiro slot para começar a usar o planner.</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="time-slots">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {timeSlots.map((slot, index) => (
                      <Draggable key={slot.id} draggableId={slot.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{slot.name}</h4>
                                <span className="text-sm text-muted-foreground">
                                  {slot.start_time} - {slot.end_time}
                                </span>
                              </div>
                              {slot.description && (
                                <p className="text-sm text-muted-foreground">{slot.description}</p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingSlot(slot);
                                  setDialogOpen(true);
                                }}
                              >
                                <Settings className="h-4 w-4" />
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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      <TimeSlotDialog
        slot={editingSlot}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingSlot(undefined);
        }}
        onSave={editingSlot ? handleUpdateSlot : handleCreateSlot}
      />
    </div>
  );
};