import { Button } from "@/components/ui/button";
import { Copy, Sparkles, RefreshCw, Clock, Check, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdGenerationType, AdGenerationStatus } from "@/pages/geradores/RevisaoDiaria";

interface AdReviewFiltersProps {
  filterType: AdGenerationType | "all";
  filterStatus: AdGenerationStatus | "all";
  onTypeChange: (type: AdGenerationType | "all") => void;
  onStatusChange: (status: AdGenerationStatus | "all") => void;
}

const typeFilters = [
  { value: "all", label: "Todos os Tipos", icon: Eye },
  { value: "clone", label: "Clones", icon: Copy },
  { value: "concept", label: "Conceitos", icon: Sparkles },
  { value: "iteration", label: "Iterações", icon: RefreshCw },
] as const;

const statusFilters = [
  { value: "all", label: "Todos", icon: Eye },
  { value: "pending", label: "Pendentes", icon: Clock },
  { value: "approved", label: "Aprovados", icon: Check },
  { value: "rejected", label: "Rejeitados", icon: X },
] as const;

export function AdReviewFilters({
  filterType,
  filterStatus,
  onTypeChange,
  onStatusChange,
}: AdReviewFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Tipo:</span>
        {typeFilters.map((filter) => {
          const Icon = filter.icon;
          return (
            <Button
              key={filter.value}
              variant={filterType === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => onTypeChange(filter.value)}
              className={cn(
                "gap-1.5",
                filterType === filter.value && "bg-primary"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {filter.label}
            </Button>
          );
        })}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Status:</span>
        {statusFilters.map((filter) => {
          const Icon = filter.icon;
          return (
            <Button
              key={filter.value}
              variant={filterStatus === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusChange(filter.value)}
              className={cn(
                "gap-1.5",
                filterStatus === filter.value && "bg-primary"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {filter.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
