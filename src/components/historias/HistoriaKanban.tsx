import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HistoriaCard } from "./HistoriaCard";
import type { Historia } from "@/hooks/useHistorias";

interface HistoriaKanbanProps {
  historias: Historia[];
  onEdit: (historia: Historia) => void;
}

const COLUMNS = [
  { key: "todo", label: "Aberta", color: "bg-slate-500" },
  { key: "progress", label: "Em Andamento", color: "bg-blue-500" },
  { key: "review", label: "Revisão", color: "bg-amber-500" },
  { key: "done", label: "Concluída", color: "bg-emerald-500" },
];

export function HistoriaKanban({ historias, onEdit }: HistoriaKanbanProps) {
  const grouped = useMemo(() => {
    const map: Record<string, Historia[]> = {};
    COLUMNS.forEach((col) => { map[col.key] = []; });
    historias.forEach((h) => {
      const key = COLUMNS.find((c) => c.key === h.status) ? h.status : "todo";
      map[key].push(h);
    });
    return map;
  }, [historias]);

  return (
    <div className="flex gap-4 h-full min-h-0 overflow-x-auto pb-2">
      {COLUMNS.map((col) => (
        <div key={col.key} className="flex flex-col min-w-[280px] w-[280px] flex-shrink-0">
          {/* Column header */}
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
            <span className="text-sm font-semibold text-foreground">{col.label}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {grouped[col.key].length}
            </span>
          </div>
          {/* Column content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col gap-2 px-1 pb-4">
              {grouped[col.key].length === 0 ? (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                  Nenhuma história
                </div>
              ) : (
                grouped[col.key].map((h) => (
                  <HistoriaCard key={h.id} historia={h} onEdit={onEdit} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
