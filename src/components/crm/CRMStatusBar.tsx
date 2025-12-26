import { useState } from "react";
import { cn } from "@/lib/utils";

interface CRMStatusBarProps {
  onStatusDrop: (dealId: string, newStatus: string) => void;
  activeStatusFilter?: string | null;
  onStatusFilterChange?: (status: string | null) => void;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Aberto', bgColor: 'bg-blue-600', borderColor: 'border-blue-400', hoverBg: 'hover:bg-blue-700' },
  { value: 'unqualified', label: 'Não Qualificado', bgColor: 'bg-amber-600', borderColor: 'border-amber-400', hoverBg: 'hover:bg-amber-700' },
  { value: 'qualified', label: 'Qualificado', bgColor: 'bg-cyan-600', borderColor: 'border-cyan-400', hoverBg: 'hover:bg-cyan-700' },
  { value: 'lost', label: 'Perdido', bgColor: 'bg-red-600', borderColor: 'border-red-400', hoverBg: 'hover:bg-red-700' },
  { value: 'won', label: 'Ganho', bgColor: 'bg-emerald-600', borderColor: 'border-emerald-400', hoverBg: 'hover:bg-emerald-700' },
  { value: null, label: 'Todos', bgColor: 'bg-gray-600', borderColor: 'border-gray-400', hoverBg: 'hover:bg-gray-700' },
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
    <div className="flex items-center gap-2 mb-6">
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
              "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border-2 text-white",
              option.bgColor,
              option.borderColor,
              option.hoverBg,
              isActive && "ring-2 ring-offset-2 ring-offset-background ring-white",
              isDragOver && "scale-110 ring-4 ring-white/50 shadow-lg shadow-white/20",
              option.value === null && "cursor-pointer",
              option.value !== null && "cursor-pointer"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
