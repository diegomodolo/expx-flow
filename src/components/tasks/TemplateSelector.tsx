import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Layout, AlertTriangle } from "lucide-react";
import { KANBAN_TEMPLATES, KanbanTemplate } from "@/data/kanbanTemplates";
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

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate: (template: KanbanTemplate) => void;
  isApplying?: boolean;
  hasExistingColumns?: boolean;
}

export function TemplateSelector({ 
  open, 
  onOpenChange, 
  onApplyTemplate,
  isApplying = false,
  hasExistingColumns = false,
}: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<KanbanTemplate | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleSelectTemplate = (template: KanbanTemplate) => {
    setSelectedTemplate(template);
  };

  const handleApplyClick = () => {
    if (!selectedTemplate) return;
    
    if (hasExistingColumns) {
      setConfirmDialogOpen(true);
    } else {
      onApplyTemplate(selectedTemplate);
      onOpenChange(false);
      setSelectedTemplate(null);
    }
  };

  const handleConfirmApply = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate);
      onOpenChange(false);
      setSelectedTemplate(null);
    }
    setConfirmDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Escolher Template de Colunas
            </DialogTitle>
            <DialogDescription>
              Selecione um template predefinido para organizar seu quadro Kanban de acordo com seu fluxo de trabalho.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {KANBAN_TEMPLATES.map((template) => {
                const isSelected = selectedTemplate?.id === template.id;
                
                return (
                  <Card
                    key={template.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-primary border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <h3 className="font-semibold text-foreground">{template.name}</h3>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Column preview */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {template.columns.length} colunas
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {template.columns.map((col, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                            style={{ 
                              backgroundColor: `${col.color}20`,
                              color: col.color,
                            }}
                          >
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: col.color }}
                            />
                            {col.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleApplyClick}
              disabled={!selectedTemplate || isApplying}
            >
              {isApplying ? 'Aplicando...' : 'Aplicar Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Substituir colunas existentes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você já possui colunas personalizadas. Aplicar este template irá <strong>substituir todas as suas colunas atuais</strong>.
              <br /><br />
              Suas tarefas serão mantidas e reorganizadas nas novas colunas de acordo com seus status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApply}>
              Sim, substituir colunas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
