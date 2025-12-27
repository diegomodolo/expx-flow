import { useState } from "react";
import { cn } from "@/lib/utils";

interface CRMStatusBarProps {
  onStatusDrop: (dealId: string, newStatus: string) => void;
  activeStatusFilter?: string | null;
  onStatusFilterChange?: (status: string | null) => void;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Aberto', textColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-blue-500', hoverBg: 'hover:bg-blue-500/10', activeBg: 'bg-blue-500/15' },
  { value: 'unqualified', label: 'Não Qualificado', textColor: 'text-amber-600 dark:text-amber-400', borderColor: 'border-amber-500', hoverBg: 'hover:bg-amber-500/10', activeBg: 'bg-amber-500/15' },
  { value: 'qualified', label: 'Qualificado', textColor: 'text-cyan-600 dark:text-cyan-400', borderColor: 'border-cyan-500', hoverBg: 'hover:bg-cyan-500/10', activeBg: 'bg-cyan-500/15' },
  { value: 'lost', label: 'Perdido', textColor: 'text-red-600 dark:text-red-400', borderColor: 'border-red-500', hoverBg: 'hover:bg-red-500/10', activeBg: 'bg-red-500/15' },
  { value: 'won', label: 'Ganho', textColor: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-emerald-500', hoverBg: 'hover:bg-emerald-500/10', activeBg: 'bg-emerald-500/15' },
  { value: null, label: 'Todos', textColor: 'text-muted-foreground', borderColor: 'border-muted-foreground/50', hoverBg: 'hover:bg-muted/50', activeBg: 'bg-muted' },
];

export function CRMStatusBar({ 
  onStatusDrop, 
  activeStatusFilter,
  onStatusFilterChange 
}: CRMStatusBarProps) {
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (status: string | null) => {
    if (status !== null) {
      setDragOverStatus(status);
    }
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, status: string | null) => {
    e.preventDefault();
    setDragOverStatus(null);
    
    if (status === null) return; // "Todos" não permite drop
    
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) {
      onStatusDrop(dealId, status);
    }
  };

  const handleClick = (status: string | null) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(status);
    }
  };

  return (
    <div className="flex items-center w-full gap-2 mb-6">
      {STATUS_OPTIONS.map((option) => {
        const isActive = activeStatusFilter === option.value;
        const isDragOver = dragOverStatus === option.value && option.value !== null;
        
        return (
          <button
            key={option.value ?? 'all'}
            type="button"
            onClick={() => handleClick(option.value)}
            onDragOver={handleDragOver}
            onDragEnter={() => handleDragEnter(option.value)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, option.value)}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border bg-transparent text-center",
              option.textColor,
              option.borderColor,
              option.hoverBg,
              isActive && option.activeBg,
              isActive && "ring-1 ring-offset-1 ring-offset-background",
              isDragOver && "scale-105 ring-2 shadow-md"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
