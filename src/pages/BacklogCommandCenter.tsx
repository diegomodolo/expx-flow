import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useBacklogCommandCenter } from "@/hooks/useBacklogCommandCenter";
import { useCompany } from "@/contexts/CompanyContext";
import { BacklogHeader } from "@/components/backlog-center/BacklogHeader";
import { BacklogClientSidebar } from "@/components/backlog-center/BacklogClientSidebar";
import { BacklogBucket } from "@/components/backlog-center/BacklogBucket";
import { BacklogFooterBar } from "@/components/backlog-center/BacklogFooterBar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Radar, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function BacklogCommandCenterPage() {
  const { activeCompany } = useCompany();
  const {
    backlogClients,
    filteredTasks,
    tasksLoading,
    selectedClientId,
    setSelectedClientId,
    selectedTaskIds,
    toggleTaskSelection,
    selectAll,
    clearSelection,
    selectionStats,
    totalStats,
    getReadiness,
    getAgingHours,
    releaseToLeaders,
    clients,
    taskToClients,
    squads,
    selectedSquadId,
    setSelectedSquadId,
    subtasksByParent,
  } = useBacklogCommandCenter();

  const [releasing, setReleasing] = useState(false);

  const handleRelease = async () => {
    if (selectedTaskIds.size === 0) return;
    setReleasing(true);
    try {
      await releaseToLeaders(Array.from(selectedTaskIds));
    } finally {
      setReleasing(false);
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedTaskIds);
    const { error } = await supabase.from('tasks').delete().in('id', ids);
    if (error) {
      toast({ title: "Erro ao excluir tarefas", variant: "destructive" });
    } else {
      toast({ title: `${ids.length} tarefa${ids.length > 1 ? 's' : ''} excluída${ids.length > 1 ? 's' : ''}` });
      clearSelection();
      // trigger refetch by clearing selection - data will refresh
      window.location.reload();
    }
  };

  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-130px)] overflow-hidden">
        {/* Header (single row: nav button + stats | title + squad) */}
        <BacklogHeader
          totalStats={totalStats}
          squads={squads}
          selectedSquadId={selectedSquadId}
          onSquadChange={setSelectedSquadId}
          leading={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/squad-command-center')}
              className="gap-2"
            >
              <Radar className="w-4 h-4" />
              Command Center
            </Button>
          }
          title={
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-primary" />
              <span className="text-base font-bold text-foreground tracking-tight">Backlog</span>
            </div>
          }
        />

        {/* Main content: Sidebar + Bucket */}
        <ResizablePanelGroup direction="horizontal" autoSaveId="backlog-panels" className="flex flex-1 min-h-0">
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <BacklogClientSidebar
              clients={backlogClients}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              totalStats={totalStats}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}>
            <BacklogBucket
              tasks={filteredTasks}
              loading={tasksLoading}
              selectedTaskIds={selectedTaskIds}
              onToggleTask={toggleTaskSelection}
              getReadiness={getReadiness}
              getAgingHours={getAgingHours}
              clients={clients}
              taskToClients={taskToClients}
              companyId={activeCompany?.company_id}
              subtasksByParent={subtasksByParent}
              selectionBar={
                <BacklogFooterBar
                  selectionStats={selectionStats}
                  onRelease={handleRelease}
                  onClear={clearSelection}
                  onSelectAll={selectAll}
                  onDeleteSelected={handleDeleteSelected}
                  releasing={releasing}
                />
              }
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DashboardLayout>
  );
}
