import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Pencil, Trash2, Clock, Calendar } from 'lucide-react';
import type { RoteiroAtividade } from '@/hooks/useRoteiroAtividades';

interface AtividadeListProps {
  atividades: RoteiroAtividade[];
  onEdit: (atividade: RoteiroAtividade) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export function AtividadeList({ atividades, onEdit, onDelete, onReorder }: AtividadeListProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(atividades);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    onReorder(items.map(a => a.id));
  };

  if (atividades.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma atividade cadastrada</p>
        <p className="text-sm mt-1">Clique em "Adicionar Atividade" para começar</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="atividades">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
            {atividades.map((atividade, index) => (
              <Draggable key={atividade.id} draggableId={atividade.id} index={index}>
                {(provided, snapshot) => (
                  <Card
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`p-3 ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div {...provided.dragHandleProps} className="cursor-grab">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{atividade.titulo}</span>
                          {atividade.tipo && (
                            <Badge variant="outline" className="text-xs">{atividade.tipo}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {atividade.inicio_apos_dias !== null && atividade.inicio_apos_dias > 0 && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Início: D+{atividade.inicio_apos_dias}
                            </span>
                          )}
                          {atividade.duracao_dias && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {atividade.duracao_dias}d
                            </span>
                          )}
                          {atividade.etapa && <span>Etapa: {atividade.etapa}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(atividade)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(atividade.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
