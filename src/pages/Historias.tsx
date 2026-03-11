import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { HistoriaFilters } from "@/components/historias/HistoriaFilters";
import { HistoriaKPIs } from "@/components/historias/HistoriaKPIs";
import { HistoriaTable } from "@/components/historias/HistoriaTable";
import { HistoriaKanban } from "@/components/historias/HistoriaKanban";
import { useHistorias } from "@/hooks/useHistorias";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, List, Columns3 } from "lucide-react";

export default function Historias() {
  const { historias, loading, teams, clients, filters, setFilters, refetch } = useHistorias();
  const [selectedTask, setSelectedTask] = useState<unknown>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

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
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 gap-1.5"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 gap-1.5"
              onClick={() => setViewMode("kanban")}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Kanban
            </Button>
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

        {loading ? (
          <div className="flex items-center justify-center py-20 flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : historias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground flex-1">
            <BookOpen className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma história encontrada</p>
            <p className="text-xs mt-1">Ajuste os filtros ou crie novas histórias no Backlog Center</p>
          </div>
        ) : viewMode === "kanban" ? (
          <div className="flex-1 min-h-0">
            <HistoriaKanban historias={historias} onEdit={handleEdit} />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <HistoriaTable historias={historias} onEdit={handleEdit} />
          </ScrollArea>
        )}
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
