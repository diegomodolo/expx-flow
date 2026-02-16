import React from 'react';
import { Plus, Trash2, Type, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MindMapToolbarProps {
  hasSelection: boolean;
  onAddChild: () => void;
  onAddSibling: () => void;
  onEditLabel: () => void;
  onDelete: () => void;
}

export function MindMapToolbar({ hasSelection, onAddChild, onAddSibling, onEditLabel, onDelete }: MindMapToolbarProps) {
  return (
    <TooltipProvider>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-card border border-border rounded-xl shadow-lg px-2 py-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddChild} disabled={!hasSelection}>
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Adicionar filho (Tab)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddSibling} disabled={!hasSelection}>
              <GitBranch className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Adicionar irmão (Enter)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditLabel} disabled={!hasSelection}>
              <Type className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editar texto (F2)</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} disabled={!hasSelection}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remover (Delete)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
