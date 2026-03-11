import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { HistoriaFilters } from "@/components/historias/HistoriaFilters";
import { HistoriaKPIs } from "@/components/historias/HistoriaKPIs";
import { HistoriaTable } from "@/components/historias/HistoriaTable";
import { useHistorias } from "@/hooks/useHistorias";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Loader2 } from "lucide-react";

export default function Historias() {
  const { historias, loading, teams, clients, filters, setFilters, refetch } = useHistorias();
  const [selectedTask, setSelectedTask] = useState<unknown>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEdit = (historia: unknown) => {
    setSelectedTask(historia);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setDialogOpen(false);
    setSelectedTask(null);
    refetch();
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-130px)] flex flex-col gap-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Histórias</h1>
            <span className="text-sm text-muted-foreground">({historias.length})</span>
          </div>
        </div>

        <div className="flex-shrink-0">
          <HistoriaKPIs historias={historias} />
        </div>

        <div className="flex-shrink-0">
          <HistoriaFilters
            teams={teams}
            clients={clients}
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : historias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BookOpen className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma história encontrada</p>
              <p className="text-xs mt-1">Ajuste os filtros ou crie novas histórias no Backlog Center</p>
            </div>
          ) : (
            <HistoriaTable historias={historias} onEdit={handleEdit} />
          )}
        </ScrollArea>
      </div>

      {dialogOpen && (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedTask(null);
              refetch();
            }
          }}
          task={selectedTask}
          onSave={handleSave}
        />
      )}
    </DashboardLayout>
  );
}
