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

  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-130px)] overflow-hidden">
        {/* Top bar with nav to Command Center */}
        <div className="flex items-center justify-between flex-shrink-0 pb-4">
          <div className="flex items-center gap-3">
            <Inbox className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Backlog</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/squad-command-center')}
            className="gap-2"
          >
            <Radar className="w-4 h-4" />
            Command Center
          </Button>
        </div>

        {/* Header */}
        <BacklogHeader
          totalStats={totalStats}
          squads={squads}
          selectedSquadId={selectedSquadId}
          onSquadChange={setSelectedSquadId}
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
